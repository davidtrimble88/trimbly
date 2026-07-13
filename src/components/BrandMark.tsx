interface BrandMarkProps {
  className?: string;
  /** Tailwind fill class for the shield body */
  fillClassName?: string;
  /** Tailwind fill class for the T cutout */
  markClassName?: string;
}

/**
 * The Trimbly shield mark: a rounded shield/badge silhouette with a T cut
 * into the center. Self-contained — no background chip needed, unlike a
 * plain letterform, which is why this replaced the old "T in a colored
 * square" treatment everywhere the logo appears.
 */
const BrandMark = ({
  className = "w-8 h-8",
  fillClassName = "fill-primary",
  markClassName = "fill-primary-foreground",
}: BrandMarkProps) => (
  <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
    <path d="M50,8 L88,22 L88,52 Q88,80 50,94 Q12,80 12,52 L12,22 Z" className={fillClassName} />
    <rect x="30" y="34" width="40" height="10" rx="2" className={markClassName} />
    <rect x="45" y="34" width="10" height="40" rx="2" className={markClassName} />
  </svg>
);

export default BrandMark;
