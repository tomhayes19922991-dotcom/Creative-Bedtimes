"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import * as THREE from "three";

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════
const PW = 38;        // pitch width (X)
const PL = 56;        // pitch length (Z)
const GOAL_W = 8;
const GOAL_H = 3;
const GOAL_DEPTH = 2.5;
const PLAYER_SPEED = 8;
const SLIDE_SPEED = 17;
const SLIDE_DURATION = 0.52;
const SLIDE_COOLDOWN = 1.9;
const SLIDE_RANGE = 1.6;      // tackle hitbox radius
const STUN_DURATION = 1.6;
const KNOCKBACK_DIST = 5;
const STAMINA_DRAIN = 9;
const STAMINA_REGEN = 20;
const BALL_FRICTION = 0.94;
const BALL_KICK_FORCE = 14;
const BALL_RADIUS = 0.22;
const PLAYER_RADIUS = 0.45;
const AI_TICK = 0.2;          // seconds between AI decisions

const ABILITY_DEFS = {
  dragonSlide:   { name: "Dragon Slide",   icon: "🐉", color: "#ff4500", cooldown: 8,  duration: 0.7, key: "1" },
  tornadoSpin:   { name: "Tornado Spin",   icon: "🌪️", color: "#00bfff", cooldown: 10, duration: 1.3, key: "2" },
  shadowStep:    { name: "Shadow Step",    icon: "👤", color: "#9b7ff4", cooldown: 12, duration: 0.6, key: "3" },
  thunderCharge: { name: "Thunder Charge", icon: "⚡", color: "#f5c842", cooldown: 9,  duration: 2.5, key: "4" },
  sakuraBurst:   { name: "Sakura Burst",   icon: "🌸", color: "#ff69b4", cooldown: 15, duration: 2.0, key: "5" },
};

const MATCH_CONFIGS = {
  classic:      { duration: 300, name: "Classic",          win: "goals",   noCooldown: false },
  tackle_rush:  { duration: 180, name: "Tackle Rush",      win: "tackles", noCooldown: false },
  survival:     { duration: null,name: "Survival",         win: "lives",   noCooldown: false, lives: 3 },
  king:         { duration: 300, name: "King of the Pitch",win: "zone",    noCooldown: false, target: 60 },
  chaos:        { duration: 300, name: "Chaos Mode",       win: "goals",   noCooldown: true  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
function clampPitch(v) {
  v.x = THREE.MathUtils.clamp(v.x, -PW / 2 + 0.5, PW / 2 - 0.5);
  v.z = THREE.MathUtils.clamp(v.z, -PL / 2 + 0.5, PL / 2 - 0.5);
}

function dist2D(a, b) {
  const dx = a.x - b.x, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function createPlayer(id, team, x, z, isAI, custom) {
  return {
    id, team, isAI,
    pos: new THREE.Vector3(x, 0, z),
    vel: new THREE.Vector3(),
    facing: team === 0 ? 0 : Math.PI,
    state: "idle",           // idle | running | sliding | stunned | ability
    abilityId: null,
    stateTimer: 0,
    stamina: 100,
    slideCooldown: 0,
    abilityCooldowns: { dragonSlide: 0, tornadoSpin: 0, shadowStep: 0, thunderCharge: 0, sakuraBurst: 0 },
    tackles: 0,
    lives: 3,
    dead: false,
    respawnTimer: 0,
    burnTimer: 0,
    thunderActive: false,
    custom: custom || { hairColor: "#333", kitColor: team === 0 ? "#e84393" : "#3498db", bootColor: "#111", name: isAI ? `CPU ${id}` : "Player" },
    groupRef: null,
    bodyRef: null,
    aiTimer: 0,
    // King-of-pitch zone contribution
    zoneContrib: 0,
  };
}

function createBall() {
  return { pos: new THREE.Vector3(0, 0, 0), vel: new THREE.Vector3(), meshRef: null };
}

let _effectId = 0;
function createEffect(type, pos, options = {}) {
  return { id: _effectId++, type, pos: pos.clone(), timer: 0, maxTime: options.maxTime || 1.2, options, meshRef: null };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOON GRADIENT (3-tone cel-shading)
// ═══════════════════════════════════════════════════════════════════════════════
function useToonGradient() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 4; canvas.height = 1;
    const ctx = canvas.getContext("2d");
    // Dark → mid → bright hard steps for cel look
    ctx.fillStyle = "#444"; ctx.fillRect(0, 0, 1, 1);
    ctx.fillStyle = "#888"; ctx.fillRect(1, 0, 1, 1);
    ctx.fillStyle = "#ccc"; ctx.fillRect(2, 0, 1, 1);
    ctx.fillStyle = "#fff"; ctx.fillRect(3, 0, 1, 1);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    return tex;
  }, []);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PITCH & GOALS
// ═══════════════════════════════════════════════════════════════════════════════
function GoalPost({ position, flipZ }) {
  const sign = flipZ ? -1 : 1;
  return (
    <group position={position}>
      <mesh position={[-GOAL_W / 2, GOAL_H / 2, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, GOAL_H, 8]} />
        <meshLambertMaterial color="#e0e0e0" />
      </mesh>
      <mesh position={[GOAL_W / 2, GOAL_H / 2, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, GOAL_H, 8]} />
        <meshLambertMaterial color="#e0e0e0" />
      </mesh>
      <mesh position={[0, GOAL_H, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, GOAL_W, 8]} />
        <meshLambertMaterial color="#e0e0e0" />
      </mesh>
      <mesh position={[0, GOAL_H / 2, sign * GOAL_DEPTH / 2]}>
        <boxGeometry args={[GOAL_W, GOAL_H, GOAL_DEPTH]} />
        <meshLambertMaterial color="#ffffff" transparent opacity={0.1} wireframe />
      </mesh>
    </group>
  );
}

function Pitch({ matchType }) {
  const circlePoints = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * 6, 0.02, Math.sin(a) * 6));
    }
    return pts;
  }, []);

  const circleCurve = useMemo(() => new THREE.CatmullRomCurve3(circlePoints, true), [circlePoints]);
  const circleGeo = useMemo(() => new THREE.TubeGeometry(circleCurve, 64, 0.06, 4, true), [circleCurve]);

  const isKing = matchType === "king";

  return (
    <group>
      {/* Grass base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[PW + 6, PL + 6]} />
        <meshLambertMaterial color="#1a5c2e" />
      </mesh>
      {/* Striped grass */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -PL / 2 + i * (PL / 7)]}>
          <planeGeometry args={[PW, PL / 7]} />
          <meshLambertMaterial color={i % 2 === 0 ? "#1e6835" : "#1a5c2e"} />
        </mesh>
      ))}
      {/* Boundary */}
      {[
        [[-PW/2,0.02,-PL/2],[PW/2,0.02,-PL/2]],
        [[PW/2,0.02,-PL/2],[PW/2,0.02,PL/2]],
        [[PW/2,0.02,PL/2],[-PW/2,0.02,PL/2]],
        [[-PW/2,0.02,PL/2],[-PW/2,0.02,-PL/2]],
        [[-PW/2,0.02,0],[PW/2,0.02,0]],
      ].map((pts, i) => (
        <LineStrip key={i} points={pts} />
      ))}
      {/* Centre circle */}
      <mesh geometry={circleGeo}><meshLambertMaterial color="#ffffff" /></mesh>
      {/* Centre spot */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.25, 16]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>
      {/* Goal areas */}
      {[-1, 1].map(side => (
        <group key={side}>
          <LineStrip points={[
            [-GOAL_W/2-3, 0.02, side*PL/2], [-GOAL_W/2-3, 0.02, side*(PL/2-7)],
            [GOAL_W/2+3,  0.02, side*(PL/2-7)], [GOAL_W/2+3,  0.02, side*PL/2],
          ]} />
        </group>
      ))}
      {/* Goals */}
      <GoalPost position={[0, 0, -PL / 2 - 0.12]} flipZ={false} />
      <GoalPost position={[0, 0, PL / 2 + 0.12]} flipZ={true} />
      {/* King zone highlight */}
      {isKing && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <circleGeometry args={[6.2, 64]} />
          <meshLambertMaterial color="#f5c842" transparent opacity={0.18} />
        </mesh>
      )}
    </group>
  );
}

function LineStrip({ points }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const verts = new Float32Array(points.flat());
    g.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    return g;
  }, []);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#ffffff" linewidth={2} />
    </lineSegments>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLAYER MODEL
// ═══════════════════════════════════════════════════════════════════════════════
function PlayerModel({ playerIndex, gsRef, gradient }) {
  const groupRef = useRef();
  const slideRef = useRef();  // inner group that tilts during slide

  useEffect(() => {
    const p = gsRef.current.players[playerIndex];
    if (p) p.groupRef = groupRef;
  }, [playerIndex]);

  const p = gsRef.current.players[playerIndex];
  if (!p) return null;
  const { hairColor, kitColor, bootColor } = p.custom;
  const teamColor = p.team === 0 ? "#e84393" : "#3498db";
  const skin = "#f4c2a1";

  return (
    <group ref={groupRef} position={[p.pos.x, 0, p.pos.z]}>
      {/* Ground shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.45, 16]} />
        <meshBasicMaterial color="#000" transparent opacity={0.3} depthWrite={false} />
      </mesh>
      {/* Slide pivot group */}
      <group ref={slideRef}>
        {/* Boots */}
        <mesh position={[-0.13, 0.09, 0.07]}>
          <boxGeometry args={[0.16, 0.11, 0.26]} />
          <meshToonMaterial color={bootColor} gradientMap={gradient} />
        </mesh>
        <mesh position={[0.13, 0.09, 0.07]}>
          <boxGeometry args={[0.16, 0.11, 0.26]} />
          <meshToonMaterial color={bootColor} gradientMap={gradient} />
        </mesh>
        {/* Legs */}
        <mesh position={[-0.14, 0.4, 0]}>
          <boxGeometry args={[0.16, 0.46, 0.16]} />
          <meshToonMaterial color={kitColor} gradientMap={gradient} />
        </mesh>
        <mesh position={[0.14, 0.4, 0]}>
          <boxGeometry args={[0.16, 0.46, 0.16]} />
          <meshToonMaterial color={kitColor} gradientMap={gradient} />
        </mesh>
        {/* Body */}
        <mesh position={[0, 0.94, 0]}>
          <boxGeometry args={[0.52, 0.52, 0.3]} />
          <meshToonMaterial color={kitColor} gradientMap={gradient} />
        </mesh>
        {/* Team stripe */}
        <mesh position={[0, 0.94, 0.16]}>
          <boxGeometry args={[0.52, 0.1, 0.02]} />
          <meshToonMaterial color={teamColor} gradientMap={gradient} />
        </mesh>
        {/* Arms */}
        <mesh position={[-0.34, 0.88, 0]} rotation={[0, 0, 0.15]}>
          <boxGeometry args={[0.14, 0.44, 0.14]} />
          <meshToonMaterial color={kitColor} gradientMap={gradient} />
        </mesh>
        <mesh position={[0.34, 0.88, 0]} rotation={[0, 0, -0.15]}>
          <boxGeometry args={[0.14, 0.44, 0.14]} />
          <meshToonMaterial color={kitColor} gradientMap={gradient} />
        </mesh>
        {/* Neck */}
        <mesh position={[0, 1.25, 0]}>
          <cylinderGeometry args={[0.1, 0.12, 0.18, 8]} />
          <meshToonMaterial color={skin} gradientMap={gradient} />
        </mesh>
        {/* Head — anime big */}
        <mesh position={[0, 1.64, 0]}>
          <sphereGeometry args={[0.33, 14, 14]} />
          <meshToonMaterial color={skin} gradientMap={gradient} />
        </mesh>
        {/* Hair cap */}
        <mesh position={[0, 1.84, 0]}>
          <sphereGeometry args={[0.32, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshToonMaterial color={hairColor} gradientMap={gradient} side={THREE.DoubleSide} />
        </mesh>
        {/* Hair spikes */}
        <mesh position={[0, 2.06, -0.04]} rotation={[0.25, 0, 0]}>
          <coneGeometry args={[0.1, 0.28, 5]} />
          <meshToonMaterial color={hairColor} gradientMap={gradient} />
        </mesh>
        <mesh position={[-0.14, 2.04, 0.04]} rotation={[0.1, 0.3, 0.3]}>
          <coneGeometry args={[0.08, 0.22, 5]} />
          <meshToonMaterial color={hairColor} gradientMap={gradient} />
        </mesh>
        <mesh position={[0.14, 2.04, 0.04]} rotation={[0.1, -0.3, -0.3]}>
          <coneGeometry args={[0.08, 0.22, 5]} />
          <meshToonMaterial color={hairColor} gradientMap={gradient} />
        </mesh>
        {/* Eyes */}
        <mesh position={[-0.11, 1.67, 0.3]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial color="#1a1a3e" />
        </mesh>
        <mesh position={[0.11, 1.67, 0.3]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial color="#1a1a3e" />
        </mesh>
        <mesh position={[-0.09, 1.69, 0.37]}>
          <sphereGeometry args={[0.03, 6, 6]} />
          <meshBasicMaterial color="#fff" />
        </mesh>
        <mesh position={[0.13, 1.69, 0.37]}>
          <sphereGeometry args={[0.03, 6, 6]} />
          <meshBasicMaterial color="#fff" />
        </mesh>
        {/* Blush */}
        <mesh position={[-0.22, 1.62, 0.29]} rotation={[0, -0.5, 0]}>
          <sphereGeometry args={[0.06, 6, 6]} />
          <meshBasicMaterial color="#ffaaaa" transparent opacity={0.5} />
        </mesh>
        <mesh position={[0.22, 1.62, 0.29]} rotation={[0, 0.5, 0]}>
          <sphereGeometry args={[0.06, 6, 6]} />
          <meshBasicMaterial color="#ffaaaa" transparent opacity={0.5} />
        </mesh>
      </group>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BALL
// ═══════════════════════════════════════════════════════════════════════════════
function BallMesh({ gsRef }) {
  const meshRef = useRef();
  const spinRef = useRef(0);

  useEffect(() => { gsRef.current.ball.meshRef = meshRef; }, []);

  return (
    <group ref={meshRef} position={[0, BALL_RADIUS, 0]}>
      <mesh castShadow>
        <sphereGeometry args={[BALL_RADIUS, 14, 14]} />
        <meshToonMaterial color="#f0f0f0" />
      </mesh>
      {/* Pentagons */}
      {[0, 1, 2, 3, 4].map(i => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.18, Math.sin(a) * 0.1, 0.18]}>
            <dodecahedronGeometry args={[0.06, 0]} />
            <meshToonMaterial color="#1a1a1a" />
          </mesh>
        );
      })}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EFFECT MESHES
// ═══════════════════════════════════════════════════════════════════════════════
const EFFECT_COLORS = {
  fire: "#ff4500", fire2: "#ffaa00",
  tornado: "#00bfff", shadow: "#9b7ff4",
  electric: "#f5c842", sakura: "#ff69b4",
  shockwave: "#ffffff", score: "#f5c842",
  burn: "#ff6600", stun: "#ffff44",
};

function EffectMeshes({ effectsRef }) {
  const meshMapRef = useRef({});
  const groupRef = useRef();

  return (
    <group ref={groupRef}>
      {/* Effects are rendered imperatively in GameLoop via refs */}
    </group>
  );
}

function EffectPool({ effectsRef, gsRef }) {
  // We render effects directly and manage them here
  const [effects, setEffects] = useState([]);
  const syncTimer = useRef(0);

  useFrame((_, delta) => {
    syncTimer.current += delta;
    if (syncTimer.current > 0.05) {
      syncTimer.current = 0;
      setEffects([...gsRef.current.effects]);
    }
  });

  return (
    <>
      {effects.map(e => <EffectVisual key={e.id} effect={e} />)}
    </>
  );
}

function EffectVisual({ effect }) {
  const ref = useRef();
  const progress = effect.timer / effect.maxTime;
  const alive = progress <= 1;

  useEffect(() => {
    if (effect.meshRef !== undefined) effect.meshRef = ref;
  }, []);

  if (!alive) return null;
  const scale = effect.type === "shockwave"
    ? 1 + progress * 5
    : effect.type === "sakura"
    ? 0.5 + progress * 3
    : effect.type === "tornado"
    ? 0.8 + Math.sin(progress * Math.PI) * 2
    : 1 - progress * 0.5;

  const opacity = effect.type === "shockwave" ? (1 - progress) * 0.7 : (1 - progress) * 0.85;
  const color = EFFECT_COLORS[effect.type] || "#ffffff";
  const y = effect.type === "tornado" ? progress * 3 : effect.type === "sakura" ? progress * 1.5 : 0.5;

  return (
    <mesh ref={ref} position={[effect.pos.x, y, effect.pos.z]} scale={scale}>
      {effect.type === "tornado" ? (
        <cylinderGeometry args={[0.3, 1.5, 3, 8, 1, true]} />
      ) : effect.type === "shockwave" ? (
        <torusGeometry args={[1, 0.12, 6, 24]} />
      ) : (
        <sphereGeometry args={[0.6, 8, 8]} />
      )}
      <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME LOOP COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
function GameLoop({ gsRef, keysRef, matchType, onGameEnd, setUiData }) {
  const { camera } = useThree();
  const cfg = MATCH_CONFIGS[matchType] || MATCH_CONFIGS.classic;
  const camTarget = useRef(new THREE.Vector3());
  const uiTimer = useRef(0);
  const gameOverFired = useRef(false);

  useFrame((_, delta) => {
    const gs = gsRef.current;
    if (gs.phase !== "playing") return;

    const dt = Math.min(delta, 0.05); // cap at 50ms

    // ── Timer ────────────────────────────────────────────────────────────────
    if (cfg.duration) {
      gs.timeLeft -= dt;
      if (gs.timeLeft <= 0 && !gameOverFired.current) {
        gs.timeLeft = 0;
        endMatch(gs, cfg, onGameEnd, gameOverFired);
      }
    }

    // ── Update players ───────────────────────────────────────────────────────
    gs.players.forEach((p, idx) => {
      if (p.dead) {
        p.respawnTimer -= dt;
        if (p.respawnTimer <= 0) respawnPlayer(p, gs);
        return;
      }

      // Cooldowns
      p.slideCooldown = Math.max(0, p.slideCooldown - dt);
      Object.keys(p.abilityCooldowns).forEach(k => {
        const cd = cfg.noCooldown ? 0 : dt;
        p.abilityCooldowns[k] = Math.max(0, p.abilityCooldowns[k] - cd);
      });

      // Burn DoT
      if (p.burnTimer > 0) {
        p.burnTimer -= dt;
        p.stamina = Math.max(0, p.stamina - 12 * dt);
      }

      // Thunder active
      if (p.thunderActive) {
        p.thunderTimer -= dt;
        if (p.thunderTimer <= 0) p.thunderActive = false;
      }

      if (!p.isAI) {
        handlePlayerInput(p, keysRef.current, gs, dt, cfg);
      } else {
        updateAI(p, gs, dt);
      }

      // Stamina regen
      if (p.state !== "running") {
        p.stamina = Math.min(100, p.stamina + STAMINA_REGEN * dt);
      }

      // Update state timers
      if (p.state === "stunned") {
        p.stateTimer -= dt;
        if (p.stateTimer <= 0) {
          p.state = "idle";
          p.vel.set(0, 0, 0);
        }
      } else if (p.state === "sliding") {
        p.stateTimer -= dt;
        if (p.stateTimer <= 0) {
          p.state = "idle";
          p.vel.set(0, 0, 0);
          p.slideCooldown = SLIDE_COOLDOWN;
        }
      } else if (p.state === "ability") {
        p.stateTimer -= dt;
        if (p.stateTimer <= 0) {
          finishAbility(p, gs);
        }
      }

      // Physics
      p.pos.add(p.vel.clone().multiplyScalar(dt));
      clampPitch(p.pos);

      // Sync mesh
      if (p.groupRef?.current) {
        p.groupRef.current.position.set(p.pos.x, 0, p.pos.z);
        p.groupRef.current.rotation.y = p.facing;

        // Slide tilt animation
        const slideRef = p.groupRef.current.children[1];
        if (slideRef) {
          if (p.state === "sliding") {
            const prog = 1 - p.stateTimer / SLIDE_DURATION;
            slideRef.rotation.x = Math.sin(prog * Math.PI) * 0.7;
            slideRef.position.y = Math.sin(prog * Math.PI) * -0.2;
          } else if (p.state === "stunned") {
            slideRef.rotation.x = Math.PI * 0.4;
            slideRef.position.y = -0.3;
          } else {
            slideRef.rotation.x = THREE.MathUtils.lerp(slideRef.rotation.x, 0, dt * 8);
            slideRef.position.y = THREE.MathUtils.lerp(slideRef.position.y, 0, dt * 8);
          }
          // Running bob
          if (p.state === "running") {
            const bob = Math.sin(Date.now() * 0.01) * 0.03;
            slideRef.position.y = bob;
          }
        }
      }
    });

    // ── Tackle collisions ────────────────────────────────────────────────────
    checkTackleCollisions(gs, cfg, matchType);

    // ── Ball physics ─────────────────────────────────────────────────────────
    updateBall(gs, dt);

    // ── Effects ──────────────────────────────────────────────────────────────
    gs.effects = gs.effects.filter(e => {
      e.timer += dt;
      return e.timer < e.maxTime;
    });

    // ── King zone ────────────────────────────────────────────────────────────
    if (matchType === "king") {
      updateKingZone(gs, dt, cfg, onGameEnd, gameOverFired);
    }

    // ── Ball in goal ─────────────────────────────────────────────────────────
    if (cfg.win === "goals" && !gs.goalCooldown) {
      checkGoal(gs, cfg, matchType, onGameEnd, gameOverFired);
    }
    if (gs.goalCooldown > 0) gs.goalCooldown -= dt;

    // ── Camera follow player ─────────────────────────────────────────────────
    const player = gs.players[0];
    if (player) {
      const tx = player.pos.x * 0.3;
      const tz = player.pos.z * 0.2;
      camTarget.current.lerp(new THREE.Vector3(tx, 0, tz), dt * 3);
      camera.position.lerp(
        new THREE.Vector3(camTarget.current.x, 24, camTarget.current.z + 18),
        dt * 4
      );
      camera.lookAt(camTarget.current.x, 0, camTarget.current.z);
    }

    // ── UI update ────────────────────────────────────────────────────────────
    uiTimer.current += dt;
    if (uiTimer.current > 0.08) {
      uiTimer.current = 0;
      const p0 = gs.players[0];
      setUiData({
        timeLeft: gs.timeLeft,
        score: [...gs.score],
        tackles: gs.players[0]?.tackles ?? 0,
        stamina: p0?.stamina ?? 100,
        lives: p0?.lives ?? 3,
        cooldowns: p0 ? { ...p0.abilityCooldowns } : {},
        zoneScore: [...(gs.zoneScore || [0, 0])],
        state: p0?.state ?? "idle",
        phase: gs.phase,
        abilityId: p0?.abilityId ?? null,
        thunderActive: p0?.thunderActive ?? false,
      });
    }
  });

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT HANDLING
// ═══════════════════════════════════════════════════════════════════════════════
function handlePlayerInput(p, keys, gs, dt, cfg) {
  if (p.state === "stunned") return;

  let mx = 0, mz = 0;
  if (keys["w"] || keys["arrowup"])    mz -= 1;
  if (keys["s"] || keys["arrowdown"])  mz += 1;
  if (keys["a"] || keys["arrowleft"])  mx -= 1;
  if (keys["d"] || keys["arrowright"]) mx += 1;

  const moving = mx !== 0 || mz !== 0;

  if (p.state === "idle" || p.state === "running") {
    if (moving) {
      const len = Math.sqrt(mx * mx + mz * mz);
      const spd = p.thunderActive ? PLAYER_SPEED * 2.4 : PLAYER_SPEED;
      p.vel.set((mx / len) * spd, 0, (mz / len) * spd);
      p.facing = Math.atan2(mx / len, mz / len);
      p.state = "running";
      p.stamina = Math.max(0, p.stamina - STAMINA_DRAIN * dt);
    } else {
      p.vel.lerp(new THREE.Vector3(0, 0, 0), dt * 12);
      p.state = "idle";
    }

    // Slide tackle
    if (keys[" "] && p.slideCooldown <= 0 && p.stamina > 20 && p.state !== "sliding") {
      startSlide(p);
      p.stamina -= 22;
    }

    // Abilities
    const abilityKeys = { "1": "dragonSlide", "2": "tornadoSpin", "3": "shadowStep", "4": "thunderCharge", "5": "sakuraBurst" };
    for (const [k, id] of Object.entries(abilityKeys)) {
      if (keys[k] && p.abilityCooldowns[id] <= 0) {
        triggerAbility(p, id, gs);
        break;
      }
    }
  }

  if (p.state === "sliding") {
    const spd = SLIDE_SPEED;
    const fx = Math.sin(p.facing), fz = Math.cos(p.facing);
    p.vel.set(fx * spd, 0, fz * spd);
  }
}

function startSlide(p) {
  p.state = "sliding";
  p.stateTimer = SLIDE_DURATION;
  const spd = SLIDE_SPEED;
  const fx = Math.sin(p.facing), fz = Math.cos(p.facing);
  p.vel.set(fx * spd, 0, fz * spd);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ABILITIES
// ═══════════════════════════════════════════════════════════════════════════════
function triggerAbility(p, id, gs) {
  const def = ABILITY_DEFS[id];
  if (!def) return;

  p.state = "ability";
  p.abilityId = id;
  p.stateTimer = def.duration;
  p.abilityCooldowns[id] = def.cooldown;

  switch (id) {
    case "dragonSlide":
      startSlide(p);
      p.stateTimer = def.duration;
      gs.effects.push(createEffect("fire", p.pos, { maxTime: def.duration }));
      break;
    case "tornadoSpin":
      p.vel.set(0, 0, 0);
      gs.effects.push(createEffect("tornado", p.pos, { maxTime: def.duration }));
      break;
    case "shadowStep": {
      const target = findNearestOpponent(p, gs.players);
      if (target) {
        gs.effects.push(createEffect("shadow", p.pos, { maxTime: 0.5 }));
        const bx = -Math.sin(target.facing), bz = -Math.cos(target.facing);
        p.pos.set(target.pos.x + bx * 2, 0, target.pos.z + bz * 2);
        p.facing = Math.atan2(-bx, -bz);
        gs.effects.push(createEffect("shadow", p.pos, { maxTime: 0.5 }));
        startSlide(p);
        p.stateTimer = def.duration;
      } else {
        p.state = "idle";
      }
      break;
    }
    case "thunderCharge":
      p.thunderActive = true;
      p.thunderTimer = def.duration;
      p.state = "idle";
      gs.effects.push(createEffect("electric", p.pos, { maxTime: 0.8 }));
      break;
    case "sakuraBurst":
      gs.effects.push(createEffect("sakura", p.pos, { maxTime: def.duration }));
      break;
  }
}

function finishAbility(p, gs) {
  if (p.abilityId === "sakuraBurst") {
    // AoE explosion
    gs.players.forEach(opp => {
      if (opp.team === p.team || opp.dead) return;
      if (dist2D(p.pos, opp.pos) < 6.5) {
        knockback(opp, p.pos, 8);
        opp.state = "stunned";
        opp.stateTimer = 2.2;
        gs.effects.push(createEffect("shockwave", opp.pos, { maxTime: 0.6 }));
      }
    });
    gs.effects.push(createEffect("shockwave", p.pos, { maxTime: 0.8 }));
  }
  p.state = "idle";
  p.abilityId = null;
  p.vel.set(0, 0, 0);
}

function findNearestOpponent(p, players) {
  let nearest = null, nearDist = Infinity;
  players.forEach(opp => {
    if (opp.team === p.team || opp.dead) return;
    const d = dist2D(p.pos, opp.pos);
    if (d < nearDist) { nearDist = d; nearest = opp; }
  });
  return nearest;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TACKLE COLLISIONS
// ═══════════════════════════════════════════════════════════════════════════════
function checkTackleCollisions(gs, cfg, matchType) {
  gs.players.forEach(attacker => {
    if (attacker.dead) return;
    const isTackling = attacker.state === "sliding" ||
      (attacker.state === "ability" && ["dragonSlide", "shadowStep"].includes(attacker.abilityId));
    const isTornado = attacker.state === "ability" && attacker.abilityId === "tornadoSpin";
    const isThunder = attacker.thunderActive;

    if (!isTackling && !isTornado && !isThunder) return;

    const range = isTornado ? 3.5 : attacker.abilityId === "dragonSlide" ? 2.2 : SLIDE_RANGE;

    gs.players.forEach(target => {
      if (target.team === attacker.team || target.dead || target.state === "stunned") return;
      if (dist2D(attacker.pos, target.pos) > range) return;

      // Hit!
      const extraKB = attacker.abilityId === "thunderCharge" ? 2.5 :
                      attacker.abilityId === "dragonSlide" ? 1.6 :
                      isTornado ? 1.8 : 1;

      knockback(target, attacker.pos, KNOCKBACK_DIST * extraKB);
      target.state = "stunned";
      target.stateTimer = STUN_DURATION + (extraKB - 1) * 0.4;

      if (attacker.abilityId === "dragonSlide") target.burnTimer = 2;

      attacker.tackles++;

      if (matchType === "survival" && !isTornado) {
        target.lives--;
        if (target.lives <= 0) {
          target.dead = true;
          target.respawnTimer = 4;
          target.vel.set(0, 0, 0);
          if (target.groupRef?.current) target.groupRef.current.visible = false;
          checkSurvivalWin(gs, cfg, null, null);
        }
      }

      gs.effects.push(createEffect("shockwave", target.pos, { maxTime: 0.5 }));
      if (isThunder) gs.effects.push(createEffect("electric", target.pos, { maxTime: 0.7 }));
    });
  });
}

function knockback(target, sourcePos, force) {
  const dx = target.pos.x - sourcePos.x;
  const dz = target.pos.z - sourcePos.z;
  const len = Math.sqrt(dx * dx + dz * dz) || 1;
  target.vel.set((dx / len) * force, 0, (dz / len) * force);
}

// ═══════════════════════════════════════════════════════════════════════════════
// BALL
// ═══════════════════════════════════════════════════════════════════════════════
function updateBall(gs, dt) {
  const ball = gs.ball;
  ball.vel.multiplyScalar(Math.pow(BALL_FRICTION, dt * 60));
  ball.pos.add(ball.vel.clone().multiplyScalar(dt));

  // Bounce off pitch walls
  if (ball.pos.x < -PW / 2 + 0.5) { ball.pos.x = -PW / 2 + 0.5; ball.vel.x *= -0.7; }
  if (ball.pos.x >  PW / 2 - 0.5) { ball.pos.x =  PW / 2 - 0.5; ball.vel.x *= -0.7; }
  if (ball.pos.z < -PL / 2 + 0.5) {
    if (Math.abs(ball.pos.x) < GOAL_W / 2) {
      // Goal!
    } else { ball.pos.z = -PL / 2 + 0.5; ball.vel.z *= -0.7; }
  }
  if (ball.pos.z >  PL / 2 - 0.5) {
    if (Math.abs(ball.pos.x) < GOAL_W / 2) {
      // Goal!
    } else { ball.pos.z = PL / 2 - 0.5; ball.vel.z *= -0.7; }
  }

  // Players kick ball on proximity
  gs.players.forEach(p => {
    if (p.dead) return;
    if (dist2D(p.pos, ball.pos) < PLAYER_RADIUS + BALL_RADIUS + 0.2) {
      if (p.state === "sliding" || p.state === "running") {
        const fx = Math.sin(p.facing), fz = Math.cos(p.facing);
        const forceMul = p.state === "sliding" ? 1.8 : 0.7;
        ball.vel.set(fx * BALL_KICK_FORCE * forceMul, 0, fz * BALL_KICK_FORCE * forceMul);
        ball.lastKickedBy = p.team;
      }
    }
  });

  // Update ball mesh
  if (ball.meshRef?.current) {
    ball.meshRef.current.position.set(ball.pos.x, BALL_RADIUS, ball.pos.z);
    ball.meshRef.current.rotation.x += ball.vel.z * dt * 2;
    ball.meshRef.current.rotation.z -= ball.vel.x * dt * 2;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOAL / WIN CONDITIONS
// ═══════════════════════════════════════════════════════════════════════════════
function checkGoal(gs, cfg, matchType, onGameEnd, gameOverFired) {
  const ball = gs.ball;
  let scored = -1;
  if (ball.pos.z < -PL / 2 + 0.5 && Math.abs(ball.pos.x) < GOAL_W / 2) scored = 1;  // team 1 scores
  if (ball.pos.z >  PL / 2 - 0.5 && Math.abs(ball.pos.x) < GOAL_W / 2) scored = 0;  // team 0 scores

  if (scored >= 0) {
    gs.score[scored]++;
    gs.goalCooldown = 2;
    gs.effects.push(createEffect("score", new THREE.Vector3(ball.pos.x, 0, ball.pos.z), { maxTime: 1.2 }));
    // Reset ball
    ball.pos.set(0, 0, 0);
    ball.vel.set(0, 0, 0);
    // Reset players
    resetPlayerPositions(gs);

    if (cfg.duration === 300 && gs.score[scored] >= 10 && !gameOverFired.current) {
      endMatch(gs, cfg, onGameEnd, gameOverFired);
    }
  }
}

function updateKingZone(gs, dt, cfg, onGameEnd, gameOverFired) {
  if (!gs.zoneScore) gs.zoneScore = [0, 0];
  let inZone = [false, false];
  gs.players.forEach(p => {
    if (p.dead) return;
    if (dist2D(p.pos, { x: 0, z: 0 }) < 6) inZone[p.team] = true;
  });
  if (inZone[0] && !inZone[1]) {
    gs.zoneScore[0] += dt;
    if (gs.zoneScore[0] >= cfg.target && !gameOverFired.current) endMatch(gs, cfg, onGameEnd, gameOverFired);
  }
  if (inZone[1] && !inZone[0]) {
    gs.zoneScore[1] += dt;
    if (gs.zoneScore[1] >= cfg.target && !gameOverFired.current) endMatch(gs, cfg, onGameEnd, gameOverFired);
  }
}

function checkSurvivalWin(gs, cfg, onGameEnd, gameOverFired) {
  const alive0 = gs.players.filter(p => p.team === 0 && !p.dead).length;
  const alive1 = gs.players.filter(p => p.team === 1 && !p.dead).length;
  if (alive0 === 0 || alive1 === 0) {
    if (onGameEnd && gameOverFired && !gameOverFired.current) endMatch(gs, cfg, onGameEnd, gameOverFired);
  }
}

function endMatch(gs, cfg, onGameEnd, gameOverFired) {
  if (!onGameEnd || gameOverFired.current) return;
  gameOverFired.current = true;
  gs.phase = "ended";

  const p0Tackles = gs.players.filter(p => p.team === 0).reduce((s, p) => s + p.tackles, 0);
  const p1Tackles = gs.players.filter(p => p.team === 1).reduce((s, p) => s + p.tackles, 0);

  let winner = "draw";
  if (cfg.win === "goals") {
    winner = gs.score[0] > gs.score[1] ? "player" : gs.score[1] > gs.score[0] ? "ai" : "draw";
  } else if (cfg.win === "tackles") {
    winner = p0Tackles > p1Tackles ? "player" : p1Tackles > p0Tackles ? "ai" : "draw";
  } else if (cfg.win === "lives") {
    const alive0 = gs.players.filter(p => p.team === 0 && !p.dead).length;
    winner = alive0 > 0 ? "player" : "ai";
  } else if (cfg.win === "zone") {
    const z0 = gs.zoneScore?.[0] ?? 0, z1 = gs.zoneScore?.[1] ?? 0;
    winner = z0 > z1 ? "player" : z1 > z0 ? "ai" : "draw";
  }

  const stats = [
    { label: "Your Score", value: cfg.win === "goals" ? gs.score[0] : cfg.win === "tackles" ? p0Tackles : cfg.win === "zone" ? Math.round(gs.zoneScore?.[0] ?? 0) : gs.players.filter(p=>p.team===0&&!p.dead).length },
    { label: "Opponent Score", value: cfg.win === "goals" ? gs.score[1] : cfg.win === "tackles" ? p1Tackles : cfg.win === "zone" ? Math.round(gs.zoneScore?.[1] ?? 0) : gs.players.filter(p=>p.team===1&&!p.dead).length },
    { label: "Tackles Made", value: p0Tackles },
    { label: "Best Ability", value: gs.players[0]?.abilityId ?? "—" },
  ];

  onGameEnd({ winner, matchTypeName: cfg.name, stats });
}

function resetPlayerPositions(gs) {
  const positions = [
    [-8,-20],[-4,-15],[0,-18],[4,-15],[8,-20],
    [-8,20],[-4,15],[0,18],[4,15],[8,20],
  ];
  gs.players.forEach((p, i) => {
    const pos = positions[i] || [0, p.team === 0 ? -10 : 10];
    p.pos.set(pos[0], 0, pos[1]);
    p.vel.set(0, 0, 0);
    p.state = "idle";
  });
}

function respawnPlayer(p, gs) {
  p.dead = false;
  p.state = "idle";
  const x = (Math.random() - 0.5) * PW * 0.6;
  const z = (p.team === 0 ? -1 : 1) * (10 + Math.random() * 8);
  p.pos.set(x, 0, z);
  p.vel.set(0, 0, 0);
  if (p.groupRef?.current) p.groupRef.current.visible = true;
  gs.effects.push(createEffect("shockwave", p.pos, { maxTime: 0.6 }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI
// ═══════════════════════════════════════════════════════════════════════════════
function updateAI(p, gs, dt) {
  if (p.state === "stunned" || p.state === "sliding") return;

  p.aiTimer -= dt;
  if (p.aiTimer > 0) {
    // Keep moving toward target
    if (p.state === "running") {
      p.pos.add(p.vel.clone().multiplyScalar(dt));
    }
    return;
  }
  p.aiTimer = AI_TICK + Math.random() * 0.1;

  const ball = gs.ball;
  const goalZ = p.team === 0 ? -PL / 2 : PL / 2;
  const nearestOpp = findNearestOpponent(p, gs.players);
  const distToBall = dist2D(p.pos, ball.pos);

  // Dodge if someone is sliding at us
  const threat = gs.players.find(a =>
    a.team !== p.team && a.state === "sliding" && dist2D(a.pos, p.pos) < 5
  );
  if (threat) {
    // Dodge perpendicular
    const dx = p.pos.x - threat.pos.x, dz = p.pos.z - threat.pos.z;
    const perp = new THREE.Vector3(-dz, 0, dx).normalize();
    const dodgeDir = perp.multiplyScalar((Math.random() > 0.5 ? 1 : -1) * PLAYER_SPEED);
    p.vel.copy(dodgeDir);
    p.facing = Math.atan2(dodgeDir.x, dodgeDir.z);
    p.state = "running";
    p.aiTimer = 0.4;
    return;
  }

  // Decide action
  let target = null;

  if (distToBall < 12 || p.team === 0 && ball.pos.z < 0 || p.team === 1 && ball.pos.z > 0) {
    target = ball.pos;
  } else {
    // Move to formation position
    const offset = p.id % 5;
    const xSpread = [-10, -5, 0, 5, 10];
    const zBase = p.team === 0 ? -12 : 12;
    target = new THREE.Vector3(xSpread[offset], 0, zBase);
  }

  // If near ball, go toward goal
  if (distToBall < 4) {
    target = new THREE.Vector3(
      THREE.MathUtils.lerp(ball.pos.x, 0, 0.5),
      0,
      goalZ
    );
  }

  // Try tackle if opponent nearby
  if (nearestOpp && dist2D(p.pos, nearestOpp.pos) < 3.5 && p.slideCooldown <= 0 && p.stamina > 30) {
    p.facing = Math.atan2(
      nearestOpp.pos.x - p.pos.x,
      nearestOpp.pos.z - p.pos.z
    );
    startSlide(p);
    p.aiTimer = SLIDE_DURATION + 0.2;
    return;
  }

  // Random ability use
  if (Math.random() < 0.15 && p.state === "idle") {
    const ids = Object.keys(p.abilityCooldowns).filter(k => p.abilityCooldowns[k] <= 0);
    if (ids.length > 0 && nearestOpp && dist2D(p.pos, nearestOpp.pos) < 7) {
      triggerAbility(p, ids[Math.floor(Math.random() * ids.length)], gs);
      return;
    }
  }

  // Move toward target
  if (target) {
    const dx = target.x - p.pos.x;
    const dz = target.z - p.pos.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len > 0.8) {
      p.vel.set((dx / len) * PLAYER_SPEED * 0.85, 0, (dz / len) * PLAYER_SPEED * 0.85);
      p.facing = Math.atan2(dx / len, dz / len);
      p.state = "running";
      p.stamina -= STAMINA_DRAIN * AI_TICK;
    } else {
      p.vel.set(0, 0, 0);
      p.state = "idle";
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENE WRAPPER (inside Canvas)
// ═══════════════════════════════════════════════════════════════════════════════
function Scene({ matchType, playerCustomization, onGameEnd, setUiData }) {
  const gradient = useToonGradient();

  const gsRef = useRef(null);
  const keysRef = useRef({});

  // Init game state once
  if (!gsRef.current) {
    const playerCustom = {
      hairColor: playerCustomization?.hairColor ?? "#cc2222",
      kitColor: playerCustomization?.kitColor ?? "#e84393",
      bootColor: playerCustomization?.bootColor ?? "#1a1a2e",
      name: playerCustomization?.name ?? "Player",
    };
    const aiKitColors = ["#3498db","#2980b9","#1abc9c","#27ae60","#8e44ad"];

    const positions = [
      [-8,-20],[-4,-15],[0,-18],[4,-15],[8,-20],
      [-8,20],[-4,15],[0,18],[4,15],[8,20],
    ];
    const players = positions.map((pos, i) => {
      const team = i < 5 ? 0 : 1;
      const isAI = i !== 0;
      const custom = i === 0 ? playerCustom : {
        hairColor: ["#1a1a2e","#f5c842","#2ecc71","#ff6b35","#ffffff"][i % 5],
        kitColor: aiKitColors[i % 5],
        bootColor: "#1a1a2e",
        name: `CPU ${i}`,
      };
      return createPlayer(i, team, pos[0], pos[1], isAI, custom);
    });

    const cfg = MATCH_CONFIGS[matchType] || MATCH_CONFIGS.classic;
    gsRef.current = {
      players,
      ball: createBall(),
      score: [0, 0],
      zoneScore: [0, 0],
      timeLeft: cfg.duration ?? 300,
      phase: "playing",
      effects: [],
      goalCooldown: 0,
      uiTimer: 0,
    };
  }

  // Keyboard input
  useEffect(() => {
    const down = (e) => { keysRef.current[e.key.toLowerCase()] = true; e.preventDefault(); };
    const up   = (e) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[10, 22, 12]} intensity={1.1} castShadow />
      <directionalLight position={[-8, 12, -10]} intensity={0.35} color="#aaccff" />
      <hemisphereLight skyColor="#a8d8ea" groundColor="#226633" intensity={0.3} />

      {/* World */}
      <Pitch matchType={matchType} />

      {/* Players */}
      {gsRef.current.players.map((_, i) => (
        <PlayerModel key={i} playerIndex={i} gsRef={gsRef} gradient={gradient} />
      ))}

      {/* Ball */}
      <BallMesh gsRef={gsRef} />

      {/* Effects */}
      <EffectPool gsRef={gsRef} effectsRef={null} />

      {/* Game loop logic */}
      <GameLoop
        gsRef={gsRef}
        keysRef={keysRef}
        matchType={matchType}
        onGameEnd={onGameEnd}
        setUiData={setUiData}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HUD OVERLAY
// ═══════════════════════════════════════════════════════════════════════════════
const T = {
  bg: "#07090f", surface: "#0e1118", card: "#13161f",
  border: "#1e2336", accent: "#f5c842", rose: "#f25c7a",
  teal: "#3de0c8", violet: "#9b7ff4", text: "#eef0f8", textSoft: "#7a86a8",
};

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function HUD({ uiData, matchType, onExit, playerCustomization }) {
  const cfg = MATCH_CONFIGS[matchType] || MATCH_CONFIGS.classic;
  const { score, timeLeft, stamina, lives, cooldowns, zoneScore, state, thunderActive } = uiData;

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", fontFamily: "system-ui, sans-serif" }}>
      {/* Top bar */}
      <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 20, pointerEvents: "auto" }}>
        <div style={{ background: "rgba(7,9,15,0.85)", border: `1px solid ${T.border}`, borderRadius: 12, padding: "8px 20px", display: "flex", alignItems: "center", gap: 20 }}>
          {/* Score */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#e84393", letterSpacing: "0.1em", fontWeight: 700 }}>YOU</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: T.text, lineHeight: 1 }}>
                {cfg.win === "goals" ? (score?.[0] ?? 0) :
                 cfg.win === "tackles" ? (uiData.tackles ?? 0) :
                 cfg.win === "lives" ? (lives ?? 3) :
                 Math.round(zoneScore?.[0] ?? 0)}
              </div>
            </div>
            <div style={{ color: T.textSoft, fontSize: 20, fontWeight: 300 }}>VS</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#3498db", letterSpacing: "0.1em", fontWeight: 700 }}>CPU</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: T.text, lineHeight: 1 }}>
                {cfg.win === "goals" ? (score?.[1] ?? 0) :
                 cfg.win === "tackles" ? "?" :
                 cfg.win === "lives" ? "?" :
                 Math.round(zoneScore?.[1] ?? 0)}
              </div>
            </div>
          </div>
          {/* Timer */}
          <div style={{ borderLeft: `1px solid ${T.border}`, paddingLeft: 16, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: T.textSoft, letterSpacing: "0.1em" }}>TIME</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: timeLeft < 30 ? T.rose : T.accent }}>
              {cfg.duration ? formatTime(timeLeft ?? 0) : "∞"}
            </div>
          </div>
          {/* Match type */}
          <div style={{ borderLeft: `1px solid ${T.border}`, paddingLeft: 16 }}>
            <div style={{ fontSize: 11, color: T.textSoft }}>{cfg.name}</div>
          </div>
        </div>
        <button
          onClick={onExit}
          style={{ background: "rgba(7,9,15,0.85)", border: `1px solid ${T.border}`, borderRadius: 8, color: T.textSoft, padding: "8px 14px", cursor: "pointer", fontSize: 13 }}
        >
          ✕ Exit
        </button>
      </div>

      {/* Bottom bar — stamina + abilities */}
      <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        {/* Stamina */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(7,9,15,0.8)", borderRadius: 99, padding: "6px 14px", border: `1px solid ${T.border}` }}>
          <span style={{ fontSize: 12, color: T.textSoft, fontWeight: 600 }}>STAMINA</span>
          <div style={{ width: 100, height: 8, borderRadius: 4, background: T.surface, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${stamina ?? 100}%`, background: stamina > 50 ? T.teal : stamina > 20 ? T.accent : T.rose, borderRadius: 4, transition: "width 0.1s" }} />
          </div>
          {thunderActive && (
            <span style={{ fontSize: 12, color: "#f5c842", fontWeight: 700 }}>⚡ CHARGED</span>
          )}
          {state === "stunned" && (
            <span style={{ fontSize: 12, color: T.rose, fontWeight: 700 }}>💫 STUNNED</span>
          )}
        </div>
        {/* Ability bar */}
        <div style={{ display: "flex", gap: 8 }}>
          {Object.entries(ABILITY_DEFS).map(([id, def], i) => {
            const cd = cooldowns?.[id] ?? 0;
            const ready = cd <= 0;
            const pct = ready ? 100 : Math.round((1 - cd / def.cooldown) * 100);
            return (
              <div
                key={id}
                style={{
                  width: 56, height: 56, borderRadius: 12,
                  background: ready ? `${def.color}22` : "rgba(7,9,15,0.85)",
                  border: `2px solid ${ready ? def.color : T.border}`,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  position: "relative", overflow: "hidden", transition: "all 0.2s",
                  boxShadow: ready ? `0 0 12px ${def.color}66` : "none",
                }}
                title={`${def.name} — ${ready ? "Ready!" : `${Math.ceil(cd)}s`}`}
              >
                {!ready && (
                  <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: `${pct}%`, background: `${def.color}33`, transition: "height 0.1s" }} />
                )}
                <span style={{ fontSize: 20, position: "relative" }}>{def.icon}</span>
                <span style={{ fontSize: 9, color: ready ? def.color : T.textSoft, fontWeight: 700, position: "relative" }}>
                  {ready ? def.key : Math.ceil(cd) + "s"}
                </span>
              </div>
            );
          })}
        </div>
        {/* Controls reminder */}
        <div style={{ display: "flex", gap: 12, fontSize: 11, color: T.textSoft }}>
          <span>WASD Move</span>
          <span>Space Tackle</span>
          <span>1-5 Abilities</span>
        </div>
      </div>

      {/* Player name */}
      <div style={{ position: "absolute", bottom: 150, left: 24, background: "rgba(7,9,15,0.7)", border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 12px" }}>
        <div style={{ fontSize: 11, color: "#e84393", fontWeight: 700 }}>YOU</div>
        <div style={{ color: T.text, fontWeight: 700, fontSize: 14 }}>{playerCustomization?.name ?? "Player"}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
export default function GameCanvas({ matchType, playerCustomization, onGameEnd, onExit }) {
  const [uiData, setUiData] = useState({
    score: [0, 0], timeLeft: 300, stamina: 100, lives: 3,
    cooldowns: {}, zoneScore: [0, 0], state: "idle",
    thunderActive: false, phase: "playing",
  });

  const handleExit = useCallback(() => {
    if (onExit) onExit();
  }, [onExit]);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", background: "#07090f" }}>
      <Canvas
        shadows
        camera={{ position: [0, 24, 18], fov: 55, near: 0.1, far: 500 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        style={{ width: "100%", height: "100%" }}
      >
        <Scene
          matchType={matchType}
          playerCustomization={playerCustomization}
          onGameEnd={onGameEnd}
          setUiData={setUiData}
        />
      </Canvas>

      <HUD
        uiData={uiData}
        matchType={matchType}
        onExit={handleExit}
        playerCustomization={playerCustomization}
      />
    </div>
  );
}
