// Standard password policy for regular homeowner/pro/mechanic accounts —
// lighter than staffPasswordPolicy.ts (employee accounts guard admin/staff
// tools and warrant stricter rules); this is enforced client-side only,
// since Supabase Auth's own signUp/updateUser calls are the real backend
// boundary and already reject known-breached passwords on their own.
import { isCommonWeakPassword, hasSequential, hasTripleRepeat } from "./passwordCommon";

export const PASSWORD_MIN = 8;

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN) {
    return `Password must be at least ${PASSWORD_MIN} characters.`;
  }
  if (!/[A-Za-z]/.test(password)) return "Password needs at least one letter.";
  if (!/[0-9]/.test(password)) return "Password needs at least one number.";
  if (hasTripleRepeat(password)) return "Avoid repeating the same character 3+ times in a row.";
  if (hasSequential(password)) return 'Avoid simple sequences like "1234" or "abcd".';
  if (isCommonWeakPassword(password)) {
    return "That password is too common — pick something less guessable.";
  }
  return null;
}
