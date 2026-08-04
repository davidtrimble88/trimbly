// Shared building blocks for both password policies (staffPasswordPolicy.ts
// for employee accounts, passwordPolicy.ts for regular homeowner/pro/mechanic
// signups). Kept separate from the policies themselves since the two account
// tiers enforce different rules but should agree on what counts as "a known
// weak password," including basic leetspeak substitutions.
const COMMON_WEAK = [
  "password", "letmein", "welcome", "qwerty", "trimbly", "employee",
  "changeme", "admin123", "123456", "iloveyou", "monkey", "dragon",
  "football", "baseball", "sunshine", "princess", "starwars", "master",
];

const LEET_MAP: Record<string, string> = { "0": "o", "1": "l", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s" };

function deleet(pw: string): string {
  return pw.toLowerCase().split("").map((c) => LEET_MAP[c] ?? c).join("");
}

export function isCommonWeakPassword(password: string): boolean {
  const deleeted = deleet(password);
  return COMMON_WEAK.some((w) => deleeted.includes(w));
}

export function hasSequential(pw: string, len = 4): boolean {
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

export function hasTripleRepeat(pw: string): boolean {
  return /(.)\1{2,}/.test(pw);
}
