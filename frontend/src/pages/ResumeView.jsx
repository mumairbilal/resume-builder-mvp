import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import * as api from "../api/client";
import { IconDoc, IconStar, IconBriefcase, IconCap, IconFolder, IconChevron, IconMail, IconPhone, IconPin, IconShare } from "../icons.jsx";
import ResumePDFTemplate from "./ResumePDFTemplate.jsx";
import ShareModal from "../components/ShareModal.jsx";

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
}

// Skills can be an old plain string or the current { name, level } shape —
// normalize so we never try to render a raw object as a React child.
function skillLabel(s) {
  if (s && typeof s === "object") return s.name || "";
  return s || "";
}

function AccordionSection({ id, icon: Icon, title, meta, open, onToggle, children }) {
  return (
    <div className={`accordion-card ${open ? "open" : ""}`} data-section={id}>
      <button type="button" className="accordion-head" onClick={onToggle}>
        <span className="accordion-head-left">
          <span className="accordion-icon"><Icon /></span>
          <span className="accordion-title">{title}</span>
          {meta != null && <span className="accordion-meta">{meta}</span>}
        </span>
        <span className="accordion-chevron"><IconChevron /></span>
      </button>
      <div className="accordion-body-wrap">
        <div className="accordion-body-inner">
          <div className="accordion-body">{children}</div>
        </div>
      </div>
    </div>
  );
}

function ResumeSkeleton() {
  return (
    <div className="resume-skeleton" aria-label="Loading resume">
      <div className="skeleton-hero">
        <div className="skeleton-circle" />
        <div className="skeleton-hero-lines">
          <div className="skeleton-line skeleton-line-wide" />
          <div className="skeleton-line skeleton-line-mid" />
        </div>
      </div>
      <div className="skeleton-body">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card skeleton-card-tall" />
      </div>
    </div>
  );
}

export default function ResumeView() {
  const { id } = useParams();
  const [resume, setResume] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState({ summary: true, skills: true, experience: true, education: false, projects: false });
  const [searchParams] = useSearchParams();
  const [view, setView] = useState(searchParams.get("view") === "document" ? "document" : "web"); // "web" | "document"
  const [downloading, setDownloading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const pdfRef = useRef(null);

  useEffect(() => {
    api.getResume(id).then(setResume).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!resume) return <ResumeSkeleton />;

  const d = resume.data || {};
  const toggle = (key) => setOpen((o) => ({ ...o, [key]: !o[key] }));

  function pdfFilename() {
    return `${(resume.title || "resume").trim().replace(/\s+/g, "_")}.pdf`;
  }

  async function buildPdfBase64() {
    const html2pdf = (await import("html2pdf.js")).default;
    return html2pdf()
      .set({
        margin: 0,
        filename: pdfFilename(),
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "px", format: [794, 1123], orientation: "portrait" },
      })
      .from(pdfRef.current)
      .outputPdf("datauristring");
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({
          margin: 0,
          filename: pdfFilename(),
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "px", format: [794, 1123], orientation: "portrait" },
        })
        .from(pdfRef.current)
        .save();
    } finally {
      setDownloading(false);
    }
  }

  async function handleShareSend({ email, message }) {
    setSending(true);
    try {
      const pdfDataUri = await buildPdfBase64();
      await api.shareResume(resume.id, { email, message, pdf_base64: pdfDataUri });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="resume-page">
      <div className="resume-hero">
        <div className="resume-hero-top">
          <div>
            <span className="eyebrow" style={{ color: "rgba(255,255,255,0.75)" }}>Last updated {new Date(resume.updated_at).toLocaleDateString()}</span>
            <h1 className="resume-hero-title">{resume.title}</h1>
          </div>
          <div className="card-actions">
            <Link to={`/resumes/${id}/edit`} className="btn-primary btn-on-dark">Edit</Link>
            <Link to={`/resumes/${id}/history`} className="link-on-dark">History</Link>
            <Link to="/dashboard" className="link-on-dark">Back</Link>
          </div>
        </div>

        <div className="resume-hero-profile">
          <div className="resume-avatar">{initials(d.full_name)}</div>
          <div>
            <h2 className="resume-hero-name">{d.full_name || "Your Name"}</h2>
            <div className="resume-hero-contact">
              {d.email && <span><IconMail />{d.email}</span>}
              {d.phone && <span><IconPhone />{[d.phone_country_code, d.phone].filter(Boolean).join(" ")}</span>}
              {d.address && <span><IconPin />{d.address}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="view-toggle-row">
        <div className="view-toggle">
          <button type="button" className={view === "web" ? "active" : ""} onClick={() => setView("web")}>Web View</button>
          <button type="button" className={view === "document" ? "active" : ""} onClick={() => setView("document")}>PDF Preview</button>
        </div>
        <div className="card-actions">
          <button type="button" className="btn-secondary btn-share" onClick={() => setShareOpen(true)}>
            <IconShare /> Share
          </button>
          {view === "document" && (
            <button type="button" className="btn-primary" onClick={handleDownload} disabled={downloading}>
              {downloading ? "Preparing..." : "Download PDF"}
            </button>
          )}
        </div>
      </div>

      {view === "document" ? (
        <div className="pdf-preview-wrap">
          <div className="pdf-page-shadow">
            <ResumePDFTemplate ref={pdfRef} resume={resume} />
          </div>
        </div>
      ) : (
      <div className="accordion-list">
        {d.summary && (
          <AccordionSection id="summary" icon={IconDoc} title="Summary" open={open.summary} onToggle={() => toggle("summary")}>
            <p>{d.summary}</p>
          </AccordionSection>
        )}

        {d.skills?.length > 0 && (
          <AccordionSection id="skills" icon={IconStar} title="Skills" meta={d.skills.length} open={open.skills} onToggle={() => toggle("skills")}>
            <div className="chip-row">
              {d.skills.map((s, i) => <span className="chip" key={i}>{skillLabel(s)}</span>)}
            </div>
          </AccordionSection>
        )}

        {d.experience?.length > 0 && (
          <AccordionSection id="experience" icon={IconBriefcase} title="Experience" meta={d.experience.length} open={open.experience} onToggle={() => toggle("experience")}>
            {d.experience.map((exp, i) => (
              <div className="template-entry" key={i}>
                <div className="entry-title-row">
                  <strong>{exp.role}</strong> {exp.company && <span>@ {exp.company}</span>}
                  <span className="muted">{[exp.start, exp.end].filter(Boolean).join(" - ")}</span>
                </div>
                <p>{exp.description}</p>
              </div>
            ))}
          </AccordionSection>
        )}

        {d.education?.length > 0 && (
          <AccordionSection id="education" icon={IconCap} title="Education" meta={d.education.length} open={open.education} onToggle={() => toggle("education")}>
            {d.education.map((ed, i) => (
              <div className="template-entry" key={i}>
                <div className="entry-title-row">
                  <strong>{ed.degree}</strong> {ed.school && <span>- {ed.school}</span>}
                  <span className="muted">{[ed.start, ed.end].filter(Boolean).join(" - ")}</span>
                </div>
              </div>
            ))}
          </AccordionSection>
        )}

        {d.projects?.length > 0 && (
          <AccordionSection id="projects" icon={IconFolder} title="Projects" meta={d.projects.length} open={open.projects} onToggle={() => toggle("projects")}>
            {d.projects.map((p, i) => (
              <div className="template-entry" key={i}>
                <div className="entry-title-row">
                  <strong>{p.name}</strong>
                  {p.link && <a href={p.link} target="_blank" rel="noreferrer">{p.link}</a>}
                </div>
                <p>{p.description}</p>
              </div>
            ))}
          </AccordionSection>
        )}
      </div>
      )}

      {view === "web" && (
        <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
          <ResumePDFTemplate ref={pdfRef} resume={resume} />
        </div>
      )}

      {shareOpen && (
        <ShareModal
          onClose={() => setShareOpen(false)}
          onSend={handleShareSend}
          sending={sending}
          defaultEmail={d.email || ""}
        />
      )}
    </div>
  );
}
