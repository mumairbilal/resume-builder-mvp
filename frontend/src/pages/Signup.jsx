import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import { getPasswordStrength, isValidEmail } from "../utils/validation";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const emailValid = email === "" || isValidEmail(email);
  const strength = getPasswordStrength(password);
  const passwordsMatch = confirmPassword === "" || confirmPassword === password;
  const nameValid = name.trim().length > 0;
  const canSubmit = nameValid && isValidEmail(email) && strength.isValid && confirmPassword === password;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setTouched({ name: true, email: true, password: true, confirmPassword: true });

    if (!nameValid) {
      setError("Please enter your full name.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!strength.isValid) {
      setError("Please choose a stronger password (at least 8 characters with a mix of letters, numbers, and symbols).");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await signup(email, password, name);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <span className="eyebrow">Get started</span>
      <h2>Create account</h2>
      <form onSubmit={handleSubmit} noValidate>
        <label>Name<span className="required-star">*</span></label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          className={touched.name && !nameValid ? "input-error" : ""}
          placeholder="Jane Doe"
          required
        />
        {touched.name && !nameValid && <p className="field-error">Please enter your name.</p>}

        <label>Email<span className="required-star">*</span></label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          className={touched.email && !emailValid ? "input-error" : ""}
          required
        />
        {touched.email && !emailValid && <p className="field-error">Enter a valid email address (e.g. name@example.com).</p>}

        <label>Password<span className="required-star">*</span></label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          minLength={8}
          required
        />
        <PasswordStrengthMeter password={password} />

        <label>Confirm Password<span className="required-star">*</span></label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
          className={touched.confirmPassword && !passwordsMatch ? "input-error" : ""}
          required
        />
        {touched.confirmPassword && !passwordsMatch && <p className="field-error">Passwords do not match.</p>}

        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={loading || !canSubmit}>
          {loading ? "Creating..." : "Sign up"}
        </button>
      </form>
      <p>Already have an account? <Link to="/login">Log in</Link></p>
    </div>
  );
}
