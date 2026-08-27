import { Link } from "react-router-dom";
import { IconLogo, IconArrowRight } from "../icons.jsx";

/* Used on pages rendered before/outside the authenticated app shell
   (Login, Signup, Admin Login, Admin Dashboard) so there's always a
   way back to the marketing site instead of a dead end with no nav. */
export default function AuthNav({ backTo = "/", backLabel = "Back to Resumly" }) {
  return (
    <div className="navbar-outer">
      <nav className="navbar">
        <Link to="/" className="brand">
          <span className="brand-mark"><IconLogo /></span>
          Resumly
        </Link>
        <Link to={backTo} className="auth-nav-back">
          <span className="auth-nav-back-arrow"><IconArrowRight /></span>
          {backLabel}
        </Link>
      </nav>
    </div>
  );
}
