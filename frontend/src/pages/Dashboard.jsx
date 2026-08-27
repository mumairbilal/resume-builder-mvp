import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as api from "../api/client";
import ResumePDFTemplate from "./ResumePDFTemplate.jsx";

const STYLE_TEMPLATES = [
  {
    key: "modern", name: "Modern", blurb: "Photo sidebar with skill bars — a friendly, contemporary look.",
    data: {
      full_name: "Gregory Walls", email: "gregory.walls@example.com", phone: "203 724 8485", phone_country_code: "+1",
      address: "Bethel, CT", photo: "",
      summary: "Skilled and passionate carpenter with 10+ years of experience in residential and commercial building.",
      skills: ["Mechanical Skills", "Hand & Power Tools", "Blueprint Reading", "Time Management"],
      experience: [{ company: "Timothy Glover Carpentry Inc.", role: "Carpenter", start: "2019", end: "Present", description: "Renovated 20 kitchens, installing top of the line cabinetry and plumbing fixtures." }],
      education: [{ school: "Charter Oak State College", degree: "Carpenters Apprenticeship", start: "2015", end: "2019" }],
      projects: [],
    },
  },
  {
    key: "classic", name: "Classic ATS", blurb: "Black & white, single column — maximum ATS parsing safety.",
    data: {
      full_name: "Priya Nair", email: "priya.nair@example.com", phone: "312 555 0148", phone_country_code: "+1",
      address: "Chicago, IL",
      summary: "Marketing professional focused on growth campaigns, brand strategy, and cross-channel storytelling.",
      skills: ["Campaign Strategy", "SEO", "Content Marketing", "Analytics", "Social Media"],
      experience: [{ company: "Brand Co.", role: "Marketing Specialist", start: "2022", end: "Present", description: "Led campaigns that grew organic traffic by 40% year over year." }],
      education: [{ school: "Central University", degree: "BA Marketing", start: "2018", end: "2022" }],
      projects: [],
    },
  },
  {
    key: "minimal", name: "Minimal", blurb: "Elegant serif headings, generous whitespace, no color.",
    data: {
      full_name: "Arthur Bennett", email: "arthur.bennett@example.com", phone: "415 555 0192", phone_country_code: "+1",
      address: "San Francisco, CA",
      summary: "Product designer focused on research-driven UX and clean, accessible interfaces.",
      skills: ["Figma", "User Research", "Prototyping", "Design Systems"],
      experience: [{ company: "Studio Name", role: "Product Designer", start: "2023", end: "Present", description: "Led end-to-end design for a core product surface, partnering closely with engineering." }],
      education: [{ school: "University Name", degree: "BFA Design", start: "2018", end: "2022" }],
      projects: [],
    },
  },
];

function QuickTemplates() {
  return (
    <div className="quick-templates">
      <div className="quick-templates-head">
        <h2>Start from a template</h2>
        <Link to="/resumes/new" className="link-more">Browse all →</Link>
      </div>
      <div className="template-grid">
        {STYLE_TEMPLATES.map((t) => (
          <Link to="/resumes/new" state={{ style: t.key }} className="template-card" key={t.key}>
            <div className="template-preview template-preview-full">
              <div className="template-preview-full-scale">
                <ResumePDFTemplate resume={{ title: t.name, data: t.data, template_key: t.key }} />
              </div>
              <div className="template-preview-overlay"><span className="btn-primary">Customize</span></div>
            </div>
            <div className="template-card-body">
              <div>
                <h4>{t.name}</h4>
                <p>{t.blurb}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  function load() {
    setLoading(true);
    api
      .listResumes()
      .then(setResumes)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleDelete(id) {
    if (!confirm("Delete this resume? This cannot be undone.")) return;
    try {
      await api.deleteResume(id);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const result = await api.parseUploadedResume(file);
      navigate("/resumes/new", { state: { uploadedTitle: result.title, uploadedData: result.data } });
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="eyebrow">{resumes.length} {resumes.length === 1 ? "file" : "files"} on record</span>
          <h1>Your Documents</h1>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? "Reading file..." : "Upload Resume"}
          </button>
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" hidden onChange={handleFileUpload} />
          <Link to="/resumes/new" className="btn-primary">+ New Resume</Link>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p>Loading...</p>
      ) : resumes.length === 0 ? (
        <p className="muted" style={{ marginTop: 8, marginBottom: 32 }}>No saved resumes yet — pick a template below or start from scratch.</p>
      ) : (
        <div className="resume-grid" style={{ marginBottom: 40 }}>
          {resumes.map((r) => {
            const d = r.data || {};
            return (
              <Link to={`/resumes/${r.id}`} className="mini-resume-card" key={r.id}>
                <div className="mini-resume-thumb">
                  <p className="mini-thumb-name">{d.full_name || "Your Name"}</p>
                  <p className="mini-thumb-headline">{r.title}</p>
                  <hr className="mini-thumb-rule" />
                  <div className="mini-thumb-line w-90" />
                  <div className="mini-thumb-line w-100" />
                  <div className="mini-thumb-line w-70" />
                  {d.skills?.length > 0 && (
                    <div className="mini-thumb-chips">
                      {d.skills.slice(0, 4).map((s, i) => <span className="mini-thumb-chip" key={i}>{typeof s === "object" ? s.name : s}</span>)}
                    </div>
                  )}
                </div>
                <div className="mini-resume-body">
                  <h3>{r.title}</h3>
                  <p className="muted">Updated: {new Date(r.updated_at).toLocaleString()}</p>
                  <div className="mini-resume-actions" onClick={(e) => e.stopPropagation()}>
                    <Link to={`/resumes/${r.id}/edit`}>Edit</Link>
                    <Link to={`/resumes/${r.id}/history`}>History</Link>
                    <button onClick={() => handleDelete(r.id)} className="btn-danger">Delete</button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {!loading && <QuickTemplates />}
    </div>
  );
}
