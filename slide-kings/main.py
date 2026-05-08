#!/usr/bin/env python3
"""
Slide Kings — Anime Football Chaos
A 3D football game built with Panda3D.

Install:  pip install panda3d
Run:      python main.py
Controls: WASD/Arrows=Move  Space=Slide Tackle  1-5=Abilities  Esc=Pause/Menu
"""
from __future__ import annotations
import math
import random
import sys
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from direct.gui.DirectGui import (
    DGG, DirectButton, DirectEntry, DirectFrame, DirectLabel, DirectWaitBar,
)
from direct.gui.OnscreenText import OnscreenText
from direct.showbase.ShowBase import ShowBase
from panda3d.core import (
    AmbientLight, CardMaker, DirectionalLight,
    GeomNode, LineSegs, NodePath,
    TextNode, TransparencyAttrib, WindowProperties,
)

from geometry import make_box, make_cylinder, make_sphere

# ══════════════════════════════════════════════════════════════════════════════
# CONSTANTS
# ══════════════════════════════════════════════════════════════════════════════
PW          = 38.0   # Pitch width  (X axis)
PL          = 56.0   # Pitch length (Y axis)
GOAL_W      = 8.0
GOAL_H      = 3.0
GOAL_DEPTH  = 2.5

PLAYER_SPEED   = 8.0
SLIDE_SPEED    = 17.0
SLIDE_DUR      = 0.52
SLIDE_CD       = 1.9
SLIDE_RANGE    = 1.6
STUN_DUR       = 1.6
KNOCKBACK      = 5.0
STAMINA_DRAIN  = 9.0
STAMINA_REGEN  = 20.0
BALL_FRICTION  = 0.94
BALL_KICK      = 14.0
BALL_R         = 0.22
PLAYER_R       = 0.45
AI_TICK        = 0.2

ABILITY_DEFS: Dict[str, dict] = {
    "dragonSlide":   {"name": "Dragon Slide",   "sym": "[D]", "color": (1.00, 0.27, 0.00, 1), "cd": 8,  "dur": 0.70, "key": "1"},
    "tornadoSpin":   {"name": "Tornado Spin",   "sym": "[T]", "color": (0.00, 0.75, 1.00, 1), "cd": 10, "dur": 1.30, "key": "2"},
    "shadowStep":    {"name": "Shadow Step",    "sym": "[S]", "color": (0.61, 0.50, 0.96, 1), "cd": 12, "dur": 0.60, "key": "3"},
    "thunderCharge": {"name": "Thunder Charge", "sym": "[C]", "color": (0.96, 0.78, 0.26, 1), "cd": 9,  "dur": 2.50, "key": "4"},
    "sakuraBurst":   {"name": "Sakura Burst",   "sym": "[B]", "color": (1.00, 0.41, 0.71, 1), "cd": 15, "dur": 2.00, "key": "5"},
}

MATCH_CONFIGS: Dict[str, dict] = {
    "classic":     {"duration": 300, "name": "Classic",           "win": "goals",   "no_cd": False},
    "tackle_rush": {"duration": 180, "name": "Tackle Rush",       "win": "tackles", "no_cd": False},
    "survival":    {"duration": None,"name": "Survival",          "win": "lives",   "no_cd": False},
    "king":        {"duration": 300, "name": "King of the Pitch", "win": "zone",    "no_cd": False, "target": 60},
    "chaos":       {"duration": 300, "name": "Chaos Mode",        "win": "goals",   "no_cd": True},
}

TEAM_KIT = [(0.91, 0.26, 0.58, 1), (0.20, 0.60, 0.90, 1)]
SKIN_C   = (0.96, 0.76, 0.63, 1)

# UI colours
UI_BG   = (0.04, 0.05, 0.06, 0.92)
UI_CARD = (0.08, 0.09, 0.12, 0.95)
UI_BORD = (0.12, 0.14, 0.20, 1)
UI_TXT  = (0.93, 0.94, 0.97, 1)
UI_SOFT = (0.48, 0.53, 0.67, 1)
UI_ACC  = (0.96, 0.78, 0.26, 1)
UI_ROSE = (0.95, 0.36, 0.48, 1)

# ══════════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ══════════════════════════════════════════════════════════════════════════════

_eid = 0

@dataclass
class Effect:
    type:     str            # fire|tornado|shadow|electric|sakura|shockwave
    pos:      Tuple[float, float]
    timer:    float = 0.0
    max_time: float = 1.2
    node:     Optional[NodePath] = None
    id:       int = field(default_factory=lambda: _get_eid())

def _get_eid():
    global _eid
    _eid += 1
    return _eid

@dataclass
class Ball:
    x:   float = 0.0
    y:   float = 0.0
    vx:  float = 0.0
    vy:  float = 0.0
    node: Optional[NodePath] = None

@dataclass
class Player:
    id:      int
    team:    int
    is_ai:   bool
    x:       float
    y:       float
    vx:      float = 0.0
    vy:      float = 0.0
    heading: float = 0.0    # Panda3D H degrees (0=+Y, 90=-X, -90=+X)
    state:   str   = "idle" # idle|running|sliding|stunned|ability
    ability_id:    Optional[str] = None
    state_timer:   float = 0.0
    stamina:       float = 100.0
    slide_cd:      float = 0.0
    ability_cds:   Dict[str, float] = field(default_factory=lambda: {k: 0.0 for k in ABILITY_DEFS})
    tackles:       int   = 0
    lives:         int   = 3
    dead:          bool  = False
    respawn_timer: float = 0.0
    burn_timer:    float = 0.0
    thunder_active: bool = False
    thunder_timer:  float = 0.0
    ai_timer:      float = 0.0
    node:          Optional[NodePath] = None
    custom:        Dict = field(default_factory=dict)

# ══════════════════════════════════════════════════════════════════════════════
# MAIN GAME CLASS
# ══════════════════════════════════════════════════════════════════════════════

class SlideKings(ShowBase):

    def __init__(self):
        ShowBase.__init__(self)

        # ── Window ────────────────────────────────────────────────────────────
        props = WindowProperties()
        props.setTitle("Slide Kings — Anime Football Chaos")
        props.setSize(1280, 720)
        self.win.requestProperties(props)
        self.setBackgroundColor(0.04, 0.04, 0.06, 1)
        self.disableMouse()

        # ── State ─────────────────────────────────────────────────────────────
        self.phase        = "menu"
        self.match_type   = "classic"
        self.player_custom = {
            "hair": (0.80, 0.10, 0.10, 1),
            "kit":  (0.91, 0.26, 0.58, 1),
            "boot": (0.10, 0.10, 0.15, 1),
            "name": "Player",
        }
        self.score        = [0, 0]
        self.zone_score   = [0.0, 0.0]
        self.time_left    = 300.0
        self.goal_cd      = 0.0
        self.game_over    = False

        self.players:  List[Player] = []
        self.ball:     Optional[Ball] = None
        self.effects:  List[Effect] = []
        self.scene_root: Optional[NodePath] = None

        self.keys: Dict[str, bool] = {}
        self._gui_nodes: List = []

        # ── Input ─────────────────────────────────────────────────────────────
        for key in ["w","a","s","d","space","1","2","3","4","5","escape",
                    "arrow_up","arrow_down","arrow_left","arrow_right"]:
            self.accept(key,       self._key_down, [key])
            self.accept(key + "-up", self._key_up,   [key])

        self._show_menu()

    # ── Input helpers ──────────────────────────────────────────────────────────

    def _key_down(self, k): self.keys[k] = True
    def _key_up(self,   k): self.keys[k] = False

    def _pressed(self, *keys) -> bool:
        return any(self.keys.get(k) for k in keys)

    # ── GUI helpers ────────────────────────────────────────────────────────────

    def _clear_gui(self):
        for n in self._gui_nodes:
            try: n.destroy()
            except Exception: pass
        self._gui_nodes.clear()

    def _frame(self, **kw) -> DirectFrame:
        f = DirectFrame(**kw)
        self._gui_nodes.append(f)
        return f

    def _btn(self, text, cmd, pos, color=UI_ROSE, w=0.36, **kw) -> DirectButton:
        b = DirectButton(
            text=text,
            text_scale=0.065,
            text_fg=UI_TXT,
            frameColor=color,
            frameSize=(-w, w, -0.05, 0.055),
            pos=pos,
            relief=DGG.FLAT,
            command=cmd,
            **kw,
        )
        self._gui_nodes.append(b)
        return b

    def _label(self, text, pos, scale=0.065, color=UI_TXT, parent=None) -> OnscreenText:
        kw = dict(text=text, pos=pos, scale=scale, fg=color, align=TextNode.ACenter,
                  mayChange=True)
        if parent: kw["parent"] = parent
        t = OnscreenText(**kw)
        self._gui_nodes.append(t)
        return t

    # ══════════════════════════════════════════════════════════════════════════
    # SCREENS
    # ══════════════════════════════════════════════════════════════════════════

    def _show_menu(self):
        self.phase = "menu"
        self._clear_gui()
        if self.scene_root:
            self.scene_root.removeNode()
            self.scene_root = None
        self.taskMgr.remove("game_update")

        bg = self._frame(frameColor=UI_BG, frameSize=(-1.8, 1.8, -1.1, 1.1), pos=(0, 0, 0))

        self._label("SLIDE KINGS",        (0, 0.72), 0.17, UI_ACC,  bg)
        self._label("Anime Football Chaos",(0, 0.54), 0.065, UI_SOFT, bg)

        # Ability pills
        pills = [("Dragon Slide","[1]","#ff4400"),("Tornado Spin","[2]","#00bfff"),
                 ("Shadow Step","[3]","#9c7ff4"),("Thunder Charge","[4]","#f5c842"),
                 ("Sakura Burst","[5]","#ff69b4")]
        for i, (name, key, _) in enumerate(pills):
            self._label(f"{key} {name}", (-0.82 + i * 0.41, 0.38), 0.046, UI_SOFT, bg)

        self._btn("PLAY NOW",         self._show_match_select, (0, 0, 0.19), color=UI_ROSE, w=0.38, parent=bg)
        self._btn("Customise Player", self._show_customise,    (0, 0, 0.06), color=UI_CARD, w=0.38, parent=bg)
        self._btn("Quit",             sys.exit,                 (0, 0,-0.08), color=UI_CARD, w=0.38, parent=bg)

        controls = "Controls:   WASD / Arrows = Move   Space = Slide Tackle   1-5 = Abilities   Esc = Menu"
        self._label(controls, (0, -0.3), 0.048, UI_SOFT, bg)

    def _show_match_select(self):
        self._clear_gui()
        bg = self._frame(frameColor=UI_BG, frameSize=(-1.8, 1.8, -1.1, 1.1))

        self._label("SELECT MATCH TYPE", (0, 0.80), 0.10, UI_ACC, bg)

        descriptions = {
            "classic":     "Score goals. 5-minute match.",
            "tackle_rush": "Most tackles in 3 minutes wins.",
            "survival":    "3 lives each. Last one standing wins.",
            "king":        "Hold the centre circle. First to 60 points.",
            "chaos":       "No ability cooldowns. Pure carnage. Score goals.",
        }

        for i, (mid, cfg) in enumerate(MATCH_CONFIGS.items()):
            y = 0.52 - i * 0.24
            selected = (mid == self.match_type)
            color = (0.18, 0.10, 0.10, 0.95) if selected else UI_CARD
            self._btn(
                f"{cfg['name']}  —  {descriptions[mid]}",
                lambda m=mid: self._select_match(m),
                (0, 0, y),
                color=color, w=0.95, parent=bg,
            )

        self._btn("Back", self._show_menu, (0, 0, -0.88), color=UI_CARD, w=0.25, parent=bg)

    def _select_match(self, mid: str):
        self.match_type = mid
        self._start_game()

    def _show_customise(self):
        self._clear_gui()
        bg = self._frame(frameColor=UI_BG, frameSize=(-1.8, 1.8, -1.1, 1.1))

        self._label("CUSTOMISE PLAYER", (0, 0.85), 0.10, UI_ACC, bg)

        # Name
        self._label("Name:", (-0.5, 0.60), 0.065, UI_TXT, bg)
        entry = DirectEntry(
            text="", initialText=self.player_custom["name"],
            scale=0.065, pos=(-0.05, 0, 0.60),
            frameColor=UI_CARD, text_fg=UI_TXT,
            width=8, numLines=1,
            parent=bg,
            command=lambda t: self.player_custom.update({"name": t}),
        )
        self._gui_nodes.append(entry)

        # Colour pickers
        hair_opts  = [(0.8,0.1,0.1,1),(0.1,0.1,0.15,1),(1.0,0.42,0.21,1),(0.97,0.78,0.26,1),
                      (0.18,0.8,0.18,1),(0.2,0.7,1.0,1),(0.6,0.5,1.0,1),(1.0,1.0,1.0,1)]
        kit_opts   = [(0.91,0.26,0.58,1),(0.78,0.08,0.08,1),(0.2,0.6,0.9,1),(0.15,0.7,0.45,1),
                      (0.95,0.6,0.15,1),(0.55,0.3,0.9,1),(0.1,0.1,0.1,1),(0.95,0.95,0.95,1)]
        boot_opts  = [(0.1,0.1,0.15,1),(0.75,0.08,0.08,1),(0.97,0.78,0.26,1),(0.2,0.65,0.35,1),
                      (0.2,0.5,0.9,1),(0.6,0.3,0.8,1),(0.95,0.95,0.95,1),(0.5,0.5,0.5,1)]

        for row_i, (label, key, opts) in enumerate([("Hair Colour","hair",hair_opts),
                                                     ("Kit Colour", "kit", kit_opts),
                                                     ("Boot Colour","boot",boot_opts)]):
            y = 0.30 - row_i * 0.28
            self._label(f"{label}:", (-0.82, y + 0.07), 0.055, UI_SOFT, bg)
            for ci, c in enumerate(opts):
                sel = (self.player_custom[key] == c)
                f = DirectFrame(
                    frameColor=c, frameSize=(-0.045, 0.045, -0.045, 0.045),
                    pos=(-0.55 + ci * 0.115, 0, y),
                    relief=DGG.FLAT,
                    borderWidth=(0.008, 0.008) if sel else (0, 0),
                    frameTexture=None,
                    parent=bg,
                )
                # Override border when selected
                if sel:
                    f["frameColor"] = (min(1, c[0]+0.3), min(1, c[1]+0.3), min(1, c[2]+0.3), 1)
                f.bind(DGG.B1PRESS, lambda e, k=key, col=c: self._set_colour(k, col))
                self._gui_nodes.append(f)

        self._btn("Save & Back", self._show_menu, (0, 0, -0.80), color=UI_ROSE, w=0.35, parent=bg)

    def _set_colour(self, key: str, colour):
        self.player_custom[key] = colour

    # ══════════════════════════════════════════════════════════════════════════
    # GAME START
    # ══════════════════════════════════════════════════════════════════════════

    def _start_game(self):
        self._clear_gui()
        self.phase     = "playing"
        self.game_over = False
        self.score     = [0, 0]
        self.zone_score = [0.0, 0.0]
        self.goal_cd   = 0.0
        self.effects   = []

        cfg = MATCH_CONFIGS[self.match_type]
        self.time_left = cfg["duration"] if cfg["duration"] else 999999.0

        # ── Scene root ────────────────────────────────────────────────────────
        if self.scene_root:
            self.scene_root.removeNode()
        self.scene_root = self.render.attachNewNode("scene")

        # ── Lighting ──────────────────────────────────────────────────────────
        amb = AmbientLight("amb")
        amb.setColor((0.45, 0.45, 0.50, 1))
        self.scene_root.setLight(self.scene_root.attachNewNode(amb))

        sun = DirectionalLight("sun")
        sun.setColor((1.0, 0.98, 0.92, 1))
        sun_np = self.scene_root.attachNewNode(sun)
        sun_np.setHpr(30, -55, 0)
        self.scene_root.setLight(sun_np)

        fill = DirectionalLight("fill")
        fill.setColor((0.25, 0.35, 0.55, 1))
        fill_np = self.scene_root.attachNewNode(fill)
        fill_np.setHpr(-150, -20, 0)
        self.scene_root.setLight(fill_np)

        # ── Build world ───────────────────────────────────────────────────────
        self._build_pitch()
        self._build_players()
        self._build_ball()

        # ── Camera ────────────────────────────────────────────────────────────
        self.camera.setPos(0, -PL * 0.42, 26)
        self.camera.lookAt(0, 2, 0)

        # ── HUD ───────────────────────────────────────────────────────────────
        self._build_hud()

        # ── Game loop ─────────────────────────────────────────────────────────
        self.taskMgr.add(self._game_loop, "game_update")

    # ══════════════════════════════════════════════════════════════════════════
    # SCENE BUILDING
    # ══════════════════════════════════════════════════════════════════════════

    def _build_pitch(self):
        root = self.scene_root.attachNewNode("pitch")

        # Grass base
        cm = CardMaker("grass")
        cm.setFrame(-PW/2 - 3, PW/2 + 3, -PL/2 - 3, PL/2 + 3)
        grass = root.attachNewNode(cm.generate())
        grass.setP(-90)
        grass.setColor(0.11, 0.38, 0.19, 1)

        # Alternating stripes
        for i in range(8):
            if i % 2 == 0: continue
            cm2 = CardMaker(f"stripe{i}")
            z0 = -PL/2 + i * (PL/7)
            z1 = z0 + PL/7
            cm2.setFrame(-PW/2, PW/2, z0, z1)
            stripe = root.attachNewNode(cm2.generate())
            stripe.setP(-90)
            stripe.setPos(0, 0, 0.005)
            stripe.setColor(0.13, 0.43, 0.22, 1)

        # Lines
        ls = LineSegs()
        ls.setColor(1, 1, 1, 0.9)
        ls.setThickness(2.0)

        def line(ax, ay, bx, by):
            ls.moveTo(ax, ay, 0.01)
            ls.drawTo(bx, by, 0.01)

        hw, hl = PW/2, PL/2
        # Boundary
        line(-hw, -hl,  hw, -hl)
        line( hw, -hl,  hw,  hl)
        line( hw,  hl, -hw,  hl)
        line(-hw,  hl, -hw, -hl)
        # Halfway
        line(-hw, 0, hw, 0)
        # Goal boxes
        gbox = GOAL_W/2 + 3
        line(-gbox, -hl, -gbox, -hl+7)
        line(-gbox, -hl+7,  gbox, -hl+7)
        line( gbox, -hl,  gbox, -hl+7)
        line(-gbox,  hl, -gbox,  hl-7)
        line(-gbox,  hl-7,  gbox,  hl-7)
        line( gbox,  hl,  gbox,  hl-7)
        # Centre circle
        segs = 60
        for i in range(segs):
            a0 = 2*math.pi * i / segs
            a1 = 2*math.pi * (i+1) / segs
            ls.moveTo(math.cos(a0)*6, math.sin(a0)*6, 0.01)
            ls.drawTo(math.cos(a1)*6, math.sin(a1)*6, 0.01)
        # Centre spot
        for i in range(16):
            a0 = 2*math.pi * i / 16
            a1 = 2*math.pi * (i+1) / 16
            ls.moveTo(math.cos(a0)*0.2, math.sin(a0)*0.2, 0.01)
            ls.drawTo(math.cos(a1)*0.2, math.sin(a1)*0.2, 0.01)

        root.attachNewNode(ls.create())

        # King-of-pitch zone glow
        if self.match_type == "king":
            cm3 = CardMaker("zone")
            cm3.setFrame(-6.1, 6.1, -6.1, 6.1)
            zone = root.attachNewNode(cm3.generate())
            zone.setP(-90)
            zone.setPos(0, 0, 0.012)
            zone.setColor(0.96, 0.78, 0.26, 0.2)
            zone.setTransparency(TransparencyAttrib.MAlpha)

        # Goal posts
        self._build_goalpost(root, 0, -PL/2,  1)
        self._build_goalpost(root, 0,  PL/2, -1)

    def _build_goalpost(self, parent, cx, cy, depth_sign):
        WHITE = (0.9, 0.9, 0.9, 1)

        def post(x, y, z, w, d, h):
            node = parent.attachNewNode(make_box(w, d, h, WHITE))
            node.setPos(cx + x, cy + y, z)
            return node

        hw = GOAL_W / 2
        # Left & right posts
        post(-hw, 0, GOAL_H/2, 0.2, 0.2, GOAL_H)
        post( hw, 0, GOAL_H/2, 0.2, 0.2, GOAL_H)
        # Crossbar
        post(0, 0, GOAL_H, GOAL_W + 0.2, 0.2, 0.2)
        # Back net (wireframe look via thin box)
        back = parent.attachNewNode(make_box(GOAL_W, 0.1, GOAL_H, (0.9, 0.9, 0.9, 0.18)))
        back.setPos(cx, cy + depth_sign * GOAL_DEPTH, GOAL_H/2)
        back.setTransparency(TransparencyAttrib.MAlpha)

    def _build_players(self):
        self.players.clear()
        positions = [
            (-8,-20),(-4,-15),(0,-18),(4,-15),(8,-20),
            (-8, 20),(-4, 15),(0, 18),(4, 15),(8, 20),
        ]
        ai_hairs = [(0.10,0.10,0.15,1),(0.97,0.78,0.26,1),(0.18,0.8,0.18,1),
                    (0.20,0.70,1.00,1),(1.00,1.00,1.00,1)]

        for i, (px, py) in enumerate(positions):
            team   = 0 if i < 5 else 1
            is_ai  = (i != 0)
            custom = dict(
                hair = self.player_custom["hair"] if not is_ai else ai_hairs[i % 5],
                kit  = self.player_custom["kit"]  if not is_ai else TEAM_KIT[team],
                boot = self.player_custom["boot"] if not is_ai else (0.10, 0.10, 0.15, 1),
                name = self.player_custom["name"] if not is_ai else f"CPU {i}",
            )
            p = Player(id=i, team=team, is_ai=is_ai, x=float(px), y=float(py), custom=custom)
            p.node = self._make_player_node(p)
            self.players.append(p)

    def _make_player_node(self, p: Player) -> NodePath:
        root = self.scene_root.attachNewNode(f"player_{p.id}")
        root.setPos(p.x, p.y, 0)

        kit  = p.custom["kit"]
        hair = p.custom["hair"]
        boot = p.custom["boot"]
        team_c = TEAM_KIT[p.team]

        # Shadow
        cm = CardMaker("shadow")
        cm.setFrame(-0.44, 0.44, -0.44, 0.44)
        shadow = root.attachNewNode(cm.generate())
        shadow.setP(-90)
        shadow.setPos(0, 0, 0.005)
        shadow.setColor(0, 0, 0, 0.35)
        shadow.setTransparency(TransparencyAttrib.MAlpha)

        # Body group (for tilt animation)
        body_root = root.attachNewNode("body")

        # Boots
        for side in (-0.14, 0.14):
            b = body_root.attachNewNode(make_box(0.17, 0.27, 0.11, boot))
            b.setPos(side, 0.05, 0.08)

        # Legs
        for side in (-0.14, 0.14):
            lg = body_root.attachNewNode(make_box(0.16, 0.16, 0.46, kit))
            lg.setPos(side, 0, 0.37)

        # Body/torso
        torso = body_root.attachNewNode(make_box(0.52, 0.30, 0.52, kit))
        torso.setPos(0, 0, 0.88)

        # Team stripe on front of torso
        stripe = body_root.attachNewNode(make_box(0.52, 0.02, 0.10, team_c))
        stripe.setPos(0, 0.16, 0.88)

        # Arms
        for side in (-0.35, 0.35):
            arm = body_root.attachNewNode(make_box(0.14, 0.14, 0.44, kit))
            arm.setPos(side, 0, 0.86)

        # Neck
        neck = body_root.attachNewNode(make_cylinder(0.10, 0.16, SKIN_C))
        neck.setPos(0, 0, 1.25)

        # Head (big for anime look)
        head = body_root.attachNewNode(make_sphere(0.33, SKIN_C, lat_segs=8, lon_segs=14))
        head.setPos(0, 0, 1.62)

        # Hair
        hair_dome = body_root.attachNewNode(make_sphere(0.31, hair, lat_segs=5, lon_segs=12))
        hair_dome.setPos(0, 0, 1.78)

        # Hair spike
        spike = body_root.attachNewNode(make_cylinder(0.09, 0.26, hair, segs=6))
        spike.setPos(0, -0.06, 2.05)
        spike.setP(15)

        # Eyes (simple dark spheres)
        for ex in (-0.11, 0.11):
            eye = body_root.attachNewNode(make_sphere(0.075, (0.1, 0.1, 0.25, 1), lat_segs=5, lon_segs=8))
            eye.setPos(ex, 0.29, 1.65)
            shine = body_root.attachNewNode(make_sphere(0.025, (1, 1, 1, 1), lat_segs=4, lon_segs=6))
            shine.setPos(ex + 0.02, 0.36, 1.67)

        # Store body_root for animation
        root.setPythonTag("body_root", body_root)
        return root

    def _build_ball(self):
        self.ball = Ball()
        node = self.scene_root.attachNewNode(make_sphere(BALL_R, (0.95, 0.95, 0.95, 1)))
        node.setPos(0, 0, BALL_R)
        # Dark patches
        for i in range(5):
            a = 2*math.pi * i / 5
            patch = self.scene_root.attachNewNode(
                make_sphere(BALL_R * 0.38, (0.12, 0.12, 0.14, 1), lat_segs=4, lon_segs=6))
            patch.setPos(math.cos(a)*BALL_R*0.78, math.sin(a)*BALL_R*0.78, BALL_R * 0.55)
        self.ball.node = node

    # ══════════════════════════════════════════════════════════════════════════
    # HUD
    # ══════════════════════════════════════════════════════════════════════════

    def _build_hud(self):
        cfg = MATCH_CONFIGS[self.match_type]

        # Score / timer bar (top centre)
        top = DirectFrame(frameColor=(0.04, 0.05, 0.06, 0.88),
                          frameSize=(-0.60, 0.60, -0.085, 0.085),
                          pos=(0, 0, 0.92), relief=DGG.FLAT)
        self._gui_nodes.append(top)

        self._score_text = [
            OnscreenText("0", pos=(-0.28, -0.035), scale=0.10, fg=(0.91,0.26,0.58,1),
                         align=TextNode.ACenter, parent=top, mayChange=True),
            OnscreenText("0", pos=( 0.28, -0.035), scale=0.10, fg=(0.20,0.60,0.90,1),
                         align=TextNode.ACenter, parent=top, mayChange=True),
        ]
        self._gui_nodes.extend(self._score_text)

        OnscreenText("VS", pos=(0, -0.028), scale=0.055, fg=UI_SOFT,
                     align=TextNode.ACenter, parent=top)
        self._time_text = OnscreenText(
            self._fmt_time(self.time_left), pos=(0.48, -0.03),
            scale=0.072, fg=UI_ACC, align=TextNode.ACenter, parent=top, mayChange=True)
        self._gui_nodes.append(self._time_text)

        OnscreenText(cfg["name"], pos=(-0.48, -0.03), scale=0.045, fg=UI_SOFT,
                     align=TextNode.ACenter, parent=top)

        # Stamina bar (bottom left)
        self._stamina_bar = DirectWaitBar(
            range=100, value=100,
            barColor=(0.24, 0.88, 0.58, 1),
            frameColor=(0.08, 0.09, 0.12, 0.9),
            pos=(-1.0, 0, -0.86),
            frameSize=(-0.38, 0.38, -0.022, 0.022),
            relief=DGG.FLAT,
        )
        self._gui_nodes.append(self._stamina_bar)
        OnscreenText("STAMINA", pos=(-1.0, -0.90), scale=0.042, fg=UI_SOFT,
                     align=TextNode.ACenter, mayChange=False)

        # Ability bar (bottom centre)
        self._ability_frames: List[DirectFrame] = []
        self._ability_cd_texts: List[OnscreenText] = []
        ability_ids = list(ABILITY_DEFS.keys())
        for i, aid in enumerate(ability_ids):
            d = ABILITY_DEFS[aid]
            x = -0.42 + i * 0.21
            y = -0.86
            fr = DirectFrame(
                frameColor=(*d["color"][:3], 0.25),
                frameSize=(-0.09, 0.09, -0.09, 0.09),
                pos=(x, 0, y), relief=DGG.FLAT,
            )
            self._gui_nodes.append(fr)
            self._ability_frames.append(fr)

            OnscreenText(d["sym"], pos=(x, y - 0.005), scale=0.048,
                         fg=d["color"], align=TextNode.ACenter, mayChange=False)
            cd_t = OnscreenText("", pos=(x, y - 0.062), scale=0.042,
                                fg=UI_SOFT, align=TextNode.ACenter, mayChange=True)
            self._gui_nodes.append(cd_t)
            self._ability_cd_texts.append(cd_t)

        # Status text (centre, shown briefly)
        self._status_text = OnscreenText("", pos=(0, 0), scale=0.13,
                                         fg=UI_ACC, align=TextNode.ACenter,
                                         shadow=(0, 0, 0, 0.8), mayChange=True)
        self._gui_nodes.append(self._status_text)
        self._status_timer = 0.0

        # Pause / exit button
        self._btn("Exit", self._show_menu, (-1.45, 0, 0.92), color=UI_CARD, w=0.16)

    def _update_hud(self, dt: float):
        p0 = self.players[0] if self.players else None
        cfg = MATCH_CONFIGS[self.match_type]

        # Timer
        if cfg["duration"]:
            self._time_text.setText(self._fmt_time(max(0, self.time_left)))
        else:
            self._time_text.setText("∞")

        # Scores
        if cfg["win"] == "goals":
            self._score_text[0].setText(str(self.score[0]))
            self._score_text[1].setText(str(self.score[1]))
        elif cfg["win"] == "tackles":
            self._score_text[0].setText(str(p0.tackles if p0 else 0))
            self._score_text[1].setText("?")
        elif cfg["win"] == "lives":
            self._score_text[0].setText(str(p0.lives if p0 else 3))
            self._score_text[1].setText("?")
        elif cfg["win"] == "zone":
            self._score_text[0].setText(str(int(self.zone_score[0])))
            self._score_text[1].setText(str(int(self.zone_score[1])))

        # Stamina
        if p0:
            self._stamina_bar["value"] = p0.stamina
            if p0.stamina > 50:
                self._stamina_bar["barColor"] = (0.24, 0.88, 0.58, 1)
            elif p0.stamina > 20:
                self._stamina_bar["barColor"] = (0.96, 0.78, 0.26, 1)
            else:
                self._stamina_bar["barColor"] = (0.95, 0.36, 0.48, 1)

        # Ability cooldowns
        if p0:
            ability_ids = list(ABILITY_DEFS.keys())
            for i, aid in enumerate(ability_ids):
                cd = p0.ability_cds.get(aid, 0.0)
                d  = ABILITY_DEFS[aid]
                ready = (cd <= 0.0)
                self._ability_frames[i]["frameColor"] = (
                    *d["color"][:3], 0.55 if ready else 0.18)
                self._ability_cd_texts[i].setText("RDY" if ready else f"{cd:.0f}s")

        # Status flash
        if self._status_timer > 0:
            self._status_timer -= dt
            if self._status_timer <= 0:
                self._status_text.setText("")

    def _flash_status(self, msg: str, duration: float = 1.8):
        self._status_text.setText(msg)
        self._status_timer = duration

    @staticmethod
    def _fmt_time(s: float) -> str:
        m = int(s) // 60
        sec = int(s) % 60
        return f"{m}:{sec:02d}"

    # ══════════════════════════════════════════════════════════════════════════
    # GAME LOOP
    # ══════════════════════════════════════════════════════════════════════════

    def _game_loop(self, task):
        if self.phase != "playing":
            return task.cont

        dt = min(globalClock.getDt(), 0.05)
        cfg = MATCH_CONFIGS[self.match_type]

        # ── Timer ──────────────────────────────────────────────────────────────
        if cfg["duration"] and not self.game_over:
            self.time_left -= dt
            if self.time_left <= 0:
                self.time_left = 0.0
                self._end_match()
                return task.cont

        # ── Players ────────────────────────────────────────────────────────────
        for p in self.players:
            if p.dead:
                p.respawn_timer -= dt
                if p.respawn_timer <= 0:
                    self._respawn(p)
                continue

            # Cooldowns
            p.slide_cd = max(0.0, p.slide_cd - dt)
            for k in p.ability_cds:
                if cfg["no_cd"]:
                    p.ability_cds[k] = 0.0
                else:
                    p.ability_cds[k] = max(0.0, p.ability_cds[k] - dt)

            # DoT (burn)
            if p.burn_timer > 0:
                p.burn_timer -= dt
                p.stamina = max(0, p.stamina - 12 * dt)

            # Thunder
            if p.thunder_active:
                p.thunder_timer -= dt
                if p.thunder_timer <= 0:
                    p.thunder_active = False

            # Update state timers
            if p.state in ("stunned", "sliding", "ability"):
                p.state_timer -= dt
                if p.state_timer <= 0:
                    if p.state == "ability":
                        self._finish_ability(p)
                    elif p.state == "sliding":
                        p.slide_cd = SLIDE_CD
                    p.state = "idle"
                    p.vx = p.vy = 0.0

            # Input / AI
            if not p.is_ai:
                self._handle_input(p, dt, cfg)
            else:
                self._update_ai(p, dt)

            # Stamina regen
            if p.state not in ("running",):
                p.stamina = min(100.0, p.stamina + STAMINA_REGEN * dt)

            # Move
            p.x += p.vx * dt
            p.y += p.vy * dt
            p.x = max(-PW/2 + 0.5, min(PW/2 - 0.5, p.x))
            p.y = max(-PL/2 + 0.5, min(PL/2 - 0.5, p.y))

            # Sync node
            if p.node:
                p.node.setPos(p.x, p.y, 0)
                p.node.setH(p.heading)
                body = p.node.getPythonTag("body_root")
                if body:
                    if p.state == "sliding":
                        prog = max(0, 1 - p.state_timer / SLIDE_DUR)
                        tilt = math.sin(prog * math.pi) * 38
                        body.setP(tilt)
                        body.setZ(-math.sin(prog * math.pi) * 0.18)
                    elif p.state == "stunned":
                        body.setP(35)
                        body.setZ(-0.25)
                    else:
                        cur_p = body.getP()
                        cur_z = body.getZ()
                        body.setP(cur_p + (0 - cur_p) * min(1, dt * 10))
                        body.setZ(cur_z + (0 - cur_z) * min(1, dt * 10))

        # ── Tackle collisions ──────────────────────────────────────────────────
        self._check_tackles(cfg)

        # ── Ball ───────────────────────────────────────────────────────────────
        self._update_ball(dt)

        # ── Effects ────────────────────────────────────────────────────────────
        dead_fx = []
        for fx in self.effects:
            fx.timer += dt
            prog = fx.timer / fx.max_time
            if fx.node:
                scale = (1 + prog * 4) if fx.type == "shockwave" else (1 - prog * 0.5 + 0.01)
                fx.node.setScale(scale, scale, scale * (2 if fx.type in ("tornado","sakura") else 1))
                a = max(0, (1 - prog) * 0.8)
                c = fx.node.getColor()
                fx.node.setColor(c.getX(), c.getY(), c.getZ(), a)
            if fx.timer >= fx.max_time:
                dead_fx.append(fx)

        for fx in dead_fx:
            if fx.node:
                fx.node.removeNode()
            self.effects.remove(fx)

        # ── King zone ──────────────────────────────────────────────────────────
        if self.match_type == "king" and not self.game_over:
            in_zone = [False, False]
            for p in self.players:
                if not p.dead and self._dist(p.x, p.y, 0, 0) < 6:
                    in_zone[p.team] = True
            for t in range(2):
                if in_zone[t] and not in_zone[1 - t]:
                    self.zone_score[t] += dt
                    if self.zone_score[t] >= 60 and not self.game_over:
                        self._end_match()

        # ── Camera smooth follow ───────────────────────────────────────────────
        if self.players:
            p0 = self.players[0]
            tx = p0.x * 0.25
            ty = p0.y * 0.15 - PL * 0.42
            cx, cy, cz = self.camera.getPos()
            self.camera.setPos(
                cx + (tx - cx) * dt * 3,
                cy + (ty - cy) * dt * 3,
                cz,
            )

        # ── HUD ────────────────────────────────────────────────────────────────
        self._update_hud(dt)
        self.goal_cd = max(0.0, self.goal_cd - dt)

        return task.cont

    # ══════════════════════════════════════════════════════════════════════════
    # INPUT
    # ══════════════════════════════════════════════════════════════════════════

    def _handle_input(self, p: Player, dt: float, cfg: dict):
        if p.state == "stunned":
            return

        mx = my = 0
        if self._pressed("w", "arrow_up"):    my =  1
        if self._pressed("s", "arrow_down"):  my = -1
        if self._pressed("a", "arrow_left"):  mx = -1
        if self._pressed("d", "arrow_right"): mx =  1

        spd = PLAYER_SPEED * (2.4 if p.thunder_active else 1.0)

        if p.state in ("idle", "running"):
            if mx != 0 or my != 0:
                length = math.sqrt(mx*mx + my*my)
                p.vx = (mx / length) * spd
                p.vy = (my / length) * spd
                p.heading = -math.degrees(math.atan2(mx / length, my / length))
                p.state = "running"
                p.stamina = max(0, p.stamina - STAMINA_DRAIN * dt)
            else:
                p.vx *= max(0, 1 - dt * 12)
                p.vy *= max(0, 1 - dt * 12)
                p.state = "idle"

            if self._pressed("space") and p.slide_cd <= 0 and p.stamina > 20:
                self._start_slide(p)
                p.stamina -= 22

            for key, aid in [("1","dragonSlide"),("2","tornadoSpin"),("3","shadowStep"),
                              ("4","thunderCharge"),("5","sakuraBurst")]:
                if self._pressed(key) and p.ability_cds.get(aid, 0) <= 0:
                    self._trigger_ability(p, aid)
                    break

        if p.state == "sliding":
            fx = -math.sin(math.radians(p.heading))
            fy =  math.cos(math.radians(p.heading))
            p.vx = fx * SLIDE_SPEED
            p.vy = fy * SLIDE_SPEED

    # ══════════════════════════════════════════════════════════════════════════
    # SLIDE & ABILITIES
    # ══════════════════════════════════════════════════════════════════════════

    def _start_slide(self, p: Player):
        p.state = "sliding"
        p.state_timer = SLIDE_DUR
        fx = -math.sin(math.radians(p.heading))
        fy =  math.cos(math.radians(p.heading))
        p.vx = fx * SLIDE_SPEED
        p.vy = fy * SLIDE_SPEED

    def _trigger_ability(self, p: Player, aid: str):
        d = ABILITY_DEFS[aid]
        p.ability_id = aid
        p.ability_cds[aid] = d["cd"]

        if aid == "dragonSlide":
            self._start_slide(p)
            p.state_timer = d["dur"]
            p.state = "ability"
            self._spawn_effect("fire", p.x, p.y, 0.8, d["color"])

        elif aid == "tornadoSpin":
            p.state = "ability"
            p.state_timer = d["dur"]
            p.vx = p.vy = 0
            self._spawn_effect("tornado", p.x, p.y, d["dur"], d["color"])

        elif aid == "shadowStep":
            target = self._nearest_opponent(p)
            if target:
                self._spawn_effect("shadow", p.x, p.y, 0.4, d["color"])
                bx = -math.sin(math.radians(target.heading))
                by =  math.cos(math.radians(target.heading))
                p.x = target.x + bx * -2
                p.y = target.y + by * -2
                p.heading = math.degrees(math.atan2(-(target.x - p.x), (target.y - p.y)))
                self._spawn_effect("shadow", p.x, p.y, 0.4, d["color"])
                self._start_slide(p)
                p.state = "ability"
                p.state_timer = d["dur"]
            else:
                p.ability_cds[aid] = 0  # refund

        elif aid == "thunderCharge":
            p.thunder_active = True
            p.thunder_timer  = d["dur"]
            self._spawn_effect("electric", p.x, p.y, 0.7, d["color"])

        elif aid == "sakuraBurst":
            p.state = "ability"
            p.state_timer = d["dur"]
            p.vx = p.vy = 0
            self._spawn_effect("sakura", p.x, p.y, d["dur"], d["color"])

    def _finish_ability(self, p: Player):
        if p.ability_id == "sakuraBurst":
            for opp in self.players:
                if opp.team == p.team or opp.dead: continue
                if self._dist(p.x, p.y, opp.x, opp.y) < 6.5:
                    self._knockback(opp, p.x, p.y, KNOCKBACK * 1.6)
                    opp.state = "stunned"
                    opp.state_timer = 2.2
                    self._spawn_effect("shockwave", opp.x, opp.y, 0.5, (1,1,1,1))
            self._spawn_effect("shockwave", p.x, p.y, 0.8, (1, 0.42, 0.71, 1))
        p.ability_id = None
        p.state = "idle"
        p.vx = p.vy = 0.0

    # ══════════════════════════════════════════════════════════════════════════
    # TACKLE COLLISIONS
    # ══════════════════════════════════════════════════════════════════════════

    def _check_tackles(self, cfg: dict):
        for att in self.players:
            if att.dead: continue
            tackling = (att.state == "sliding" or
                        (att.state == "ability" and att.ability_id in ("dragonSlide","shadowStep")))
            tornado  = (att.state == "ability" and att.ability_id == "tornadoSpin")
            if not tackling and not tornado and not att.thunder_active:
                continue

            rng = 3.5 if tornado else (2.2 if att.ability_id == "dragonSlide" else SLIDE_RANGE)

            for tgt in self.players:
                if tgt.team == att.team or tgt.dead or tgt.state == "stunned":
                    continue
                if self._dist(att.x, att.y, tgt.x, tgt.y) > rng:
                    continue

                # Hit!
                mult = (2.5 if att.ability_id == "thunderCharge" else
                        1.6 if att.ability_id == "dragonSlide"   else
                        1.8 if tornado else 1.0)
                self._knockback(tgt, att.x, att.y, KNOCKBACK * mult)
                tgt.state       = "stunned"
                tgt.state_timer = STUN_DUR + (mult - 1) * 0.4

                if att.ability_id == "dragonSlide":
                    tgt.burn_timer = 2.0
                if att.thunder_active:
                    self._spawn_effect("electric", tgt.x, tgt.y, 0.7, (0.96,0.78,0.26,1))

                att.tackles += 1
                self._spawn_effect("shockwave", tgt.x, tgt.y, 0.5, (1,1,1,1))

                if self.match_type == "survival":
                    tgt.lives -= 1
                    if tgt.lives <= 0:
                        tgt.dead = True
                        tgt.respawn_timer = 4.0
                        if tgt.node:
                            tgt.node.hide()
                        self._check_survival_win()

    def _knockback(self, tgt: Player, sx: float, sy: float, force: float):
        dx = tgt.x - sx
        dy = tgt.y - sy
        ln = math.sqrt(dx*dx + dy*dy) or 1
        tgt.vx = (dx / ln) * force
        tgt.vy = (dy / ln) * force

    # ══════════════════════════════════════════════════════════════════════════
    # BALL
    # ══════════════════════════════════════════════════════════════════════════

    def _update_ball(self, dt: float):
        b = self.ball
        b.vx *= math.pow(BALL_FRICTION, dt * 60)
        b.vy *= math.pow(BALL_FRICTION, dt * 60)
        b.x  += b.vx * dt
        b.y  += b.vy * dt

        hw, hl = PW/2 - 0.5, PL/2 - 0.5

        # Side walls
        if b.x < -hw: b.x = -hw; b.vx *= -0.7
        if b.x >  hw: b.x =  hw; b.vx *= -0.7

        # End walls (goal check)
        if b.y < -hl:
            if abs(b.x) < GOAL_W/2 and self.goal_cd <= 0:
                self._score_goal(1)  # team 1 scores
            else:
                b.y = -hl; b.vy *= -0.7
        if b.y > hl:
            if abs(b.x) < GOAL_W/2 and self.goal_cd <= 0:
                self._score_goal(0)  # team 0 scores
            else:
                b.y = hl; b.vy *= -0.7

        # Player kicks
        for p in self.players:
            if p.dead: continue
            if self._dist(p.x, p.y, b.x, b.y) < PLAYER_R + BALL_R + 0.2:
                if p.state in ("sliding", "running"):
                    fx = -math.sin(math.radians(p.heading))
                    fy =  math.cos(math.radians(p.heading))
                    mult = 1.9 if p.state == "sliding" else 0.8
                    b.vx = fx * BALL_KICK * mult
                    b.vy = fy * BALL_KICK * mult

        if b.node:
            b.node.setPos(b.x, b.y, BALL_R)
            spd = math.sqrt(b.vx*b.vx + b.vy*b.vy)
            b.node.setH(b.node.getH() + spd * dt * 40)

    # ══════════════════════════════════════════════════════════════════════════
    # GOALS / WIN CONDITIONS
    # ══════════════════════════════════════════════════════════════════════════

    def _score_goal(self, scoring_team: int):
        cfg = MATCH_CONFIGS[self.match_type]
        if cfg["win"] != "goals" or self.game_over:
            return
        self.score[scoring_team] += 1
        self.goal_cd = 2.5
        self._spawn_effect("shockwave", self.ball.x, self.ball.y, 1.0, (0.96,0.78,0.26,1))
        msg = "GOAL!  YOU SCORED!" if scoring_team == 0 else "GOAL!  CPU SCORED"
        self._flash_status(msg, 2.2)
        self.ball.x = self.ball.y = 0
        self.ball.vx = self.ball.vy = 0
        self._reset_player_positions()
        if self.score[scoring_team] >= 10:
            self._end_match()

    def _reset_player_positions(self):
        starts = [(-8,-20),(-4,-15),(0,-18),(4,-15),(8,-20),
                  (-8, 20),(-4, 15),(0, 18),(4, 15),(8, 20)]
        for p, (px, py) in zip(self.players, starts):
            p.x, p.y = float(px), float(py)
            p.vx = p.vy = 0.0
            p.state = "idle"

    def _check_survival_win(self):
        alive0 = sum(1 for p in self.players if p.team == 0 and not p.dead)
        alive1 = sum(1 for p in self.players if p.team == 1 and not p.dead)
        if alive0 == 0 or alive1 == 0:
            self._end_match()

    def _respawn(self, p: Player):
        p.dead = False
        p.state = "idle"
        p.vx = p.vy = 0.0
        p.x = random.uniform(-PW*0.3, PW*0.3)
        p.y = (-1 if p.team == 0 else 1) * random.uniform(10, 18)
        if p.node:
            p.node.show()
            p.node.setPos(p.x, p.y, 0)
        self._spawn_effect("shockwave", p.x, p.y, 0.6, (0.24, 0.88, 0.58, 1))

    # ══════════════════════════════════════════════════════════════════════════
    # AI
    # ══════════════════════════════════════════════════════════════════════════

    def _update_ai(self, p: Player, dt: float):
        if p.state in ("stunned", "sliding"):
            return

        p.ai_timer -= dt
        if p.ai_timer > 0:
            if p.state == "running":
                p.x += p.vx * dt  # position already updated in main loop
            return
        p.ai_timer = AI_TICK + random.random() * 0.08

        b = self.ball
        goal_y = -PL/2 if p.team == 0 else PL/2
        nearest_opp = self._nearest_opponent(p)
        dist_ball  = self._dist(p.x, p.y, b.x, b.y)

        # Dodge incoming slide
        threat = next((a for a in self.players
                       if a.team != p.team and a.state == "sliding"
                       and self._dist(a.x, a.y, p.x, p.y) < 5), None)
        if threat:
            dx = p.x - threat.x
            dy = p.y - threat.y
            perp_x, perp_y = -dy, dx
            ln = math.sqrt(perp_x*perp_x + perp_y*perp_y) or 1
            s = random.choice([-1, 1])
            p.vx = (perp_x / ln) * s * PLAYER_SPEED
            p.vy = (perp_y / ln) * s * PLAYER_SPEED
            p.heading = -math.degrees(math.atan2(p.vx, p.vy))
            p.state = "running"
            p.ai_timer = 0.4
            return

        # Target selection
        target_x, target_y = b.x, b.y
        if dist_ball < 4:
            target_x = 0
            target_y = goal_y

        # Try tackle
        if (nearest_opp and
                self._dist(p.x, p.y, nearest_opp.x, nearest_opp.y) < 3.5
                and p.slide_cd <= 0 and p.stamina > 30):
            p.heading = -math.degrees(math.atan2(
                nearest_opp.x - p.x, nearest_opp.y - p.y))
            self._start_slide(p)
            p.ai_timer = SLIDE_DUR + 0.15
            return

        # Random ability
        if (random.random() < 0.12 and nearest_opp and
                self._dist(p.x, p.y, nearest_opp.x, nearest_opp.y) < 7):
            ready = [aid for aid, cd in p.ability_cds.items() if cd <= 0]
            if ready:
                self._trigger_ability(p, random.choice(ready))
                return

        # Move toward target
        dx = target_x - p.x
        dy = target_y - p.y
        ln = math.sqrt(dx*dx + dy*dy)
        if ln > 0.8:
            spd = PLAYER_SPEED * 0.82
            p.vx = (dx / ln) * spd
            p.vy = (dy / ln) * spd
            p.heading = -math.degrees(math.atan2(dx / ln, dy / ln))
            p.state = "running"
            p.stamina -= STAMINA_DRAIN * AI_TICK
        else:
            p.vx = p.vy = 0
            p.state = "idle"

    # ══════════════════════════════════════════════════════════════════════════
    # EFFECTS
    # ══════════════════════════════════════════════════════════════════════════

    def _spawn_effect(self, etype: str, x: float, y: float,
                      max_time: float, color):
        fx = Effect(type=etype, pos=(x, y), max_time=max_time)
        color_map = {
            "fire":     (1.00, 0.27, 0.00),
            "tornado":  (0.00, 0.75, 1.00),
            "shadow":   (0.61, 0.50, 0.96),
            "electric": (0.96, 0.78, 0.26),
            "sakura":   (1.00, 0.41, 0.71),
            "shockwave":(1.00, 1.00, 1.00),
        }
        c = color_map.get(etype, (1, 1, 1))

        if etype == "tornado":
            geom = make_cylinder(0.8, 2.0, (*c, 0.7), segs=10)
        elif etype == "shockwave":
            geom = make_cylinder(0.5, 0.12, (*c, 0.7), segs=16)
        else:
            geom = make_sphere(0.55, (*c, 0.7), lat_segs=5, lon_segs=8)

        node = self.scene_root.attachNewNode(geom)
        node.setPos(x, y, 0.5)
        node.setColor(*c, 0.7)
        node.setTransparency(TransparencyAttrib.MAlpha)
        fx.node = node
        self.effects.append(fx)

    # ══════════════════════════════════════════════════════════════════════════
    # END OF MATCH
    # ══════════════════════════════════════════════════════════════════════════

    def _end_match(self):
        if self.game_over:
            return
        self.game_over = True
        self.phase = "ended"
        self.taskMgr.doMethodLater(1.5, lambda t: self._show_results(), "show_results")

    def _show_results(self):
        cfg = MATCH_CONFIGS[self.match_type]
        p0  = self.players[0] if self.players else None

        p0_score = (
            self.score[0]          if cfg["win"] == "goals"   else
            (p0.tackles if p0 else 0) if cfg["win"] == "tackles" else
            (p0.lives   if p0 else 0) if cfg["win"] == "lives"   else
            int(self.zone_score[0])   if cfg["win"] == "zone"    else 0
        )
        p1_score = (
            self.score[1]                                      if cfg["win"] == "goals"   else
            sum(p.tackles for p in self.players if p.team == 1) if cfg["win"] == "tackles" else
            sum(1 for p in self.players if p.team == 1 and not p.dead) if cfg["win"] == "lives" else
            int(self.zone_score[1])                            if cfg["win"] == "zone"    else 0
        )

        if p0_score > p1_score:   winner = "YOU WIN!"
        elif p1_score > p0_score: winner = "CPU WINS"
        else:                     winner = "DRAW!"

        self._clear_gui()
        bg = self._frame(frameColor=UI_BG, frameSize=(-1.8, 1.8, -1.1, 1.1))

        win_color = (0.24,0.88,0.58,1) if "WIN" in winner else (UI_ROSE if "CPU" in winner else UI_SOFT)
        self._label(winner, (0, 0.68), 0.18, win_color, bg)
        self._label(cfg["name"], (0, 0.50), 0.07, UI_SOFT, bg)

        score_label = "Goals" if cfg["win"]=="goals" else "Tackles" if cfg["win"]=="tackles" else "Points"
        rows = [
            (f"Your {score_label}", str(p0_score)),
            (f"CPU {score_label}",  str(p1_score)),
            ("Your Tackles",        str(p0.tackles if p0 else 0)),
        ]
        for i, (lbl, val) in enumerate(rows):
            y = 0.26 - i * 0.18
            self._label(f"{lbl}:", (-0.30, y), 0.065, UI_SOFT, bg)
            self._label(val,       ( 0.30, y), 0.065, UI_ACC,  bg)

        self._btn("Play Again", self._start_game,  (0, 0, -0.35), color=UI_ROSE, w=0.30, parent=bg)
        self._btn("Main Menu",  self._show_menu,   (0, 0, -0.52), color=UI_CARD, w=0.30, parent=bg)

    # ══════════════════════════════════════════════════════════════════════════
    # UTILITIES
    # ══════════════════════════════════════════════════════════════════════════

    @staticmethod
    def _dist(ax, ay, bx, by) -> float:
        dx, dy = ax - bx, ay - by
        return math.sqrt(dx*dx + dy*dy)

    def _nearest_opponent(self, p: Player) -> Optional[Player]:
        best, best_d = None, float("inf")
        for opp in self.players:
            if opp.team == p.team or opp.dead:
                continue
            d = self._dist(p.x, p.y, opp.x, opp.y)
            if d < best_d:
                best_d, best = d, opp
        return best


# ══════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    game = SlideKings()
    game.run()
