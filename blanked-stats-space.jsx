import { useState, useEffect, useRef } from "react";

/*
  ═══════════════════════════════════════════════════
  BLANKED — Memory Analytics (Stats Space)
  ═══════════════════════════════════════════════════

  Usage:
    <StatsSpace mode="light" isSubscribed={true} />
    <StatsSpace mode="dark" isSubscribed={false} />

  mode: reads from app's theme setting, NOT a toggle on this screen
  isSubscribed: Blanked+ status. False = sample data + blur + upgrade prompt
*/

const C = {
  accent: "#6C5CE7", accentL: "#A29BFE", accentD: "#4A3BBF",
  green: "#00B894", coral: "#FF6B6B", gold: "#D4A012", blue: "#0984E3",
  pink: "#FD79A8", teal: "#00CEC9",
  text: "#1A1A18", textM: "#636E72", textD: "#B2BEC3",
};

const themes = {
  light: {
    bg: "#FAFAF7",
    glow: "rgba(108,92,231,0.06)",
    shapeOpacity: 0.06,
    cardBg: "rgba(108,92,231,0.04)",
    cardBorder: "rgba(108,92,231,0.06)",
    title: C.text,
    subtitle: C.textM,
    muted: C.textD,
    insightBg: "rgba(108,92,231,0.04)",
    insightBorder: "rgba(108,92,231,0.06)",
    insightText: C.text,
    insightSub: C.textM,
    radarGrid: "rgba(108,92,231,0.08)",
    radarAxis: "rgba(108,92,231,0.06)",
    radarFill: "rgba(108,92,231,0.06)",
    radarLabel: C.textM,
    badgeBg: "rgba(108,92,231,0.1)",
    badgeText: C.accent,
    backBg: "rgba(0,0,0,0.04)",
    backColor: C.textD,
    blinkGlow: "rgba(108,92,231,0.1)",
    blinkShadow: "rgba(108,92,231,0.06)",
    scoreSub: C.accent,
    blurFrom: "rgba(250,250,247,0)",
    blurMid: "rgba(250,250,247,0.8)",
    blurTo: "rgba(250,250,247,0.95)",
    sampleBadgeBg: "rgba(108,92,231,0.08)",
    sampleBadgeText: C.accent,
  },
  dark: {
    bg: "#0C0B14",
    glow: "rgba(108,92,231,0.08)",
    shapeOpacity: 0.08,
    cardBg: "rgba(255,255,255,0.06)",
    cardBorder: "rgba(255,255,255,0.06)",
    title: "#FFFFFF",
    subtitle: "rgba(255,255,255,0.5)",
    muted: "rgba(255,255,255,0.3)",
    insightBg: "rgba(255,255,255,0.04)",
    insightBorder: "rgba(255,255,255,0.06)",
    insightText: "#FFFFFF",
    insightSub: "rgba(255,255,255,0.4)",
    radarGrid: "rgba(108,92,231,0.08)",
    radarAxis: "rgba(108,92,231,0.06)",
    radarFill: "rgba(108,92,231,0.08)",
    radarLabel: "rgba(255,255,255,0.45)",
    badgeBg: "rgba(108,92,231,0.15)",
    badgeText: C.accentL,
    backBg: "rgba(255,255,255,0.08)",
    backColor: "rgba(255,255,255,0.5)",
    blinkGlow: "rgba(108,92,231,0.15)",
    blinkShadow: "rgba(108,92,231,0.08)",
    scoreSub: C.accentL,
    blurFrom: "rgba(12,11,20,0)",
    blurMid: "rgba(12,11,20,0.8)",
    blurTo: "rgba(12,11,20,0.95)",
    sampleBadgeBg: "rgba(255,255,255,0.08)",
    sampleBadgeText: "rgba(255,255,255,0.5)",
  },
};

// ═══ FLOATING SHAPE ═══
const FloatingShape = ({ type, color, size, startX, startY, speed, delay, opacity }) => {
  const timeRef = useRef(delay);
  const [pos, setPos] = useState({ x: startX, y: startY });
  useEffect(() => {
    let raf;
    const tick = () => {
      timeRef.current += 0.016;
      const tt = timeRef.current;
      setPos({
        x: startX + Math.sin(tt * speed * 0.7) * 30 + Math.cos(tt * speed * 0.3) * 15,
        y: startY + Math.cos(tt * speed * 0.5) * 25 + Math.sin(tt * speed * 0.4) * 10,
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const shapes = {
    circle: <circle cx={size/2} cy={size/2} r={size/2-1} fill={color} opacity={opacity} />,
    square: <rect width={size-2} height={size-2} x={1} y={1} rx={size*0.15} fill={color} opacity={opacity} />,
    triangle: <polygon points={`${size/2},2 ${size-2},${size-2} 2,${size-2}`} fill={color} opacity={opacity} />,
    star: (() => { const p=[]; for(let i=0;i<5;i++){const oa=(i*72-90)*Math.PI/180,ia=(i*72+36-90)*Math.PI/180,r=size/2-1;p.push(`${size/2+r*Math.cos(oa)},${size/2+r*Math.sin(oa)}`);p.push(`${size/2+r*0.4*Math.cos(ia)},${size/2+r*0.4*Math.sin(ia)}`);}return<polygon points={p.join(" ")} fill={color} opacity={opacity}/>; })(),
    diamond: <polygon points={`${size/2},1 ${size-1},${size/2} ${size/2},${size-1} 1,${size/2}`} fill={color} opacity={opacity} />,
  };

  return (
    <div style={{ position: "absolute", left: pos.x, top: pos.y, width: size, height: size, pointerEvents: "none" }}>
      <svg width={size} height={size}>{shapes[type]}</svg>
    </div>
  );
};

// ═══ BLINK (wandering eyes + periodic blink) ═══
const BlinkFloat = ({ size = 110, glowColor, shadowColor }) => {
  const s = size, cx = s/2, cy = s/2 + s*0.04, bR = s*0.38;
  const sw = (min, pct) => Math.max(min, s * pct);

  const [look, setLook] = useState({ x: 0, y: 0 });
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    const w = () => setLook({ x: (Math.random()-0.5)*s*0.04, y: (Math.random()-0.5)*s*0.03 });
    w();
    const t = setInterval(w, 2000 + Math.random() * 1500);
    return () => clearInterval(t);
  }, [s]);

  useEffect(() => {
    const t = setInterval(() => { setBlinking(true); setTimeout(() => setBlinking(false), 150); }, 3000 + Math.random() * 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <circle cx={cx} cy={cy} r={bR*1.5} fill={`url(#bglow-${s})`} />
      <ellipse cx={cx} cy={cy+bR+s*0.06} rx={bR*0.45} ry={s*0.02} fill={shadowColor} />
      <circle cx={cx} cy={cy} r={bR} fill={`url(#bbdy-${s})`} />
      <ellipse cx={cx-s*0.07} cy={cy-s*0.12} rx={bR*0.45} ry={bR*0.3} fill="rgba(255,255,255,0.14)" />
      {blinking ? (
        <>
          <path d={`M${cx-s*0.15},${cy-s*0.04} Q${cx-s*0.1},${cy-s*0.09} ${cx-s*0.04},${cy-s*0.04}`} fill="none" stroke={C.accentD} strokeWidth={sw(1,0.02)} strokeLinecap="round" opacity="0.5" />
          <path d={`M${cx+s*0.04},${cy-s*0.04} Q${cx+s*0.1},${cy-s*0.09} ${cx+s*0.15},${cy-s*0.04}`} fill="none" stroke={C.accentD} strokeWidth={sw(1,0.02)} strokeLinecap="round" opacity="0.5" />
        </>
      ) : (
        <>
          <ellipse cx={cx-s*0.1} cy={cy-s*0.05} rx={s*0.085} ry={s*0.11} fill="white" />
          <ellipse cx={cx+s*0.1} cy={cy-s*0.05} rx={s*0.085} ry={s*0.11} fill="white" />
          <circle cx={cx-s*0.085+look.x} cy={cy-s*0.04+look.y} r={s*0.045} fill={C.accent} style={{transition:"all 0.6s ease"}} />
          <circle cx={cx+s*0.115+look.x} cy={cy-s*0.04+look.y} r={s*0.045} fill={C.accent} style={{transition:"all 0.6s ease"}} />
          <circle cx={cx-s*0.07+look.x} cy={cy-s*0.06+look.y} r={s*0.015} fill="white" />
          <circle cx={cx+s*0.13+look.x} cy={cy-s*0.06+look.y} r={s*0.015} fill="white" />
        </>
      )}
      <path d={`M${cx-s*0.04},${cy+s*0.1} Q${cx},${cy+s*0.14} ${cx+s*0.04},${cy+s*0.1}`} fill="none" stroke={C.text} strokeWidth={sw(1,0.018)} strokeLinecap="round" />
      <defs>
        <radialGradient id={`bbdy-${s}`} cx="38%" cy="32%"><stop offset="0%" stopColor={C.accentL}/><stop offset="100%" stopColor={C.accent}/></radialGradient>
        <radialGradient id={`bglow-${s}`}><stop offset="0%" stopColor={glowColor}/><stop offset="100%" stopColor={glowColor} stopOpacity="0"/></radialGradient>
      </defs>
    </svg>
  );
};

// ═══ RADAR CHART ═══
const RadarChart = ({ data, size = 210, theme }) => {
  const cx = size/2, cy = size/2, r = size*0.38;
  const labels = ["Visual","Spatial","Sequence","Speed","Focus","Consistency"];
  const n = 6;
  const pt = (i, v) => { const a=(i*360/n-90)*Math.PI/180; return {x:cx+r*(v/100)*Math.cos(a), y:cy+r*(v/100)*Math.sin(a)}; };
  const dp = data.map((v,i) => pt(i,v));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.25,0.5,0.75,1.0].map((lv,li) => (
        <polygon key={li} points={Array.from({length:n},(_,i)=>{const p=pt(i,lv*100);return`${p.x},${p.y}`;}).join(" ")} fill="none" stroke={theme.radarGrid} strokeWidth="1" />
      ))}
      {Array.from({length:n},(_,i)=>{const p=pt(i,100);return<line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={theme.radarAxis} strokeWidth="1"/>;})}
      <polygon points={dp.map(p=>`${p.x},${p.y}`).join(" ")} fill={theme.radarFill} stroke={C.accent} strokeWidth="2" />
      {dp.map((p,i) => <circle key={i} cx={p.x} cy={p.y} r={4} fill={C.accent} stroke="white" strokeWidth="2" />)}
      {labels.map((l,i) => { const p=pt(i,120); return <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="600" fill={theme.radarLabel}>{l}</text>; })}
      {data.map((v,i) => { if(v<20)return null; const p=pt(i,v-12); return <text key={`v${i}`} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="800" fill={C.accent}>{v}</text>; })}
    </svg>
  );
};

// ═══ STAT CARD ═══
const StatCard = ({ value, label, icon, color, delay = 0, theme }) => {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div style={{
      padding: "12px 14px", borderRadius: 16, background: theme.cardBg, border: `1px solid ${theme.cardBorder}`,
      opacity: show ? 1 : 0, transform: show ? "translateY(0) scale(1)" : "translateY(10px) scale(0.95)",
      transition: "all 0.5s cubic-bezier(0.22, 1, 0.36, 1)", textAlign: "center", minWidth: 95, flex: 1,
    }}>
      <div style={{ fontSize: 16, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 9, fontWeight: 600, color: theme.muted, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</div>
    </div>
  );
};

// ═══ ANIMATED NUMBER ═══
const Num = ({ target, suffix = "", duration = 1200 }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const tick = () => { const p=Math.min(1,(Date.now()-start)/duration); setVal(Math.round(target*(1-Math.pow(1-p,3)))); if(p<1)requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return <>{val}{suffix}</>;
};

// ═══ BLINK CELEBRATE (for upgrade prompt) ═══
const BlinkCelebrate = ({ size = 50 }) => {
  const s = size, cx = s/2, cy = s/2+s*0.04, bR = s*0.38;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <circle cx={cx} cy={cy} r={bR} fill={`url(#bbc-${s})`} />
      <ellipse cx={cx-s*0.07} cy={cy-s*0.12} rx={bR*0.45} ry={bR*0.3} fill="rgba(255,255,255,0.14)" />
      <ellipse cx={cx-s*0.1} cy={cy-s*0.05} rx={s*0.085} ry={s*0.11*1.3} fill="white" />
      <ellipse cx={cx+s*0.1} cy={cy-s*0.05} rx={s*0.085} ry={s*0.11*1.3} fill="white" />
      <circle cx={cx-s*0.085} cy={cy-s*0.04} r={s*0.055} fill={C.accent} />
      <circle cx={cx+s*0.115} cy={cy-s*0.04} r={s*0.055} fill={C.accent} />
      <circle cx={cx-s*0.07} cy={cy-s*0.06} r={s*0.015} fill="white" />
      <circle cx={cx+s*0.13} cy={cy-s*0.06} r={s*0.015} fill="white" />
      <path d={`M${cx-s*0.08},${cy+s*0.08} Q${cx},${cy+s*0.19} ${cx+s*0.08},${cy+s*0.08}`} fill="none" stroke={C.text} strokeWidth={Math.max(1,s*0.02)} strokeLinecap="round" />
      <defs><radialGradient id={`bbc-${s}`} cx="38%" cy="32%"><stop offset="0%" stopColor={C.accentL}/><stop offset="100%" stopColor={C.accent}/></radialGradient></defs>
    </svg>
  );
};

// ═══ SHIMMER BUTTON ═══
const ShimmerBtn = ({ children }) => {
  const [sh, setSh] = useState(-30);
  useEffect(() => { const t = setInterval(() => setSh(p => p >= 120 ? -30 : p + 1.5), 25); return () => clearInterval(t); }, []);
  return (
    <div style={{
      padding: "14px 0", borderRadius: 14, textAlign: "center", cursor: "pointer",
      background: `linear-gradient(135deg, ${C.accent}, ${C.accentD})`,
      position: "relative", overflow: "hidden", boxShadow: `0 4px 18px ${C.accent}30`,
    }}>
      <div style={{ position: "absolute", top: 0, bottom: 0, width: 50, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)", left: `${sh}%`, transform: "skewX(-20deg)" }} />
      <span style={{ fontSize: 15, fontWeight: 700, color: "white", position: "relative", zIndex: 1 }}>{children}</span>
    </div>
  );
};

// ═══ MAIN COMPONENT ═══
// mode: "light" | "dark" — from app theme, NOT a toggle
// isSubscribed: boolean — Blanked+ status
export default function StatsSpace({ mode = "light", isSubscribed = true }) {
  const t = themes[mode];
  const [loaded, setLoaded] = useState(false);
  const [showBlur, setShowBlur] = useState(false);

  useEffect(() => { setTimeout(() => setLoaded(true), 300); }, []);
  useEffect(() => {
    if (!isSubscribed) { setTimeout(() => setShowBlur(true), 2500); }
  }, [isSubscribed]);

  // Sample data for free users, real data for subscribers
  const stats = isSubscribed
    ? { score: 82, accuracy: 87, streak: 14, stars: 479, levels: 142, speed: 1.4, days: 23, radar: [82, 74, 68, 88, 76, 91] }
    : { score: 82, accuracy: 87, streak: 14, stars: 479, levels: 142, speed: 1.4, days: 23, radar: [82, 74, 68, 88, 76, 91] };

  const shapeColors = [C.accent, C.accentL, C.coral, C.green, C.gold, C.blue, C.pink, C.teal];
  const shapeTypes = ["circle", "square", "triangle", "star", "diamond"];
  const floats = useRef(Array.from({ length: 40 }, (_, i) => ({
    type: shapeTypes[i % 5], color: shapeColors[i % shapeColors.length],
    size: 12 + Math.random() * 28, startX: Math.random() * 360, startY: Math.random() * 820,
    speed: 0.3 + Math.random() * 0.6, delay: Math.random() * 2,
  }))).current;

  return (
    <div style={{
      width: 390, height: 844, margin: "20px auto",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
      background: t.bg, borderRadius: 24, overflow: "hidden", position: "relative",
      transition: "background 0.4s",
    }}>
      {/* Glow */}
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 35%, ${t.glow} 0%, transparent 60%)` }} />

      {/* Shapes */}
      {floats.map((s, i) => <FloatingShape key={i} {...s} opacity={t.shapeOpacity} />)}

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ padding: "50px 20px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: t.backBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <span style={{ fontSize: 14, color: t.backColor }}>‹</span>
            </div>
            <span style={{ fontSize: 18, fontWeight: 800, color: t.title }}>Memory Analytics</span>
          </div>
          {isSubscribed && (
            <div style={{ padding: "4px 10px", borderRadius: 10, background: t.badgeBg }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: t.badgeText }}>BLANKED+</span>
            </div>
          )}
        </div>

        {/* Sample data badge for free users */}
        {!isSubscribed && !showBlur && (
          <div style={{ display: "flex", justifyContent: "center", padding: "2px 0" }}>
            <div style={{ padding: "3px 10px", borderRadius: 8, background: t.sampleBadgeBg }}>
              <span style={{ fontSize: 8, fontWeight: 700, color: t.sampleBadgeText, letterSpacing: 1 }}>SAMPLE DATA</span>
            </div>
          </div>
        )}

        {/* Blink + Score */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 0 0",
          opacity: loaded ? 1 : 0, transform: loaded ? "scale(1)" : "scale(0.9)",
          transition: "all 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
        }}>
          <div style={{ animation: "blinkFloat 4s infinite ease-in-out" }}>
            <BlinkFloat size={110} glowColor={t.blinkGlow} shadowColor={t.blinkShadow} />
          </div>
          <div style={{ marginTop: -4, textAlign: "center" }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: t.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>MEMORY SCORE</div>
            <div style={{ fontSize: 44, fontWeight: 800, color: t.title, lineHeight: 1 }}><Num target={stats.score} duration={1500} /></div>
            <div style={{ fontSize: 11, fontWeight: 600, color: t.scoreSub, marginTop: 4 }}>Top 15% of players</div>
          </div>
        </div>

        {/* Stats row 1 */}
        <div style={{ display: "flex", gap: 8, padding: "14px 16px 0" }}>
          <StatCard icon="🎯" value={<Num target={stats.accuracy} suffix="%" />} label="Accuracy" color={C.green} delay={400} theme={t} />
          <StatCard icon="🔥" value={<Num target={stats.streak} />} label="Best Streak" color={C.coral} delay={550} theme={t} />
          <StatCard icon="⭐" value={<Num target={stats.stars} />} label="Stars" color={C.gold} delay={700} theme={t} />
        </div>

        {/* Stats row 2 */}
        <div style={{ display: "flex", gap: 8, padding: "8px 16px 0" }}>
          <StatCard icon="🧩" value={<Num target={stats.levels} />} label="Levels Done" color={C.blue} delay={850} theme={t} />
          <StatCard icon="⚡" value={<><Num target={1} />.<Num target={4} />s</>} label="Avg Speed" color={C.teal} delay={1000} theme={t} />
          <StatCard icon="📅" value={<Num target={stats.days} />} label="Days Active" color={C.pink} delay={1150} theme={t} />
        </div>

        {/* Radar */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 0 0",
          opacity: loaded ? 1 : 0, transition: "opacity 1.2s 0.5s",
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: t.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 2 }}>BRAIN PROFILE</div>
          <RadarChart data={stats.radar} size={210} theme={t} />
        </div>

        {/* Insight (subscribers only) */}
        {isSubscribed && (
          <div style={{ padding: "0 24px 28px", marginTop: "auto" }}>
            <div style={{
              padding: "12px 16px", borderRadius: 14, background: t.insightBg,
              border: `1px solid ${t.insightBorder}`, display: "flex", alignItems: "flex-start", gap: 10,
            }}>
              <span style={{ fontSize: 16 }}>🧠</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: t.insightText, marginBottom: 2 }}>Your strongest area: Speed</div>
                <div style={{ fontSize: 10, color: t.insightSub, lineHeight: 1.4 }}>You answer faster than 88% of players. Try Sequence mode to challenge your weakest area.</div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ FREE USER: BLUR OVERLAY + UPGRADE PROMPT ═══ */}
        {!isSubscribed && showBlur && (
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: "55%",
            background: `linear-gradient(to bottom, ${t.blurFrom}, ${t.blurMid} 20%, ${t.blurTo})`,
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "0 32px",
            animation: "blurSlideUp 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
            zIndex: 10,
          }}>
            <BlinkCelebrate size={56} />
            <div style={{ fontSize: 22, fontWeight: 800, color: t.title, marginTop: 10, marginBottom: 4 }}>Like what you see?</div>
            <div style={{ fontSize: 13, color: t.subtitle, textAlign: "center", lineHeight: 1.5, marginBottom: 20, maxWidth: 280 }}>
              Unlock Memory Analytics with Blanked+ and track your real brain performance over time.
            </div>
            <div style={{ width: "100%", maxWidth: 300 }}>
              <ShimmerBtn>Upgrade to Blanked+</ShimmerBtn>
            </div>
            <div style={{ fontSize: 10, color: t.muted, marginTop: 8 }}>Includes unlimited lives, 100 gems/month, and more</div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes blinkFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes blurSlideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
