import { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as api from "../api/client";
import { IconShield } from "../icons.jsx";
import AuthLayout from "../components/AuthLayout.jsx";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.adminLogin({ email, password });
      api.setAdminToken(res.access_token);
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout variant="admin">
      <div className="auth-card admin-login-card">
        <div className="admin-badge"><IconShield /></div>
        <span className="eyebrow">Restricted access</span>
        <h2>Admin Dashboard</h2>
        <form onSubmit={handleSubmit}>
          <label>Admin Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          <label>Admin Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
