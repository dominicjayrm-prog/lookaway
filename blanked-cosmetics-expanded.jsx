import { useState } from "react";

const C = {
  accent: "#6C5CE7", accentL: "#A29BFE", accentD: "#4A3BBF",
  green: "#00B894", coral: "#FF6B6B", gold: "#D4A012", blue: "#0984E3",
  pink: "#FD79A8", teal: "#00CEC9",
  text: "#1A1A18", textM: "#636E72", textD: "#B2BEC3",
};

const rarityColors = {
  common: { text: "#636E72", bg: "#636E7210", border: "#636E7220" },
  rare: { text: "#0984E3", bg: "#0984E310", border: "#0984E320" },
  epic: { text: "#6C5CE7", bg: "#6C5CE710", border: "#6C5CE720" },
  legendary: { text: "#D4A012", bg: "#D4A01215", border: "#D4A01230" },
};

// ═══ BLINK RENDERER — all expressions ═══
const BlinkExpr = ({ type = "default", bodyColor = "default", size = 48 }) => {
  const s = size, cx = s/2, cy = s/2 + s*0.04, bR = s*0.38;
  const sw = (min, pct) => Math.max(min, s * pct);

  const bodyGrads = {
    default: [C.accentL, C.accent],
    golden: ["#FFD700", "#DAA520"],
    ice: ["#B3E5FC", "#4FC3F7"],
    galaxy: ["#7B1FA2", "#311B92"],
    zombie: ["#81C784", "#4CAF50"],
    rainbow: ["#FF6B6B", "#6C5CE7"],
    shadow: ["#616161", "#212121"],
    cherry: ["#FF80AB", "#C2185B"],
  };
  const [gFrom, gTo] = bodyGrads[bodyColor] || bodyGrads.default;
  const gId = `bg-${s}-${type}-${bodyColor}`;

  // Standard eye helper
  const stdEyes = (pc = C.text, pr = s*0.045, lx = 0, ly = 0) => (
    <>
      <ellipse cx={cx-s*0.1} cy={cy-s*0.05} rx={s*0.085} ry={s*0.11} fill="white" />
      <ellipse cx={cx+s*0.1} cy={cy-s*0.05} rx={s*0.085} ry={s*0.11} fill="white" />
      <circle cx={cx-s*0.085+lx} cy={cy-s*0.04+ly} r={pr} fill={pc} />
      <circle cx={cx+s*0.115+lx} cy={cy-s*0.04+ly} r={pr} fill={pc} />
      <circle cx={cx-s*0.07+lx} cy={cy-s*0.06+ly} r={s*0.014} fill="white" />
      <circle cx={cx+s*0.13+lx} cy={cy-s*0.06+ly} r={s*0.014} fill="white" />
    </>
  );

  const smilePath = (w=0.04, lift=0.04) => (
    <path d={`M${cx-s*w},${cy+s*0.1} Q${cx},${cy+s*0.1+s*lift} ${cx+s*w},${cy+s*0.1}`}
      fill="none" stroke={C.text} strokeWidth={sw(1, 0.018)} strokeLinecap="round" />
  );

  const bigSmile = () => (
    <path d={`M${cx-s*0.08},${cy+s*0.08} Q${cx},${cy+s*0.19} ${cx+s*0.08},${cy+s*0.08}`}
      fill="none" stroke={C.text} strokeWidth={sw(1, 0.02)} strokeLinecap="round" />
  );

  const frown = () => (
    <path d={`M${cx-s*0.05},${cy+s*0.13} Q${cx},${cy+s*0.09} ${cx+s*0.05},${cy+s*0.13}`}
      fill="none" stroke={C.text} strokeWidth={sw(1, 0.016)} strokeLinecap="round" />
  );

  // ═══ FACES ═══
  const faces = {
    default: <>{stdEyes()}{smilePath()}</>,

    wink: (
      <>
        {/* Left eye normal */}
        <ellipse cx={cx-s*0.1} cy={cy-s*0.05} rx={s*0.085} ry={s*0.11} fill="white" />
        <circle cx={cx-s*0.085} cy={cy-s*0.04} r={s*0.045} fill={C.text} />
        <circle cx={cx-s*0.07} cy={cy-s*0.06} r={s*0.014} fill="white" />
        {/* Right eye closed — wink */}
        <path d={`M${cx+s*0.04},${cy-s*0.04} Q${cx+s*0.1},${cy-s*0.1} ${cx+s*0.16},${cy-s*0.04}`}
          fill="none" stroke={C.text} strokeWidth={sw(1, 0.022)} strokeLinecap="round" />
        {/* Cheeky smile */}
        <path d={`M${cx-s*0.06},${cy+s*0.09} Q${cx},${cy+s*0.16} ${cx+s*0.06},${cy+s*0.09}`}
          fill="none" stroke={C.text} strokeWidth={sw(1, 0.02)} strokeLinecap="round" />
      </>
    ),

    tongue: (
      <>
        {stdEyes()}
        {/* Open smile with tongue */}
        <path d={`M${cx-s*0.07},${cy+s*0.08} Q${cx},${cy+s*0.18} ${cx+s*0.07},${cy+s*0.08}`}
          fill="none" stroke={C.text} strokeWidth={sw(1, 0.02)} strokeLinecap="round" />
        {/* Tongue */}
        <ellipse cx={cx} cy={cy+s*0.16} rx={s*0.04} ry={s*0.035} fill={C.coral} />
        <ellipse cx={cx} cy={cy+s*0.155} rx={s*0.035} ry={s*0.02} fill="#FF8A80" />
      </>
    ),

    focused: (
      <>
        {stdEyes(C.accent, s*0.05)}
        <line x1={cx-s*0.22} y1={cy-s*0.22} x2={cx-s*0.18} y2={cy-s*0.18} stroke={C.gold} strokeWidth={sw(0.8, 0.015)} strokeLinecap="round" />
        <line x1={cx+s*0.2} y1={cy-s*0.24} x2={cx+s*0.17} y2={cy-s*0.2} stroke={C.gold} strokeWidth={sw(0.8, 0.015)} strokeLinecap="round" />
      </>
    ),

    thinker: (
      <>
        {stdEyes(C.accent, s*0.045, s*0.02, -s*0.02)}
        <path d={`M${cx+s*0.05},${cy-s*0.17} Q${cx+s*0.1},${cy-s*0.22} ${cx+s*0.17},${cy-s*0.17}`}
          fill="none" stroke={C.accentD} strokeWidth={sw(0.8, 0.018)} strokeLinecap="round" opacity="0.55" />
        <circle cx={cx+s*0.26} cy={cy-s*0.16} r={sw(1.5, 0.018)} fill={C.accentL} opacity="0.55" />
        <circle cx={cx+s*0.31} cy={cy-s*0.23} r={sw(1, 0.014)} fill={C.accentL} opacity="0.4" />
      </>
    ),

    nailed_it: <>{stdEyes(C.green, s*0.05)}{bigSmile()}</>,

    oops: (
      <>
        {stdEyes(C.coral, s*0.038)}
        {frown()}
        <path d={`M${cx+s*0.2},${cy-s*0.1} Q${cx+s*0.22},${cy-s*0.04} ${cx+s*0.2},${cy+s*0.02} Q${cx+s*0.18},${cy-s*0.04} ${cx+s*0.2},${cy-s*0.1}`}
          fill={C.blue} opacity="0.35" />
      </>
    ),

    party: (
      <>
        {stdEyes(C.accent, s*0.055)}
        {bigSmile()}
        {[
          { x: -0.3, y: -0.26, a: -30, c: C.coral }, { x: 0.3, y: -0.22, a: 30, c: C.blue },
          { x: -0.26, y: 0.2, a: -50, c: C.gold }, { x: 0.24, y: 0.22, a: 40, c: C.green },
        ].map((l, i) => (
          <line key={i} x1={cx+s*l.x} y1={cy+s*l.y} x2={cx+s*l.x+Math.cos(l.a*Math.PI/180)*s*0.06} y2={cy+s*l.y+Math.sin(l.a*Math.PI/180)*s*0.06}
            stroke={l.c} strokeWidth={sw(1, 0.018)} strokeLinecap="round" />
        ))}
      </>
    ),

    on_fire: (
      <>
        {stdEyes(C.coral, s*0.048)}
        {smilePath(0.05, 0.05)}
        <ellipse cx={cx} cy={cy-bR-s*0.01} rx={s*0.06} ry={s*0.03} fill={C.coral} opacity="0.15" />
        <path d={`M${cx},${cy-bR-s*0.01} C${cx-s*0.08},${cy-bR+s*0.06} ${cx-s*0.05},${cy-bR-s*0.06} ${cx},${cy-bR-s*0.14} C${cx+s*0.05},${cy-bR-s*0.06} ${cx+s*0.08},${cy-bR+s*0.06} ${cx},${cy-bR-s*0.01}`} fill={C.coral} />
        <path d={`M${cx},${cy-bR-s*0.01} C${cx-s*0.04},${cy-bR+s*0.03} ${cx-s*0.025},${cy-bR-s*0.03} ${cx},${cy-bR-s*0.08} C${cx+s*0.025},${cy-bR-s*0.03} ${cx+s*0.04},${cy-bR+s*0.03} ${cx},${cy-bR-s*0.01}`} fill={C.gold} />
      </>
    ),

    blue_day: <>{stdEyes(C.blue, s*0.04)}{frown()}<circle cx={cx+s*0.15} cy={cy+s*0.04} r={s*0.014} fill={C.blue} opacity="0.45" /></>,

    sleepyhead: (
      <>
        <path d={`M${cx-s*0.15},${cy-s*0.04} Q${cx-s*0.1},${cy-s*0.09} ${cx-s*0.04},${cy-s*0.04}`} fill="none" stroke={C.accentD} strokeWidth={sw(0.8, 0.02)} strokeLinecap="round" opacity="0.45" />
        <path d={`M${cx+s*0.04},${cy-s*0.04} Q${cx+s*0.1},${cy-s*0.09} ${cx+s*0.15},${cy-s*0.04}`} fill="none" stroke={C.accentD} strokeWidth={sw(0.8, 0.02)} strokeLinecap="round" opacity="0.45" />
        {smilePath(0.03, 0.03)}
        <path d={`M${cx+s*0.2},${cy-s*0.18} L${cx+s*0.28},${cy-s*0.18} L${cx+s*0.2},${cy-s*0.12} L${cx+s*0.28},${cy-s*0.12}`} fill="none" stroke={C.accentL} strokeWidth={sw(0.8, 0.014)} strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
      </>
    ),

    shocked: (
      <>
        <ellipse cx={cx-s*0.1} cy={cy-s*0.05} rx={s*0.085*1.2} ry={s*0.11*1.35} fill="white" />
        <ellipse cx={cx+s*0.1} cy={cy-s*0.05} rx={s*0.085*1.2} ry={s*0.11*1.35} fill="white" />
        <circle cx={cx-s*0.085} cy={cy-s*0.04} r={s*0.035} fill={C.text} />
        <circle cx={cx+s*0.115} cy={cy-s*0.04} r={s*0.035} fill={C.text} />
        <circle cx={cx-s*0.07} cy={cy-s*0.06} r={s*0.012} fill="white" />
        <circle cx={cx+s*0.13} cy={cy-s*0.06} r={s*0.012} fill="white" />
        <ellipse cx={cx} cy={cy+s*0.12} rx={s*0.04} ry={s*0.035} fill={C.accentD} />
      </>
    ),

    love: (
      <>
        <ellipse cx={cx-s*0.1} cy={cy-s*0.05} rx={s*0.085} ry={s*0.11} fill="white" />
        <ellipse cx={cx+s*0.1} cy={cy-s*0.05} rx={s*0.085} ry={s*0.11} fill="white" />
        <circle cx={cx-s*0.09} cy={cy-s*0.04} r={s*0.04} fill={C.coral} />
        <circle cx={cx+s*0.11} cy={cy-s*0.04} r={s*0.04} fill={C.coral} />
        {smilePath(0.06, 0.07)}
        <ellipse cx={cx-s*0.16} cy={cy+s*0.04} rx={s*0.035} ry={s*0.025} fill={C.pink} opacity="0.35" />
        <ellipse cx={cx+s*0.16} cy={cy+s*0.04} rx={s*0.035} ry={s*0.025} fill={C.pink} opacity="0.35" />
      </>
    ),

    go_blank: (
      <>
        <path d={`M${cx-bR+s*0.06},${cy+s*0.1} C${cx-bR-s*0.08},${cy-s*0.02} ${cx-bR-s*0.06},${cy-s*0.18} ${cx-s*0.18},${cy-s*0.04}`} fill="none" stroke={gTo === C.accent ? C.accentD : gTo} strokeWidth={sw(1.5, 0.04)} strokeLinecap="round" />
        <path d={`M${cx+bR-s*0.06},${cy+s*0.1} C${cx+bR+s*0.08},${cy-s*0.02} ${cx+bR+s*0.06},${cy-s*0.18} ${cx+s*0.18},${cy-s*0.04}`} fill="none" stroke={gTo === C.accent ? C.accentD : gTo} strokeWidth={sw(1.5, 0.04)} strokeLinecap="round" />
        <ellipse cx={cx-s*0.11} cy={cy-s*0.03} rx={s*0.11} ry={s*0.065} fill="white" stroke="#DDD9D5" strokeWidth={sw(0.5, 0.007)} />
        <ellipse cx={cx+s*0.11} cy={cy-s*0.03} rx={s*0.11} ry={s*0.065} fill="white" stroke="#DDD9D5" strokeWidth={sw(0.5, 0.007)} />
        {frown()}
      </>
    ),

    // ═══ NEW EPIC EXPRESSIONS ═══
    pirate: (
      <>
        <ellipse cx={cx-s*0.1} cy={cy-s*0.05} rx={s*0.085} ry={s*0.11} fill="white" />
        <circle cx={cx-s*0.085} cy={cy-s*0.04} r={s*0.045} fill={C.text} />
        <circle cx={cx-s*0.07} cy={cy-s*0.06} r={s*0.014} fill="white" />
        <ellipse cx={cx+s*0.1} cy={cy-s*0.05} rx={s*0.095} ry={s*0.12} fill="#3E2723" />
        <line x1={cx-s*0.16} y1={cy-s*0.16} x2={cx+s*0.25} y2={cy} stroke="#3E2723" strokeWidth={sw(0.8, 0.012)} strokeLinecap="round" />
        {smilePath(0.05, 0.06)}
      </>
    ),

    cool: (
      <>
        <rect x={cx-s*0.22} y={cy-s*0.1} width={s*0.17} height={s*0.12} rx={s*0.03} fill="#37474F" stroke="#212121" strokeWidth={sw(0.5, 0.008)} />
        <rect x={cx+s*0.05} y={cy-s*0.1} width={s*0.17} height={s*0.12} rx={s*0.03} fill="#37474F" stroke="#212121" strokeWidth={sw(0.5, 0.008)} />
        <line x1={cx-s*0.05} y1={cy-s*0.04} x2={cx+s*0.05} y2={cy-s*0.04} stroke="#212121" strokeWidth={sw(0.8, 0.012)} strokeLinecap="round" />
        <rect x={cx-s*0.19} y={cy-s*0.09} width={s*0.07} height={s*0.04} rx={s*0.01} fill="rgba(255,255,255,0.2)" />
        <rect x={cx+s*0.08} y={cy-s*0.09} width={s*0.07} height={s*0.04} rx={s*0.01} fill="rgba(255,255,255,0.2)" />
        {smilePath(0.05, 0.05)}
      </>
    ),

    ninja: (
      <>
        <rect x={cx-s*0.32} y={cy-s*0.12} width={s*0.64} height={s*0.15} rx={s*0.02} fill="#212121" />
        <ellipse cx={cx-s*0.1} cy={cy-s*0.05} rx={s*0.06} ry={s*0.06} fill="white" />
        <ellipse cx={cx+s*0.1} cy={cy-s*0.05} rx={s*0.06} ry={s*0.06} fill="white" />
        <circle cx={cx-s*0.09} cy={cy-s*0.04} r={s*0.03} fill={C.text} />
        <circle cx={cx+s*0.11} cy={cy-s*0.04} r={s*0.03} fill={C.text} />
      </>
    ),

    frozen: (
      <>
        {stdEyes("#4FC3F7", s*0.04)}
        {smilePath()}
        <circle cx={cx-s*0.25} cy={cy-s*0.18} r={s*0.02} fill="#4FC3F7" opacity="0.5" />
        <circle cx={cx+s*0.22} cy={cy-s*0.22} r={s*0.015} fill="#4FC3F7" opacity="0.4" />
        <circle cx={cx+s*0.18} cy={cy+s*0.2} r={s*0.018} fill="#4FC3F7" opacity="0.3" />
        <circle cx={cx-s*0.2} cy={cy+s*0.16} r={s*0.012} fill="#B3E5FC" opacity="0.4" />
      </>
    ),

    angel: (
      <>
        <ellipse cx={cx} cy={cy-bR-s*0.06} rx={s*0.16} ry={s*0.04} fill="none" stroke="#FFD700" strokeWidth={sw(1.5, 0.025)} opacity="0.7" />
        {stdEyes("#DAA520", s*0.045)}
        {smilePath(0.05, 0.06)}
      </>
    ),

    devil: (
      <>
        <path d={`M${cx-s*0.14},${cy-bR+s*0.02} L${cx-s*0.2},${cy-bR-s*0.12} L${cx-s*0.08},${cy-bR-s*0.02}`} fill="#FF1744" />
        <path d={`M${cx+s*0.14},${cy-bR+s*0.02} L${cx+s*0.2},${cy-bR-s*0.12} L${cx+s*0.08},${cy-bR-s*0.02}`} fill="#FF1744" />
        {stdEyes("#FF1744", s*0.045)}
        {smilePath(0.06, 0.06)}
      </>
    ),

    robot: (
      <>
        <line x1={cx} y1={cy-bR} x2={cx} y2={cy-bR-s*0.12} stroke="#78909C" strokeWidth={sw(1, 0.015)} strokeLinecap="round" />
        <circle cx={cx} cy={cy-bR-s*0.14} r={s*0.025} fill="#00E676" />
        <rect x={cx-s*0.13} y={cy-s*0.09} width={s*0.1} height={s*0.08} rx={s*0.01} fill="white" />
        <rect x={cx+s*0.03} y={cy-s*0.09} width={s*0.1} height={s*0.08} rx={s*0.01} fill="white" />
        <rect x={cx-s*0.11} y={cy-s*0.06} width={s*0.06} height={s*0.03} rx={s*0.005} fill="#00E676" />
        <rect x={cx+s*0.05} y={cy-s*0.06} width={s*0.06} height={s*0.03} rx={s*0.005} fill="#00E676" />
        {smilePath()}
      </>
    ),

    dizzy: (
      <>
        <ellipse cx={cx-s*0.1} cy={cy-s*0.05} rx={s*0.085} ry={s*0.11} fill="white" />
        <ellipse cx={cx+s*0.1} cy={cy-s*0.05} rx={s*0.085} ry={s*0.11} fill="white" />
        <circle cx={cx-s*0.09} cy={cy-s*0.04} r={s*0.05} fill="none" stroke={C.accent} strokeWidth={sw(0.6, 0.01)} />
        <circle cx={cx-s*0.09} cy={cy-s*0.04} r={s*0.025} fill="none" stroke={C.accent} strokeWidth={sw(0.6, 0.01)} />
        <circle cx={cx+s*0.11} cy={cy-s*0.04} r={s*0.05} fill="none" stroke={C.accent} strokeWidth={sw(0.6, 0.01)} />
        <circle cx={cx+s*0.11} cy={cy-s*0.04} r={s*0.025} fill="none" stroke={C.accent} strokeWidth={sw(0.6, 0.01)} />
        {frown()}
      </>
    ),

    // ═══ LEGENDARIES (body colour changes) ═══
    golden_blink: (
      <>
        <polygon points={`${cx-s*0.14},${cy-bR-s*0.02} ${cx-s*0.1},${cy-bR-s*0.12} ${cx-s*0.04},${cy-bR-s*0.06} ${cx},${cy-bR-s*0.14} ${cx+s*0.04},${cy-bR-s*0.06} ${cx+s*0.1},${cy-bR-s*0.12} ${cx+s*0.14},${cy-bR-s*0.02}`}
          fill="#FFD700" stroke="#DAA520" strokeWidth={sw(0.5, 0.008)} />
        {stdEyes("#DAA520", s*0.05)}
        {bigSmile()}
      </>
    ),

    galaxy_eyes: (
      <>
        {stdEyes("#E040FB", s*0.05)}
        {smilePath(0.04, 0.05)}
        <circle cx={cx-s*0.24} cy={cy-s*0.2} r={s*0.008} fill="white" opacity="0.3" />
        <circle cx={cx+s*0.22} cy={cy-s*0.16} r={s*0.006} fill="white" opacity="0.25" />
        <circle cx={cx+s*0.16} cy={cy+s*0.2} r={s*0.007} fill="white" opacity="0.2" />
      </>
    ),

    rainbow_body: <>{stdEyes()}{bigSmile()}</>,
    shadow_body: <>{stdEyes("rgba(255,255,255,0.8)", s*0.045)}{smilePath()}</>,
    cherry_body: <>{stdEyes(C.coral, s*0.045)}{smilePath(0.05, 0.06)}</>,
  };

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <ellipse cx={cx} cy={cy+bR+s*0.04} rx={bR*0.55} ry={s*0.025} fill="rgba(0,0,0,0.06)" />
      <circle cx={cx} cy={cy} r={bR} fill={`url(#${gId})`} />
      <ellipse cx={cx-s*0.07} cy={cy-s*0.12} rx={bR*0.45} ry={bR*0.3} fill="rgba(255,255,255,0.14)" />
      {faces[type] || faces.default}
      <defs><radialGradient id={gId} cx="38%" cy="32%"><stop offset="0%" stopColor={gFrom} /><stop offset="100%" stopColor={gTo} /></radialGradient></defs>
    </svg>
  );
};

// ═══ CARD ═══
const Card = ({ item }) => {
  const rc = rarityColors[item.rarity];
  return (
    <div style={{
      padding: "12px 8px", borderRadius: 16, textAlign: "center",
      background: item.owned ? rc.bg : "white",
      border: item.owned ? `2px solid ${rc.border}` : "2px solid rgba(0,0,0,0.04)",
      position: "relative",
    }}>
      {item.rarity === "legendary" && <div style={{ position: "absolute", inset: 0, borderRadius: 14, background: `linear-gradient(135deg, transparent 30%, ${C.gold}08 50%, transparent 70%)`, pointerEvents: "none" }} />}
      {!item.owned && !item.adFree && <div style={{ position: "absolute", top: 6, right: 6 }}><svg width="12" height="12" viewBox="0 0 24 24" opacity="0.3"><rect x="5" y="11" width="14" height="10" rx="2" fill={C.textD} /><path d="M8,11 V8 C8,5.5 9.8,4 12,4 C14.2,4 16,5.5 16,8 V11" fill="none" stroke={C.textD} strokeWidth="2" /></svg></div>}
      {item.adFree && !item.owned && <div style={{ position: "absolute", top: 6, right: 6, padding: "1px 5px", borderRadius: 4, background: C.green }}><span style={{ fontSize: 6, fontWeight: 800, color: "white" }}>FREE AD</span></div>}
      <div style={{ marginBottom: 6, display: "flex", justifyContent: "center" }}>{item.preview}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{item.name}</div>
      <div style={{ fontSize: 8, fontWeight: 700, color: rc.text, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 1 }}>{item.rarity}</div>
      {item.owned ? <div style={{ fontSize: 8, fontWeight: 700, color: C.green, marginTop: 3 }}>OWNED</div>
        : item.adFree ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, marginTop: 3 }}><svg width="10" height="10" viewBox="0 0 24 24"><path d="M8,5 L19,12 L8,19Z" fill={C.green} /></svg><span style={{ fontSize: 8, fontWeight: 700, color: C.green }}>Watch ad</span></div>
        : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, marginTop: 3 }}><svg width="8" height="8" viewBox="0 0 40 40"><polygon points="20,4 32,14 28,36 12,36 8,14" fill={C.accent} /></svg><span style={{ fontSize: 9, fontWeight: 700, color: C.accent }}>{item.cost}</span></div>}
    </div>
  );
};

// ═══ FRAME + BANNER PREVIEWS ═══
const FramePrev = ({ borderColor, glow, sparkle }) => (
  <div style={{ width: 44, height: 44, borderRadius: 14, margin: "0 auto", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "white", border: `3px solid ${borderColor}`, boxShadow: glow ? `0 0 10px ${borderColor}50` : "none", position: "relative" }}>D
    {sparkle && <><div style={{ position: "absolute", top: -2, right: -2, width: 5, height: 5, borderRadius: 3, background: C.gold }} /><div style={{ position: "absolute", bottom: 0, left: -3, width: 4, height: 4, borderRadius: 2, background: C.gold, opacity: 0.6 }} /></>}
  </div>
);
const BanPrev = ({ gradient }) => <div style={{ width: "100%", height: 32, borderRadius: 8, background: gradient }} />;

// ═══ DATA ═══
const expressions = [
  { id: "wink", name: "Wink", rarity: "common", cost: 30, owned: false, adFree: true, preview: <BlinkExpr type="wink" size={48} /> },
  { id: "tongue", name: "Tongue Out", rarity: "common", cost: 30, owned: false, adFree: true, preview: <BlinkExpr type="tongue" size={48} /> },
  { id: "pirate", name: "Pirate", rarity: "epic", cost: 120, owned: false, preview: <BlinkExpr type="pirate" size={48} /> },
  { id: "cool", name: "Cool Guy", rarity: "epic", cost: 120, owned: false, preview: <BlinkExpr type="cool" size={48} /> },
  { id: "ninja", name: "Ninja", rarity: "epic", cost: 150, owned: false, preview: <BlinkExpr type="ninja" size={48} /> },
  { id: "frozen", name: "Frozen", rarity: "epic", cost: 120, owned: false, preview: <BlinkExpr type="frozen" bodyColor="ice" size={48} /> },
  { id: "angel", name: "Angel", rarity: "epic", cost: 150, owned: false, preview: <BlinkExpr type="angel" size={48} /> },
  { id: "devil", name: "Little Devil", rarity: "epic", cost: 150, owned: false, preview: <BlinkExpr type="devil" size={48} /> },
  { id: "robot", name: "Robot", rarity: "epic", cost: 120, owned: false, preview: <BlinkExpr type="robot" size={48} /> },
  { id: "dizzy", name: "Dizzy", rarity: "epic", cost: 100, owned: false, preview: <BlinkExpr type="dizzy" size={48} /> },
  { id: "golden", name: "Golden Blink", rarity: "legendary", cost: 300, owned: false, preview: <BlinkExpr type="golden_blink" bodyColor="golden" size={48} /> },
  { id: "galaxy", name: "Galaxy", rarity: "legendary", cost: 300, owned: false, preview: <BlinkExpr type="galaxy_eyes" bodyColor="galaxy" size={48} /> },
  { id: "rainbow", name: "Rainbow", rarity: "legendary", cost: 350, owned: false, preview: <BlinkExpr type="rainbow_body" bodyColor="rainbow" size={48} /> },
  { id: "shadow", name: "Shadow", rarity: "legendary", cost: 300, owned: false, preview: <BlinkExpr type="shadow_body" bodyColor="shadow" size={48} /> },
  { id: "cherry", name: "Cherry Blossom", rarity: "legendary", cost: 350, owned: false, preview: <BlinkExpr type="cherry_body" bodyColor="cherry" size={48} /> },
];

const frames = [
  { id: "lightning", name: "Lightning", rarity: "rare", cost: 60, owned: false, preview: <FramePrev borderColor="#FFEB3B" glow /> },
  { id: "vines", name: "Vines", rarity: "rare", cost: 60, owned: false, preview: <FramePrev borderColor="#4CAF50" /> },
  { id: "ocean", name: "Ocean", rarity: "rare", cost: 60, owned: false, preview: <FramePrev borderColor="#00BCD4" glow /> },
  { id: "flame_ring", name: "Flame Ring", rarity: "epic", cost: 100, owned: false, preview: <FramePrev borderColor="#FF5722" glow /> },
  { id: "ice_crystal", name: "Ice Crystal", rarity: "epic", cost: 100, owned: false, preview: <FramePrev borderColor="#4FC3F7" glow /> },
  { id: "neon_pulse", name: "Neon Pulse", rarity: "epic", cost: 120, owned: false, preview: <FramePrev borderColor="#E040FB" glow /> },
  { id: "halo_frame", name: "Halo", rarity: "legendary", cost: 250, owned: false, preview: <FramePrev borderColor="#FFD700" glow sparkle /> },
  { id: "galaxy_ring", name: "Galaxy Ring", rarity: "legendary", cost: 250, owned: false, preview: <FramePrev borderColor="#7B1FA2" glow /> },
  { id: "diamond", name: "Diamond", rarity: "legendary", cost: 300, owned: false, preview: <FramePrev borderColor="#B3E5FC" glow sparkle /> },
  { id: "dotted", name: "Dotted", rarity: "common", cost: 25, owned: false, adFree: true, preview: <FramePrev borderColor={C.textD} /> },
];

const banners = [
  { id: "storm", name: "Storm", rarity: "rare", cost: 60, owned: false, preview: <BanPrev gradient="linear-gradient(135deg, #1A237E, #4A148C, #311B92)" /> },
  { id: "autumn", name: "Autumn", rarity: "rare", cost: 60, owned: false, preview: <BanPrev gradient="linear-gradient(135deg, #BF360C, #E65100, #F57F17)" /> },
  { id: "mint", name: "Mint Fresh", rarity: "rare", cost: 60, owned: false, preview: <BanPrev gradient="linear-gradient(135deg, #00BFA5, #1DE9B6, #A7FFEB)" /> },
  { id: "lightning_storm", name: "Lightning Storm", rarity: "epic", cost: 120, owned: false, preview: <BanPrev gradient="linear-gradient(135deg, #1A1A2E, #4A148C, #FFEB3B, #1A1A2E)" /> },
  { id: "aurora", name: "Aurora", rarity: "epic", cost: 120, owned: false, preview: <BanPrev gradient="linear-gradient(135deg, #1B5E20, #00BCD4, #E040FB, #1A237E)" /> },
  { id: "neon_city", name: "Neon City", rarity: "epic", cost: 150, owned: false, preview: <BanPrev gradient="linear-gradient(135deg, #0D0D1A, #E040FB, #00E5FF, #0D0D1A)" /> },
  { id: "underwater", name: "Underwater", rarity: "epic", cost: 120, owned: false, preview: <BanPrev gradient="linear-gradient(180deg, #0277BD, #00838F, #004D40)" /> },
  { id: "lava", name: "Lava Flow", rarity: "epic", cost: 120, owned: false, preview: <BanPrev gradient="linear-gradient(135deg, #BF360C, #FF6D00, #FFD600, #BF360C)" /> },
  { id: "galaxy_banner", name: "Galaxy", rarity: "legendary", cost: 300, owned: false, preview: <BanPrev gradient="linear-gradient(135deg, #0D0D2B, #4A148C, #E040FB, #00BCD4, #0D0D2B)" /> },
  { id: "holographic", name: "Holographic", rarity: "legendary", cost: 350, owned: false, preview: <BanPrev gradient="linear-gradient(135deg, #FF6B6B, #FFD93D, #00B894, #0984E3, #6C5CE7, #FD79A8)" /> },
  { id: "celestial", name: "Celestial", rarity: "legendary", cost: 300, owned: false, preview: <BanPrev gradient="linear-gradient(180deg, #000428, #004e92, #FFD700)" /> },
  { id: "pastel_pink", name: "Pastel Pink", rarity: "common", cost: 25, owned: false, adFree: true, preview: <BanPrev gradient="linear-gradient(135deg, #FCE4EC, #F8BBD0)" /> },
  { id: "grey_slate", name: "Slate", rarity: "common", cost: 25, owned: false, adFree: true, preview: <BanPrev gradient="linear-gradient(135deg, #CFD8DC, #90A4AE)" /> },
];

// ═══ SHOWCASE ═══
export default function CosmeticsExpanded() {
  const [tab, setTab] = useState("expressions");
  const data = { expressions, frames, banners };

  return (
    <div style={{ width: 390, height: 844, margin: "20px auto", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif", background: "#FAFAF7", borderRadius: 24, overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "50px 20px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: C.text }}>New Cosmetics</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4, background: `${C.accent}10`, padding: "5px 12px", borderRadius: 16 }}>
          <svg width="14" height="14" viewBox="0 0 40 40"><polygon points="20,4 32,14 28,36 12,36 8,14" fill={C.accent} /></svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>248</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, padding: "0 20px 8px" }}>
        {["expressions", "frames", "banners"].map(t => (
          <div key={t} onClick={() => setTab(t)} style={{ padding: "6px 16px", borderRadius: 10, cursor: "pointer", background: t === tab ? C.accent : "white", border: t === tab ? "none" : "1.5px solid rgba(0,0,0,0.05)" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: t === tab ? "white" : C.textM, textTransform: "capitalize" }}>{t}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, padding: "0 20px 8px" }}>
        {Object.entries(rarityColors).map(([n, rc]) => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <div style={{ width: 6, height: 6, borderRadius: 3, background: rc.text }} />
            <span style={{ fontSize: 8, fontWeight: 600, color: rc.text, textTransform: "capitalize" }}>{n}</span>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "0 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {data[tab].map(item => <Card key={item.id} item={item} />)}
        </div>
        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}
