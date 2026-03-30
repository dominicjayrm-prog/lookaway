import { useState, useEffect } from "react";

const P = {
  bg: "#F7F6F3",
  card: "#FFFFFF",
  accent: "#6C5CE7",
  accentL: "#A29BFE",
  glow: "rgba(108,92,231,0.15)",
  green: "#00B894",
  coral: "#FF6B6B",
  gold: "#D4A012",
  text: "#1A1A18",
  textM: "#636E72",
  textD: "#B2BEC3",
};

const Logo = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64">
    <defs><linearGradient id="ob" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#6C5CE7"/><stop offset="100%" stopColor="#A29BFE"/></linearGradient></defs>
    <rect width="64" height="64" rx="16" fill="url(#ob)"/>
    <g transform="translate(14,20)"><path d="M2 12Q18 0 34 12Q18 24 2 12Z" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="1.5"/><circle cx="18" cy="12" r="6" fill="white"/><circle cx="18" cy="12" r="3" fill="#6C5CE7"/><line x1="18" y1="1" x2="18" y2="-2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/><line x1="8" y1="4" x2="5" y2="1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/><line x1="28" y1="4" x2="31" y2="1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></g>
  </svg>
);

// Smooth blinking eye with proper eyelid animation
const BlinkingEye = ({ blinkPhase }) => {
  // blinkPhase: 0 = fully open, 1 = fully closed
  const lidY = blinkPhase * 35; // How much the lids close
  const pupilScale = 1 - blinkPhase * 0.3;

  return (
    <svg width="160" height="100" viewBox="0 0 160 100">
      <defs>
        <linearGradient id="eyeG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6C5CE7"/>
          <stop offset="100%" stopColor="#A29BFE"/>
        </linearGradient>
        <clipPath id="eyeClip">
          {/* Upper eyelid curve */}
          <path d={`M10,50 Q80,${10 + lidY} 150,50 Q80,${90 - lidY} 10,50 Z`} />
        </clipPath>
      </defs>

      {/* Eye outline / white */}
      <path d="M10,50 Q80,10 150,50 Q80,90 10,50 Z" fill="white" stroke="url(#eyeG)" strokeWidth="2.5" />

      {/* Everything inside gets clipped by the eyelids */}
      <g clipPath="url(#eyeClip)">
        {/* White of eye */}
        <path d="M10,50 Q80,10 150,50 Q80,90 10,50 Z" fill="white" />

        {/* Iris */}
        <circle cx="80" cy="50" r={22 * pupilScale} fill="url(#eyeG)" style={{ transition: "r 0.15s" }} />

        {/* Pupil */}
        <circle cx="80" cy="50" r={10 * pupilScale} fill={P.text} style={{ transition: "r 0.15s" }} />

        {/* Light reflection */}
        <circle cx="88" cy="42" r={5 * pupilScale} fill="white" opacity="0.8" style={{ transition: "r 0.15s" }} />
        <circle cx="74" cy="55" r={2.5 * pupilScale} fill="white" opacity="0.5" style={{ transition: "r 0.15s" }} />
      </g>

      {/* Eyelash details on the upper lid */}
      <path d={`M10,50 Q80,${10 + lidY} 150,50`} fill="none" stroke="url(#eyeG)" strokeWidth="3" strokeLinecap="round" />

      {/* Subtle lower lash line */}
      <path d={`M25,${55 - lidY * 0.1} Q80,${85 - lidY} 135,${55 - lidY * 0.1}`} fill="none" stroke="url(#eyeG)" strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />
    </svg>
  );
};

const Shape = ({ type, color, size, x, y, delay }) => {
  const base = {
    position: "absolute", left: x, top: y, width: size, height: size,
    opacity: 0,
    animation: `shapeIn 0.8s ${delay}s forwards ease-out, shapeFloat 5s ${delay + 0.8}s infinite ease-in-out`,
  };
  if (type === "circle") return <div style={{ ...base, borderRadius: "50%", background: color }} />;
  if (type === "square") return <div style={{ ...base, borderRadius: size * 0.12, background: color }} />;
  if (type === "triangle") return <svg style={base} viewBox="0 0 100 100"><polygon points="50,8 92,88 8,88" fill={color} /></svg>;
  if (type === "star") return <svg style={base} viewBox="0 0 100 100"><polygon points="50,5 63,35 95,35 69,57 79,90 50,70 21,90 31,57 5,35 37,35" fill={color} /></svg>;
  if (type === "diamond") return <svg style={base} viewBox="0 0 100 100"><polygon points="50,5 95,50 50,95 5,50" fill={color} /></svg>;
  return null;
};

const MiniScene = ({ visible, faded }) => (
  <div style={{
    width: 240, height: 200, borderRadius: 20, background: "white", position: "relative",
    boxShadow: "0 8px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
    opacity: visible ? 1 : 0, transform: visible ? "scale(1)" : "scale(0.9)",
    transition: "all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)",
    overflow: "hidden",
  }}>
    {faded && <div style={{ position: "absolute", inset: 0, background: "rgba(247,246,243,0.88)", zIndex: 2, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: P.accent, fontFamily: "-apple-system, sans-serif", background: "white", padding: "8px 20px", borderRadius: 12, boxShadow: "0 2px 12px rgba(108,92,231,0.15)" }}>Gone! What did you see?</div>
    </div>}
    <div style={{ position: "absolute", left: "18%", top: "15%", width: 36, height: 36, borderRadius: "50%", background: P.coral }} />
    <div style={{ position: "absolute", right: "18%", top: "22%", width: 30, height: 30, borderRadius: 5, background: "#0984E3" }} />
    <div style={{ position: "absolute", left: "42%", bottom: "18%", width: 32, height: 32 }}>
      <svg viewBox="0 0 100 100" width="32" height="32"><polygon points="50,8 92,88 8,88" fill={P.green} /></svg>
    </div>
    <div style={{ position: "absolute", right: "14%", bottom: "28%", width: 26, height: 26, borderRadius: "50%", background: P.gold }} />
    <div style={{ position: "absolute", left: "12%", bottom: "38%", width: 22, height: 22 }}>
      <svg viewBox="0 0 100 100" width="22" height="22"><polygon points="50,5 63,35 95,35 69,57 79,90 50,70 21,90 31,57 5,35 37,35" fill={P.accent} /></svg>
    </div>
  </div>
);

const TimerBar = ({ progress, visible }) => (
  <div style={{ width: 240, height: 5, borderRadius: 3, background: "rgba(0,0,0,0.06)", opacity: visible ? 1 : 0, transition: "opacity 0.4s", overflow: "hidden" }}>
    <div style={{
      width: `${progress}%`, height: "100%", borderRadius: 3,
      background: progress > 40 ? `linear-gradient(90deg, ${P.accent}, ${P.accentL})` : progress > 15 ? P.gold : P.coral,
      transition: "width 3s linear, background 0.5s",
    }} />
  </div>
);

const QuestionCard = ({ visible, answered }) => (
  <div style={{
    width: 280, borderRadius: 18, background: "white",
    boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)",
    padding: "18px 20px", opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)",
    transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
  }}>
    <div style={{ fontSize: 15, fontWeight: 700, color: P.text, marginBottom: 14, fontFamily: "-apple-system, sans-serif" }}>
      How many red shapes were there?
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {["1", "2", "3", "4"].map((opt, i) => {
        const isSelected = answered && i === 0;
        return (
          <div key={i} style={{
            padding: "10px 0", borderRadius: 10, textAlign: "center", fontSize: 15, fontWeight: 600,
            fontFamily: "-apple-system, sans-serif",
            background: isSelected ? "rgba(0,184,148,0.1)" : "#F7F6F3",
            color: isSelected ? P.green : P.textM,
            border: isSelected ? `2px solid ${P.green}` : "2px solid transparent",
            transition: "all 0.4s",
            transform: isSelected ? "scale(1.05)" : "scale(1)",
          }}>{opt}{isSelected ? " ✓" : ""}</div>
        );
      })}
    </div>
  </div>
);

const Dots = ({ current, total }) => (
  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
    {Array.from({ length: total }, (_, i) => (
      <div key={i} style={{
        width: i === current ? 28 : 8, height: 8, borderRadius: 4,
        background: i === current ? P.accent : "rgba(0,0,0,0.1)",
        transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }} />
    ))}
  </div>
);

export default function Onboarding() {
  const [page, setPage] = useState(0);
  const [blinkPhase, setBlinkPhase] = useState(0);
  const [timerProgress, setTimerProgress] = useState(100);
  const [sceneVisible, setSceneVisible] = useState(false);
  const [sceneFaded, setSceneFaded] = useState(false);
  const [questionVisible, setQuestionVisible] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [s4Anim, setS4Anim] = useState(0);

  // Page 1: smooth blink animation
  useEffect(() => {
    if (page !== 0) return;
    let frame;
    let blinkTimeout;

    const doBlink = () => {
      let start = null;
      const duration = 180; // ms for close
      const closeBlink = (ts) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        setBlinkPhase(p);
        if (p < 1) { frame = requestAnimationFrame(closeBlink); }
        else {
          // Hold closed briefly
          setTimeout(() => {
            start = null;
            const openBlink = (ts2) => {
              if (!start) start = ts2;
              const p2 = Math.min((ts2 - start) / 200, 1);
              setBlinkPhase(1 - p2);
              if (p2 < 1) { frame = requestAnimationFrame(openBlink); }
              else { blinkTimeout = setTimeout(doBlink, 2500 + Math.random() * 1500); }
            };
            frame = requestAnimationFrame(openBlink);
          }, 80);
        }
      };
      frame = requestAnimationFrame(closeBlink);
    };

    blinkTimeout = setTimeout(doBlink, 1500);
    return () => { cancelAnimationFrame(frame); clearTimeout(blinkTimeout); };
  }, [page]);

  // Page 2: scene + timer
  useEffect(() => {
    if (page !== 1) return;
    setSceneVisible(false); setSceneFaded(false); setTimerProgress(100);
    const t1 = setTimeout(() => setSceneVisible(true), 300);
    const t2 = setTimeout(() => setTimerProgress(0), 500);
    const t3 = setTimeout(() => { setSceneFaded(true); setTimerProgress(100); }, 3800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [page]);

  // Page 3: question + answer
  useEffect(() => {
    if (page !== 2) return;
    setQuestionVisible(false); setAnswered(false);
    const t1 = setTimeout(() => setQuestionVisible(true), 400);
    const t2 = setTimeout(() => setAnswered(true), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [page]);

  // Page 4: staggered reveals
  useEffect(() => {
    if (page !== 3) return;
    setS4Anim(0);
    const t1 = setTimeout(() => setS4Anim(1), 300);
    const t2 = setTimeout(() => setS4Anim(2), 700);
    const t3 = setTimeout(() => setS4Anim(3), 1100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [page]);

  const next = () => setPage(p => Math.min(p + 1, 3));
  const prev = () => setPage(p => Math.max(p - 1, 0));

  const pages = [
    // ─── SCREEN 1: THE HOOK ──────────────────
    <div key={0} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, position: "relative" }}>
      <div style={{ position: "absolute", inset: -80, pointerEvents: "none", overflow: "hidden" }}>
        <Shape type="circle" color={`${P.coral}22`} size={30} x="6%" y="10%" delay={0.2} />
        <Shape type="square" color={`${P.accent}18`} size={24} x="84%" y="6%" delay={0.5} />
        <Shape type="triangle" color={`${P.green}18`} size={28} x="10%" y="78%" delay={0.8} />
        <Shape type="star" color={`${P.gold}22`} size={22} x="80%" y="72%" delay={1.0} />
        <Shape type="diamond" color={`${P.accentL}15`} size={18} x="90%" y="38%" delay={0.3} />
        <Shape type="circle" color={`${P.accent}12`} size={14} x="4%" y="48%" delay={1.3} />
      </div>

      <div style={{ marginTop: 20 }}><Logo size={52} /></div>

      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "-apple-system, sans-serif", fontSize: 18, fontWeight: 800, color: P.text, letterSpacing: 0.5 }}>
          Look<span style={{ color: P.accent }}>Away</span>
        </div>
      </div>

      <div style={{ margin: "12px 0 4px" }}>
        <BlinkingEye blinkPhase={blinkPhase} />
      </div>

      <div style={{ textAlign: "center", maxWidth: 260, padding: "0 8px" }}>
        <div style={{ fontFamily: "-apple-system, sans-serif", fontSize: 24, fontWeight: 800, color: P.text, lineHeight: 1.25, marginBottom: 10, letterSpacing: -0.3 }}>
          How much can<br />you remember?
        </div>
        <div style={{ fontSize: 15, color: P.textM, lineHeight: 1.6, fontFamily: "-apple-system, sans-serif", fontWeight: 400 }}>
          A scene flashes before your eyes. Shapes, colours, positions. Then it vanishes. Can you recall what you saw?
        </div>
      </div>
    </div>,

    // ─── SCREEN 2: MEMORISE ──────────────────
    <div key={1} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      <div style={{ display: "inline-flex", padding: "5px 16px", borderRadius: 20, background: `${P.accent}0A`, border: `1px solid ${P.accent}18` }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: P.accent, fontFamily: "-apple-system, sans-serif", letterSpacing: 1.5, textTransform: "uppercase" }}>Step 1</span>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "-apple-system, sans-serif", fontSize: 26, fontWeight: 800, color: P.text, letterSpacing: -0.3 }}>Memorise the scene</div>
        <div style={{ fontSize: 15, color: P.textM, marginTop: 8, fontFamily: "-apple-system, sans-serif", maxWidth: 270, lineHeight: 1.55 }}>
          You have a few seconds. Study every shape, colour and position carefully.
        </div>
      </div>
      <MiniScene visible={sceneVisible} faded={sceneFaded} />
      <TimerBar progress={timerProgress} visible={sceneVisible} />
      <div style={{ fontSize: 13, color: P.textD, fontFamily: "-apple-system, sans-serif", fontWeight: 500 }}>
        {sceneFaded ? "Now answer from memory..." : "Study every detail..."}
      </div>
    </div>,

    // ─── SCREEN 3: ANSWER ────────────────────
    <div key={2} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      <div style={{ display: "inline-flex", padding: "5px 16px", borderRadius: 20, background: `${P.green}0A`, border: `1px solid ${P.green}18` }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: P.green, fontFamily: "-apple-system, sans-serif", letterSpacing: 1.5, textTransform: "uppercase" }}>Step 2</span>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "-apple-system, sans-serif", fontSize: 26, fontWeight: 800, color: P.text, letterSpacing: -0.3 }}>Answer from memory</div>
        <div style={{ fontSize: 15, color: P.textM, marginTop: 8, fontFamily: "-apple-system, sans-serif", maxWidth: 270, lineHeight: 1.55 }}>
          Five questions test what you saw. Colours, counts, positions. Trust your memory.
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{
            width: 10, height: 10, borderRadius: 5,
            background: i === 1 && answered ? P.green : i === 1 ? P.accent : "rgba(0,0,0,0.08)",
            transition: "all 0.4s",
            transform: i === 1 && answered ? "scale(1.4)" : "scale(1)",
          }} />
        ))}
      </div>
      <QuestionCard visible={questionVisible} answered={answered} />
      {answered && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, animation: "fadeInUp 0.5s forwards" }}>
          <div style={{ width: 28, height: 28, borderRadius: 14, background: `${P.green}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: P.green, fontSize: 16, fontWeight: 700 }}>{"✓"}</span>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: P.green, fontFamily: "-apple-system, sans-serif" }}>Correct!</span>
        </div>
      )}
    </div>,

    // ─── SCREEN 4: COMPETE + CTA ─────────────
    <div key={3} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{ display: "inline-flex", padding: "5px 16px", borderRadius: 20, background: `${P.gold}12`, border: `1px solid ${P.gold}25` }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: P.gold, fontFamily: "-apple-system, sans-serif", letterSpacing: 1.5, textTransform: "uppercase" }}>Step 3</span>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "-apple-system, sans-serif", fontSize: 26, fontWeight: 800, color: P.text, letterSpacing: -0.3 }}>Share your score</div>
        <div style={{ fontSize: 15, color: P.textM, marginTop: 8, fontFamily: "-apple-system, sans-serif", maxWidth: 270, lineHeight: 1.55 }}>
          Everyone gets the same daily challenge. Compare with friends. Who remembers more?
        </div>
      </div>

      {/* Score result card */}
      <div style={{
        width: 260, borderRadius: 20, background: "white", padding: "20px 24px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)",
        opacity: s4Anim >= 1 ? 1 : 0, transform: s4Anim >= 1 ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 42, fontWeight: 800, color: P.accent, fontFamily: "-apple-system, sans-serif", lineHeight: 1 }}>92%</div>
          <div style={{ fontSize: 13, color: P.textM, marginTop: 4, fontFamily: "-apple-system, sans-serif" }}>Memory score</div>
        </div>
        {/* Row 1: all correct */}
        <div style={{ display: "flex", justifyContent: "center", gap: 5, marginBottom: 8 }}>
          {[1,1,1,1,1].map((v, i) => <div key={`r1${i}`} style={{ width: 14, height: 14, borderRadius: 7, background: P.green }} />)}
        </div>
        {/* Row 2: one wrong */}
        <div style={{ display: "flex", justifyContent: "center", gap: 5, marginBottom: 8 }}>
          {[1,1,0,1,1].map((v, i) => <div key={`r2${i}`} style={{ width: 14, height: 14, borderRadius: 7, background: v ? P.green : P.coral }} />)}
        </div>
        {/* Row 3: all correct */}
        <div style={{ display: "flex", justifyContent: "center", gap: 5, marginBottom: 14 }}>
          {[1,1,1,1,1].map((v, i) => <div key={`r3${i}`} style={{ width: 14, height: 14, borderRadius: 7, background: P.green }} />)}
        </div>
        {/* Stars as SVG */}
        <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
          {[0,1,2].map(i => (
            <svg key={i} width="26" height="26" viewBox="0 0 100 100" style={{
              opacity: s4Anim >= 2 ? 1 : 0,
              transform: s4Anim >= 2 ? "scale(1)" : "scale(0)",
              transition: `all 0.5s ${0.1 * i}s cubic-bezier(0.34, 1.56, 0.64, 1)`,
            }}>
              <polygon points="50,5 63,35 95,35 69,57 79,90 50,70 21,90 31,57 5,35 37,35" fill={P.gold} />
            </svg>
          ))}
        </div>
      </div>

      {/* Feature pills */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center",
        opacity: s4Anim >= 2 ? 1 : 0, transform: s4Anim >= 2 ? "translateY(0)" : "translateY(12px)",
        transition: "all 0.5s 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}>
        {[
          { t: "200+ levels", c: P.accent },
          { t: "Daily challenge", c: P.green },
          { t: "Brain training", c: P.gold },
        ].map((f, i) => (
          <div key={i} style={{
            padding: "6px 14px", borderRadius: 20,
            background: `${f.c}0A`, border: `1px solid ${f.c}20`,
            fontSize: 12, fontWeight: 600, color: f.c,
            fontFamily: "-apple-system, sans-serif",
          }}>{f.t}</div>
        ))}
      </div>

      {/* CTA */}
      <div
        onClick={() => {}}
        style={{
          width: "100%", maxWidth: 280, padding: "16px 0", borderRadius: 14, textAlign: "center",
          background: `linear-gradient(135deg, ${P.accent}, ${P.accentL})`,
          color: "white", fontSize: 17, fontWeight: 700, fontFamily: "-apple-system, sans-serif",
          cursor: "pointer", marginTop: 4,
          boxShadow: `0 4px 24px ${P.glow}`,
          animation: s4Anim >= 3 ? "ctaPulse 2.5s infinite" : "none",
          opacity: s4Anim >= 3 ? 1 : 0, transform: s4Anim >= 3 ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.5s, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >Start playing</div>
      <div style={{
        fontSize: 12, color: P.textD, fontFamily: "-apple-system, sans-serif",
        opacity: s4Anim >= 3 ? 1 : 0, transition: "opacity 0.5s 0.3s",
      }}>Free to play. No account needed.</div>
    </div>,
  ];

  return (
    <div style={{
      width: "100%", maxWidth: 390, margin: "0 auto", minHeight: "100vh",
      background: P.bg, position: "relative", overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      <style>{`
        @keyframes shapeIn {
          from { opacity: 0; transform: scale(0.4) rotate(-15deg); }
          to { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes shapeFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ctaPulse {
          0%, 100% { box-shadow: 0 4px 24px ${P.glow}; }
          50% { box-shadow: 0 4px 40px rgba(108,92,231,0.3), 0 0 50px rgba(108,92,231,0.15); }
        }
      `}</style>

      {/* Skip */}
      {page < 3 && (
        <div onClick={() => setPage(3)} style={{
          position: "absolute", top: 16, right: 20, zIndex: 10,
          fontSize: 14, color: P.textD, cursor: "pointer", padding: "6px 12px",
          fontFamily: "-apple-system, sans-serif", fontWeight: 500,
        }}>Skip</div>
      )}

      {/* Content */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "50px 24px 0" }}>
        <div style={{ animation: "fadeInUp 0.4s forwards", width: "100%" }}>
          {pages[page]}
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{ padding: "20px 30px 40px", display: "flex", flexDirection: "column", gap: 18, alignItems: "center" }}>
        <Dots current={page} total={4} />
        {page < 3 ? (
          <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 280 }}>
            {page > 0 && (
              <div onClick={prev} style={{
                flex: 1, padding: "14px 0", borderRadius: 12, textAlign: "center",
                background: "white", border: "1px solid rgba(0,0,0,0.08)",
                color: P.textM, fontSize: 15, fontWeight: 600, cursor: "pointer",
                fontFamily: "-apple-system, sans-serif",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}>Back</div>
            )}
            <div onClick={next} style={{
              flex: 2, padding: "14px 0", borderRadius: 12, textAlign: "center",
              background: `linear-gradient(135deg, ${P.accent}, ${P.accentL})`,
              color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer",
              fontFamily: "-apple-system, sans-serif",
              boxShadow: `0 4px 16px ${P.glow}`,
            }}>Next</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
