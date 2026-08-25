interface AnimatedHomePlaceholderProps {
  /** "sm" = compact circular icon slot (e.g. home-selector thumbnail). "lg" = wide landscape cover (e.g. card hero, wizard preview). */
  size?: "sm" | "lg";
  className?: string;
}

const PUFF_DELAYS = ["0s", "1s", "2s"];

/** Generic "no photo yet" illustration for a home — a little house with a
 * chimney puffing smoke on a loop, styled with the app's own tinted-icon
 * palette (primary on primary/10) instead of illustrative colors, so it
 * reads as part of Trimbly's UI rather than a dropped-in cartoon. */
export default function AnimatedHomePlaceholder({ size = "lg", className = "" }: AnimatedHomePlaceholderProps) {
  if (size === "sm") {
    return (
      <div className={`rounded-full bg-primary/10 flex items-center justify-center overflow-hidden ${className}`}>
        <svg viewBox="0 0 40 40" className="w-3/4 h-3/4">
          <polygon points="20,8 8,18 32,18" className="fill-primary" />
          <rect x="11" y="18" width="18" height="13" className="fill-primary/40" />
          <rect x="23" y="10" width="3" height="6" className="fill-primary/70" />
          {PUFF_DELAYS.map((delay, i) => (
            <circle
              key={i}
              cx="24.5"
              cy="9"
              r="1.6"
              className="fill-primary/50 animate-puff-drift"
              style={{ animationDelay: delay }}
            />
          ))}
        </svg>
      </div>
    );
  }

  return (
    <div className={`bg-primary/10 flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 160 100" className="w-1/2 h-1/2 max-w-[140px]">
        <polygon points="80,18 32,52 128,52" className="fill-primary" />
        <rect x="40" y="52" width="80" height="38" className="fill-primary/40" />
        <rect x="66" y="66" width="22" height="24" className="fill-primary/70" />
        <rect x="98" y="24" width="9" height="16" className="fill-primary/70" />
        {PUFF_DELAYS.map((delay, i) => (
          <circle
            key={i}
            cx="102.5"
            cy="22"
            r="4.5"
            className="fill-primary/50 animate-puff-drift"
            style={{ animationDelay: delay }}
          />
        ))}
      </svg>
    </div>
  );
}
