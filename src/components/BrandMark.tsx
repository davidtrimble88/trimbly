import trimblyLogo from "@/assets/branding/trimbly-logo.png";

interface BrandMarkProps {
  className?: string;
  /** Unused now that BrandMark renders the turtle badge — kept so existing call sites still type-check. */
  fillClassName?: string;
  /** Unused now that BrandMark renders the turtle badge — kept so existing call sites still type-check. */
  markClassName?: string;
}

/**
 * The Trimbly badge: the turtle-and-house mascot mark, also used as the
 * app's profile picture across social channels, so the site and social
 * presence share one recognizable mark.
 */
const BrandMark = ({ className = "w-8 h-8" }: BrandMarkProps) => (
  <img src={trimblyLogo} alt="Trimbly" className={`${className} rounded-full object-contain`} />
);

export default BrandMark;
