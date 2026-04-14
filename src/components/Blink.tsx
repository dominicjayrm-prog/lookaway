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
  // Original 13
  | 'normal' | 'memorise' | 'blank' | 'thinking' | 'correct' | 'wrong'
  | 'celebrate' | 'streak' | 'sad' | 'sleeping' | 'surprised' | 'love'
  | 'premium'
  // Expanded catalogue — 15 new
  | 'wink' | 'tongue_out'
  | 'pirate' | 'cool_guy' | 'ninja' | 'frozen' | 'angel'
  | 'devil' | 'robot' | 'dizzy'
  | 'golden_blink' | 'galaxy' | 'rainbow' | 'shadow' | 'cherry_blossom'
  // Milestone earn-only expressions
  | 'sharp_eye' | 'lightning_mind' | 'detective' | 'motion_master'
  | 'mastermind_boss';

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

// ── BODY COLOUR VARIANTS ────────────────────────────────────
// Expressions that swap Blink's body colour (not just the face) map
// to a [lightStop, darkStop] pair used as the two stops of the
// RadialGradient in the component body. The default purple is used
// for every other expression.
const DEFAULT_BODY_STOPS: [string, string] = [C.accentL, C.accent];
const BODY_STOPS: Partial<Record<BlinkExpression, [string, string]>> = {
  frozen:         ['#B3E5FC', '#4FC3F7'],
  golden_blink:   ['#FFD700', '#DAA520'],
  galaxy:         ['#7B1FA2', '#311B92'],
  rainbow:        ['#FF6B6B', '#6C5CE7'],
  shadow:         ['#616161', '#212121'],
  cherry_blossom: ['#FF80AB', '#C2185B'],
  // Royal purple — slightly deeper than default with a gold-warmed highlight
  // so the body itself reads "premium" alongside the crown and chain.
  mastermind_boss: ['#B8A8F0', '#3F2D8E'],
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

    premium: (
      <>
        {/* Eye whites */}
        <Ellipse cx={cx - s * 0.1} cy={cy - s * 0.05} rx={s * 0.085 * 1.1} ry={s * 0.11 * 1.15} fill="white" />
        <Ellipse cx={cx + s * 0.1} cy={cy - s * 0.05} rx={s * 0.085 * 1.1} ry={s * 0.11 * 1.15} fill="white" />
        {/* Gold star pupils */}
        <Polygon points={starPts(cx - s * 0.085, cy - s * 0.04, s * 0.05)} fill={C.gold} />
        <Polygon points={starPts(cx + s * 0.115, cy - s * 0.04, s * 0.05)} fill={C.gold} />
        {/* Sparkle dots */}
        <Circle cx={cx - s * 0.07} cy={cy - s * 0.06} r={s * 0.012} fill="white" />
        <Circle cx={cx + s * 0.13} cy={cy - s * 0.06} r={s * 0.012} fill="white" />
        {/* Gold sparkle lines around head */}
        <Line x1={cx - s * 0.24} y1={cy - s * 0.2} x2={cx - s * 0.2} y2={cy - s * 0.16} stroke={C.gold} strokeWidth={sw(0.8, 0.015)} strokeLinecap="round" />
        <Line x1={cx + s * 0.22} y1={cy - s * 0.22} x2={cx + s * 0.19} y2={cy - s * 0.18} stroke={C.gold} strokeWidth={sw(0.8, 0.015)} strokeLinecap="round" />
        <Line x1={cx} y1={cy - s * 0.36} x2={cx} y2={cy - s * 0.3} stroke={C.gold} strokeWidth={sw(0.8, 0.015)} strokeLinecap="round" />
        <Line x1={cx - s * 0.26} y1={cy - s * 0.1} x2={cx - s * 0.2} y2={cy - s * 0.12} stroke={C.gold} strokeWidth={sw(0.6, 0.012)} strokeLinecap="round" />
        <Line x1={cx + s * 0.24} y1={cy - s * 0.12} x2={cx + s * 0.2} y2={cy - s * 0.14} stroke={C.gold} strokeWidth={sw(0.6, 0.012)} strokeLinecap="round" />
        {bigSmile()}
      </>
    ),

    // ═══ EXPANDED CATALOGUE (15 new) ═══

    wink: (
      <>
        {/* Left eye normal */}
        <Ellipse cx={cx - s * 0.1} cy={cy - s * 0.05} rx={s * 0.085} ry={s * 0.11} fill="white" />
        <Circle cx={cx - s * 0.085} cy={cy - s * 0.04} r={s * 0.045} fill={C.text} />
        <Circle cx={cx - s * 0.07} cy={cy - s * 0.06} r={s * 0.014} fill="white" />
        {/* Right eye closed — curved path */}
        <Path
          d={`M${cx + s * 0.04},${cy - s * 0.05} Q${cx + s * 0.1},${cy - s * 0.11} ${cx + s * 0.16},${cy - s * 0.05}`}
          fill="none" stroke={C.accentD} strokeWidth={sw(1, 0.022)} strokeLinecap="round"
        />
        {smile(0.06, 0.06)}
      </>
    ),

    tongue_out: (
      <>
        {eyes()}
        {/* Open smile curve */}
        <Path
          d={`M${cx - s * 0.08},${cy + s * 0.08} Q${cx},${cy + s * 0.17} ${cx + s * 0.08},${cy + s * 0.08}`}
          fill="none" stroke={C.text} strokeWidth={sw(1, 0.02)} strokeLinecap="round"
        />
        {/* Tongue */}
        <Ellipse cx={cx} cy={cy + s * 0.16} rx={s * 0.04} ry={s * 0.028} fill={C.coral} />
        <Ellipse cx={cx - s * 0.008} cy={cy + s * 0.15} rx={s * 0.018} ry={s * 0.01} fill="#FFB8B8" />
      </>
    ),

    pirate: (
      <>
        {/* Left eye normal */}
        <Ellipse cx={cx - s * 0.1} cy={cy - s * 0.05} rx={s * 0.085} ry={s * 0.11} fill="white" />
        <Circle cx={cx - s * 0.085} cy={cy - s * 0.04} r={s * 0.045} fill={C.text} />
        <Circle cx={cx - s * 0.07} cy={cy - s * 0.06} r={s * 0.014} fill="white" />
        {/* Eyepatch over right eye */}
        <Ellipse cx={cx + s * 0.1} cy={cy - s * 0.05} rx={s * 0.11} ry={s * 0.09} fill="#3E2723" />
        {/* Strap diagonal */}
        <Line x1={cx - s * 0.02} y1={cy - s * 0.22} x2={cx + s * 0.32} y2={cy + s * 0.05} stroke="#3E2723" strokeWidth={sw(1.3, 0.024)} strokeLinecap="round" />
        {smile(0.07, 0.05)}
      </>
    ),

    cool_guy: (
      <>
        {/* Sunglasses — two rounded rectangles + bridge */}
        <Rect x={cx - s * 0.22} y={cy - s * 0.12} width={s * 0.2} height={s * 0.13} rx={s * 0.025} fill="#37474F" />
        <Rect x={cx + s * 0.02} y={cy - s * 0.12} width={s * 0.2} height={s * 0.13} rx={s * 0.025} fill="#37474F" />
        <Line x1={cx - s * 0.02} y1={cy - s * 0.055} x2={cx + s * 0.02} y2={cy - s * 0.055} stroke="#37474F" strokeWidth={sw(1.5, 0.028)} strokeLinecap="round" />
        {/* Reflective highlights */}
        <Rect x={cx - s * 0.2} y={cy - s * 0.105} width={s * 0.06} height={s * 0.028} rx={s * 0.008} fill="rgba(255,255,255,0.55)" />
        <Rect x={cx + s * 0.04} y={cy - s * 0.105} width={s * 0.06} height={s * 0.028} rx={s * 0.008} fill="rgba(255,255,255,0.55)" />
        {smile(0.06, 0.05)}
      </>
    ),

    ninja: (
      <>
        {/* Shinobi mask — contoured path instead of a hard rectangle
            so it wraps Blink's face naturally rather than sitting on
            it like a sticker. Top curve matches the head, bottom
            curve matches the jaw. */}
        <Path
          d={`M${cx - bR * 0.96},${cy - s * 0.04} Q${cx - bR * 0.99},${cy - s * 0.19} ${cx - bR * 0.82},${cy - s * 0.22} L${cx + bR * 0.82},${cy - s * 0.22} Q${cx + bR * 0.99},${cy - s * 0.19} ${cx + bR * 0.96},${cy - s * 0.04} L${cx + bR * 0.96},${cy + s * 0.08} Q${cx + bR * 0.72},${cy + s * 0.16} ${cx},${cy + s * 0.16} Q${cx - bR * 0.72},${cy + s * 0.16} ${cx - bR * 0.96},${cy + s * 0.08} Z`}
          fill="#0F0F0F"
        />
        {/* Subtle highlight across the top of the mask to catch light
            and make it read as fabric rather than a flat shape */}
        <Path
          d={`M${cx - bR * 0.88},${cy - s * 0.16} Q${cx},${cy - s * 0.22} ${cx + bR * 0.88},${cy - s * 0.16}`}
          fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={sw(0.8, 0.012)} strokeLinecap="round"
        />
        {/* Red headband stripe running across the forehead */}
        <Rect x={cx - bR * 0.92} y={cy - s * 0.205} width={bR * 1.84} height={s * 0.028} fill="#C62828" />
        {/* Knotted headband ends flicking off to the right */}
        <Polygon
          points={`${cx + bR * 0.9},${cy - s * 0.205} ${cx + bR * 1.08},${cy - s * 0.24} ${cx + bR * 1.02},${cy - s * 0.17}`}
          fill="#C62828"
        />
        <Polygon
          points={`${cx + bR * 0.9},${cy - s * 0.18} ${cx + bR * 1.12},${cy - s * 0.13} ${cx + bR * 0.92},${cy - s * 0.14}`}
          fill="#B71C1C"
        />
        {/* Headband centre dot (small red accent) */}
        <Circle cx={cx} cy={cy - s * 0.19} r={s * 0.014} fill="#FFEB3B" />
        {/* Horizontal eye slits — rounded rectangles read as "squinted
            through the mask" instead of small circles which looked
            bug-eyed on the original */}
        <Rect x={cx - s * 0.175} y={cy - s * 0.05} width={s * 0.14} height={s * 0.045} rx={s * 0.022} fill="#F5F5F5" />
        <Rect x={cx + s * 0.035} y={cy - s * 0.05} width={s * 0.14} height={s * 0.045} rx={s * 0.022} fill="#F5F5F5" />
        {/* Focused dark pupils centred in the slits */}
        <Circle cx={cx - s * 0.105} cy={cy - s * 0.026} r={s * 0.015} fill={C.text} />
        <Circle cx={cx + s * 0.105} cy={cy - s * 0.026} r={s * 0.015} fill={C.text} />
        {/* Tiny highlight dots so the eyes feel alive */}
        <Circle cx={cx - s * 0.1} cy={cy - s * 0.032} r={s * 0.005} fill="white" />
        <Circle cx={cx + s * 0.11} cy={cy - s * 0.032} r={s * 0.005} fill="white" />
      </>
    ),

    frozen: (
      <>
        {/* Ice-blue pupils */}
        {eyes({ pc: '#4FC3F7' })}
        {smile(0.05, 0.04)}
        {/* Floating snowflakes */}
        <Circle cx={cx - s * 0.32} cy={cy - s * 0.22} r={s * 0.02} fill="#B3E5FC" opacity={0.7} />
        <Circle cx={cx + s * 0.3} cy={cy - s * 0.18} r={s * 0.018} fill="#B3E5FC" opacity={0.6} />
        <Circle cx={cx - s * 0.22} cy={cy - s * 0.34} r={s * 0.014} fill="#E1F5FE" opacity={0.6} />
        <Circle cx={cx + s * 0.1} cy={cy - s * 0.36} r={s * 0.016} fill="#B3E5FC" opacity={0.55} />
        <Circle cx={cx + s * 0.34} cy={cy + s * 0.02} r={s * 0.012} fill="#E1F5FE" opacity={0.5} />
        <Circle cx={cx - s * 0.36} cy={cy + s * 0.08} r={s * 0.015} fill="#B3E5FC" opacity={0.5} />
      </>
    ),

    angel: (
      <>
        {/* Halo — stroked ellipse above head */}
        <Ellipse cx={cx} cy={cy - bR - s * 0.12} rx={s * 0.14} ry={s * 0.035} fill="none" stroke="#FFD700" strokeWidth={sw(1.2, 0.022)} />
        {eyes({ pc: '#DAA520', pr: s * 0.048 })}
        {bigSmile()}
      </>
    ),

    devil: (
      <>
        {/* Two horns poking from top */}
        <Polygon points={`${cx - s * 0.16},${cy - bR + s * 0.02} ${cx - s * 0.1},${cy - bR - s * 0.12} ${cx - s * 0.07},${cy - bR + s * 0.01}`} fill="#FF1744" />
        <Polygon points={`${cx + s * 0.07},${cy - bR + s * 0.01} ${cx + s * 0.1},${cy - bR - s * 0.12} ${cx + s * 0.16},${cy - bR + s * 0.02}`} fill="#FF1744" />
        {eyes({ pc: '#FF1744' })}
        {/* Cheeky smirk */}
        <Path
          d={`M${cx - s * 0.07},${cy + s * 0.1} Q${cx},${cy + s * 0.15} ${cx + s * 0.07},${cy + s * 0.08}`}
          fill="none" stroke={C.text} strokeWidth={sw(1, 0.02)} strokeLinecap="round"
        />
      </>
    ),

    robot: (
      <>
        {/* Antenna */}
        <Line x1={cx} y1={cy - bR} x2={cx} y2={cy - bR - s * 0.1} stroke="#90A4AE" strokeWidth={sw(1, 0.018)} strokeLinecap="round" />
        <Circle cx={cx} cy={cy - bR - s * 0.11} r={s * 0.022} fill="#00E676" />
        <Circle cx={cx} cy={cy - bR - s * 0.11} r={s * 0.035} fill="#00E676" opacity={0.3} />
        {/* Square eyes */}
        <Rect x={cx - s * 0.18} y={cy - s * 0.12} width={s * 0.14} height={s * 0.14} rx={s * 0.012} fill="white" />
        <Rect x={cx + s * 0.04} y={cy - s * 0.12} width={s * 0.14} height={s * 0.14} rx={s * 0.012} fill="white" />
        <Rect x={cx - s * 0.13} y={cy - s * 0.08} width={s * 0.05} height={s * 0.06} fill="#00E676" />
        <Rect x={cx + s * 0.09} y={cy - s * 0.08} width={s * 0.05} height={s * 0.06} fill="#00E676" />
        {/* Straight line mouth */}
        <Line x1={cx - s * 0.06} y1={cy + s * 0.12} x2={cx + s * 0.06} y2={cy + s * 0.12} stroke={C.text} strokeWidth={sw(1, 0.02)} strokeLinecap="round" />
      </>
    ),

    dizzy: (
      <>
        {/* Eye whites */}
        <Ellipse cx={cx - s * 0.1} cy={cy - s * 0.05} rx={s * 0.085} ry={s * 0.11} fill="white" />
        <Ellipse cx={cx + s * 0.1} cy={cy - s * 0.05} rx={s * 0.085} ry={s * 0.11} fill="white" />
        {/* Concentric spiral rings (outer + inner) per eye */}
        <Circle cx={cx - s * 0.1} cy={cy - s * 0.05} r={s * 0.06} fill="none" stroke={C.accent} strokeWidth={sw(0.8, 0.014)} />
        <Circle cx={cx - s * 0.1} cy={cy - s * 0.05} r={s * 0.028} fill="none" stroke={C.accent} strokeWidth={sw(0.8, 0.014)} />
        <Circle cx={cx + s * 0.1} cy={cy - s * 0.05} r={s * 0.06} fill="none" stroke={C.accent} strokeWidth={sw(0.8, 0.014)} />
        <Circle cx={cx + s * 0.1} cy={cy - s * 0.05} r={s * 0.028} fill="none" stroke={C.accent} strokeWidth={sw(0.8, 0.014)} />
        {frown()}
      </>
    ),

    golden_blink: (
      <>
        {/* Gold crown (zigzag polygon) */}
        <Polygon
          points={`${cx - s * 0.16},${cy - bR + s * 0.02} ${cx - s * 0.12},${cy - bR - s * 0.1} ${cx - s * 0.06},${cy - bR} ${cx},${cy - bR - s * 0.14} ${cx + s * 0.06},${cy - bR} ${cx + s * 0.12},${cy - bR - s * 0.1} ${cx + s * 0.16},${cy - bR + s * 0.02}`}
          fill="#FFD700" stroke="#DAA520" strokeWidth={sw(0.8, 0.012)} strokeLinejoin="round"
        />
        {/* Gold gem inlays */}
        <Circle cx={cx - s * 0.12} cy={cy - bR - s * 0.02} r={s * 0.014} fill="#FFF8E1" />
        <Circle cx={cx} cy={cy - bR - s * 0.04} r={s * 0.016} fill="#FFF8E1" />
        <Circle cx={cx + s * 0.12} cy={cy - bR - s * 0.02} r={s * 0.014} fill="#FFF8E1" />
        {eyes({ pc: '#DAA520' })}
        {bigSmile()}
      </>
    ),

    galaxy: (
      <>
        {eyes({ pc: '#E040FB' })}
        {smile(0.05, 0.04)}
        {/* Tiny star dots around the body */}
        <Circle cx={cx - s * 0.32} cy={cy - s * 0.18} r={s * 0.012} fill="white" opacity={0.9} />
        <Circle cx={cx + s * 0.3} cy={cy - s * 0.24} r={s * 0.01} fill="white" opacity={0.8} />
        <Circle cx={cx - s * 0.26} cy={cy + s * 0.12} r={s * 0.008} fill="white" opacity={0.7} />
        <Circle cx={cx + s * 0.34} cy={cy + s * 0.08} r={s * 0.012} fill="white" opacity={0.85} />
        <Circle cx={cx - s * 0.04} cy={cy - s * 0.36} r={s * 0.01} fill="white" opacity={0.8} />
        <Circle cx={cx + s * 0.16} cy={cy - s * 0.38} r={s * 0.008} fill="white" opacity={0.7} />
        <Circle cx={cx - s * 0.38} cy={cy + s * 0.02} r={s * 0.009} fill="white" opacity={0.6} />
        <Circle cx={cx + s * 0.38} cy={cy - s * 0.08} r={s * 0.011} fill="white" opacity={0.75} />
      </>
    ),

    rainbow: (
      <>
        {/* The body gradient IS the cosmetic — just render the default face */}
        {eyes()}
        {bigSmile()}
      </>
    ),

    shadow: (
      <>
        {/* Translucent white pupils on dark body */}
        <Ellipse cx={cx - s * 0.1} cy={cy - s * 0.05} rx={s * 0.085} ry={s * 0.11} fill="rgba(255,255,255,0.92)" />
        <Ellipse cx={cx + s * 0.1} cy={cy - s * 0.05} rx={s * 0.085} ry={s * 0.11} fill="rgba(255,255,255,0.92)" />
        <Circle cx={cx - s * 0.085} cy={cy - s * 0.04} r={s * 0.045} fill="rgba(255,255,255,0.8)" />
        <Circle cx={cx + s * 0.115} cy={cy - s * 0.04} r={s * 0.045} fill="rgba(255,255,255,0.8)" />
        {smile(0.05, 0.04)}
      </>
    ),

    cherry_blossom: (
      <>
        {eyes({ pc: C.coral })}
        {bigSmile()}
        {/* Small petal dots floating near Blink */}
        <Circle cx={cx - s * 0.3} cy={cy - s * 0.24} r={s * 0.016} fill="#FCE4EC" opacity={0.8} />
        <Circle cx={cx + s * 0.28} cy={cy - s * 0.2} r={s * 0.014} fill="#F8BBD0" opacity={0.75} />
        <Circle cx={cx - s * 0.22} cy={cy + s * 0.16} r={s * 0.012} fill="#FCE4EC" opacity={0.7} />
      </>
    ),

    // ═══ MILESTONE EXPRESSIONS ═══

    sharp_eye: (
      <>
        {/* Left eye normal, right eye squinting with raised brow */}
        <Ellipse cx={cx - s * 0.1} cy={cy - s * 0.05} rx={s * 0.085} ry={s * 0.11} fill="white" />
        <Ellipse cx={cx + s * 0.1} cy={cy - s * 0.05} rx={s * 0.085} ry={s * 0.075} fill="white" />
        <Circle cx={cx - s * 0.085} cy={cy - s * 0.04} r={s * 0.045} fill={C.text} />
        <Circle cx={cx + s * 0.115} cy={cy - s * 0.04} r={s * 0.04} fill={C.text} />
        <Circle cx={cx - s * 0.07} cy={cy - s * 0.06} r={s * 0.014} fill="white" />
        <Circle cx={cx + s * 0.13} cy={cy - s * 0.055} r={s * 0.012} fill="white" />
        {/* Raised left eyebrow */}
        <Path d={`M${cx - s * 0.16},${cy - s * 0.17} Q${cx - s * 0.1},${cy - s * 0.23} ${cx - s * 0.03},${cy - s * 0.17}`} fill="none" stroke={C.accentD} strokeWidth={sw(1, 0.02)} strokeLinecap="round" />
        {smile(0.05, 0.04)}
      </>
    ),

    lightning_mind: (
      <>
        {eyes({ pc: '#FFD600', pr: s * 0.05 })}
        {bigSmile()}
        {/* Small zigzag lightning sparks on both sides of head */}
        <Path d={`M${cx - s * 0.26},${cy - s * 0.18} l${s * 0.03},${s * 0.04} l${-s * 0.025},${s * 0.03} l${s * 0.03},${s * 0.04}`} fill="none" stroke="#FFD600" strokeWidth={sw(1.5, 0.022)} strokeLinecap="round" strokeLinejoin="round" />
        <Path d={`M${cx + s * 0.23},${cy - s * 0.2} l${s * 0.03},${s * 0.04} l${-s * 0.025},${s * 0.03} l${s * 0.03},${s * 0.04}`} fill="none" stroke="#FFD600" strokeWidth={sw(1.5, 0.022)} strokeLinecap="round" strokeLinejoin="round" />
        {/* Top spark */}
        <Path d={`M${cx - s * 0.02},${cy - s * 0.34} l${s * 0.02},${s * 0.03} l${-s * 0.015},${s * 0.02} l${s * 0.02},${s * 0.03}`} fill="none" stroke="#FFD600" strokeWidth={sw(1.2, 0.018)} strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),

    detective: (
      <>
        {/* Left eye normal */}
        <Ellipse cx={cx - s * 0.1} cy={cy - s * 0.05} rx={s * 0.085} ry={s * 0.11} fill="white" />
        <Circle cx={cx - s * 0.085} cy={cy - s * 0.04} r={s * 0.045} fill={C.text} />
        <Circle cx={cx - s * 0.07} cy={cy - s * 0.06} r={s * 0.014} fill="white" />
        {/* Right eye larger (magnifying glass) */}
        <Ellipse cx={cx + s * 0.1} cy={cy - s * 0.05} rx={s * 0.11} ry={s * 0.14} fill="white" />
        <Circle cx={cx + s * 0.115} cy={cy - s * 0.04} r={s * 0.06} fill={C.text} />
        <Circle cx={cx + s * 0.13} cy={cy - s * 0.06} r={s * 0.018} fill="white" />
        {/* Magnifying glass rim */}
        <Circle cx={cx + s * 0.1} cy={cy - s * 0.05} r={s * 0.14} fill="none" stroke="#78909C" strokeWidth={sw(1.5, 0.025)} />
        {/* Handle */}
        <Line x1={cx + s * 0.2} y1={cy + s * 0.06} x2={cx + s * 0.28} y2={cy + s * 0.14} stroke="#78909C" strokeWidth={sw(2, 0.03)} strokeLinecap="round" />
        {smile(0.05, 0.04)}
      </>
    ),

    motion_master: (
      <>
        {/* Motion trail blurs behind eyes */}
        <Ellipse cx={cx - s * 0.14} cy={cy - s * 0.05} rx={s * 0.1} ry={s * 0.12} fill="#0984E3" opacity={0.08} />
        <Ellipse cx={cx + s * 0.06} cy={cy - s * 0.05} rx={s * 0.1} ry={s * 0.12} fill="#0984E3" opacity={0.12} />
        {eyes({ pc: '#0984E3', pr: s * 0.05 })}
        {bigSmile()}
        {/* Speed lines */}
        <Line x1={cx - s * 0.32} y1={cy - s * 0.04} x2={cx - s * 0.22} y2={cy - s * 0.04} stroke="#0984E3" strokeWidth={sw(0.8, 0.012)} strokeLinecap="round" opacity={0.3} />
        <Line x1={cx - s * 0.34} y1={cy + s * 0.02} x2={cx - s * 0.24} y2={cy + s * 0.02} stroke="#0984E3" strokeWidth={sw(0.6, 0.01)} strokeLinecap="round" opacity={0.2} />
        <Line x1={cx + s * 0.22} y1={cy - s * 0.04} x2={cx + s * 0.32} y2={cy - s * 0.04} stroke="#0984E3" strokeWidth={sw(0.8, 0.012)} strokeLinecap="round" opacity={0.3} />
        <Line x1={cx + s * 0.24} y1={cy + s * 0.02} x2={cx + s * 0.34} y2={cy + s * 0.02} stroke="#0984E3" strokeWidth={sw(0.6, 0.01)} strokeLinecap="round" opacity={0.2} />
      </>
    ),

    // ═══ LEGENDARY: MASTERMIND BOSS ═══
    // The crown of the cosmetic system. Earned by completing all 40
    // levels of Mastermind. Gold five-point crown with jewels, glowing
    // gold eyes radiating power, confident champion smirk, surrounding
    // gold sparkle aura, and a gold chain at the neck. This is THE
    // legendary item — should be visibly distinct from any other.
    mastermind_boss: (
      <>
        {/* Soft outer aura — radial gold glow behind everything */}
        <Circle cx={cx} cy={cy - s * 0.05} r={s * 0.46} fill={C.gold} opacity={0.08} />

        {/* Gold sparkle stars around the head — five-pointed, randomly placed */}
        {[
          { x: cx - s * 0.34, y: cy - s * 0.32, sz: s * 0.034, op: 0.95 },
          { x: cx + s * 0.34, y: cy - s * 0.28, sz: s * 0.030, op: 0.85 },
          { x: cx - s * 0.40, y: cy - s * 0.05, sz: s * 0.024, op: 0.75 },
          { x: cx + s * 0.40, y: cy - s * 0.10, sz: s * 0.028, op: 0.85 },
          { x: cx - s * 0.10, y: cy - s * 0.45, sz: s * 0.026, op: 0.75 },
          { x: cx + s * 0.12, y: cy - s * 0.46, sz: s * 0.022, op: 0.65 },
        ].map((sp, i) => (
          <Polygon key={`sparkle-${i}`} points={starPts(sp.x, sp.y, sp.sz)} fill={C.gold} opacity={sp.op} />
        ))}

        {/* Gold crown — sits above Blink's head, 5 points with jewels */}
        {/* Crown band (base) */}
        <Rect
          x={cx - s * 0.22} y={cy - s * 0.30}
          width={s * 0.44} height={s * 0.04} rx={s * 0.008}
          fill="#F4C842" stroke="#9C7406" strokeWidth={sw(0.6, 0.01)}
        />
        {/* Crown spikes — three tall, two short between */}
        <Path
          d={`
            M${cx - s * 0.22},${cy - s * 0.30}
            L${cx - s * 0.18},${cy - s * 0.42}
            L${cx - s * 0.13},${cy - s * 0.34}
            L${cx - s * 0.06},${cy - s * 0.46}
            L${cx},${cy - s * 0.36}
            L${cx + s * 0.06},${cy - s * 0.46}
            L${cx + s * 0.13},${cy - s * 0.34}
            L${cx + s * 0.18},${cy - s * 0.42}
            L${cx + s * 0.22},${cy - s * 0.30}
            Z
          `}
          fill="#F4C842" stroke="#9C7406" strokeWidth={sw(0.6, 0.01)} strokeLinejoin="round"
        />
        {/* Highlight on the crown — diagonal sheen */}
        <Path
          d={`
            M${cx - s * 0.18},${cy - s * 0.42}
            L${cx - s * 0.06},${cy - s * 0.46}
            L${cx + s * 0.06},${cy - s * 0.46}
            L${cx + s * 0.18},${cy - s * 0.42}
          `}
          fill="none" stroke="#FFE89A" strokeWidth={sw(0.8, 0.012)} strokeLinecap="round"
        />
        {/* Three jewels — center red ruby, side blue/purple */}
        <Circle cx={cx} cy={cy - s * 0.27} r={s * 0.022} fill={C.coral} stroke="#9C7406" strokeWidth={sw(0.4, 0.006)} />
        <Circle cx={cx - s * 0.13} cy={cy - s * 0.27} r={s * 0.018} fill={C.accent} stroke="#9C7406" strokeWidth={sw(0.4, 0.006)} />
        <Circle cx={cx + s * 0.13} cy={cy - s * 0.27} r={s * 0.018} fill={C.accent} stroke="#9C7406" strokeWidth={sw(0.4, 0.006)} />
        {/* Tiny white speculars on jewels */}
        <Circle cx={cx - s * 0.005} cy={cy - s * 0.275} r={s * 0.006} fill="white" opacity={0.85} />
        <Circle cx={cx - s * 0.135} cy={cy - s * 0.275} r={s * 0.005} fill="white" opacity={0.85} />
        <Circle cx={cx + s * 0.125} cy={cy - s * 0.275} r={s * 0.005} fill="white" opacity={0.85} />

        {/* Glowing gold eyes — replace the default body eyes with a more
            intense gold-pupil version. White eye whites + bright gold
            pupils + bright sparkle. Slightly narrowed for confidence. */}
        <Ellipse cx={cx - s * 0.1} cy={cy - s * 0.04} rx={s * 0.085} ry={s * 0.095} fill="white" />
        <Ellipse cx={cx + s * 0.1} cy={cy - s * 0.04} rx={s * 0.085} ry={s * 0.095} fill="white" />
        {/* Gold glow behind each pupil */}
        <Circle cx={cx - s * 0.085} cy={cy - s * 0.035} r={s * 0.07} fill={C.gold} opacity={0.18} />
        <Circle cx={cx + s * 0.115} cy={cy - s * 0.035} r={s * 0.07} fill={C.gold} opacity={0.18} />
        {/* Gold pupils */}
        <Circle cx={cx - s * 0.085} cy={cy - s * 0.035} r={s * 0.05} fill="#D4A012" />
        <Circle cx={cx + s * 0.115} cy={cy - s * 0.035} r={s * 0.05} fill="#D4A012" />
        {/* Inner darker ring for depth */}
        <Circle cx={cx - s * 0.085} cy={cy - s * 0.035} r={s * 0.025} fill="#9C7406" />
        <Circle cx={cx + s * 0.115} cy={cy - s * 0.035} r={s * 0.025} fill="#9C7406" />
        {/* Bright spec highlights */}
        <Circle cx={cx - s * 0.07} cy={cy - s * 0.055} r={s * 0.018} fill="white" />
        <Circle cx={cx + s * 0.13} cy={cy - s * 0.055} r={s * 0.018} fill="white" />

        {/* Confident champion smirk — asymmetric, one corner raised higher */}
        <Path
          d={`M${cx - s * 0.08},${cy + s * 0.11} Q${cx - s * 0.01},${cy + s * 0.16} ${cx + s * 0.05},${cy + s * 0.13} Q${cx + s * 0.09},${cy + s * 0.10} ${cx + s * 0.10},${cy + s * 0.06}`}
          fill="none" stroke={C.text} strokeWidth={sw(1.4, 0.022)} strokeLinecap="round"
        />

        {/* Gold chain at the neck — dangling small medallion */}
        <Path
          d={`M${cx - s * 0.18},${cy + s * 0.27} Q${cx},${cy + s * 0.34} ${cx + s * 0.18},${cy + s * 0.27}`}
          fill="none" stroke={C.gold} strokeWidth={sw(1, 0.014)} strokeLinecap="round"
        />
        <Circle cx={cx} cy={cy + s * 0.34} r={s * 0.028} fill="#F4C842" stroke="#9C7406" strokeWidth={sw(0.5, 0.008)} />
        {/* "M" mark on medallion for "Mastermind" */}
        <Path
          d={`M${cx - s * 0.012},${cy + s * 0.346} L${cx - s * 0.012},${cy + s * 0.328} L${cx},${cy + s * 0.342} L${cx + s * 0.012},${cy + s * 0.328} L${cx + s * 0.012},${cy + s * 0.346}`}
          fill="none" stroke="#9C7406" strokeWidth={sw(0.7, 0.01)} strokeLinecap="round" strokeLinejoin="round"
        />
      </>
    ),
  };

  const bodyStops = BODY_STOPS[expression] ?? DEFAULT_BODY_STOPS;
  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <Defs>
        <RadialGradient id={id} cx="38%" cy="32%">
          <Stop offset="0%" stopColor={bodyStops[0]} />
          <Stop offset="100%" stopColor={bodyStops[1]} />
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
