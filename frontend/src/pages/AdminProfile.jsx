import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as api from "../api/client";
import { IconCheck, IconShield } from "../icons.jsx";

function initials(name) {
  if (!name) return "A";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "A";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AdminProfile() {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef(null);

  useEffect(() => {
    api.adminGetProfile()
      .then((p) => { setProfile(p); setName(p.name); setImage(p.profile_image); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function handleFilePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please choose an image file."); return; }
    if (file.size > 2 * 1024 * 1024) { setError("Image must be smaller than 2MB."); return; }
    setError("");
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg(""); setError(""); setSaving(true);
    try {
      const updated = await api.adminUpdateProfile({ name, profile_image: image });
      setProfile(updated);
      setMsg("Profile updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="container"><p>Loading...</p></div>;

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <span className="eyebrow"><IconShield /> Admin</span>
          <h1>Admin Profile</h1>
        </div>
        <Link to="/admin/dashboard" className="btn-secondary">← Dashboard</Link>
      </div>

      <div className="auth-card settings-card" style={{ maxWidth: 460 }}>
        <form onSubmit={handleSubmit}>
          <div className="avatar-editor">
            <div className="avatar-circle-lg">
              {image ? <img src={image} alt="admin avatar" /> : <span>{initials(name)}</span>}
            </div>
            <div>
              <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}>Upload photo</button>
              {image && <button type="button" className="btn-link-danger" onClick={() => setImage("")}>Remove</button>}
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFilePick} hidden />
              <p className="muted" style={{ marginTop: 8 }}>JPG or PNG, up to 2MB.</p>
            </div>
          </div>

          <label>Display Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Admin" />

          <label>Login Email</label>
          <input value={profile?.email || ""} disabled />
          <p className="muted" style={{ marginTop: -2 }}>
            Set via <code>ADMIN_EMAIL</code> in <code>backend/.env</code> — change credentials there and restart the server.
          </p>

          {msg && <p className="success"><IconCheck /> {msg}</p>}
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={saving} style={{ marginTop: 20 }}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
