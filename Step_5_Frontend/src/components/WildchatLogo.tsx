import { useTheme } from "../context/ThemeContext";

interface Props {
  /** Show full wordmark beside icon. Default: true */
  wordmark?: boolean;
  /** Icon size in px. Default: 20 */
  size?: number;
}

export default function WildchatLogo({ wordmark = true, size = 20 }: Props) {
  const { colors } = useTheme();
  const accent = colors.logoAccent;
  const irisAlpha = `${accent}1f`; // ~12% opacity hex

  const icon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 80 80"
      fill="none"
      width={size}
      height={size}
      style={{ flexShrink: 0 }}
      aria-hidden="true"
    >
      {/* Iris fill */}
      <ellipse cx="40" cy="40" rx="12" ry="22" fill={irisAlpha} />
      {/* Outer eye almond */}
      <path
        d="M10 40 Q25 16 40 14 Q55 16 70 40 Q55 64 40 66 Q25 64 10 40Z"
        stroke={accent}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Pupil */}
      <rect x="37" y="18" width="6" height="44" rx="3" fill={accent} opacity="0.85" />
      {/* Left whiskers — radiate from left corner inward */}
      <g stroke={accent} strokeWidth="1.5" strokeLinecap="round" opacity="0.5">
        <line x1="14" y1="40" x2="27" y2="40" />
        <line x1="15" y1="38" x2="26" y2="34" />
        <line x1="15" y1="42" x2="26" y2="46" />
      </g>
      {/* Right whiskers — radiate from right corner inward */}
      <g stroke={accent} strokeWidth="1.5" strokeLinecap="round" opacity="0.5">
        <line x1="66" y1="40" x2="53" y2="40" />
        <line x1="65" y1="38" x2="54" y2="34" />
        <line x1="65" y1="42" x2="54" y2="46" />
      </g>
    </svg>
  );

  if (!wordmark) return icon;

  return (
    <div className="flex items-center gap-2" style={{ lineHeight: 1 }}>
      {icon}
      <span
        style={{
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: "0.01em",
          color: colors.textPrimary,
        }}
      >
        Wild
        <span style={{ color: accent, fontWeight: 400 }}>chat</span>
        {" "}Lens
      </span>
    </div>
  );
}

/** Simplified 20×20 icon only — no whiskers — for tight spaces */
export function WildchatIcon({ size = 20 }: { size?: number }) {
  const { colors } = useTheme();
  const accent = colors.logoAccent;
  const irisAlpha = `${accent}1f`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <ellipse cx="10" cy="10" rx="3" ry="5.5" fill={irisAlpha} />
      <path
        d="M2.5 10 Q6.25 4 10 3.5 Q13.75 4 17.5 10 Q13.75 16 10 16.5 Q6.25 16 2.5 10Z"
        stroke={accent}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect x="9.25" y="4.5" width="1.5" height="11" rx="0.75" fill={accent} opacity="0.85" />
    </svg>
  );
}
