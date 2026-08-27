import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import * as api from "../api/client";
import { IconShield, IconUsers, IconDoc, IconShare, IconClose } from "../icons.jsx";
import ResumePDFTemplate from "./ResumePDFTemplate.jsx";

function initials(name) {
  if (!name) return "A";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "A";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="admin-stat-card">
      <div className="admin-stat-icon"><Icon /></div>
      <div>
        <p className="admin-stat-value">{value}</p>
        <p className="admin-stat-label">{label}</p>
      </div>
    </div>
  );
}

function EditUserModal({ user, onClose, onSaved }) {
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.adminUpdateUser(user.id, { name, email });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose}><IconClose /></button>
        <h3>Edit User</h3>
        <form onSubmit={submit}>
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={saving} style={{ width: "100%" }}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditResumeModal({ resume, onClose, onSaved }) {
  const [title, setTitle] = useState(resume.title || "");
  const [templateKey, setTemplateKey] = useState(resume.template_key || "modern");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.adminUpdateResume(resume.id, { title, template_key: templateKey });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose}><IconClose /></button>
        <h3>Edit Resume</h3>
        <p className="muted" style={{ marginTop: -8, marginBottom: 12 }}>Owner: {resume.owner_email}</p>
        <form onSubmit={submit}>
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          <label>Template Style</label>
          <select value={templateKey} onChange={(e) => setTemplateKey(e.target.value)}>
            <option value="modern">Modern</option>
            <option value="classic">Classic ATS</option>
            <option value="minimal">Minimal</option>
          </select>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={saving} style={{ width: "100%" }}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

function PreviewResumeModal({ resumeId, onClose }) {
  const [resume, setResume] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.adminGetResume(resumeId).then(setResume).catch((e) => setError(e.message));
  }, [resumeId]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card admin-preview-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose}><IconClose /></button>
        <h3>{resume?.title || "Loading..."}</h3>
        {resume && <p className="muted" style={{ marginTop: -8, marginBottom: 14 }}>Owner: {resume.owner_email} · Style: {resume.template_key}</p>}
        {error && <p className="error">{error}</p>}
        {resume && (
          <div className="admin-preview-frame">
            <div className="admin-preview-scale">
              <ResumePDFTemplate resume={resume} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [adminProfile, setAdminProfile] = useState(null);
  const [tab, setTab] = useState("overview");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [editResume, setEditResume] = useState(null);
  const [previewResumeId, setPreviewResumeId] = useState(null);

  function loadAll() {
    setLoading(true);
    Promise.all([api.adminGetStats(), api.adminListUsers(), api.adminListResumes(), api.adminGetProfile()])
      .then(([s, u, r, p]) => {
        setStats(s);
        setUsers(u);
        setResumes(r);
        setAdminProfile(p);
      })
      .catch((e) => {
        if (String(e.message).includes("credentials") || String(e.message).includes("401")) {
          api.setAdminToken(null);
          navigate("/admin/login");
        } else {
          setError(e.message);
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(loadAll, []);

  function handleLogout() {
    api.setAdminToken(null);
    navigate("/admin/login");
  }

  async function handleDeleteUser(id) {
    if (!confirm("Delete this user and all their resumes?")) return;
    await api.adminDeleteUser(id);
    loadAll();
  }

  async function handleDeleteResume(id) {
    if (!confirm("Delete this resume?")) return;
    await api.adminDeleteResume(id);
    loadAll();
  }

  const NAV_ITEMS = [
    { key: "overview", label: "Overview", icon: IconDoc },
    { key: "users", label: "Users", icon: IconUsers, count: users.length },
    { key: "resumes", label: "Resumes", icon: IconShare, count: resumes.length },
  ];

  return (
    <div className="container admin-dashboard">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <Link to="/admin/profile" className="admin-sidebar-profile">
            <span className="avatar-circle-lg admin-sidebar-avatar">
              {adminProfile?.profile_image ? <img src={adminProfile.profile_image} alt="" /> : <span>{initials(adminProfile?.name)}</span>}
            </span>
            <div>
              <p className="admin-sidebar-name">{adminProfile?.name || "Admin"}</p>
              <p className="admin-sidebar-email">{adminProfile?.email}</p>
            </div>
          </Link>

          <nav className="admin-sidebar-nav">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  className={tab === item.key ? "active" : ""}
                  onClick={() => setTab(item.key)}
                >
                  <Icon /> {item.label}
                  {item.count !== undefined && <span className="admin-sidebar-count">{item.count}</span>}
                </button>
              );
            })}
          </nav>

          <div className="admin-sidebar-footer">
            <Link to="/admin/profile" className="btn-secondary" style={{ width: "100%", justifyContent: "center" }}>Edit Profile</Link>
            <button className="btn-secondary" style={{ width: "100%", justifyContent: "center" }} onClick={handleLogout}>Logout</button>
          </div>
        </aside>

        <main className="admin-main">
          <div className="page-header">
            <div>
              <span className="eyebrow"><IconShield /> Admin</span>
              <h1>{NAV_ITEMS.find((i) => i.key === tab)?.label}</h1>
            </div>
          </div>

          {error && <p className="error">{error}</p>}
          {loading ? <p>Loading...</p> : (
            <>
              {tab === "overview" && stats && (
            <>
              <div className="admin-stats-grid">
                <StatCard icon={IconUsers} label="Total Users" value={stats.total_users} />
                <StatCard icon={IconDoc} label="Total Resumes" value={stats.total_resumes} />
                <StatCard icon={IconShare} label="Emails Shared" value={stats.total_shares} />
                <StatCard icon={IconDoc} label="Avg Resumes / User" value={stats.avg_resumes_per_user} />
              </div>

              <div className="admin-panel">
                <h3>Resumes by Template</h3>
                {stats.resumes_by_template.length === 0 ? <p className="muted">No data yet.</p> : (
                  <div className="admin-bar-list">
                    {stats.resumes_by_template.map((t) => {
                      const max = Math.max(...stats.resumes_by_template.map((x) => x.count), 1);
                      return (
                        <div className="admin-bar-row" key={t.template}>
                          <span className="admin-bar-label">{t.template}</span>
                          <div className="admin-bar-track"><div className="admin-bar-fill" style={{ width: `${(t.count / max) * 100}%` }} /></div>
                          <span className="admin-bar-count">{t.count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="admin-panel">
                <h3>Signups by Day</h3>
                {stats.signups_by_day.length === 0 ? <p className="muted">No signups yet.</p> : (
                  <div className="admin-bar-list">
                    {stats.signups_by_day.slice(-10).map((d) => {
                      const max = Math.max(...stats.signups_by_day.map((x) => x.count), 1);
                      return (
                        <div className="admin-bar-row" key={d.date}>
                          <span className="admin-bar-label">{d.date}</span>
                          <div className="admin-bar-track"><div className="admin-bar-fill" style={{ width: `${(d.count / max) * 100}%` }} /></div>
                          <span className="admin-bar-count">{d.count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {tab === "users" && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Joined</th><th></th></tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name || "—"}</td>
                      <td>{u.email}</td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="admin-row-actions">
                        <button className="btn-secondary btn-xs" onClick={() => setEditUser(u)}>Edit</button>
                        <button className="btn-danger-sm" onClick={() => handleDeleteUser(u.id)}><IconClose /></button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && <tr><td colSpan={4} className="muted">No users yet.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {tab === "resumes" && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>Title</th><th>Owner</th><th>Template</th><th>Updated</th><th></th></tr>
                </thead>
                <tbody>
                  {resumes.map((r) => (
                    <tr key={r.id}>
                      <td>{r.title}</td>
                      <td>{r.owner_email}</td>
                      <td>{r.template_key}{r.is_fresher ? " · fresher" : ""}</td>
                      <td>{new Date(r.updated_at).toLocaleDateString()}</td>
                      <td className="admin-row-actions">
                        <button className="btn-secondary btn-xs" onClick={() => setPreviewResumeId(r.id)}>Preview</button>
                        <button className="btn-secondary btn-xs" onClick={() => setEditResume(r)}>Edit</button>
                        <button className="btn-danger-sm" onClick={() => handleDeleteResume(r.id)}><IconClose /></button>
                      </td>
                    </tr>
                  ))}
                  {resumes.length === 0 && <tr><td colSpan={5} className="muted">No resumes yet.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
            </>
          )}
        </main>
      </div>

      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={() => { setEditUser(null); loadAll(); }}
        />
      )}
      {editResume && (
        <EditResumeModal
          resume={editResume}
          onClose={() => setEditResume(null)}
          onSaved={() => { setEditResume(null); loadAll(); }}
        />
      )}
      {previewResumeId && (
        <PreviewResumeModal resumeId={previewResumeId} onClose={() => setPreviewResumeId(null)} />
      )}
    </div>
  );
}
