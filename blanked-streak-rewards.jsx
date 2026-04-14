import { useState, useEffect } from "react";

const C = {
  accent: "#6C5CE7", accentL: "#A29BFE", accentD: "#4A3BBF",
  green: "#00B894", coral: "#FF6B6B", gold: "#D4A012", blue: "#0984E3",
  pink: "#FD79A8", teal: "#00CEC9",
  text: "#1A1A18", textM: "#636E72", textD: "#B2BEC3",
};

// ═══ ANIMATED NUMBER ═══
const Num = ({ target, duration = 1000 }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / duration);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target]);
  return <>{val}</>;
};

// ═══ BLINK (streak expression — fire on head) ═══
const BlinkStreak = ({ size = 70 }) => {
  const s = size, cx = s/2, cy = s/2 + s*0.04, bR = s*0.38;
  const sw = (min, pct) => Math.max(min, s * pct);
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <ellipse cx={cx} cy={cy+bR+s*0.04} rx={bR*0.55} ry={s*0.025} fill="rgba(0,0,0,0.06)" />
      <circle cx={cx} cy={cy} r={bR} fill={`url(#bs-${s})`} />
      <ellipse cx={cx-s*0.07} cy={cy-s*0.12} rx={bR*0.45} ry={bR*0.3} fill="rgba(255,255,255,0.14)" />
      {/* Eyes */}
      <ellipse cx={cx-s*0.1} cy={cy-s*0.05} rx={s*0.085} ry={s*0.11} fill="white" />
      <ellipse cx={cx+s*0.1} cy={cy-s*0.05} rx={s*0.085} ry={s*0.11} fill="white" />
      <circle cx={cx-s*0.085} cy={cy-s*0.04} r={s*0.048} fill={C.coral} />
      <circle cx={cx+s*0.115} cy={cy-s*0.04} r={s*0.048} fill={C.coral} />
      <circle cx={cx-s*0.07} cy={cy-s*0.06} r={s*0.014} fill="white" />
      <circle cx={cx+s*0.13} cy={cy-s*0.06} r={s*0.014} fill="white" />
      {/* Smile */}
      <path d={`M${cx-s*0.05},${cy+s*0.1} Q${cx},${cy+s*0.15} ${cx+s*0.05},${cy+s*0.1}`} fill="none" stroke={C.text} strokeWidth={sw(1, 0.018)} strokeLinecap="round" />
      {/* Fire */}
      <ellipse cx={cx} cy={cy-bR-s*0.01} rx={s*0.06} ry={s*0.03} fill={C.coral} opacity="0.15" />
      <path d={`M${cx},${cy-bR-s*0.01} C${cx-s*0.08},${cy-bR+s*0.06} ${cx-s*0.05},${cy-bR-s*0.06} ${cx},${cy-bR-s*0.14} C${cx+s*0.05},${cy-bR-s*0.06} ${cx+s*0.08},${cy-bR+s*0.06} ${cx},${cy-bR-s*0.01}`} fill={C.coral} />
      <path d={`M${cx},${cy-bR-s*0.01} C${cx-s*0.04},${cy-bR+s*0.03} ${cx-s*0.025},${cy-bR-s*0.03} ${cx},${cy-bR-s*0.08} C${cx+s*0.025},${cy-bR-s*0.03} ${cx+s*0.04},${cy-bR+s*0.03} ${cx},${cy-bR-s*0.01}`} fill={C.gold} />
      <defs>
        <radialGradient id={`bs-${s}`} cx="38%" cy="32%"><stop offset="0%" stopColor={C.accentL} /><stop offset="100%" stopColor={C.accent} /></radialGradient>
      </defs>
    </svg>
  );
};

// ═══ REWARD DATA ═══
const milestones = [
  { day: 3, gems: 3, shields: 0 },
  { day: 7, gems: 5, shields: 1 },
  { day: 14, gems: 10, shields: 0 },
  { day: 21, gems: 10, shields: 1 },
  { day: 30, gems: 15, shields: 2 },
  { day: 50, gems: 25, shields: 1 },
  { day: 75, gems: 30, shields: 2 },
  { day: 100, gems: 40, shields: 3 },
  { day: 150, gems: 50, shields: 3 },
  { day: 200, gems: 60, shields: 5 },
  { day: 365, gems: 100, shields: 5 },
];

// ═══ WEEK VIEW ═══
const WeekView = ({ currentStreak, playedToday }) => {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const today = new Date().getDay(); // 0=Sun
  const todayIdx = today === 0 ? 6 : today - 1; // Convert to Mon=0

  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
      {days.map((d, i) => {
        const isPast = i < todayIdx;
        const isToday = i === todayIdx;
        const completed = isPast || (isToday && playedToday);
        const isFuture = i > todayIdx;

        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 11,
              background: completed ? `${C.coral}12` : isToday ? `${C.gold}10` : "#F5F4F0",
              border: isToday ? `2px solid ${playedToday ? C.coral : C.gold}` : completed ? `1.5px solid ${C.coral}30` : "1.5px solid transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {completed ? (
                <svg width="16" height="16" viewBox="0 0 100 100">
                  <path d="M50,88 C20,65 5,50 5,32 C5,18 16,8 30,8 C38,8 45,12 50,20 C55,12 62,8 70,8 C84,8 95,18 95,32 C95,50 80,65 50,88Z" fill={C.coral} />
                </svg>
              ) : isToday && !playedToday ? (
                <div style={{ width: 8, height: 8, borderRadius: 4, background: C.gold, animation: "todayPulse 2s infinite" }} />
              ) : (
                <div style={{ width: 6, height: 6, borderRadius: 3, background: "#DDD" }} />
              )}
            </div>
            <span style={{ fontSize: 8, fontWeight: 600, color: isToday ? C.text : completed ? C.coral : C.textD }}>{d}</span>
          </div>
        );
      })}
    </div>
  );
};

// ═══ MILESTONE NODE ═══
const MilestoneNode = ({ milestone, currentStreak, claimed, isNext }) => {
  const reached = currentStreak >= milestone.day;
  const progress = Math.min(1, currentStreak / milestone.day);

  return (
    <div style={{
      display: "flex", gap: 12, alignItems: "flex-start",
      opacity: reached || isNext ? 1 : 0.45,
    }}>
      {/* Timeline dot + line */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 28, flexShrink: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 14,
          background: claimed ? C.green : isNext ? `${C.coral}15` : reached ? C.coral : "#EEECEA",
          border: isNext ? `2px solid ${C.coral}` : "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: isNext ? `0 0 12px ${C.coral}25` : "none",
          animation: isNext ? "nextPulse 2s infinite" : "none",
        }}>
          {claimed ? (
            <svg width="12" height="12" viewBox="0 0 24 24"><path d="M5,12 L10,17 L19,7" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          ) : reached ? (
            <span style={{ fontSize: 10 }}>🎁</span>
          ) : (
            <span style={{ fontSize: 9, fontWeight: 800, color: C.textD }}>{milestone.day}</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1, padding: "8px 12px", borderRadius: 14,
        background: isNext ? "white" : claimed ? `${C.green}04` : "white",
        border: isNext ? `1.5px solid ${C.coral}18` : claimed ? `1px solid ${C.green}15` : "1px solid rgba(0,0,0,0.04)",
        boxShadow: isNext ? "0 2px 12px rgba(0,0,0,0.04)" : "none",
      }}>
        {/* Day label + status */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: claimed ? C.green : isNext ? C.coral : C.text }}>
              Day {milestone.day}
            </span>
            {isNext && (
              <div style={{ padding: "1px 6px", borderRadius: 4, background: `${C.coral}12` }}>
                <span style={{ fontSize: 7, fontWeight: 700, color: C.coral }}>{milestone.day - currentStreak} DAYS AWAY</span>
              </div>
            )}
            {claimed && (
              <div style={{ padding: "1px 6px", borderRadius: 4, background: `${C.green}12` }}>
                <span style={{ fontSize: 7, fontWeight: 700, color: C.green }}>CLAIMED</span>
              </div>
            )}
          </div>
        </div>

        {/* Rewards */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 6, background: `${C.accent}06` }}>
            <svg width="10" height="10" viewBox="0 0 40 40"><polygon points="20,4 32,14 28,36 12,36 8,14" fill={C.accent} /></svg>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.accent }}>{milestone.gems}</span>
          </div>
          {milestone.shields > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 6, background: `${C.coral}06` }}>
              <span style={{ fontSize: 9 }}>🛡️</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.coral }}>×{milestone.shields}</span>
            </div>
          )}
        </div>

        {/* Progress bar for next milestone */}
        {isNext && (
          <div style={{ marginTop: 6 }}>
            <div style={{ height: 4, borderRadius: 2, background: `${C.coral}12`, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 2,
                background: `linear-gradient(90deg, ${C.coral}, ${C.gold})`,
                width: `${progress * 100}%`,
                transition: "width 0.5s ease-out",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
              <span style={{ fontSize: 7, color: C.textD }}>Day {currentStreak}</span>
              <span style={{ fontSize: 7, color: C.textD }}>Day {milestone.day}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ═══ STREAK SHIELD STATUS ═══
const ShieldStatus = ({ shieldsOwned }) => (
  <div style={{
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 14px", borderRadius: 14,
    background: "white", border: "1px solid rgba(0,0,0,0.04)",
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 18 }}>🛡️</span>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Streak Shields</div>
        <div style={{ fontSize: 9, color: C.textM }}>Protects your streak if you miss a day</div>
      </div>
    </div>
    <div style={{
      padding: "4px 12px", borderRadius: 10,
      background: shieldsOwned > 0 ? `${C.green}10` : `${C.coral}10`,
    }}>
      <span style={{ fontSize: 14, fontWeight: 800, color: shieldsOwned > 0 ? C.green : C.coral }}>
        {shieldsOwned}
      </span>
    </div>
  </div>
);

// ═══ MAIN SCREEN ═══
export default function StreakRewards() {
  // Demo state — change these to test different states
  const currentStreak = 19;
  const playedToday = true;
  const shieldsOwned = 2;
  const bestStreak = 34;

  // Find next unclaimed milestone
  const nextMilestone = milestones.find(m => m.day > currentStreak);
  const claimedDays = milestones.filter(m => m.day <= currentStreak).map(m => m.day);

  return (
    <div style={{
      width: 390, height: 844, margin: "20px auto",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
      background: "#FAFAF7", borderRadius: 24, overflow: "hidden",
      boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{ padding: "50px 20px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 28, height: 28, borderRadius: 9, background: "rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <span style={{ fontSize: 14, color: C.textD }}>‹</span>
          </div>
          <span style={{ fontSize: 20, fontWeight: 800, color: C.text }}>Your Streak</span>
        </div>
        <div style={{ padding: "4px 10px", borderRadius: 10, background: `${C.gold}10` }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.gold }}>Best: {bestStreak} days</span>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "0 20px" }}>
        {/* Blink + Streak number */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "10px 0 16px",
        }}>
          <div style={{ animation: "blinkFloat 3s infinite ease-in-out" }}>
            <BlinkStreak size={70} />
          </div>
          <div style={{ fontSize: 48, fontWeight: 800, color: C.coral, lineHeight: 1, marginTop: -2 }}>
            <Num target={currentStreak} duration={1200} />
          </div>
          <div style={{ fontSize: 13, color: C.textM, marginTop: 2 }}>day streak</div>

          {/* Next reward preview */}
          {nextMilestone && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 10,
              background: `${C.coral}06`, marginTop: 10,
            }}>
              <span style={{ fontSize: 11 }}>🎁</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.coral }}>
                Day {nextMilestone.day}: {nextMilestone.gems} gems{nextMilestone.shields > 0 ? ` + ${nextMilestone.shields} shield${nextMilestone.shields > 1 ? "s" : ""}` : ""} — {nextMilestone.day - currentStreak} day{nextMilestone.day - currentStreak > 1 ? "s" : ""} away
              </span>
            </div>
          )}
        </div>

        {/* This week */}
        <div style={{
          padding: "14px 16px", borderRadius: 16,
          background: "white", border: "1px solid rgba(0,0,0,0.04)",
          marginBottom: 12,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.textD, letterSpacing: 1.2, marginBottom: 10 }}>THIS WEEK</div>
          <WeekView currentStreak={currentStreak} playedToday={playedToday} />
        </div>

        {/* Shield status */}
        <div style={{ marginBottom: 12 }}>
          <ShieldStatus shieldsOwned={shieldsOwned} />
        </div>

        {/* Rewards timeline */}
        <div style={{ fontSize: 10, fontWeight: 700, color: C.textD, letterSpacing: 1.2, marginBottom: 8 }}>
          STREAK REWARDS
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 20 }}>
          {/* Timeline connector */}
          {milestones.map((m, i) => {
            const claimed = claimedDays.includes(m.day);
            const isNext = nextMilestone?.day === m.day;

            return (
              <div key={m.day}>
                {i > 0 && (
                  <div style={{
                    width: 2, height: 10, marginLeft: 13,
                    background: claimed ? C.green : `${C.textD}30`,
                    borderRadius: 1,
                  }} />
                )}
                <MilestoneNode
                  milestone={m}
                  currentStreak={currentStreak}
                  claimed={claimed}
                  isNext={isNext}
                />
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes blinkFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes nextPulse { 0%,100% { box-shadow: 0 0 0px rgba(255,107,107,0); } 50% { box-shadow: 0 0 12px rgba(255,107,107,0.25); } }
        @keyframes todayPulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.2); } }
      `}</style>
    </div>
  );
}
