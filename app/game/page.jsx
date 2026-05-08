"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

const GameCanvas = dynamic(() => import("./GameCanvas"), { ssr: false });

const MATCH_TYPES = [
  {
    id: "classic",
    name: "Classic",
    desc: "Score goals. 5 minute match.",
    icon: "⚽",
    color: "#3de0c8",
    detail: "Football but everyone wants to wipe each other out.",
  },
  {
    id: "tackle_rush",
    name: "Tackle Rush",
    desc: "Most tackles in 3 minutes wins.",
    icon: "💥",
    color: "#f25c7a",
    detail: "Forget the ball. Slide tackle everything that moves.",
  },
  {
    id: "survival",
    name: "Survival",
    desc: "3 lives each. Last one standing.",
    icon: "💀",
    color: "#9b7ff4",
    detail: "Get knocked out 3 times and you're eliminated.",
  },
  {
    id: "king",
    name: "King of the Pitch",
    desc: "Control the centre zone. First to 60 points.",
    icon: "👑",
    color: "#f5c842",
    detail: "Stand in the centre circle to score. Protect your spot.",
  },
  {
    id: "chaos",
    name: "Chaos Mode",
    desc: "No cooldowns. Pure carnage.",
    icon: "🌀",
    color: "#ff6b35",
    detail: "All abilities active forever. Score goals if you can.",
  },
];

const HAIR_COLORS = [
  "#1a1a2e","#cc2222","#ff6b35","#f5c842","#2ecc71",
  "#3de0c8","#3498db","#9b7ff4","#ff69b4","#ffffff",
];
const KIT_COLORS  = [
  "#e84393","#c0392b","#e67e22","#f1c40f","#27ae60",
  "#16a085","#2980b9","#8e44ad","#2c3e50","#ecf0f1",
];
const BOOT_COLORS = [
  "#1a1a2e","#c0392b","#f39c12","#27ae60","#2980b9",
  "#8e44ad","#ffffff","#e67e22","#16a085","#7f8c8d",
];

const T = {
  bg: "#07090f", surface: "#0e1118", card: "#13161f", cardHover: "#181c28",
  border: "#1e2336", accent: "#f5c842", rose: "#f25c7a",
  teal: "#3de0c8", violet: "#9b7ff4", text: "#eef0f8", textSoft: "#7a86a8",
};

function ColorPicker({ label, colors, value, onChange }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, color: T.textSoft, marginBottom: 8, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {colors.map(c => (
          <button
            key={c}
            onClick={() => onChange(c)}
            style={{
              width: 32, height: 32, borderRadius: "50%", background: c, border: "none",
              cursor: "pointer", boxShadow: value === c ? `0 0 0 3px #fff, 0 0 0 5px ${c}` : "none",
              transition: "box-shadow 0.15s", transform: value === c ? "scale(1.15)" : "scale(1)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function AvatarPreview({ customization }) {
  const { hairColor, kitColor, bootColor } = customization;
  return (
    <svg width="120" height="200" viewBox="0 0 120 200" style={{ display: "block", margin: "0 auto" }}>
      {/* Shadow */}
      <ellipse cx="60" cy="195" rx="28" ry="6" fill="rgba(0,0,0,0.3)" />
      {/* Boots */}
      <rect x="38" y="162" width="18" height="14" rx="3" fill={bootColor} />
      <rect x="64" y="162" width="18" height="14" rx="3" fill={bootColor} />
      {/* Legs */}
      <rect x="40" y="118" width="16" height="50" rx="4" fill={kitColor} />
      <rect x="65" y="118" width="16" height="50" rx="4" fill={kitColor} />
      {/* Body */}
      <rect x="33" y="78" width="54" height="48" rx="8" fill={kitColor} />
      {/* Arms */}
      <rect x="18" y="80" width="14" height="38" rx="5" fill={kitColor} />
      <rect x="88" y="80" width="14" height="38" rx="5" fill={kitColor} />
      {/* Kit number */}
      <text x="60" y="107" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="14" fontWeight="bold">10</text>
      {/* Neck */}
      <rect x="52" y="68" width="16" height="14" rx="4" fill="#f4c2a1" />
      {/* Head */}
      <circle cx="60" cy="50" r="28" fill="#f4c2a1" />
      {/* Hair top */}
      <ellipse cx="60" cy="28" rx="28" ry="14" fill={hairColor} />
      {/* Hair spikes */}
      <polygon points="45,24 50,8 55,24" fill={hairColor} />
      <polygon points="55,22 60,4 65,22" fill={hairColor} />
      <polygon points="65,24 70,8 75,24" fill={hairColor} />
      {/* Eyes */}
      <ellipse cx="49" cy="52" rx="7" ry="8" fill="#1a1a3e" />
      <ellipse cx="71" cy="52" rx="7" ry="8" fill="#1a1a3e" />
      {/* Iris */}
      <ellipse cx="49" cy="53" rx="4" ry="5" fill="#3498db" />
      <ellipse cx="71" cy="53" rx="4" ry="5" fill="#3498db" />
      {/* Pupils */}
      <circle cx="49" cy="53" r="2.5" fill="#000" />
      <circle cx="71" cy="53" r="2.5" fill="#000" />
      {/* Eye shine */}
      <circle cx="51" cy="51" r="1.5" fill="#fff" />
      <circle cx="73" cy="51" r="1.5" fill="#fff" />
      {/* Blush */}
      <ellipse cx="42" cy="59" rx="6" ry="3" fill="rgba(255,150,150,0.35)" />
      <ellipse cx="78" cy="59" rx="6" ry="3" fill="rgba(255,150,150,0.35)" />
      {/* Mouth */}
      <path d="M52 64 Q60 70 68 64" stroke="#c87a7a" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export default function GamePage() {
  const [screen, setScreen] = useState("menu");
  const [matchType, setMatchType] = useState("classic");
  const [customization, setCustomization] = useState({
    hairColor: "#cc2222",
    kitColor: "#e84393",
    bootColor: "#1a1a2e",
    name: "Player",
  });
  const [results, setResults] = useState(null);

  const updateCustom = (key, val) => setCustomization(c => ({ ...c, [key]: val }));

  if (screen === "game") {
    return (
      <GameCanvas
        matchType={matchType}
        playerCustomization={customization}
        onGameEnd={(r) => { setResults(r); setScreen("results"); }}
        onExit={() => setScreen("menu")}
      />
    );
  }

  /* ── RESULTS ── */
  if (screen === "results" && results) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 72, marginBottom: 8 }}>{results.winner === "player" ? "🏆" : results.winner === "draw" ? "🤝" : "💀"}</div>
          <h1 style={{ fontSize: 42, fontWeight: 900, color: results.winner === "player" ? T.accent : results.winner === "draw" ? T.textSoft : T.rose, marginBottom: 4, fontFamily: "system-ui" }}>
            {results.winner === "player" ? "VICTORY!" : results.winner === "draw" ? "DRAW!" : "DEFEAT!"}
          </h1>
          <div style={{ color: T.textSoft, marginBottom: 32, fontSize: 16 }}>{results.matchTypeName}</div>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "24px 32px", marginBottom: 24 }}>
            {results.stats.map((s, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < results.stats.length - 1 ? `1px solid ${T.border}` : "none" }}>
                <span style={{ color: T.textSoft }}>{s.label}</span>
                <span style={{ color: T.text, fontWeight: 700 }}>{s.value}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={() => setScreen("game")} style={{ padding: "14px 28px", borderRadius: 10, background: T.accent, color: "#000", fontWeight: 800, fontSize: 15, border: "none", cursor: "pointer" }}>
              Play Again
            </button>
            <button onClick={() => setScreen("menu")} style={{ padding: "14px 28px", borderRadius: 10, background: T.card, color: T.text, fontWeight: 700, fontSize: 15, border: `1px solid ${T.border}`, cursor: "pointer" }}>
              Main Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── CUSTOMISE ── */
  if (screen === "customise") {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, padding: "24px 16px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <button onClick={() => setScreen("menu")} style={{ background: "none", border: "none", color: T.textSoft, cursor: "pointer", fontSize: 14, marginBottom: 24, display: "flex", alignItems: "center", gap: 6 }}>
            ← Back
          </button>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: T.text, marginBottom: 4, fontFamily: "system-ui" }}>Customise Your Player</h2>
          <p style={{ color: T.textSoft, marginBottom: 32 }}>Make your anime footballer your own.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            <div>
              <AvatarPreview customization={customization} />
            </div>
            <div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: T.textSoft, marginBottom: 6, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Name</div>
                <input
                  value={customization.name}
                  onChange={e => updateCustom("name", e.target.value)}
                  maxLength={12}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: T.card, border: `1px solid ${T.border}`, color: T.text, fontSize: 15, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <ColorPicker label="Hair" colors={HAIR_COLORS} value={customization.hairColor} onChange={v => updateCustom("hairColor", v)} />
              <ColorPicker label="Kit" colors={KIT_COLORS} value={customization.kitColor} onChange={v => updateCustom("kitColor", v)} />
              <ColorPicker label="Boots" colors={BOOT_COLORS} value={customization.bootColor} onChange={v => updateCustom("bootColor", v)} />
            </div>
          </div>
          <button onClick={() => setScreen("menu")} style={{ marginTop: 24, width: "100%", padding: "16px", borderRadius: 12, background: T.accent, color: "#000", fontWeight: 800, fontSize: 16, border: "none", cursor: "pointer" }}>
            Save & Continue →
          </button>
        </div>
      </div>
    );
  }

  /* ── MATCH SELECT ── */
  if (screen === "matchSelect") {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, padding: "24px 16px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <button onClick={() => setScreen("menu")} style={{ background: "none", border: "none", color: T.textSoft, cursor: "pointer", fontSize: 14, marginBottom: 24 }}>
            ← Back
          </button>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: T.text, marginBottom: 4, fontFamily: "system-ui" }}>Select Match Type</h2>
          <p style={{ color: T.textSoft, marginBottom: 24 }}>Pick your chaos.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {MATCH_TYPES.map(m => (
              <button
                key={m.id}
                onClick={() => { setMatchType(m.id); setScreen("game"); }}
                style={{
                  padding: "18px 22px", borderRadius: 14, background: matchType === m.id ? `${m.color}22` : T.card,
                  border: `1.5px solid ${matchType === m.id ? m.color : T.border}`,
                  cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: 16,
                }}
              >
                <span style={{ fontSize: 30 }}>{m.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: m.color, fontWeight: 800, fontSize: 17, fontFamily: "system-ui" }}>{m.name}</div>
                  <div style={{ color: T.text, fontSize: 14, marginTop: 2 }}>{m.desc}</div>
                  <div style={{ color: T.textSoft, fontSize: 12, marginTop: 4 }}>{m.detail}</div>
                </div>
                <div style={{ color: m.color, fontSize: 20 }}>→</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── MAIN MENU ── */
  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}>
      {/* Background glow orbs */}
      <div style={{ position: "absolute", top: "10%", left: "15%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, #f25c7a22, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "15%", right: "10%", width: 250, height: 250, borderRadius: "50%", background: "radial-gradient(circle, #9b7ff422, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "40%", right: "20%", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, #3de0c822, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", textAlign: "center", maxWidth: 520 }}>
        {/* Badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 99, background: `${T.rose}22`, border: `1px solid ${T.rose}44`, marginBottom: 20 }}>
          <span style={{ fontSize: 12 }}>⚡</span>
          <span style={{ color: T.rose, fontSize: 13, fontWeight: 600, letterSpacing: "0.08em" }}>ANIME FOOTBALL CHAOS</span>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: "clamp(42px, 8vw, 72px)", fontWeight: 900, lineHeight: 1.05, marginBottom: 8, fontFamily: "system-ui" }}>
          <span style={{ color: T.text }}>SLIDE</span>
          <br />
          <span style={{ background: `linear-gradient(135deg, ${T.rose}, ${T.violet})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>KINGS</span>
        </h1>

        <p style={{ color: T.textSoft, fontSize: 17, marginBottom: 40, lineHeight: 1.6 }}>
          Anime-powered 3D football. Wipe out your opponents with slide tackles and insane abilities. No mercy.
        </p>

        {/* Ability previews */}
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 40, flexWrap: "wrap" }}>
          {[["🐉","Dragon Slide","#ff4500"],["🌪️","Tornado Spin","#00bfff"],["👤","Shadow Step","#9b7ff4"],["⚡","Thunder Charge","#f5c842"],["🌸","Sakura Burst","#ff69b4"]].map(([icon, name, color]) => (
            <div key={name} style={{ padding: "8px 14px", borderRadius: 99, background: `${color}18`, border: `1px solid ${color}44`, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14 }}>{icon}</span>
              <span style={{ color, fontSize: 12, fontWeight: 600 }}>{name}</span>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 320, margin: "0 auto" }}>
          <button
            onClick={() => setScreen("matchSelect")}
            style={{ padding: "18px 24px", borderRadius: 14, background: `linear-gradient(135deg, ${T.rose}, ${T.violet})`, color: "#fff", fontWeight: 800, fontSize: 17, border: "none", cursor: "pointer", letterSpacing: "0.03em", boxShadow: `0 4px 24px ${T.rose}44` }}
          >
            ⚽ PLAY NOW
          </button>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => setScreen("customise")}
              style={{ flex: 1, padding: "14px 16px", borderRadius: 12, background: T.card, color: T.text, fontWeight: 700, fontSize: 15, border: `1px solid ${T.border}`, cursor: "pointer" }}
            >
              🎨 Customise
            </button>
            <button
              onClick={() => setScreen("matchSelect")}
              style={{ flex: 1, padding: "14px 16px", borderRadius: 12, background: T.card, color: T.text, fontWeight: 700, fontSize: 15, border: `1px solid ${T.border}`, cursor: "pointer" }}
            >
              ⚙️ Match Types
            </button>
          </div>
        </div>

        {/* Controls hint */}
        <div style={{ marginTop: 36, padding: "16px 24px", borderRadius: 12, background: T.card, border: `1px solid ${T.border}`, textAlign: "left" }}>
          <div style={{ color: T.textSoft, fontSize: 13, fontWeight: 600, marginBottom: 10, letterSpacing: "0.05em" }}>CONTROLS</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", fontSize: 13 }}>
            {[["WASD / Arrows","Move"],["Space","Slide Tackle"],["1–5","Abilities"],["Esc","Pause"]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
                <kbd style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, padding: "2px 6px", color: T.accent, fontSize: 11, fontFamily: "monospace" }}>{k}</kbd>
                <span style={{ color: T.textSoft }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <Link href="/" style={{ color: T.textSoft, fontSize: 13, textDecoration: "none" }}>← Back to Creative Bedtimes</Link>
        </div>
      </div>
    </div>
  );
}
