import { Link } from "react-router-dom";
import { IconLogo, IconCheck, IconShield, IconClock, IconLayers, IconDoc } from "../icons.jsx";

/* Split-screen shell used by Login / Signup / Admin Login.
   Left: animated, on-brand panel that sells the product while you fill
   the form — floating blobs, a feature list, and a soft testimonial.
   Right: whatever form the page passes in as children.
   `variant="admin"` swaps the palette to a darker, security-flavored look. */

/* Copy is fully separate per screen — login, signup, and admin each get
   their own kicker, headline, blurb, feature points, and (for the two
   user-facing screens) their own testimonial, so nothing is reused
   verbatim across pages. */
const COPY = {
  login: {
    kicker: "Welcome back",
    heading: <>Pick up right<br />where you left off.</>,
    blurb: "Every resume you've built is saved, versioned, and ready to keep polishing.",
    points: [
      { icon: IconClock, text: "Full version history — undo any change, any time" },
      { icon: IconDoc, text: "ATS-friendly layouts that pass resume screeners" },
      { icon: IconLayers, text: "Pick up any saved resume and keep editing instantly" },
    ],
    testimonial: {
      quote: "Went from a blank page to an interview-ready resume in under ten minutes.",
      author: "— a Resumly user",
    },
  },
  signup: {
    kicker: "Land the interview",
    heading: <>Your career story,<br />done properly.</>,
    blurb: "Structured templates, full version history, and a live preview that updates as you type.",
    points: [
      { icon: IconLayers, text: "6+ role-specific templates, pre-filled with real content" },
      { icon: IconDoc, text: "ATS-friendly layouts that pass resume screeners" },
      { icon: IconCheck, text: "Free to start — no credit card required" },
    ],
    testimonial: {
      quote: "I had three tailored resumes ready before my next application deadline.",
      author: "— a new Resumly user",
    },
  },
  admin: {
    kicker: "Admin Console",
    heading: <>Manage every account<br />from one dashboard.</>,
    blurb: "Secure, scoped access to user accounts, resumes, and platform activity.",
    points: [
      { icon: IconShield, text: "Full visibility into accounts and saved resumes" },
      { icon: IconClock, text: "Every action is scoped to a signed, expiring session" },
      { icon: IconDoc, text: "Read-only by default — nothing changes by accident" },
    ],
    testimonial: null,
  },
};

export default function AuthLayout({ children, variant = "signup" }) {
  const copy = COPY[variant] || COPY.signup;
  const isAdmin = variant === "admin";

  return (
    <div className={`auth-split ${isAdmin ? "auth-split-admin" : ""}`}>
      <div className="auth-split-left">
        <div className="auth-split-blob auth-split-blob-1" />
        <div className="auth-split-blob auth-split-blob-2" />
        <div className="auth-split-grid" />

        <Link to="/" className="auth-split-brand">
          <span className="brand-mark"><IconLogo /></span>
          Resumly
        </Link>

        <div className="auth-split-copy">
          <span className="auth-split-kicker">{copy.kicker}</span>
          <h1>{copy.heading}</h1>
          <p>{copy.blurb}</p>

          <ul className="auth-split-points">
            {copy.points.map((p, i) => {
              const Icon = p.icon;
              return (
                <li key={i} style={{ animationDelay: `${i * 90 + 120}ms` }}>
                  <span className="auth-split-point-icon"><Icon /></span>
                  {p.text}
                </li>
              );
            })}
          </ul>

          {copy.testimonial && (
            <div className="auth-split-testimonial">
              <div className="auth-split-stars">
                <IconCheck /><IconCheck /><IconCheck /><IconCheck /><IconCheck />
              </div>
              <p>"{copy.testimonial.quote}"</p>
              <span>{copy.testimonial.author}</span>
            </div>
          )}
        </div>

        <div className="auth-split-mock">
          <div className="auth-split-mock-bar" />
          <div className="auth-split-mock-line" style={{ width: "72%" }} />
          <div className="auth-split-mock-line" style={{ width: "94%" }} />
          <div className="auth-split-mock-line" style={{ width: "58%" }} />
        </div>
      </div>

      <div className="auth-split-right">
        <div className="auth-split-right-inner">{children}</div>
      </div>
    </div>
  );
}
