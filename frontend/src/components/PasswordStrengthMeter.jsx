import { getPasswordStrength } from "../utils/validation";

export default function PasswordStrengthMeter({ password }) {
  if (!password) return null;
  const s = getPasswordStrength(password);

  return (
    <div className="pw-strength">
      <div className="pw-strength-bar">
        <div
          className="pw-strength-fill"
          style={{ width: `${s.percent}%`, background: s.color }}
        />
      </div>
      <div className="pw-strength-row">
        <span className="pw-strength-label" style={{ color: s.color }}>{s.label}</span>
        <span className="pw-strength-hints">
          {!s.checks.length && "8+ chars "}
          {!s.checks.uppercase && "• uppercase "}
          {!s.checks.lowercase && "• lowercase "}
          {!s.checks.digit && "• number "}
          {!s.checks.special && "• symbol"}
        </span>
      </div>
    </div>
  );
}
