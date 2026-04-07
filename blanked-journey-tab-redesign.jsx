import { useState } from "react";

const C = {
  bg: "#FAFAF7", accent: "#6C5CE7", accentL: "#A29BFE",
  green: "#00B894", coral: "#FF6B6B", gold: "#D4A012", blue: "#0984E3",
  orange: "#E17055", pink: "#FD79A8", teal: "#00CEC9",
  text: "#1A1A18", textM: "#636E72", textD: "#B2BEC3",
};

const modes = [
  { id: "classic", name: "Classic", letter: "C", color: C.accent, totalLevels: 200, completedLevels: 60, worlds: [
    { num: 1, name: "Shape Basics", levels: 20, completed: 20, stars: 52, maxStars: 60 },
    { num: 2, name: "Colour & Position", levels: 30, completed: 28, stars: 61, maxStars: 90 },
    { num: 3, name: "Speed & Count", levels: 35, completed: 12, stars: 24, maxStars: 105 },
    { num: 4, name: "Hidden Details", levels: 35, completed: 0, stars: 0, maxStars: 105, locked: true },
    { num: 5, name: "Moving Shapes", levels: 40, completed: 0, stars: 0, maxStars: 120, locked: true },
    { num: 6, name: "Mastermind", levels: 40, completed: 0, stars: 0, maxStars: 120, locked: true },
  ]},
  { id: "speed_recall", name: "Speed Recall", letter: "S", color: C.coral, totalLevels: 45, completedLevels: 21, worlds: [
    { num: 1, name: "Foundations", levels: 15, completed: 15, stars: 38, maxStars: 45 },
    { num: 2, name: "Precision", levels: 15, completed: 6, stars: 12, maxStars: 45 },
    { num: 3, name: "Mastermind", levels: 15, completed: 0, stars: 0, maxStars: 45, locked: true },
  ]},
  { id: "snap_match", name: "Snap Match", letter: "S", color: C.blue, totalLevels: 45, completedLevels: 3, worlds: [
    { num: 1, name: "Sharp Eyes", levels: 15, completed: 3, stars: 6, maxStars: 45 },
    { num: 2, name: "Quick Scan", levels: 15, completed: 0, stars: 0, maxStars: 45, locked: true },
    { num: 3, name: "Eagle Vision", levels: 15, completed: 0, stars: 0, maxStars: 45, locked: true },
  ]},
  { id: "sequence", name: "Sequence", letter: "S", color: C.gold, totalLevels: 36, completedLevels: 0, worlds: [
    { num: 1, name: "First Steps", levels: 12, completed: 0, stars: 0, maxStars: 36 },
    { num: 2, name: "Memory Lane", levels: 12, completed: 0, stars: 0, maxStars: 36, locked: true },
    { num: 3, name: "Chain Master", levels: 12, completed: 0, stars: 0, maxStars: 36, locked: true },
  ]},
  { id: "counting", name: "Counting Blitz", letter: "C", color: C.green, totalLevels: 30, completedLevels: 0, worlds: [
    { num: 1, name: "Focus", levels: 15, completed: 0, stars: 0, maxStars: 45 },
    { num: 2, name: "Chaos", levels: 15, completed: 0, stars: 0, maxStars: 45, locked: true },
  ]},
  { id: "colour_chain", name: "Colour Chain", letter: "C", color: C.pink, totalLevels: 24, completedLevels: 0, worlds: [
    { num: 1, name: "Palette", levels: 12, completed: 0, stars: 0, maxStars: 36 },
    { num: 2, name: "Spectrum", levels: 12, completed: 0, stars: 0, maxStars: 36, locked: true },
  ]},
];

// Progress ring
const Ring = ({ pct, color, size = 26 }) => {
  const r = (size - 3) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#ECEAE8" strokeWidth="2.5" />
      {pct > 0 && <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="2.5" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />}
    </svg>
  );
};

export default function JourneyTab() {
  const [selectedMode, setSelectedMode] = useState(0);
  const mode = modes[selectedMode];
  const continueWorld = mode.worlds.find(w => !w.locked && w.completed < w.levels) || mode.worlds[0];
  const hasStarted = mode.completedLevels > 0;

  return (
    <div style={{
      width: 390, height: 844, margin: "20px auto",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
      background: C.bg, borderRadius: 24, overflow: "hidden",
      boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
      display: "flex", flexDirection: "column",
    }}>
      {/* ═══ HEADER ═══ */}
      <div style={{ padding: "50px 20px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 24, fontWeight: 800, color: C.text }}>Journey</span>
        <div style={{ padding: "4px 12px", borderRadius: 12, background: `${C.gold}10` }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.gold }}>★ 479/1140</span>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>

        {/* ═══ MODE PILLS — horizontal, compact ═══ */}
        <div style={{
          display: "flex", gap: 6, padding: "4px 20px 12px",
          overflowX: "auto", scrollbarWidth: "none",
        }}>
          {modes.map((m, i) => {
            const mPct = Math.round((m.completedLevels / m.totalLevels) * 100);
            const sel = i === selectedMode;
            return (
              <div key={m.id} onClick={() => setSelectedMode(i)} style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "6px 12px 6px 6px", borderRadius: 12,
                background: sel ? `${m.color}08` : "white",
                border: sel ? `1.5px solid ${m.color}22` : "1.5px solid rgba(0,0,0,0.04)",
                cursor: "pointer", flexShrink: 0,
                transition: "all 0.25s",
              }}>
                {/* Ring with letter */}
                <div style={{ position: "relative", width: 26, height: 26 }}>
                  <Ring pct={mPct} color={m.color} size={26} />
                  <div style={{
                    position: "absolute", inset: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: sel ? m.color : C.textD }}>{m.letter}</span>
                  </div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
                  color: sel ? m.color : C.textM,
                }}>{m.name}</span>
              </div>
            );
          })}
        </div>

        {/* ═══ HERO CARD — start vs continue ═══ */}
        <div style={{ padding: "0 20px 12px" }}>
          <div style={{
            borderRadius: 16, overflow: "hidden",
            background: hasStarted
              ? `linear-gradient(140deg, ${mode.color}, ${mode.color}BB)`
              : `linear-gradient(140deg, ${mode.color}20, ${mode.color}08)`,
            padding: "14px 16px",
            position: "relative",
            border: hasStarted ? "none" : `1.5px solid ${mode.color}15`,
          }}>
            <div style={{ position: "absolute", right: -12, top: -12, width: 50, height: 50, borderRadius: 25, background: hasStarted ? "rgba(255,255,255,0.05)" : `${mode.color}05` }} />

            <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ flex: 1 }}>
                {hasStarted ? (
                  <>
                    <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>
                      CONTINUE · WORLD {continueWorld.num}
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "white", marginBottom: 1 }}>
                      {continueWorld.name}
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", marginBottom: 8 }}>
                      Level {continueWorld.completed + 1} of {continueWorld.levels}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.15)" }}>
                        <div style={{ width: `${(continueWorld.completed / continueWorld.levels) * 100}%`, height: "100%", borderRadius: 2, background: "white" }} />
                      </div>
                      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>{continueWorld.completed}/{continueWorld.levels}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 9, fontWeight: 600, color: mode.color, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2, opacity: 0.6 }}>
                      NEW CAMPAIGN
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: mode.color, marginBottom: 2 }}>
                      {mode.name}
                    </div>
                    <div style={{ fontSize: 11, color: C.textM }}>
                      {mode.worlds.length} worlds · {mode.totalLevels} levels
                    </div>
                  </>
                )}
              </div>
              <div style={{
                padding: "10px 18px", borderRadius: 11, cursor: "pointer",
                background: hasStarted ? "white" : mode.color,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: hasStarted ? mode.color : "white" }}>
                  {hasStarted ? "Play" : "Start"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ WORLDS LIST ═══ */}
        <div style={{ padding: "2px 20px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.textD, letterSpacing: 1.2, marginBottom: 8 }}>
            {mode.name.toUpperCase()} WORLDS
          </div>

          {mode.worlds.map((world, i) => {
            const pct = world.levels > 0 ? Math.round((world.completed / world.levels) * 100) : 0;
            const isComplete = world.completed === world.levels && world.levels > 0;
            const isCurrent = !world.locked && world.completed < world.levels;
            const isNext = isCurrent && i === mode.worlds.findIndex(w => !w.locked && w.completed < w.levels);
            const isAlmostDone = pct >= 80 && !isComplete && pct > 0;

            return (
              <div key={i}>
                {/* Connector */}
                {i > 0 && (
                  <div style={{
                    width: 2, height: 8, marginLeft: 19,
                    background: world.locked ? "#E8E6E1" : isComplete ? mode.color : `${mode.color}25`,
                    borderRadius: 1,
                  }} />
                )}

                <div style={{
                  display: "flex", gap: 12, alignItems: "center",
                  padding: isNext ? "10px 12px" : "8px 12px",
                  borderRadius: 14,
                  background: isComplete ? `${C.green}04` : isNext ? "white" : "transparent",
                  border: isComplete ? `1.5px solid ${C.green}12` : isNext ? `1.5px solid ${mode.color}18` : "1.5px solid transparent",
                  boxShadow: isNext ? "0 2px 10px rgba(0,0,0,0.03)" : "none",
                  opacity: world.locked ? 0.4 : 1,
                  cursor: world.locked ? "default" : "pointer",
                  borderLeft: isComplete ? `3px solid ${C.green}` : isNext ? `3px solid ${mode.color}` : "3px solid transparent",
                }}>
                  {/* World indicator */}
                  <div style={{
                    width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                    background: isComplete ? C.green : isCurrent ? `${mode.color}10` : "#F0EFEB",
                    border: isCurrent && !isComplete ? `2px solid ${mode.color}25` : "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {world.locked ? (
                      <svg width="14" height="14" viewBox="0 0 24 24">
                        <rect x="5" y="11" width="14" height="10" rx="2" fill={C.textD}/>
                        <path d="M8,11 V8 C8,5.5 9.8,4 12,4 C14.2,4 16,5.5 16,8 V11" fill="none" stroke={C.textD} strokeWidth="2"/>
                      </svg>
                    ) : isComplete ? (
                      <svg width="16" height="16" viewBox="0 0 24 24">
                        <path d="M5,12 L10,17 L19,7" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <span style={{ fontSize: 15, fontWeight: 800, color: mode.color }}>{world.num}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: world.locked ? C.textD : C.text }}>
                        {world.name}
                      </span>
                      {isAlmostDone && (
                        <div style={{ padding: "1px 6px", borderRadius: 4, background: `${C.green}12` }}>
                          <span style={{ fontSize: 8, fontWeight: 700, color: C.green }}>ALMOST!</span>
                        </div>
                      )}
                      {isComplete && (
                        <div style={{ display: "flex", gap: 1 }}>
                          {[1,2,3].map(s => {
                            const starThreshold = world.maxStars * (s / 3);
                            return (
                              <svg key={s} width="10" height="10" viewBox="0 0 24 24">
                                <polygon points="12,2 15,8 22,9 17,14 18,21 12,17 6,21 7,14 2,9 9,8"
                                  fill={world.stars >= starThreshold ? C.gold : `${C.gold}25`}/>
                              </svg>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {world.locked ? (
                      <span style={{ fontSize: 11, color: C.textD }}>Complete World {world.num - 1} to unlock</span>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <div style={{ flex: 1, maxWidth: 100 }}>
                          <div style={{ height: 4, borderRadius: 2, background: "#ECEAE8" }}>
                            <div style={{
                              width: `${pct}%`, height: "100%", borderRadius: 2,
                              background: isComplete ? C.green : mode.color,
                            }} />
                          </div>
                        </div>
                        <span style={{ fontSize: 10, color: C.textM, fontWeight: 500 }}>
                          {isComplete ? "Complete" : `${world.completed}/${world.levels}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Chevron */}
                  {!world.locked && (
                    <svg width="14" height="14" viewBox="0 0 24 24" style={{ flexShrink: 0, opacity: isNext ? 0.5 : 0.25 }}>
                      <path d="M9 5l7 7-7 7" fill="none" stroke={isNext ? mode.color : C.textD} strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ TAB BAR ═══ */}
      <div style={{
        display: "flex", justifyContent: "space-around", alignItems: "center",
        padding: "6px 0 26px", background: "white",
        borderTop: "1px solid rgba(0,0,0,0.04)",
      }}>
        {[
          { label: "Play", active: false, icon: <svg width="20" height="20" viewBox="0 0 24 24"><path d="M8,5 L19,12 L8,19Z" fill="#C8CDD0"/></svg> },
          { label: "Journey", active: true, icon: <svg width="20" height="20" viewBox="0 0 24 24"><path d="M3,7 L8.5,4 L15.5,7 L21,4 V18 L15.5,21 L8.5,18 L3,21Z" fill="none" stroke={C.accent} strokeWidth="1.5" strokeLinejoin="round"/></svg> },
          { label: "Friends", active: false, icon: <svg width="20" height="20" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5" fill="none" stroke="#C8CDD0" strokeWidth="1.5"/><path d="M2,20 C2,15 5,13 9,13 C13,13 16,15 16,20" fill="none" stroke="#C8CDD0" strokeWidth="1.5"/></svg> },
          { label: "Shop", active: false, icon: <svg width="20" height="20" viewBox="0 0 24 24"><polygon points="12,2 20,9 12,22 4,9" fill="none" stroke="#C8CDD0" strokeWidth="1.5" strokeLinejoin="round"/></svg> },
        ].map((tab, i) => (
          <div key={i} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            padding: "3px 14px", borderRadius: 10,
            background: tab.active ? `${C.accent}08` : "transparent",
          }}>
            {tab.icon}
            <span style={{ fontSize: 9, fontWeight: 600, color: tab.active ? C.accent : "#C8CDD0" }}>{tab.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
