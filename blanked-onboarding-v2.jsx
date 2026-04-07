import { useState, useEffect } from "react";

const C = {
  bg: "#FAFAF7", accent: "#6C5CE7", accentL: "#A29BFE", accentD: "#4A3BBF",
  green: "#00B894", coral: "#FF6B6B", gold: "#D4A012", blue: "#0984E3",
  teal: "#00CEC9", pink: "#FD79A8",
  text: "#1A1A18", textM: "#636E72", textD: "#B2BEC3",
};

// Animated counter that counts up
const Counter = ({ target, duration = 1500, suffix = "", prefix = "" }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const pct = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - pct, 3); // ease-out cubic
      setVal(Math.round(target * eased));
      if (pct < 1) requestAnimationFrame(tick);
    };
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return <>{prefix}{val}{suffix}</>;
};

// Staggered fade-in wrapper
const FadeIn = ({ delay = 0, children }) => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div style={{
      opacity: show ? 1 : 0,
      transform: show ? "translateY(0)" : "translateY(12px)",
      transition: "all 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
    }}>{children}</div>
  );
};

// ═══ SCREEN 1: EMOTIONAL HOOK ═══
const Screen1 = () => {
  // Pulsing brain animation
  const [pulse, setPulse] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setPulse(p => p === 1 ? 1.06 : 1), 1200);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "0 32px", textAlign: "center",
    }}>
      {/* Brain visual */}
      <FadeIn delay={200}>
        <div style={{
          width: 120, height: 120, borderRadius: 36,
          background: `linear-gradient(135deg, ${C.accent}15, ${C.accentL}10)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 32, marginLeft: "auto", marginRight: "auto",
          transform: `scale(${pulse})`,
          transition: "transform 0.6s ease",
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: 24,
            background: `linear-gradient(135deg, ${C.accent}20, ${C.accentL}15)`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="44" height="44" viewBox="0 0 48 48">
              {/* Brain icon */}
              <path d="M24,6 C18,6 14,10 14,14 C10,14 8,18 8,22 C8,26 10,28 12,29 C12,34 16,38 20,40 L20,42 L28,42 L28,40 C32,38 36,34 36,29 C38,28 40,26 40,22 C40,18 38,14 34,14 C34,10 30,6 24,6Z" fill="none" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M24,14 L24,42" fill="none" stroke={C.accent} strokeWidth="1.5" strokeDasharray="2,3" opacity="0.4" />
              <path d="M18,20 C20,18 22,20 24,18" fill="none" stroke={C.accent} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
              <path d="M24,24 C26,22 28,24 30,22" fill="none" stroke={C.accent} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
            </svg>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={500}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: C.text, lineHeight: 1.2, margin: "0 0 12px" }}>
          Your memory is<br />more powerful<br />than you think
        </h1>
      </FadeIn>

      <FadeIn delay={800}>
        <p style={{ fontSize: 15, color: C.textM, lineHeight: 1.6, margin: 0 }}>
          You just need to train it.
        </p>
      </FadeIn>
    </div>
  );
};

// ═══ SCREEN 2: SCIENCE-BACKED BENEFITS ═══
const Screen2 = () => {
  const benefits = [
    {
      icon: <svg width="22" height="22" viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" fill="none" stroke={C.blue} strokeWidth="2.5" /><path d="M20,12 L20,20 L27,24" fill="none" stroke={C.blue} strokeWidth="2.5" strokeLinecap="round" /></svg>,
      stat: "23%",
      label: "faster recall",
      desc: "Memory training improves how quickly you retrieve information",
      color: C.blue,
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" fill="none" stroke={C.green} strokeWidth="2.5" /><path d="M14,20 C14,20 18,28 26,14" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
      stat: "31%",
      label: "better focus",
      desc: "Visual memory exercises strengthen attention and concentration",
      color: C.green,
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 40 40"><path d="M8,28 L16,16 L24,22 L32,10" fill="none" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="32" cy="10" r="3" fill={C.accent} /></svg>,
      stat: "40%",
      label: "sharper with age",
      desc: "Consistent brain training helps maintain cognitive function long-term",
      color: C.accent,
    },
  ];

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      padding: "0 24px", justifyContent: "center",
    }}>
      <FadeIn delay={200}>
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.accent, letterSpacing: 1.5, textTransform: "uppercase" }}>BACKED BY SCIENCE</span>
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: C.text, lineHeight: 1.2, margin: "0 0 24px" }}>
          Memory training<br />actually works
        </h2>
      </FadeIn>

      {benefits.map((b, i) => (
        <FadeIn key={i} delay={400 + i * 200}>
          <div style={{
            display: "flex", gap: 14, padding: "14px 0",
            borderBottom: i < 2 ? "1px solid rgba(0,0,0,0.04)" : "none",
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14, flexShrink: 0,
              background: `${b.color}08`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{b.icon}</div>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: 2 }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: b.color }}>
                  <Counter target={parseInt(b.stat)} suffix="%" duration={1200 + i * 300} />
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{b.label}</span>
              </div>
              <p style={{ fontSize: 11, color: C.textM, lineHeight: 1.4, margin: 0 }}>{b.desc}</p>
            </div>
          </div>
        </FadeIn>
      ))}
    </div>
  );
};

// ═══ SCREEN 3: THE COMMITMENT ═══
const Screen3 = () => {
  const days = ["M","T","W","T","F","S","S"];
  const [filledDays, setFilledDays] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFilledDays(d => d < 7 ? d + 1 : d), 300);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "0 28px", textAlign: "center",
    }}>
      <FadeIn delay={200}>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: C.text, lineHeight: 1.2, margin: "0 0 6px" }}>
          Just 2 minutes a day
        </h2>
        <p style={{ fontSize: 14, color: C.textM, margin: "0 0 28px" }}>
          That's all it takes to build a sharper memory
        </p>
      </FadeIn>

      {/* Week streak visual */}
      <FadeIn delay={500}>
        <div style={{
          background: "white", borderRadius: 18, padding: "18px 20px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
          width: "100%", marginBottom: 24,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.textD, letterSpacing: 1, marginBottom: 12, textTransform: "uppercase" }}>
            Your first week
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {days.map((d, i) => {
              const filled = i < filledDays;
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 12,
                    background: filled ? `${C.coral}12` : "#F5F4F0",
                    border: filled ? `2px solid ${C.coral}` : "2px solid transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    transform: filled ? "scale(1)" : "scale(0.9)",
                  }}>
                    {filled ? (
                      <svg width="16" height="16" viewBox="0 0 100 100">
                        <path d="M50,88 C20,65 5,50 5,32 C5,18 16,8 30,8 C38,8 45,12 50,20 C55,12 62,8 70,8 C84,8 95,18 95,32 C95,50 80,65 50,88Z" fill={C.coral} />
                      </svg>
                    ) : (
                      <div style={{ width: 8, height: 8, borderRadius: 4, background: "#E0DCDA" }} />
                    )}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: filled ? C.text : C.textD }}>{d}</span>
                </div>
              );
            })}
          </div>
          {filledDays >= 7 && (
            <div style={{
              marginTop: 12, padding: "6px 0", borderRadius: 8,
              background: `${C.coral}08`, textAlign: "center",
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.coral }}>🔥 7-day streak — you did it!</span>
            </div>
          )}
        </div>
      </FadeIn>

      {/* Micro stats */}
      <FadeIn delay={900}>
        <div style={{ display: "flex", gap: 12, width: "100%" }}>
          {[
            { value: "2 min", label: "per session", color: C.accent },
            { value: "14 min", label: "per week", color: C.blue },
            { value: "12 hrs", label: "per year", color: C.green },
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1, background: "white", borderRadius: 14, padding: "12px 6px",
              textAlign: "center", boxShadow: "0 1px 6px rgba(0,0,0,0.03)",
            }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, color: C.textD, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </FadeIn>
    </div>
  );
};

// ═══ SCREEN 4: HOW IT WORKS ═══
const Screen4 = () => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % 3), 2000);
    return () => clearInterval(t);
  }, []);

  const steps = [
    {
      num: "1",
      title: "Memorise",
      desc: "Study the shapes, colours, and positions",
      visual: (
        <div style={{
          width: "100%", height: 120, background: "white", borderRadius: 14,
          position: "relative", boxShadow: "0 1px 6px rgba(0,0,0,0.03)",
        }}>
          <div style={{ position: "absolute", left: "15%", top: "18%" }}><div style={{ width: 24, height: 24, borderRadius: "50%", background: C.coral }} /></div>
          <div style={{ position: "absolute", right: "18%", top: "20%" }}><div style={{ width: 22, height: 22, borderRadius: 5, background: C.blue }} /></div>
          <div style={{ position: "absolute", left: "50%", top: "45%", transform: "translateX(-50%)" }}>
            <svg width="24" height="24" viewBox="0 0 100 100"><polygon points="50,5 62,35 95,35 68,55 78,90 50,70 22,90 32,55 5,35 38,35" fill={C.accent} /></svg>
          </div>
          <div style={{ position: "absolute", left: "20%", bottom: "15%" }}>
            <svg width="22" height="22" viewBox="0 0 100 100"><polygon points="50,8 95,88 5,88" fill={C.green} /></svg>
          </div>
          <div style={{ position: "absolute", right: "20%", bottom: "18%" }}>
            <svg width="20" height="20" viewBox="0 0 100 100"><polygon points="50,5 95,50 50,95 5,50" fill={C.gold} /></svg>
          </div>
        </div>
      ),
    },
    {
      num: "2",
      title: "Go blank",
      desc: "The scene disappears completely",
      visual: (
        <div style={{
          width: "100%", height: 120, background: "white", borderRadius: 14,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 1px 6px rgba(0,0,0,0.03)",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 2 }}>🫣</div>
            <div style={{ fontSize: 11, color: C.textD }}>Gone!</div>
          </div>
        </div>
      ),
    },
    {
      num: "3",
      title: "Answer",
      desc: "Test your memory with questions",
      visual: (
        <div style={{
          width: "100%", height: 120, background: "white", borderRadius: 14,
          padding: "10px 12px", boxShadow: "0 1px 6px rgba(0,0,0,0.03)",
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.text, marginBottom: 8 }}>How many shapes?</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
            {["4", "5", "6", "3"].map((v, i) => (
              <div key={i} style={{
                padding: "8px 0", borderRadius: 8, textAlign: "center",
                background: i === 1 ? `${C.green}12` : "#F5F4F0",
                border: i === 1 ? `1.5px solid ${C.green}` : "1.5px solid transparent",
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: i === 1 ? C.green : C.textD }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      padding: "0 24px", justifyContent: "center",
    }}>
      <FadeIn delay={200}>
        <div style={{ marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.accent, letterSpacing: 1.5, textTransform: "uppercase" }}>HOW IT WORKS</span>
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: C.text, lineHeight: 1.2, margin: "0 0 24px" }}>
          Simple, fun,<br />surprisingly addictive
        </h2>
      </FadeIn>

      {/* Active step display */}
      <FadeIn delay={400}>
        <div key={step} style={{
          marginBottom: 20,
          animation: "stepFade 0.4s ease-out",
        }}>
          {steps[step].visual}
        </div>
      </FadeIn>

      {/* Step indicators */}
      <div style={{ display: "flex", gap: 10 }}>
        {steps.map((s, i) => (
          <FadeIn key={i} delay={500 + i * 100}>
            <div
              onClick={() => setStep(i)}
              style={{
                flex: 1, padding: "12px 10px", borderRadius: 14, cursor: "pointer",
                background: i === step ? `${C.accent}06` : "white",
                border: i === step ? `1.5px solid ${C.accent}20` : "1.5px solid rgba(0,0,0,0.04)",
                transition: "all 0.3s",
              }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: 8, marginBottom: 6,
                background: i === step ? C.accent : "#F0EFEB",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.3s",
              }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: i === step ? "white" : C.textD }}>{s.num}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: i === step ? C.accent : C.text }}>{s.title}</div>
              <div style={{ fontSize: 9, color: C.textD, marginTop: 2, lineHeight: 1.3 }}>{s.desc}</div>
            </div>
          </FadeIn>
        ))}
      </div>

      <style>{`@keyframes stepFade { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
};

// ═══ SCREEN 5: SOCIAL PROOF / WHAT PLAYERS SAY ═══
const Screen5 = () => {
  const testimonials = [
    { name: "Sarah M.", streak: "42 day streak", text: "I play every morning with my coffee. It's become my favourite way to wake up my brain.", avatar: "S", color: C.coral },
    { name: "James K.", streak: "28 day streak", text: "Started to improve my focus at work. Now I'm addicted to getting 3 stars on every level.", avatar: "J", color: C.blue },
    { name: "Maria L.", streak: "67 day streak", text: "My memory has genuinely improved. I remember shopping lists without writing them down now!", avatar: "M", color: C.green },
  ];

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      padding: "0 24px", justifyContent: "center",
    }}>
      <FadeIn delay={200}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 2, marginBottom: 8 }}>
            {[1,2,3,4].map(i => (
              <svg key={i} width="18" height="18" viewBox="0 0 24 24">
                <polygon points="12,2 15,8 22,9 17,14 18,21 12,17 6,21 7,14 2,9 9,8" fill={C.gold} />
              </svg>
            ))}
            {/* 5th star — 80% filled for 4.8 rating */}
            <svg width="18" height="18" viewBox="0 0 24 24">
              <defs>
                <linearGradient id="partialStar">
                  <stop offset="80%" stopColor={C.gold} />
                  <stop offset="80%" stopColor={`${C.gold}25`} />
                </linearGradient>
              </defs>
              <polygon points="12,2 15,8 22,9 17,14 18,21 12,17 6,21 7,14 2,9 9,8" fill="url(#partialStar)" />
            </svg>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.textM }}>4.8 out of 5 · App Store</div>
        </div>
      </FadeIn>

      {testimonials.map((t, i) => (
        <FadeIn key={i} delay={400 + i * 200}>
          <div style={{
            background: "white", borderRadius: 16, padding: "14px 16px",
            boxShadow: "0 1px 6px rgba(0,0,0,0.03)",
            marginBottom: 8,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: `${t.color}15`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, color: t.color,
              }}>{t.avatar}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{t.name}</div>
                <div style={{ fontSize: 9, color: t.color, fontWeight: 600 }}>🔥 {t.streak}</div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: C.textM, lineHeight: 1.5, margin: 0 }}>"{t.text}"</p>
          </div>
        </FadeIn>
      ))}
    </div>
  );
};

// ═══ SCREEN 6: GET STARTED ═══
const Screen6 = () => {
  const [shimmer, setShimmer] = useState(-30);
  useEffect(() => {
    const t = setInterval(() => setShimmer(p => p >= 120 ? -30 : p + 1.5), 25);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "0 28px", textAlign: "center",
    }}>
      <FadeIn delay={200}>
        {/* Logo */}
        <div style={{
          width: 80, height: 80, borderRadius: 24,
          background: `linear-gradient(135deg, ${C.accent}, ${C.accentL})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 20,
          boxShadow: `0 8px 24px ${C.accent}25`,
        }}>
          <svg width="42" height="26" viewBox="0 0 36 24">
            <path d="M2 12Q18 2 34 12Q18 22 2 12Z" fill="rgba(255,255,255,0.25)" stroke="white" strokeWidth="1.2" />
            <circle cx="18" cy="12" r="5" fill="white" />
          </svg>
        </div>
      </FadeIn>

      <FadeIn delay={400}>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: C.text, lineHeight: 1.2, margin: "0 0 6px" }}>
          Ready to train<br />your memory?
        </h2>
        <p style={{ fontSize: 14, color: C.textM, margin: "0 0 28px" }}>
          Free to play. 2 minutes a day.<br />Your brain will thank you.
        </p>
      </FadeIn>

      <FadeIn delay={600}>
        <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
          {[
            { icon: "🎮", label: "380+ levels" },
            { icon: "🧠", label: "6 game modes" },
            { icon: "👥", label: "Challenge friends" },
          ].map((f, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{f.icon}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.textM }}>{f.label}</div>
            </div>
          ))}
        </div>
      </FadeIn>

      <FadeIn delay={800}>
        <div style={{ width: "100%" }}>
          {/* CTA */}
          <div style={{
            padding: "16px 0", borderRadius: 16, textAlign: "center", cursor: "pointer",
            background: `linear-gradient(135deg, ${C.accent}, ${C.accentD})`,
            position: "relative", overflow: "hidden",
            boxShadow: `0 4px 20px ${C.accent}30`,
          }}>
            <div style={{
              position: "absolute", top: 0, bottom: 0, width: 50,
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
              left: `${shimmer}%`, transform: "skewX(-20deg)",
            }} />
            <span style={{ fontSize: 17, fontWeight: 700, color: "white", position: "relative", zIndex: 1 }}>
              Play Now
            </span>
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: C.textD }}>
            No account needed to try
          </div>
        </div>
      </FadeIn>
    </div>
  );
};

// ═══ DOT INDICATORS ═══
const Dots = ({ total, current }) => (
  <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
    {Array.from({ length: total }, (_, i) => (
      <div key={i} style={{
        width: i === current ? 18 : 6,
        height: 6, borderRadius: 3,
        background: i === current ? C.accent : i < current ? C.accentL : "#E0DCDA",
        transition: "all 0.3s",
      }} />
    ))}
  </div>
);

// ═══ MAIN ONBOARDING ═══
const screens = [Screen1, Screen2, Screen3, Screen4, Screen5, Screen6];

export default function OnboardingFlow() {
  const [current, setCurrent] = useState(0);
  const ActiveScreen = screens[current];
  const isLast = current === screens.length - 1;

  return (
    <div style={{
      width: 390, height: 844, margin: "20px auto",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
      background: C.bg, borderRadius: 24, overflow: "hidden",
      boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
      display: "flex", flexDirection: "column",
      position: "relative",
    }}>
      {/* Skip button */}
      {!isLast && (
        <div style={{
          position: "absolute", top: 52, right: 20, zIndex: 10,
          cursor: "pointer",
        }} onClick={() => setCurrent(screens.length - 1)}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.textD }}>Skip</span>
        </div>
      )}

      {/* Screen content */}
      <div key={current} style={{
        flex: 1, paddingTop: 60,
        animation: "onboardFade 0.5s ease-out",
      }}>
        <ActiveScreen />
      </div>

      {/* Bottom: dots + next button */}
      <div style={{ padding: "0 24px 36px" }}>
        <Dots total={screens.length} current={current} />
        {!isLast && (
          <div
            onClick={() => setCurrent(c => c + 1)}
            style={{
              marginTop: 16, padding: "14px 0", borderRadius: 14,
              background: C.accent, textAlign: "center", cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 700, color: "white" }}>
              {current === 0 ? "Tell me more" : "Continue"}
            </span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes onboardFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
