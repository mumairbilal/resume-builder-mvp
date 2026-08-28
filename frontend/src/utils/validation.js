// Mirrors the backend's scoring logic (backend is the source of truth / enforces the minimum).
export function getPasswordStrength(password = "") {
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    digit: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  let score = Object.values(checks).filter(Boolean).length;
  if (password.length >= 12 && score >= 4) score = 5;
  score = Math.min(score, 5);

  const labels = ["Very Weak", "Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
  const colors = ["#ef4444", "#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];

  return {
    score,
    label: labels[score],
    color: colors[score],
    percent: (score / 5) * 100,
    checks,
    isValid: password.length >= 8 && score >= 3,
  };
}

export const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export function isValidEmail(email = "") {
  return EMAIL_RE.test(email.trim());
}
