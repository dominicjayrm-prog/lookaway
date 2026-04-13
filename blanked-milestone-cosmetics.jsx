import React from "react";

const C = {
  accent: "#6C5CE7", accentL: "#A29BFE", accentD: "#4A3BBF",
  green: "#00B894", coral: "#FF6B6B", gold: "#D4A012", blue: "#0984E3",
  pink: "#FD79A8", teal: "#00CEC9",
  text: "#1A1A18", textM: "#636E72", textD: "#B2BEC3",
};

const rc = {
  common: "#636E72",
  rare: "#0984E3",
  epic: "#6C5CE7",
  legendary: "#D4A012",
};

// ═══ BLINK EXPRESSIONS ═══
const BlinkExpr = ({ type, size = 56 }) => {
  const s = size, cx = s/2, cy = s/2 + s*0.04, bR = s*0.38;
  const sw = (min, pct) => Math.max(min, s * pct);

  const stdEye = (side, pc = C.text, pr = s*0.045, rxMul = 1, ryMul = 1) => {
    const ex = side === "L" ? cx - s*0.1 : cx + s*0.1;
    const px = side === "L" ? cx - s*0.085 : cx + s*0.115;
    const spx = side === "L" ? cx - s*0.07 : cx + s*0.13;
    return (
      <>
        <ellipse cx={ex} cy={cy-s*0.05} rx={s*0.085*rxMul} ry={s*0.11*ryMul} fill="white" />
        <circle cx={px} cy={cy-s*0.04} r={pr} fill={pc} />
        <circle cx={spx} cy={cy-s*0.06} r={s*0.014} fill="white" />
      </>
    );
  };

  const smile = () => <path d={`M${cx-s*0.04},${cy+s*0.1} Q${cx},${cy+s*0.14} ${cx+s*0.04},${cy+s*0.1}`} fill="none" stroke={C.text} strokeWidth={sw(1, 0.018)} strokeLinecap="round" />;
  const bigSmile = () => <path d={`M${cx-s*0.08},${cy+s*0.08} Q${cx},${cy+s*0.19} ${cx+s*0.08},${cy+s*0.08}`} fill="none" stroke={C.text} strokeWidth={sw(1, 0.02)} strokeLinecap="round" />;

  const expressions = {
    sharp_eye: (
      <>
        {/* Left eye normal */}
        {stdEye("L")}
        {/* Right eye squinting — shorter ry */}
        <ellipse cx={cx+s*0.1} cy={cy-s*0.04} rx={s*0.085} ry={s*0.075} fill="white" />
        <circle cx={cx+s*0.115} cy={cy-s*0.035} r={s*0.04} fill={C.text} />
        <circle cx={cx+s*0.13} cy={cy-s*0.05} r={s*0.012} fill="white" />
        {/* Raised left eyebrow */}
        <path d={`M${cx-s*0.16},${cy-s*0.18} Q${cx-s*0.1},${cy-s*0.24} ${cx-s*0.03},${cy-s*0.18}`}
          fill="none" stroke={C.text} strokeWidth={sw(0.8, 0.018)} strokeLinecap="round" />
        {smile()}
      </>
    ),

    lightning_mind: (
      <>
        {stdEye("L", "#FFD600", s*0.05)}
        {stdEye("R", "#FFD600", s*0.05)}
        {bigSmile()}
        {/* Left bolt */}
        <path d={`M${cx-s*0.26},${cy-s*0.18} L${cx-s*0.22},${cy-s*0.24} L${cx-s*0.2},${cy-s*0.18} L${cx-s*0.17},${cy-s*0.22}`}
          fill="none" stroke="#FFD600" strokeWidth={sw(0.8, 0.014)} strokeLinecap="round" strokeLinejoin="round" />
        {/* Right bolt */}
        <path d={`M${cx+s*0.17},${cy-s*0.22} L${cx+s*0.2},${cy-s*0.18} L${cx+s*0.22},${cy-s*0.24} L${cx+s*0.26},${cy-s*0.18}`}
          fill="none" stroke="#FFD600" strokeWidth={sw(0.8, 0.014)} strokeLinecap="round" strokeLinejoin="round" />
        {/* Top bolt */}
        <path d={`M${cx-s*0.05},${cy-bR-s*0.02} L${cx},${cy-bR-s*0.1} L${cx+s*0.02},${cy-bR-s*0.04} L${cx+s*0.05},${cy-bR-s*0.1}`}
          fill="none" stroke="#FFD600" strokeWidth={sw(0.8, 0.016)} strokeLinecap="round" strokeLinejoin="round" />
        {/* Glow */}
        <circle cx={cx} cy={cy-bR-s*0.06} r={s*0.03} fill="#FFD600" opacity="0.15" />
      </>
    ),

    detective: (
      <>
        {/* Left eye normal */}
        {stdEye("L")}
        {/* Right eye magnified — bigger ellipse + bigger pupil */}
        <ellipse cx={cx+s*0.1} cy={cy-s*0.05} rx={s*0.11} ry={s*0.14} fill="white" />
        <circle cx={cx+s*0.115} cy={cy-s*0.04} r={s*0.06} fill={C.text} />
        <circle cx={cx+s*0.13} cy={cy-s*0.06} r={s*0.018} fill="white" />
        {/* Magnifying glass rim */}
        <circle cx={cx+s*0.1} cy={cy-s*0.05} r={s*0.14} fill="none" stroke="#78909C" strokeWidth={sw(1.2, 0.02)} />
        {/* Handle */}
        <line x1={cx+s*0.2} y1={cy+s*0.06} x2={cx+s*0.28} y2={cy+s*0.16}
          stroke="#78909C" strokeWidth={sw(1.5, 0.025)} strokeLinecap="round" />
        {smile()}
      </>
    ),

    motion_master: (
      <>
        {/* Motion blur trails BEHIND eyes */}
        <ellipse cx={cx-s*0.16} cy={cy-s*0.05} rx={s*0.06} ry={s*0.08} fill={C.blue} opacity="0.08" />
        <ellipse cx={cx-s*0.14} cy={cy-s*0.05} rx={s*0.07} ry={s*0.09} fill={C.blue} opacity="0.12" />
        <ellipse cx={cx+s*0.04} cy={cy-s*0.05} rx={s*0.06} ry={s*0.08} fill={C.blue} opacity="0.08" />
        <ellipse cx={cx+s*0.06} cy={cy-s*0.05} rx={s*0.07} ry={s*0.09} fill={C.blue} opacity="0.12" />
        {/* Eyes with blue pupils */}
        {stdEye("L", C.blue, s*0.05)}
        {stdEye("R", C.blue, s*0.05)}
        {/* Speed lines */}
        <line x1={cx-s*0.3} y1={cy-s*0.08} x2={cx-s*0.22} y2={cy-s*0.08} stroke={C.blue} strokeWidth={sw(0.6, 0.01)} strokeLinecap="round" opacity="0.3" />
        <line x1={cx-s*0.32} y1={cy-s*0.02} x2={cx-s*0.24} y2={cy-s*0.02} stroke={C.blue} strokeWidth={sw(0.6, 0.01)} strokeLinecap="round" opacity="0.2" />
        <line x1={cx+s*0.22} y1={cy-s*0.06} x2={cx+s*0.3} y2={cy-s*0.06} stroke={C.blue} strokeWidth={sw(0.6, 0.01)} strokeLinecap="round" opacity="0.3" />
        <line x1={cx+s*0.24} y1={cy} x2={cx+s*0.32} y2={cy} stroke={C.blue} strokeWidth={sw(0.6, 0.01)} strokeLinecap="round" opacity="0.2" />
        {bigSmile()}
      </>
    ),

    mastermind_boss: (
      <>
        {/* Eyes behind glasses */}
        <ellipse cx={cx-s*0.1} cy={cy-s*0.04} rx={s*0.075} ry={s*0.095} fill="white" />
        <ellipse cx={cx+s*0.1} cy={cy-s*0.04} rx={s*0.075} ry={s*0.095} fill="white" />
        <circle cx={cx-s*0.085} cy={cy-s*0.03} r={s*0.04} fill={C.gold} />
        <circle cx={cx+s*0.115} cy={cy-s*0.03} r={s*0.04} fill={C.gold} />
        <circle cx={cx-s*0.07} cy={cy-s*0.05} r={s*0.012} fill="white" />
        <circle cx={cx+s*0.13} cy={cy-s*0.05} r={s*0.012} fill="white" />
        {/* Gold-framed dark sunglasses */}
        <rect x={cx-s*0.24} y={cy-s*0.12} width={s*0.18} height={s*0.14} rx={s*0.03} fill="#1A1A18" opacity="0.85" stroke={C.gold} strokeWidth={sw(1, 0.015)} />
        <rect x={cx+s*0.06} y={cy-s*0.12} width={s*0.18} height={s*0.14} rx={s*0.03} fill="#1A1A18" opacity="0.85" stroke={C.gold} strokeWidth={sw(1, 0.015)} />
        {/* Bridge */}
        <line x1={cx-s*0.06} y1={cy-s*0.05} x2={cx+s*0.06} y2={cy-s*0.05} stroke={C.gold} strokeWidth={sw(1, 0.015)} strokeLinecap="round" />
        {/* Temple arms */}
        <line x1={cx-s*0.24} y1={cy-s*0.08} x2={cx-s*0.34} y2={cy-s*0.06} stroke={C.gold} strokeWidth={sw(0.8, 0.012)} strokeLinecap="round" />
        <line x1={cx+s*0.24} y1={cy-s*0.08} x2={cx+s*0.34} y2={cy-s*0.06} stroke={C.gold} strokeWidth={sw(0.8, 0.012)} strokeLinecap="round" />
        {/* Lens glare */}
        <rect x={cx-s*0.21} y={cy-s*0.1} width={s*0.06} height={s*0.03} rx={s*0.008} fill="rgba(255,255,255,0.15)" />
        <rect x={cx+s*0.09} y={cy-s*0.1} width={s*0.06} height={s*0.03} rx={s*0.008} fill="rgba(255,255,255,0.15)" />
        {/* Confident smile */}
        <path d={`M${cx-s*0.06},${cy+s*0.1} Q${cx},${cy+s*0.17} ${cx+s*0.06},${cy+s*0.1}`} fill="none" stroke={C.text} strokeWidth={sw(1, 0.02)} strokeLinecap="round" />
      </>
    ),
  };

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <ellipse cx={cx} cy={cy+bR+s*0.04} rx={bR*0.55} ry={s*0.025} fill="rgba(0,0,0,0.06)" />
      <circle cx={cx} cy={cy} r={bR} fill={`url(#mg-${s}-${type})`} />
      <ellipse cx={cx-s*0.07} cy={cy-s*0.12} rx={bR*0.45} ry={bR*0.3} fill="rgba(255,255,255,0.14)" />
      {expressions[type]}
      <defs>
        <radialGradient id={`mg-${s}-${type}`} cx="38%" cy="32%">
          <stop offset="0%" stopColor={C.accentL} /><stop offset="100%" stopColor={C.accent} />
        </radialGradient>
      </defs>
    </svg>
  );
};

// ═══ FRAME PREVIEW ═══
const Frame = ({ borderColor, glow, gradient }) => (
  <div style={{
    width: 48, height: 48, borderRadius: 15, margin: "0 auto",
    background: gradient || C.accent,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 19, fontWeight: 700, color: "white",
    border: `3px solid ${borderColor}`,
    boxShadow: glow ? `0 0 10px ${borderColor}50` : "none",
  }}>D</div>
);

// ═══ BANNER PREVIEW ═══
const Banner = ({ gradient }) => (
  <div style={{ width: "100%", height: 34, borderRadius: 8, background: gradient }} />
);

// ═══ FLAT ITEM CARD ═══
const ItemCard = ({ preview, name, rarity, category, world, level, milestone, earn }) => (
  <div style={{
    background: "white", borderRadius: 16, padding: 12,
    border: rarity === "legendary" ? `2px solid ${rc.legendary}30` : "1.5px solid rgba(0,0,0,0.04)",
    position: "relative",
  }}>
    {rarity === "legendary" && <div style={{ position: "absolute", inset: 0, borderRadius: 14, background: `linear-gradient(135deg, transparent 30%, ${C.gold}06 50%, transparent 70%)`, pointerEvents: "none" }} />}

    {/* Top row: world/level badge + rarity */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: C.textD }}>W{world} L{level}</span>
        <span style={{ fontSize: 7, color: C.textD }}>·</span>
        <span style={{ fontSize: 8, fontWeight: 600, color: milestone === "HALFWAY" ? C.gold : C.green }}>{milestone}</span>
      </div>
      <div style={{ padding: "1px 6px", borderRadius: 4, background: `${rc[rarity]}10` }}>
        <span style={{ fontSize: 7, fontWeight: 700, color: rc[rarity], textTransform: "uppercase" }}>{rarity}</span>
      </div>
    </div>

    {/* Preview */}
    <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
      {preview}
    </div>

    {/* Name + category */}
    <div style={{ textAlign: "center", marginBottom: 4 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{name}</div>
      <div style={{ fontSize: 9, color: C.textD }}>{category}</div>
    </div>

    {/* Earn condition */}
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
      padding: "4px 8px", borderRadius: 6, background: `${C.green}06`,
    }}>
      <span style={{ fontSize: 8 }}>🎁</span>
      <span style={{ fontSize: 8, fontWeight: 600, color: C.green }}>{earn}</span>
    </div>
  </div>
);

// ═══ REFERENCE SHEET ═══
export default function MilestoneReference() {
  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
      background: "#FAFAF7", minHeight: "100vh", padding: "30px 16px",
    }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, textAlign: "center", margin: "0 0 2px" }}>Milestone Cosmetics Reference</h1>
        <p style={{ fontSize: 12, color: C.textM, textAlign: "center", margin: "0 0 20px" }}>12 earn-only cosmetics · Classic mode progression</p>

        {/* ═══ EXPRESSIONS (5) ═══ */}
        <h2 style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 8, borderBottom: `2px solid ${C.accent}15`, paddingBottom: 4 }}>Expressions (5)</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 24 }}>
          <ItemCard
            preview={<BlinkExpr type="sharp_eye" size={56} />}
            name="Sharp Eye" rarity="common" category="Expression"
            world={2} level={15} milestone="HALFWAY"
            earn="Reach L15 in Colour & Position"
          />
          <ItemCard
            preview={<BlinkExpr type="detective" size={56} />}
            name="Detective" rarity="rare" category="Expression"
            world={4} level={18} milestone="HALFWAY"
            earn="Reach L18 in Hidden Details"
          />
          <ItemCard
            preview={<BlinkExpr type="lightning_mind" size={56} />}
            name="Lightning Mind" rarity="epic" category="Expression"
            world={3} level={35} milestone="COMPLETE"
            earn="Complete Speed & Count"
          />
          <ItemCard
            preview={<BlinkExpr type="motion_master" size={56} />}
            name="Motion Master" rarity="epic" category="Expression"
            world={5} level={40} milestone="COMPLETE"
            earn="Complete Moving Shapes"
          />
          <ItemCard
            preview={<BlinkExpr type="mastermind_boss" size={56} />}
            name="Mastermind" rarity="legendary" category="Expression"
            world={6} level={40} milestone="COMPLETE"
            earn="Complete Deep Memory"
          />
        </div>

        {/* ═══ FRAMES (4) ═══ */}
        <h2 style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 8, borderBottom: `2px solid ${C.accent}15`, paddingBottom: 4 }}>Frames (4)</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 24 }}>
          <ItemCard
            preview={<Frame borderColor={C.teal} glow={false} />}
            name="Starter" rarity="common" category="Frame"
            world={1} level={10} milestone="HALFWAY"
            earn="Reach L10 in Shape Basics"
          />
          <ItemCard
            preview={<Frame borderColor="#FF9F43" glow={true} />}
            name="Speedster" rarity="rare" category="Frame"
            world={3} level={18} milestone="HALFWAY"
            earn="Reach L18 in Speed & Count"
          />
          <ItemCard
            preview={<Frame borderColor="#2ECC71" glow={true} />}
            name="Eagle Eye" rarity="epic" category="Frame"
            world={4} level={35} milestone="COMPLETE"
            earn="Complete Hidden Details"
          />
          <ItemCard
            preview={<Frame borderColor={C.gold} glow={true} gradient={`linear-gradient(135deg, ${C.gold}, ${C.accent})`} />}
            name="Temporal" rarity="epic" category="Frame"
            world={6} level={20} milestone="HALFWAY"
            earn="Reach L20 in Deep Memory"
          />
        </div>

        {/* ═══ BANNERS (3) ═══ */}
        <h2 style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 8, borderBottom: `2px solid ${C.accent}15`, paddingBottom: 4 }}>Banners (3)</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 24 }}>
          <ItemCard
            preview={<Banner gradient={`linear-gradient(135deg, ${C.teal}, #B2DFDB, white)`} />}
            name="First Steps" rarity="rare" category="Banner"
            world={1} level={30} milestone="COMPLETE"
            earn="Complete Shape Basics"
          />
          <ItemCard
            preview={<Banner gradient={`linear-gradient(135deg, ${C.coral}, ${C.gold}, ${C.green}, ${C.blue}, ${C.accent})`} />}
            name="Colour Pro" rarity="rare" category="Banner"
            world={2} level={30} milestone="COMPLETE"
            earn="Complete Colour & Position"
          />
          <ItemCard
            preview={<Banner gradient={`linear-gradient(135deg, #1A237E, ${C.accent}, #4A148C)`} />}
            name="Focused" rarity="rare" category="Banner"
            world={5} level={20} milestone="HALFWAY"
            earn="Reach L20 in Moving Shapes"
          />
        </div>

        {/* ═══ PROGRESSION MAP ═══ */}
        <h2 style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 8, borderBottom: `2px solid ${C.accent}15`, paddingBottom: 4 }}>Unlock Progression</h2>
        <div style={{ background: "white", borderRadius: 16, padding: 16, border: "1px solid rgba(0,0,0,0.04)" }}>
          {[
            { w: 1, name: "Shape Basics", rewards: [{ l: 10, n: "Starter Frame", r: "common" }, { l: 30, n: "First Steps Banner", r: "rare" }] },
            { w: 2, name: "Colour & Position", rewards: [{ l: 15, n: "Sharp Eye", r: "common" }, { l: 30, n: "Colour Pro Banner", r: "rare" }] },
            { w: 3, name: "Speed & Count", rewards: [{ l: 18, n: "Speedster Frame", r: "rare" }, { l: 35, n: "Lightning Mind", r: "epic" }] },
            { w: 4, name: "Hidden Details", rewards: [{ l: 18, n: "Detective", r: "rare" }, { l: 35, n: "Eagle Eye Frame", r: "epic" }] },
            { w: 5, name: "Moving Shapes", rewards: [{ l: 20, n: "Focused Banner", r: "rare" }, { l: 40, n: "Motion Master", r: "epic" }] },
            { w: 6, name: "Deep Memory", rewards: [{ l: 20, n: "Temporal Frame", r: "epic" }, { l: 40, n: "Mastermind", r: "legendary" }] },
          ].map((world, wi) => (
            <div key={wi} style={{ marginBottom: wi < 5 ? 10 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, background: world.w === 6 ? C.gold : C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: "white" }}>{world.w}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{world.name}</span>
              </div>
              <div style={{ display: "flex", gap: 6, marginLeft: 26 }}>
                {world.rewards.map((rew, ri) => (
                  <div key={ri} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, background: `${rc[rew.r]}08` }}>
                    <span style={{ fontSize: 8, fontWeight: 700, color: C.textM }}>L{rew.l}</span>
                    <span style={{ fontSize: 8, fontWeight: 600, color: rc[rew.r] }}>{rew.n}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
