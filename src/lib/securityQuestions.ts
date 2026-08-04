// Standard security-question prompts offered on account setup. Answers are
// matched case-insensitively and trimmed (see the set_security_questions /
// recover_account_via_security_questions Postgres functions), so the exact
// wording here doesn't need to hint at formatting.
export const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What was the make and model of your first car?",
  "What is your mother's maiden name?",
  "What was the name of your elementary school?",
  "What was your childhood nickname?",
  "What street did you grow up on?",
  "What was your favorite teacher's last name?",
  "What was the name of your first employer?",
  "What is your favorite food?",
];
