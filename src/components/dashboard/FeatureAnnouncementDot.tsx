import { useEffect, useState } from "react";

const KEY_PREFIX = "trimbly:seenFeature:";

/** Has this browser already dismissed the announcement for `featureKey`? */
export function isFeatureSeen(featureKey: string): boolean {
  try {
    return localStorage.getItem(KEY_PREFIX + featureKey) === "1";
  } catch {
    return true; // fail closed — never nag if storage is unavailable
  }
}

/** Call when the user visits/clicks the thing being announced, so the dot
 * doesn't come back. */
export function markFeatureSeen(featureKey: string): void {
  try { localStorage.setItem(KEY_PREFIX + featureKey, "1"); } catch {}
}

/** A small pulsing dot for pinning to a nav item or button to flag a new
 * feature, until the user visits it once — the lightweight sibling of the
 * full onboarding tour spotlight (src/components/onboarding/OnboardingTour.tsx),
 * for a single persistent target rather than a guided multi-step walkthrough. */
export default function FeatureAnnouncementDot({ featureKey }: { featureKey: string }) {
  const [seen, setSeen] = useState(true);

  useEffect(() => {
    setSeen(isFeatureSeen(featureKey));
  }, [featureKey]);

  if (seen) return null;

  return (
    <span className="relative inline-flex w-2 h-2 shrink-0" aria-hidden="true">
      <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 animate-ping" />
      <span className="relative inline-flex rounded-full w-2 h-2 bg-accent" />
    </span>
  );
}
