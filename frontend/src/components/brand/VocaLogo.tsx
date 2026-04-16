import { cn } from "@/lib/utils";

interface VocaLogoProps {
  className?: string;
  showTagline?: boolean;
  /** Force a monochrome white variant (e.g. on dark panels) */
  mono?: boolean;
}

/**
 * Full "V[mic]CA" wordmark. Renders the letters V, C, A in brand purple with
 * a microphone icon standing in for the O.
 *
 * The SVG adapts to dark mode via currentColor + dark: classes rather than
 * hardcoding fill colors for the letters.
 */
export function VocaLogo({ className, showTagline = false, mono = false }: VocaLogoProps) {
  const letterColor = mono ? "#ffffff" : "#534AB7";
  const micRing     = mono ? "rgba(255,255,255,0.95)" : "#CECBF6";
  const micBody     = mono ? "rgba(255,255,255,0.75)" : "#AFA9EC";
  const micActive   = "#1D9E75"; // always accent green
  const tagline     = mono ? "#ffffff" : "#534AB7";

  return (
    <svg
      viewBox="0 0 680 420"
      className={cn("block", className)}
      role="img"
      aria-label="Voca"
    >
      <title>Voca</title>
      {/* V */}
      <text x="190" y="238" textAnchor="middle" fill={letterColor}
        style={{ fontFamily: "'Arial Rounded MT Bold', Arial, sans-serif", fontSize: 96, fontWeight: 800 }}>V</text>
      {/* O = mic */}
      <ellipse cx="278" cy="193" rx="43" ry="52" fill="none" stroke={micRing} strokeWidth={13} />
      <path d="M263 244 Q263 273 278 273 Q293 273 293 244" fill="none" stroke={micRing} strokeWidth={9} strokeLinecap="round" />
      <rect x="266" y="153" width="24" height="50" rx="12" fill={micBody} />
      <rect x="272" y="166" width="12" height="24" rx="6" fill={micActive} />
      {/* C */}
      <text x="364" y="238" textAnchor="middle" fill={letterColor}
        style={{ fontFamily: "'Arial Rounded MT Bold', Arial, sans-serif", fontSize: 96, fontWeight: 800 }}>C</text>
      {/* A */}
      <text x="436" y="238" textAnchor="middle" fill={letterColor}
        style={{ fontFamily: "'Arial Rounded MT Bold', Arial, sans-serif", fontSize: 96, fontWeight: 800 }}>A</text>
      {/* Sound waves */}
      <g opacity={0.5}>
        <path d="M477 185 Q485 193 477 201" fill="none" stroke={letterColor} strokeWidth={3} strokeLinecap="round" />
        <path d="M486 176 Q498 193 486 210" fill="none" stroke={letterColor} strokeWidth={2.5} strokeLinecap="round" opacity={0.7} />
        <path d="M494 168 Q510 193 494 218" fill="none" stroke={letterColor} strokeWidth={2} strokeLinecap="round" opacity={0.5} />
      </g>
      {/* Tagline */}
      {showTagline && (
        <text x="340" y="315" textAnchor="middle" fill={tagline}
          style={{ fontFamily: "Arial, sans-serif", fontSize: 13, fontWeight: 400, letterSpacing: 2 }}>
          READ ANYTHING. LISTEN ANYWHERE.
        </text>
      )}
    </svg>
  );
}

interface VocaMarkProps {
  className?: string;
  /** Size of the containing badge in px */
  size?: number;
}

/**
 * Compact brand mark — just the microphone icon on a purple rounded-square
 * badge. Used anywhere the previous "V" badge was (nav, mobile headers).
 */
export function VocaMark({ className, size = 40 }: VocaMarkProps) {
  const inner = size * 0.55;
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-[22%] bg-primary shadow-lg shadow-primary/30",
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 54 72" width={inner} height={inner} fill="none" aria-hidden="true">
        <ellipse cx="27" cy="29" rx="20" ry="24" stroke="#fff" strokeWidth={6} />
        <rect x="19" y="10" width="16" height="32" rx="8" fill="rgba(255,255,255,0.85)" />
        <rect x="23" y="17" width="8" height="14" rx="4" fill="#1D9E75" />
        <path d="M16 52 Q16 65 27 65 Q38 65 38 52" stroke="#fff" strokeWidth={5} strokeLinecap="round" />
      </svg>
    </div>
  );
}
