import { useState } from "react";

const C = {
  accent: "#6C5CE7", accentL: "#A29BFE", accentD: "#4A3BBF",
  green: "#00B894", coral: "#FF6B6B", gold: "#D4A012", blue: "#0984E3",
  pink: "#FD79A8", teal: "#00CEC9",
  text: "#1A1A18", textM: "#636E72", textD: "#B2BEC3",
};

// ═══ BLINK EXPRESSIONS ═══
const Blink = ({ expression = "sad", size = 80 }) => {
  const s = size, cx = s/2, cy = s/2 + s*0.04, bR = s*0.38;
  const sw = (min, pct) => Math.max(min, s * pct);

  const faces = {
    sad: (
      <>
        <ellipse cx={cx-s*0.1} cy={cy-s*0.05} rx={s*0.085} ry={s*0.11*0.8} fill="white" />
        <ellipse cx={cx+s*0.1} cy={cy-s*0.05} rx={s*0.085} ry={s*0.11*0.8} fill="white" />
        <circle cx={cx-s*0.085} cy={cy-s*0.025} r={s*0.04} fill={C.textM} />
        <circle cx={cx+s*0.115} cy={cy-s*0.025} r={s*0.04} fill={C.textM} />
        <path d={`M${cx+s*0.15},${cy-s*0.01} Q${cx+s*0.17},${cy+s*0.04} ${cx+s*0.15},${cy+s*0.06} Q${cx+s*0.13},${cy+s*0.04} ${cx+s*0.15},${cy-s*0.01}`} fill={C.blue} opacity="0.4" />
        <path d={`M${cx-s*0.05},${cy+s*0.13} Q${cx},${cy+s*0.09} ${cx+s*0.05},${cy+s*0.13}`} fill="none" stroke={C.text} strokeWidth={sw(1,0.016)} strokeLinecap="round" />
      </>
    ),
    worried: (
      <>
        <ellipse cx={cx-s*0.1} cy={cy-s*0.05} rx={s*0.085} ry={s*0.11} fill="white" />
        <ellipse cx={cx+s*0.1} cy={cy-s*0.05} rx={s*0.085} ry={s*0.11} fill="white" />
        <circle cx={cx-s*0.085} cy={cy-s*0.03} r={s*0.045} fill={C.coral} />
        <circle cx={cx+s*0.115} cy={cy-s*0.03} r={s*0.045} fill={C.coral} />
        <circle cx={cx-s*0.07} cy={cy-s*0.05} r={s*0.013} fill="white" />
        <circle cx={cx+s*0.13} cy={cy-s*0.05} r={s*0.013} fill="white" />
        <path d={`M${cx-s*0.15},${cy-s*0.16} Q${cx-s*0.1},${cy-s*0.2} ${cx-s*0.04},${cy-s*0.18}`} fill="none" stroke={C.text} strokeWidth={sw(0.8,0.016)} strokeLinecap="round" opacity="0.45" />
        <path d={`M${cx+s*0.04},${cy-s*0.18} Q${cx+s*0.1},${cy-s*0.2} ${cx+s*0.15},${cy-s*0.16}`} fill="none" stroke={C.text} strokeWidth={sw(0.8,0.016)} strokeLinecap="round" opacity="0.45" />
        <path d={`M${cx+s*0.2},${cy-s*0.1} Q${cx+s*0.22},${cy-s*0.04} ${cx+s*0.2},${cy+s*0.02} Q${cx+s*0.18},${cy-s*0.04} ${cx+s*0.2},${cy-s*0.1}`} fill={C.blue} opacity="0.3" />
        <path d={`M${cx-s*0.06},${cy+s*0.11} Q${cx-s*0.03},${cy+s*0.09} ${cx},${cy+s*0.11} Q${cx+s*0.03},${cy+s*0.13} ${cx+s*0.06},${cy+s*0.11}`} fill="none" stroke={C.text} strokeWidth={sw(1,0.016)} strokeLinecap="round" />
      </>
    ),
    crying: (
      <>
        <ellipse cx={cx-s*0.1} cy={cy-s*0.05} rx={s*0.085} ry={s*0.11*0.7} fill="white" />
        <ellipse cx={cx+s*0.1} cy={cy-s*0.05} rx={s*0.085} ry={s*0.11*0.7} fill="white" />
        <circle cx={cx-s*0.09} cy={cy-s*0.03} r={s*0.035} fill={C.textM} />
        <circle cx={cx+s*0.11} cy={cy-s*0.03} r={s*0.035} fill={C.textM} />
        <path d={`M${cx-s*0.12},${cy+s*0.01} Q${cx-s*0.14},${cy+s*0.06} ${cx-s*0.12},${cy+s*0.08} Q${cx-s*0.1},${cy+s*0.06} ${cx-s*0.12},${cy+s*0.01}`} fill={C.blue} opacity="0.35" />
        <path d={`M${cx+s*0.15},${cy} Q${cx+s*0.17},${cy+s*0.05} ${cx+s*0.15},${cy+s*0.07} Q${cx+s*0.13},${cy+s*0.05} ${cx+s*0.15},${cy}`} fill={C.blue} opacity="0.35" />
        <path d={`M${cx-s*0.14},${cy-s*0.14} Q${cx-s*0.1},${cy-s*0.18} ${cx-s*0.04},${cy-s*0.16}`} fill="none" stroke={C.text} strokeWidth={sw(0.8,0.016)} strokeLinecap="round" opacity="0.4" />
        <path d={`M${cx+s*0.04},${cy-s*0.16} Q${cx+s*0.1},${cy-s*0.18} ${cx+s*0.14},${cy-s*0.14}`} fill="none" stroke={C.text} strokeWidth={sw(0.8,0.016)} strokeLinecap="round" opacity="0.4" />
        <ellipse cx={cx} cy={cy+s*0.12} rx={s*0.04} ry={s*0.03} fill={C.accentD} />
      </>
    ),
  };

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <ellipse cx={cx} cy={cy+bR+s*0.04} rx={bR*0.55} ry={s*0.025} fill="rgba(0,0,0,0.06)" />
      <circle cx={cx} cy={cy} r={bR} fill={`url(#bsm-${s}-${expression})`} />
      <ellipse cx={cx-s*0.07} cy={cy-s*0.12} rx={bR*0.45} ry={bR*0.3} fill="rgba(255,255,255,0.14)" />
      {faces[expression]}
      <defs><radialGradient id={`bsm-${s}-${expression}`} cx="38%" cy="32%"><stop offset="0%" stopColor={C.accentL}/><stop offset="100%" stopColor={C.accent}/></radialGradient></defs>
    </svg>
  );
};

// ═══ PRICING ═══
function getRecoveryPrice(streak, daysMissed) {
  if (daysMissed <= 0) return 0;
  if (daysMissed === 1) return 10;
  if (daysMissed === 2) return 25;
  if (daysMissed === 3) return 40;
  if (daysMissed <= 7) return Math.round(streak * 0.3 + daysMissed * 10);
  if (daysMissed <= 14) return Math.round(streak * 0.5 + daysMissed * 15);
  return -1;
}

const scenarios = [
  { id: "shield_1d", label: "Shield (1 day)", streak: 42, daysMissed: 1, shields: 3, gems: 120 },
  { id: "noshield_1d", label: "No shield (1 day)", streak: 42, daysMissed: 1, shields: 0, gems: 120 },
  { id: "missed_3d", label: "3 days missed", streak: 67, daysMissed: 3, shields: 1, gems: 200 },
  { id: "missed_7d", label: "7 days missed", streak: 100, daysMissed: 7, shields: 0, gems: 300 },
  { id: "missed_14d", label: "14 days missed", streak: 100, daysMissed: 14, shields: 0, gems: 400 },
  { id: "gone", label: "15+ days (gone)", streak: 85, daysMissed: 20, shields: 0, gems: 50 },
];

// ═══ PREMIUM MODAL ═══
const StreakModal = ({ scenario }) => {
  const { streak, daysMissed, shields, gems } = scenario;
  const price = getRecoveryPrice(streak, daysMissed);
  const isGone = price === -1;
  const canAfford = gems >= price;
  const hasShield = shields > 0 && daysMissed <= 3;
  const shieldCost = daysMissed === 1 ? 0 : daysMissed === 2 ? 15 : 25;

  const blinkExpr = isGone ? "crying" : daysMissed >= 4 ? "crying" : daysMissed >= 2 ? "worried" : "sad";

  return (
    <div style={{
      background: "white", borderRadius: 28, width: "100%", maxWidth: 340,
      boxShadow: "0 24px 64px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.08)",
      border: "1px solid rgba(0,0,0,0.06)",
      overflow: "hidden",
    }}>
      <div style={{ padding: "28px 24px 24px", display: "flex", flexDirection: "column", alignItems: "center" }}>

        {/* Blink — just sitting there naturally */}
        <Blink expression={blinkExpr} size={80} />

        {/* Streak number */}
        <div style={{ marginTop: 8, textAlign: "center" }}>
          <div style={{
            fontSize: 52, fontWeight: 800, lineHeight: 1,
            color: isGone ? C.textD : C.coral,
            opacity: isGone ? 0.5 : 1,
            textDecoration: isGone ? "line-through" : "none",
            textDecorationColor: C.coral,
          }}>
            {streak}
          </div>
          <div style={{ fontSize: 12, color: C.textD, marginTop: 2 }}>day streak</div>
        </div>

        {/* Message */}
        <div style={{ marginTop: 14, textAlign: "center", maxWidth: 260 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 4 }}>
            {isGone ? "Your streak is gone" : daysMissed === 1 ? "Your streak is in danger" : `You missed ${daysMissed} days`}
          </div>
          <div style={{ fontSize: 12, color: C.textM, lineHeight: 1.5 }}>
            {isGone
              ? "It's been over 2 weeks. Your streak has reset permanently."
              : daysMissed === 1
              ? "You didn't play yesterday. One more day and it resets."
              : `Your fire is fading. ${daysMissed} days without training.`
            }
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: "100%", height: 1, background: "rgba(0,0,0,0.05)", margin: "18px 0 16px" }} />

        {/* ═══ OPTIONS ═══ */}

        {/* GONE FOREVER */}
        {isGone && (
          <div style={{ width: "100%" }}>
            <div style={{
              padding: "13px 0", borderRadius: 14, textAlign: "center",
              background: C.accent, cursor: "pointer", width: "100%",
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>Start Fresh</span>
            </div>
          </div>
        )}

        {/* SHIELD OPTION */}
        {!isGone && hasShield && (
          <div onClick={() => {}} style={{
            width: "100%", padding: "14px 16px", borderRadius: 16, marginBottom: 8,
            background: "#FAFAF7", cursor: "pointer",
            border: "1px solid rgba(0,0,0,0.05)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            transition: "background 0.15s",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 13,
                background: `${C.green}10`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: 18 }}>🛡️</span>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Use Streak Shield</div>
                <div style={{ fontSize: 11, color: C.textM }}>
                  {shieldCost === 0 ? `${shields} shield${shields > 1 ? "s" : ""} available` : `Shield + ${shieldCost} gems`}
                </div>
              </div>
            </div>
            <div style={{
              padding: "8px 16px", borderRadius: 11,
              background: C.green,
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>
                {shieldCost === 0 ? "Free" : shieldCost}
              </span>
            </div>
          </div>
        )}

        {/* GEM RECOVERY OPTION */}
        {!isGone && price > 0 && (
          <div onClick={() => {}} style={{
            width: "100%", padding: "14px 16px", borderRadius: 16, marginBottom: 8,
            background: "#FAFAF7", cursor: "pointer",
            border: "1px solid rgba(0,0,0,0.05)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            opacity: canAfford ? 1 : 0.55,
            transition: "background 0.15s",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 13,
                background: `${C.accent}10`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="18" height="18" viewBox="0 0 40 40"><polygon points="20,4 32,14 28,36 12,36 8,14" fill={C.accent} /></svg>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                  {hasShield ? "Or pay with gems" : "Recover with gems"}
                </div>
                <div style={{ fontSize: 11, color: canAfford ? C.textM : C.coral }}>
                  {canAfford ? `You have ${gems} gems` : `Need ${price - gems} more`}
                </div>
              </div>
            </div>
            <div style={{
              padding: "8px 16px", borderRadius: 11,
              background: canAfford ? C.accent : C.textD,
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{price}</span>
            </div>
          </div>
        )}

        {/* PRICE BREAKDOWN — only for expensive recoveries */}
        {!isGone && daysMissed >= 4 && price > 0 && (
          <div style={{
            width: "100%", padding: "10px 14px", borderRadius: 12,
            background: "rgba(0,0,0,0.02)", marginBottom: 8,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: C.textM }}>{streak}-day streak × {daysMissed <= 7 ? "0.3" : "0.5"}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: C.text }}>{Math.round(streak * (daysMissed <= 7 ? 0.3 : 0.5))}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: C.textM }}>{daysMissed} days × {daysMissed <= 7 ? "10" : "15"} gems</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: C.text }}>{daysMissed * (daysMissed <= 7 ? 10 : 15)}</span>
            </div>
            <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "4px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.text }}>Recovery cost</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: C.accent }}>{price} gems</span>
            </div>
          </div>
        )}

        {/* DISMISS */}
        {!isGone && (
          <div style={{ textAlign: "center", marginTop: 6, paddingBottom: 4 }}>
            <span style={{ fontSize: 12, color: C.accent, fontWeight: 500, cursor: "pointer" }}>Let it reset</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ═══ SHOWCASE ═══
export default function StreakRecoveryShowcase() {
  const [idx, setIdx] = useState(0);

  return (
    <div style={{
      width: 390, height: 844, margin: "20px auto",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
      background: "#FAFAF7", borderRadius: 24, overflow: "hidden",
      boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
      display: "flex", flexDirection: "column",
    }}>
      {/* Scenario selector */}
      <div style={{ padding: "50px 16px 10px" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 6 }}>Scenarios</div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {scenarios.map((s, i) => (
            <div key={s.id} onClick={() => setIdx(i)} style={{
              padding: "5px 10px", borderRadius: 8, cursor: "pointer",
              background: i === idx ? C.coral : "white",
              border: i === idx ? "none" : "1px solid rgba(0,0,0,0.05)",
            }}>
              <span style={{ fontSize: 9, fontWeight: 600, color: i === idx ? "white" : C.textM }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal on dark overlay */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "0 24px", background: "rgba(0,0,0,0.45)",
        borderRadius: "0 0 24px 24px",
      }}>
        <StreakModal scenario={scenarios[idx]} />
      </div>
    </div>
  );
}
