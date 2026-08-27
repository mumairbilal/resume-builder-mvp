import { useEffect, useRef, useState } from "react";
import { useAuth } from "../AuthContext";
import * as api from "../api/client";
import { IconCheck } from "../icons.jsx";

function initials(nameOrEmail) {
  if (!nameOrEmail) return "?";
  const parts = nameOrEmail.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Profile() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [profileImage, setProfileImage] = useState(user?.profile_image || "");
  const [imgBroken, setImgBroken] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  // keep local form state in sync if `user` loads/changes after this
  // component has already mounted (e.g. AuthContext resolves late)
  useEffect(() => {
    setName(user?.name || "");
    setProfileImage(user?.profile_image || "");
    setImgBroken(false);
  }, [user?.id, user?.name, user?.profile_image]);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  function handleFilePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setProfileError("Please choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setProfileError("Image must be smaller than 2MB.");
      return;
    }
    setProfileError("");
    const reader = new FileReader();
    reader.onload = () => { setProfileImage(reader.result); setImgBroken(false); };
    reader.readAsDataURL(file);
  }

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setProfileMsg("");
    setProfileError("");
    setSaving(true);
    try {
      const updated = await api.updateProfile({ name, profile_image: profileImage });
      setUser(updated);
      setProfileMsg("Profile updated.");
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPwMsg("");
    setPwError("");
    setPwSaving(true);
    try {
      await api.updatePassword({ old_password: oldPassword, new_password: newPassword });
      setPwMsg("Password updated.");
      setOldPassword("");
      setNewPassword("");
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="eyebrow">Account</span>
          <h1>Profile & Settings</h1>
        </div>
      </div>

      <div className="settings-grid">
        <div className="auth-card settings-card">
          <h3>Basic Info</h3>
          <form onSubmit={handleProfileSubmit}>
            <div className="avatar-editor">
              <div className="avatar-circle-lg">
                {profileImage && !imgBroken ? (
                  <img src={profileImage} alt="avatar" onError={() => setImgBroken(true)} />
                ) : (
                  <span>{initials(name || user?.email)}</span>
                )}
              </div>
              <div>
                <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}>
                  Upload photo
                </button>
                {profileImage && (
                  <button type="button" className="btn-link-danger" onClick={() => setProfileImage("")}>Remove</button>
                )}
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFilePick} hidden />
                <p className="muted" style={{ marginTop: 8 }}>JPG or PNG, up to 2MB.</p>
              </div>
            </div>

            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />

            <label>Email</label>
            <input value={user?.email || ""} disabled />

            {profileMsg && <p className="success"><IconCheck /> {profileMsg}</p>}
            {profileError && <p className="error">{profileError}</p>}
            <button type="submit" className="btn-primary" disabled={saving} style={{ marginTop: 20 }}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>

        <div className="auth-card settings-card">
          <h3>Change Password</h3>
          <form onSubmit={handlePasswordSubmit}>
            <label>Current Password</label>
            <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required />
            <label>New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
            {pwMsg && <p className="success"><IconCheck /> {pwMsg}</p>}
            {pwError && <p className="error">{pwError}</p>}
            <button type="submit" className="btn-primary" disabled={pwSaving} style={{ marginTop: 20 }}>
              {pwSaving ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
