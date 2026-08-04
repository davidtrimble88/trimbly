// Mirrors src/lib/staffPasswordPolicy.ts — this copy is the real security
// boundary since it runs server-side; the frontend copy is UX-only and could
// be bypassed by anyone calling the edge function directly. Keep both in sync.
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 15;

const COMMON_WEAK = [
  "password", "letmein", "welcome", "qwerty", "trimbly", "employee",
  "changeme", "admin123", "123456", "iloveyou", "monkey", "dragon",
];

const LEET_MAP: Record<string, string> = { "0": "o", "1": "l", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s" };
function deleet(pw: string): string {
  return pw.toLowerCase().split("").map((c) => LEET_MAP[c] ?? c).join("");
}

function hasSequential(pw: string, len = 4): boolean {
  const s = pw.toLowerCase();
  for (let i = 0; i <= s.length - len; i++) {
    let asc = true;
    let desc = true;
    for (let j = 1; j < len; j++) {
      if (s.charCodeAt(i + j) !== s.charCodeAt(i + j - 1) + 1) asc = false;
      if (s.charCodeAt(i + j) !== s.charCodeAt(i + j - 1) - 1) desc = false;
    }
    if (asc || desc) return true;
  }
  return false;
}

export function validateStaffPassword(password: string, username?: string): string | null {
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return `Password must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters.`;
  }
  if (!/[A-Z]/.test(password)) return "Password needs at least one capital letter.";
  if (!/[a-z]/.test(password)) return "Password needs at least one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password needs at least one number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password needs at least one special character.";
  if (/(.)\1{2,}/.test(password)) return "Avoid repeating the same character 3+ times in a row.";
  if (hasSequential(password)) return 'Avoid simple sequences like "1234" or "abcd".';
  if (username && username.length >= 3 && password.toLowerCase().includes(username.toLowerCase())) {
    return "Password can't contain the username.";
  }
  const deleeted = deleet(password);
  if (COMMON_WEAK.some((w) => deleeted.includes(w))) {
    return "That password is too common — pick something less guessable.";
  }
  return null;
}
