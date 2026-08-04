// Mirrors src/lib/staffPasswordPolicy.ts — this copy is the real security
// boundary since it runs server-side; the frontend copy is UX-only and could
// be bypassed by anyone calling the edge function directly. Keep both in sync.
import { isCommonWeakPassword, hasSequential, hasTripleRepeat } from "./passwordCommon.ts";

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 15;

export function validateStaffPassword(password: string, username?: string): string | null {
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return `Password must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters.`;
  }
  if (!/[A-Z]/.test(password)) return "Password needs at least one capital letter.";
  if (!/[a-z]/.test(password)) return "Password needs at least one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password needs at least one number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password needs at least one special character.";
  if (hasTripleRepeat(password)) return "Avoid repeating the same character 3+ times in a row.";
  if (hasSequential(password)) return 'Avoid simple sequences like "1234" or "abcd".';
  if (username && username.length >= 3 && password.toLowerCase().includes(username.toLowerCase())) {
    return "Password can't contain the username.";
  }
  if (isCommonWeakPassword(password)) {
    return "That password is too common — pick something less guessable.";
  }
  return null;
}
