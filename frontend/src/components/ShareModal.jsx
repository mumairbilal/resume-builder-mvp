import { useState } from "react";
import { IconClose, IconMail } from "../icons.jsx";
import { isValidEmail } from "../utils/validation";

export default function ShareModal({ onClose, onSend, sending, defaultEmail = "" }) {
  const [email, setEmail] = useState(defaultEmail);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [message, setMessage] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const emailValid = isValidEmail(email);
  const emailsMatch = confirmEmail === email;

  async function handleSend(e) {
    e.preventDefault();
    setTouched(true);
    setError("");
    if (!emailValid) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!emailsMatch) {
      setError("Email addresses do not match.");
      return;
    }
    try {
      await onSend({ email, message });
      setSent(true);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose}><IconClose /></button>
        {sent ? (
          <div className="modal-success">
            <div className="modal-success-icon"><IconMail /></div>
            <h3>Resume sent!</h3>
            <p>We emailed the PDF to <strong>{email}</strong>.</p>
            <button type="button" className="btn-primary" onClick={onClose}>Done</button>
          </div>
        ) : (
          <form onSubmit={handleSend} noValidate>
            <span className="eyebrow">Share via email</span>
            <h3>Send this resume</h3>
            <p className="muted" style={{ marginTop: "-4px" }}>We'll email a PDF copy to the address below.</p>

            <label>Recipient Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
              className={touched && !emailValid ? "input-error" : ""}
              placeholder="name@example.com"
              required
              autoFocus
            />
            {touched && !emailValid && <p className="field-error">Enter a valid email address.</p>}

            <label>Confirm Email</label>
            <input
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className={touched && confirmEmail && !emailsMatch ? "input-error" : ""}
              placeholder="Re-enter the email"
              required
            />
            {touched && confirmEmail && !emailsMatch && <p className="field-error">Emails do not match.</p>}

            <label>Message (optional)</label>
            <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Add a short note..." />

            {error && <p className="error">{error}</p>}

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={sending}>{sending ? "Sending..." : "Send Resume"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
