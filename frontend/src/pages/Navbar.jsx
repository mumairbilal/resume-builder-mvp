import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { IconLogo } from "../icons.jsx";
import { useState } from "react";

function initials(nameOrEmail) {
  if (!nameOrEmail) return "?";
  const parts = nameOrEmail.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [imgBroken, setImgBroken] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="navbar-outer">
      <nav className="navbar">
        <Link to="/dashboard" className="brand">
          <span className="brand-mark"><IconLogo /></span>
          Resumly
        </Link>
        <div className="nav-links">
          <Link to="/profile" className="nav-user">
            <span className="avatar-circle-sm">
              {user?.profile_image && !imgBroken
                ? <img src={user.profile_image} alt="" onError={() => setImgBroken(true)} />
                : <span>{initials(user?.name || user?.email)}</span>}
            </span>
            {user?.name || user?.email}
          </Link>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </nav>
    </div>
  );
}