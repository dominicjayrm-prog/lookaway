import React from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  Line,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
  LinearGradient,
} from 'react-native-svg';

// ─── TYPES ─────────────────────────────────────────────────
export type BlinkExpression =
  | 'normal'
  | 'memorise'
  | 'blank'
  | 'thinking'
  | 'correct'
  | 'wrong'
  | 'celebrate'
  | 'streak'
  | 'sad'
  | 'sleeping'
  | 'surprised'
  | 'love';

interface BlinkProps {
  expression?: BlinkExpression;
  size?: number;
  /** Shift pupils: {x: -1 to 1, y: -1 to 1}. 0,0 = center, 0,1 = looking down */
  lookOffset?: { x: number; y: number };
}

// ─── COLORS ────────────────────────────────────────────────
const C = {
  accent: '#6C5CE7',
  accentL: '#A29BFE',
  accentD: '#4A3BBF',
  green: '#00B894',
  coral: '#FF6B6B',
  gold: '#D4A012',
  blue: '#0984E3',
  pink: '#FD79A8',
  teal: '#00CEC9',
  text: '#1A1A18',
  textM: '#636E72',
};

// ─── HELPERS ───────────────────────────────────────────────
function starPts(sx: number, sy: number, sr: number): string {
  const p: string[] = [];
  for (let i = 0; i < 5; i++) {
    const oa = (i * 72 - 90) * Math.PI / 180;
    const ia = ((i * 72) + 36 - 90) * Math.PI / 180;
    p.push(`${sx + sr * Math.cos(oa)},${sy + sr * Math.sin(oa)}`);
    p.push(`${sx + sr * 0.4 * Math.cos(ia)},${sy + sr * 0.4 * Math.sin(ia)}`);
  }
  return p.join(' ');
}

function heartPath(hx: number, hy: number, hs: number): string {
  return `M${hx},${hy + hs * 0.3} C${hx - hs * 0.5},${hy - hs * 0.15} ${hx - hs * 0.5},${hy - hs * 0.55} ${hx},${hy - hs * 0.3} C${hx + hs * 0.5},${hy - hs * 0.55} ${hx + hs * 0.5},${hy - hs * 0.15} ${hx},${hy + hs * 0.3}Z`;
}

// ─── BLINK COMPONENT ───────────────────────────────────────
let _blinkId = 0;

function BlinkComponent({ expression = 'normal', size = 120, lookOffset }: BlinkProps) {
  const id = React.useRef(`blink-${++_blinkId}`).current;
  const s = size;
  const cx = s / 2;
  const cy = s / 2 + s * 0.04;
  const bR = s * 0.38;
  const sw = (min: number, pct: number) => Math.max(min, s * pct);

  // ═══ BODY ═══
  const body = (
    <>
      <Ellipse cx={cx} cy={cy + bR + s * 0.04} rx={bR * 0.55} ry={s * 0.025} fill="rgba(0,0,0,0.06)" />
      <Circle cx={cx} cy={cy} r={bR} fill={`url(#${id})`} />
      <Ellipse cx={cx - s * 0.07} cy={cy - s * 0.12} rx={bR * 0.45} ry={bR * 0.3} fill="rgba(255,255,255,0.14)" />
    </>
  );

  // ═══ EYES ═══
  const eyes = ({ pc = C.text, sx: sxE = 1, sy: syE = 1, pr = s * 0.045, lx = 0, ly = 0, sp = true }: {
    pc?: string; sx?: number; sy?: number; pr?: number; lx?: number; ly?: number; sp?: boolean;
  } = {}) => (
    <>
      <Ellipse cx={cx - s * 0.1} cy={cy - s * 0.05} rx={s * 0.085 * sxE} ry={s * 0.11 * syE} fill="white" />
      <Ellipse cx={cx + s * 0.1} cy={cy - s * 0.05} rx={s * 0.085 * sxE} ry={s * 0.11 * syE} fill="white" />
      <Circle cx={cx - s * 0.085 + lx} cy={cy - s * 0.04 + ly} r={pr} fill={pc} />
      <Circle cx={cx + s * 0.115 + lx} cy={cy - s * 0.04 + ly} r={pr} fill={pc} />
      {sp && (
        <>
          <Circle cx={cx - s * 0.07 + lx} cy={cy - s * 0.06 + ly} r={s * 0.014} fill="white" />
          <Circle cx={cx + s * 0.13 + lx} cy={cy - s * 0.06 + ly} r={s * 0.014} fill="white" />
        </>
      )}
    </>
  );

  // ═══ MOUTHS ═══
  const smile = (w = 0.06, lift = 0.06) => (
    <Path
      d={`M${cx - s * w},${cy + s * 0.1} Q${cx},${cy + s * 0.1 + s * lift} ${cx + s * w},${cy + s * 0.1}`}
      fill="none" stroke={C.text} strokeWidth={sw(1, 0.018)} strokeLinecap="round"
    />
  );

  const bigSmile = () => (
    <Path
      d={`M${cx - s * 0.08},${cy + s * 0.08} Q${cx},${cy + s * 0.19} ${cx + s * 0.08},${cy + s * 0.08}`}
      fill="none" stroke={C.text} strokeWidth={sw(1, 0.02)} strokeLinecap="round"
    />
  );

  const frown = (w = 0.05) => (
    <Path
      d={`M${cx - s * w},${cy + s * 0.13} Q${cx},${cy + s * 0.09} ${cx + s * w},${cy + s * 0.13}`}
      fill="none" stroke={C.text} strokeWidth={sw(1, 0.016)} strokeLinecap="round"
    />
  );

  const openMouth = () => (
    <Ellipse cx={cx} cy={cy + s * 0.12} rx={s * 0.04} ry={s * 0.035} fill={C.accentD} />
  );

  // ═══ BLANK: ARMS + HANDS ═══
  const blankArmsAndHands = () => (
    <>
      {/* Left arm */}
      <Path
        d={`M${cx - bR + s * 0.06},${cy + s * 0.1} C${cx - bR - s * 0.08},${cy - s * 0.02} ${cx - bR - s * 0.06},${cy - s * 0.18} ${cx - s * 0.18},${cy - s * 0.04}`}
        fill="none" stroke={C.accentD} strokeWidth={sw(1.5, 0.04)} strokeLinecap="round"
      />
      {/* Right arm */}
      <Path
        d={`M${cx + bR - s * 0.06},${cy + s * 0.1} C${cx + bR + s * 0.08},${cy - s * 0.02} ${cx + bR + s * 0.06},${cy - s * 0.18} ${cx + s * 0.18},${cy - s * 0.04}`}
        fill="none" stroke={C.accentD} strokeWidth={sw(1.5, 0.04)} strokeLinecap="round"
      />
      {/* Left hand */}
      <Ellipse cx={cx - s * 0.11} cy={cy - s * 0.03} rx={s * 0.11} ry={s * 0.065} fill="white" stroke="#DDD9D5" strokeWidth={sw(0.5, 0.007)} />
      <Ellipse cx={cx - s * 0.19} cy={cy - s * 0.06} rx={s * 0.025} ry={s * 0.035} fill="white" stroke="#DDD9D5" strokeWidth={sw(0.4, 0.005)} />
      {/* Right hand */}
      <Ellipse cx={cx + s * 0.11} cy={cy - s * 0.03} rx={s * 0.11} ry={s * 0.065} fill="white" stroke="#DDD9D5" strokeWidth={sw(0.5, 0.007)} />
      <Ellipse cx={cx + s * 0.19} cy={cy - s * 0.06} rx={s * 0.025} ry={s * 0.035} fill="white" stroke="#DDD9D5" strokeWidth={sw(0.4, 0.005)} />
      {/* Finger hints */}
      <Line x1={cx - s * 0.15} y1={cy - s * 0.035} x2={cx - s * 0.15} y2={cy + s * 0.005} stroke="#E8E4E0" strokeWidth={sw(0.3, 0.005)} strokeLinecap="round" />
      <Line x1={cx - s * 0.1} y1={cy - s * 0.038} x2={cx - s * 0.1} y2={cy + s * 0.008} stroke="#E8E4E0" strokeWidth={sw(0.3, 0.005)} strokeLinecap="round" />
      <Line x1={cx + s * 0.06} y1={cy - s * 0.038} x2={cx + s * 0.06} y2={cy + s * 0.008} stroke="#E8E4E0" strokeWidth={sw(0.3, 0.005)} strokeLinecap="round" />
      <Line x1={cx + s * 0.11} y1={cy - s * 0.035} x2={cx + s * 0.11} y2={cy + s * 0.005} stroke="#E8E4E0" strokeWidth={sw(0.3, 0.005)} strokeLinecap="round" />
    </>
  );

  // ═══ ACCESSORIES ═══
  const smallStars = () => s >= 50 ? (
    <>
      <Polygon points={starPts(cx + s * 0.24, cy - s * 0.2, s * 0.035)} fill={C.gold} />
      <Polygon points={starPts(cx - s * 0.26, cy - s * 0.14, s * 0.025)} fill={C.gold} />
    </>
  ) : null;

  const bigStarsAndConfetti = () => {
    const confetti = [
      { x: cx - s * 0.34, y: cy - s * 0.28, a: -35, c: C.coral },
      { x: cx + s * 0.35, y: cy - s * 0.2, a: 25, c: C.blue },
      { x: cx - s * 0.22, y: cy + s * 0.24, a: -55, c: C.gold },
      { x: cx + s * 0.28, y: cy + s * 0.26, a: 45, c: C.green },
      { x: cx - s * 0.1, y: cy - s * 0.42, a: -5, c: C.pink },
      { x: cx + s * 0.18, y: cy - s * 0.4, a: 12, c: C.gold },
      { x: cx - s * 0.38, y: cy + s * 0.06, a: -70, c: C.teal },
      { x: cx + s * 0.36, y: cy + s * 0.1, a: 65, c: C.coral },
    ];
    return (
      <>
        <Polygon points={starPts(cx + s * 0.28, cy - s * 0.24, s * 0.05)} fill={C.gold} />
        <Polygon points={starPts(cx - s * 0.32, cy - s * 0.18, s * 0.04)} fill={C.gold} />
        <Polygon points={starPts(cx + s * 0.06, cy - s * 0.38, s * 0.028)} fill={C.gold} />
        {confetti.map((l, i) => (
          <Line
            key={i}
            x1={l.x} y1={l.y}
            x2={l.x + Math.cos(l.a * Math.PI / 180) * s * 0.06}
            y2={l.y + Math.sin(l.a * Math.PI / 180) * s * 0.06}
            stroke={l.c} strokeWidth={sw(1.2, 0.02)} strokeLinecap="round"
          />
        ))}
      </>
    );
  };

  const fireWithGlow = () => (
    <>
      <Ellipse cx={cx} cy={cy - bR - s * 0.01} rx={s * 0.06} ry={s * 0.03} fill={C.coral} opacity={0.15} />
      <Path
        d={`M${cx},${cy - bR - s * 0.01} C${cx - s * 0.08},${cy - bR + s * 0.06} ${cx - s * 0.05},${cy - bR - s * 0.06} ${cx},${cy - bR - s * 0.14} C${cx + s * 0.05},${cy - bR - s * 0.06} ${cx + s * 0.08},${cy - bR + s * 0.06} ${cx},${cy - bR - s * 0.01}`}
        fill={C.coral}
      />
      <Path
        d={`M${cx},${cy - bR - s * 0.01} C${cx - s * 0.04},${cy - bR + s * 0.03} ${cx - s * 0.025},${cy - bR - s * 0.03} ${cx},${cy - bR - s * 0.08} C${cx + s * 0.025},${cy - bR - s * 0.03} ${cx + s * 0.04},${cy - bR + s * 0.03} ${cx},${cy - bR - s * 0.01}`}
        fill={C.gold}
      />
    </>
  );

  const teardrop = () => (
    <Path
      d={`M${cx + s * 0.15},${cy - s * 0.01} Q${cx + s * 0.17},${cy + s * 0.04} ${cx + s * 0.15},${cy + s * 0.06} Q${cx + s * 0.13},${cy + s * 0.04} ${cx + s * 0.15},${cy - s * 0.01}`}
      fill={C.blue} opacity={0.45}
    />
  );

  const sweatDrop = () => (
    <Path
      d={`M${cx + s * 0.2},${cy - s * 0.1} Q${cx + s * 0.22},${cy - s * 0.04} ${cx + s * 0.2},${cy + s * 0.02} Q${cx + s * 0.18},${cy - s * 0.04} ${cx + s * 0.2},${cy - s * 0.1}`}
      fill={C.blue} opacity={0.35}
    />
  );

  const blushCheeks = () => (
    <>
      <Ellipse cx={cx - s * 0.16} cy={cy + s * 0.04} rx={s * 0.035} ry={s * 0.025} fill={C.pink} opacity={0.35} />
      <Ellipse cx={cx + s * 0.16} cy={cy + s * 0.04} rx={s * 0.035} ry={s * 0.025} fill={C.pink} opacity={0.35} />
    </>
  );

  const thinkDots = () => (
    <>
      <Circle cx={cx + s * 0.26} cy={cy - s * 0.16} r={sw(1.5, 0.018)} fill={C.accentL} opacity={0.55} />
      <Circle cx={cx + s * 0.31} cy={cy - s * 0.23} r={sw(1, 0.014)} fill={C.accentL} opacity={0.45} />
      <Circle cx={cx + s * 0.34} cy={cy - s * 0.29} r={sw(0.8, 0.01)} fill={C.accentL} opacity={0.3} />
    </>
  );

  const sleepZz = () => (
    <>
      <Path
        d={`M${cx + s * 0.2},${cy - s * 0.18} L${cx + s * 0.28},${cy - s * 0.18} L${cx + s * 0.2},${cy - s * 0.12} L${cx + s * 0.28},${cy - s * 0.12}`}
        fill="none" stroke={C.accentL} strokeWidth={sw(0.8, 0.014)} strokeLinecap="round" strokeLinejoin="round" opacity={0.5}
      />
      <Path
        d={`M${cx + s * 0.28},${cy - s * 0.26} L${cx + s * 0.33},${cy - s * 0.26} L${cx + s * 0.28},${cy - s * 0.22} L${cx + s * 0.33},${cy - s * 0.22}`}
        fill="none" stroke={C.accentL} strokeWidth={sw(0.6, 0.01)} strokeLinecap="round" strokeLinejoin="round" opacity={0.35}
      />
    </>
  );

  const closedEyes = () => (
    <>
      <Path
        d={`M${cx - s * 0.15},${cy - s * 0.04} Q${cx - s * 0.1},${cy - s * 0.09} ${cx - s * 0.04},${cy - s * 0.04}`}
        fill="none" stroke={C.accentD} strokeWidth={sw(0.8, 0.02)} strokeLinecap="round" opacity={0.45}
      />
      <Path
        d={`M${cx + s * 0.04},${cy - s * 0.04} Q${cx + s * 0.1},${cy - s * 0.09} ${cx + s * 0.15},${cy - s * 0.04}`}
        fill="none" stroke={C.accentD} strokeWidth={sw(0.8, 0.02)} strokeLinecap="round" opacity={0.45}
      />
    </>
  );

  // ═══ 12 EXPRESSIONS ═══
  const faces: Record<BlinkExpression, React.ReactNode> = {
    normal: <>{eyes({ lx: (lookOffset?.x ?? 0) * s * 0.03, ly: (lookOffset?.y ?? 0) * s * 0.04 })}{smile(0.04, 0.04)}</>,

    memorise: (
      <>
        {eyes({ pc: C.accent, sy: 1.25, pr: s * 0.05 })}
        <Line x1={cx - s * 0.22} y1={cy - s * 0.22} x2={cx - s * 0.18} y2={cy - s * 0.18} stroke={C.gold} strokeWidth={sw(0.8, 0.015)} strokeLinecap="round" />
        <Line x1={cx + s * 0.2} y1={cy - s * 0.24} x2={cx + s * 0.17} y2={cy - s * 0.2} stroke={C.gold} strokeWidth={sw(0.8, 0.015)} strokeLinecap="round" />
        <Line x1={cx - s * 0.24} y1={cy - s * 0.17} x2={cx - s * 0.18} y2={cy - s * 0.19} stroke={C.gold} strokeWidth={sw(0.6, 0.012)} strokeLinecap="round" />
      </>
    ),

    blank: <>{blankArmsAndHands()}{frown(0.04)}</>,

    thinking: (
      <>
        {eyes({ lx: s * 0.02, ly: -s * 0.02, sy: 0.9 })}
        <Path
          d={`M${cx + s * 0.05},${cy - s * 0.17} Q${cx + s * 0.1},${cy - s * 0.22} ${cx + s * 0.17},${cy - s * 0.17}`}
          fill="none" stroke={C.accentD} strokeWidth={sw(0.8, 0.018)} strokeLinecap="round" opacity={0.55}
        />
        {thinkDots()}
      </>
    ),

    correct: <>{eyes({ pc: C.green, pr: s * 0.05 })}{bigSmile()}{smallStars()}</>,

    wrong: (
      <>
        {eyes({ pc: C.coral, sx: 0.9, sy: 0.85, pr: s * 0.038, sp: false })}
        {frown()}
        {sweatDrop()}
      </>
    ),

    celebrate: <>{eyes({ pc: C.accent, sy: 1.3, pr: s * 0.055 })}{bigSmile()}{bigStarsAndConfetti()}</>,

    streak: <>{eyes({ pc: C.coral, pr: s * 0.048 })}{smile(0.05, 0.05)}{fireWithGlow()}</>,

    sad: (
      <>
        {eyes({ pc: C.textM, sy: 0.8, ly: s * 0.015, sp: false })}
        {frown(0.05)}
        {teardrop()}
      </>
    ),

    sleeping: <>{closedEyes()}{smile(0.03, 0.03)}{sleepZz()}</>,

    surprised: (
      <>
        {eyes({ sx: 1.2, sy: 1.35, pr: s * 0.035 })}
        {openMouth()}
        <Path
          d={`M${cx - s * 0.16},${cy - s * 0.18} Q${cx - s * 0.1},${cy - s * 0.24} ${cx - s * 0.03},${cy - s * 0.18}`}
          fill="none" stroke={C.accentD} strokeWidth={sw(0.8, 0.016)} strokeLinecap="round" opacity={0.55}
        />
        <Path
          d={`M${cx + s * 0.03},${cy - s * 0.18} Q${cx + s * 0.1},${cy - s * 0.24} ${cx + s * 0.16},${cy - s * 0.18}`}
          fill="none" stroke={C.accentD} strokeWidth={sw(0.8, 0.016)} strokeLinecap="round" opacity={0.55}
        />
      </>
    ),

    love: (
      <>
        <Ellipse cx={cx - s * 0.1} cy={cy - s * 0.05} rx={s * 0.085} ry={s * 0.11} fill="white" />
        <Ellipse cx={cx + s * 0.1} cy={cy - s * 0.05} rx={s * 0.085} ry={s * 0.11} fill="white" />
        <Path d={heartPath(cx - s * 0.1, cy - s * 0.04, s * 0.08)} fill={C.coral} />
        <Path d={heartPath(cx + s * 0.1, cy - s * 0.04, s * 0.08)} fill={C.coral} />
        {smile(0.06, 0.07)}
        {blushCheeks()}
      </>
    ),
  };

  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <Defs>
        <RadialGradient id={id} cx="38%" cy="32%">
          <Stop offset="0%" stopColor={C.accentL} />
          <Stop offset="100%" stopColor={C.accent} />
        </RadialGradient>
      </Defs>
      {body}
      {faces[expression]}
    </Svg>
  );
}

export const Blink = React.memo(BlinkComponent);

// ─── APP ICON (face only on darker purple) ─────────────────
function BlinkAppIconComponent({ size = 120 }: { size?: number }) {
  const s = size;
  const cx = s / 2;
  const cy = s / 2 + s * 0.04;
  const pr = s * 0.065;
  const iconId = React.useRef(`blink-icon-${++_blinkId}`).current;

  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <Defs>
        <LinearGradient id={iconId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#5B4BC7" />
          <Stop offset="100%" stopColor="#7E6EE8" />
        </LinearGradient>
      </Defs>
      <Rect width={s} height={s} rx={s * 0.22} fill={`url(#${iconId})`} />
      <Ellipse cx={cx - s * 0.1} cy={cy - s * 0.12} rx={s * 0.25} ry={s * 0.15} fill="rgba(255,255,255,0.06)" />
      {/* Left eye */}
      <Ellipse cx={cx - s * 0.14} cy={cy} rx={s * 0.12} ry={s * 0.155} fill="white" />
      <Circle cx={cx - s * 0.12} cy={cy + s * 0.015} r={pr} fill={C.text} />
      <Circle cx={cx - s * 0.1} cy={cy - s * 0.015} r={s * 0.024} fill="white" />
      {/* Right eye */}
      <Ellipse cx={cx + s * 0.14} cy={cy} rx={s * 0.12} ry={s * 0.155} fill="white" />
      <Circle cx={cx + s * 0.16} cy={cy + s * 0.015} r={pr} fill={C.text} />
      <Circle cx={cx + s * 0.18} cy={cy - s * 0.015} r={s * 0.024} fill="white" />
      {/* Smile */}
      <Path
        d={`M${cx - s * 0.06},${cy + s * 0.2} Q${cx},${cy + s * 0.27} ${cx + s * 0.06},${cy + s * 0.2}`}
        fill="none" stroke={C.text} strokeWidth={Math.max(1.2, s * 0.022)} strokeLinecap="round"
      />
    </Svg>
  );
}

export const BlinkAppIcon = React.memo(BlinkAppIconComponent);
