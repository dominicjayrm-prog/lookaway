/**
 * BlinkMini — a web-safe Blink mascot for the admin panel.
 *
 * The main app's Blink.tsx uses react-native-svg primitives which don't
 * render on a pure Next.js page. This is a simplified inline SVG port
 * of the "normal" expression only — the Blink face with two eyes and
 * a gentle smile, in brand purple.
 *
 * No props beyond size so it stays a drop-in decoration.
 */
interface BlinkMiniProps {
  size?: number;
}

export function BlinkMini({ size = 40 }: BlinkMiniProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Blink"
    >
      <defs>
        <radialGradient id="blink-body" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#A29BFE" />
          <stop offset="100%" stopColor="#6C5CE7" />
        </radialGradient>
      </defs>
      {/* Body */}
      <circle cx="50" cy="50" r="44" fill="url(#blink-body)" />
      {/* Soft highlight */}
      <ellipse cx="36" cy="32" rx="12" ry="7" fill="rgba(255,255,255,0.25)" />
      {/* Left eye white */}
      <ellipse cx="36" cy="46" rx="9" ry="10" fill="#FFFFFF" />
      {/* Right eye white */}
      <ellipse cx="64" cy="46" rx="9" ry="10" fill="#FFFFFF" />
      {/* Left pupil */}
      <circle cx="36" cy="48" r="3.5" fill="#1A1A18" />
      {/* Right pupil */}
      <circle cx="64" cy="48" r="3.5" fill="#1A1A18" />
      {/* Pupil shines */}
      <circle cx="37.5" cy="46" r="1.2" fill="#FFFFFF" />
      <circle cx="65.5" cy="46" r="1.2" fill="#FFFFFF" />
      {/* Smile */}
      <path
        d="M 40 66 Q 50 74 60 66"
        fill="none"
        stroke="#1A1A18"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
