import { forwardRef } from "react";

/* Three genuinely different resume layouts, chosen via resume.template_key:
   - modern:  two-column, dark photo sidebar (name/contact/skills) + main content
   - classic: single column, pure black & white, zero decoration — safest for ATS parsers
   - minimal: single column, elegant serif headings, generous whitespace, hairline rules
   Rendered off-screen (or in a preview box) and converted to PDF via html2pdf.js.
   Keep styling inline / self-contained so html2canvas captures it correctly. */

function formatMonth(value) {
  if (!value) return "";
  if (value === "Present") return "Present";
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  if (!m) return value;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[parseInt(m[2], 10) - 1]} ${m[1]}`;
}

function initials(name) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* Skills can be either a plain string (older saved resumes) or
   { name, level } (current format). Normalize once here so every
   template can just call skillName()/skillLevel() safely. */
const SKILL_LEVEL_WIDTH = { basic: 35, intermediate: 68, expert: 96 };
function skillObj(s) {
  if (s && typeof s === "object") return { name: s.name || "", level: s.level || "intermediate" };
  return { name: s || "", level: "intermediate" };
}
function skillName(s) {
  return skillObj(s).name;
}
function skillBarWidth(s) {
  const level = skillObj(s).level;
  return SKILL_LEVEL_WIDTH[level] ?? SKILL_LEVEL_WIDTH.intermediate;
}

/* ---------------------------------------------------------------- */
/* MODERN — dark sidebar with photo, contact, and skill bars         */
/* ---------------------------------------------------------------- */
function ModernTemplate({ d, title, phone }) {
  const F = "'Calibri', 'Helvetica Neue', Arial, sans-serif";
  const accent = "#4338ca";
  return (
    <div style={{ width: "794px", minHeight: "1123px", display: "flex", background: "#fff", fontFamily: F, boxSizing: "border-box" }}>
      {/* Sidebar */}
      <div style={{ width: "270px", flexShrink: 0, background: "#1e1b3a", color: "#fff", padding: "40px 26px" }}>
        <div style={{
          width: "104px", height: "104px", borderRadius: "50%", overflow: "hidden",
          background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px", border: "3px solid rgba(255,255,255,0.25)",
        }}>
          {d.photo
            ? <img src={d.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontSize: "30px", fontWeight: 700, color: "#fff" }}>{initials(d.full_name) || "?"}</span>}
        </div>

        <div style={{ marginBottom: "26px" }}>
          <p style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "1.4px", color: "#a5b4fc", textTransform: "uppercase", margin: "0 0 8px" }}>Contact</p>
          {d.email && <p style={{ fontSize: "11px", margin: "0 0 6px", wordBreak: "break-word", color: "#e0e0f5" }}>{d.email}</p>}
          {phone && <p style={{ fontSize: "11px", margin: "0 0 6px", color: "#e0e0f5" }}>{phone}</p>}
          {d.address && <p style={{ fontSize: "11px", margin: "0 0 6px", color: "#e0e0f5" }}>{d.address}</p>}
          {d.links?.map((l, i) => l.url && <p key={i} style={{ fontSize: "11px", margin: "0 0 6px", color: "#e0e0f5", wordBreak: "break-word" }}>{l.url}</p>)}
        </div>

        {d.skills?.length > 0 && (
          <div style={{ marginBottom: "26px" }}>
            <p style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "1.4px", color: "#a5b4fc", textTransform: "uppercase", margin: "0 0 10px" }}>Skills</p>
            {d.skills.map((s, i) => (
              <div key={i} style={{ marginBottom: "9px" }}>
                <p style={{ fontSize: "11px", margin: "0 0 4px", color: "#f1f1fa" }}>{skillName(s)}</p>
                <div style={{ height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.15)" }}>
                  <div style={{ height: "100%", width: `${skillBarWidth(s)}%`, borderRadius: "2px", background: "#818cf8" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {d.education?.length > 0 && (
          <div>
            <p style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "1.4px", color: "#a5b4fc", textTransform: "uppercase", margin: "0 0 10px" }}>Education</p>
            {d.education.map((ed, i) => (
              <div key={i} style={{ marginBottom: "12px" }}>
                <p style={{ fontSize: "11.5px", fontWeight: 700, margin: 0, color: "#fff" }}>{ed.degree}</p>
                <p style={{ fontSize: "10.5px", margin: "2px 0 0", color: "#c7c9f0" }}>{ed.school}</p>
                <p style={{ fontSize: "10px", margin: "1px 0 0", color: "#9294c9" }}>{[formatMonth(ed.start), formatMonth(ed.end)].filter(Boolean).join(" – ")}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: "40px 38px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 800, margin: 0, color: "#111827" }}>{d.full_name || "Your Name"}</h1>
        <p style={{ fontSize: "13px", fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: "0.6px", margin: "4px 0 22px" }}>{title || "Resume"}</p>

        {d.summary && (
          <div style={{ marginBottom: "22px" }}>
            <p style={{ fontSize: "12.5px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: accent, margin: "0 0 8px" }}>Profile</p>
            <p style={{ fontSize: "12.5px", lineHeight: 1.6, color: "#374151", margin: 0 }}>{d.summary}</p>
          </div>
        )}

        {d.experience?.length > 0 && (
          <div style={{ marginBottom: "22px" }}>
            <p style={{ fontSize: "12.5px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: accent, margin: "0 0 12px" }}>Employment History</p>
            {d.experience.map((exp, i) => (
              <div key={i} style={{ marginBottom: "14px", position: "relative", paddingLeft: "14px", borderLeft: "2px solid #e0e0f5" }}>
                <div style={{ position: "absolute", left: "-5px", top: "3px", width: "8px", height: "8px", borderRadius: "50%", background: accent }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#111827" }}>{exp.role}{exp.company ? `, ${exp.company}` : ""}</span>
                  <span style={{ fontSize: "11px", color: "#6b7280", whiteSpace: "nowrap" }}>{[formatMonth(exp.start), formatMonth(exp.end)].filter(Boolean).join(" – ")}</span>
                </div>
                {exp.description && <p style={{ fontSize: "12px", lineHeight: 1.6, color: "#4b5563", margin: "4px 0 0" }}>{exp.description}</p>}
              </div>
            ))}
          </div>
        )}

        {d.projects?.length > 0 && (
          <div>
            <p style={{ fontSize: "12.5px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: accent, margin: "0 0 10px" }}>Projects</p>
            {d.projects.map((p, i) => (
              <div key={i} style={{ marginBottom: "10px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>{p.name}</span>
                {p.description && <p style={{ fontSize: "12px", lineHeight: 1.6, color: "#4b5563", margin: "2px 0 0" }}>{p.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* CLASSIC ATS — pure black & white, single column, zero decoration  */
/* ---------------------------------------------------------------- */
function ClassicTemplate({ d, title, phone }) {
  const F = "'Times New Roman', Georgia, serif";
  const sec = (label) => (
    <p style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#000", margin: "18px 0 8px", borderBottom: "1px solid #000", paddingBottom: "3px" }}>{label}</p>
  );
  return (
    <div style={{ width: "794px", minHeight: "1123px", background: "#fff", color: "#000", fontFamily: F, padding: "50px 60px", boxSizing: "border-box" }}>
      <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0, textAlign: "center", letterSpacing: "0.5px" }}>{(d.full_name || "Your Name").toUpperCase()}</h1>
      <p style={{ fontSize: "11px", textAlign: "center", margin: "6px 0 0" }}>
        {[d.email, phone, d.address].filter(Boolean).join("  |  ")}
      </p>
      <div style={{ borderTop: "1.5px solid #000", margin: "14px 0 0" }} />

      {d.summary && (
        <div>
          {sec("Summary")}
          <p style={{ fontSize: "12px", lineHeight: 1.55, margin: 0 }}>{d.summary}</p>
        </div>
      )}

      {d.experience?.length > 0 && (
        <div>
          {sec("Professional Experience")}
          {d.experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12.5px", fontWeight: 700 }}>{exp.role}{exp.company ? `, ${exp.company}` : ""}</span>
                <span style={{ fontSize: "11px" }}>{[formatMonth(exp.start), formatMonth(exp.end)].filter(Boolean).join(" - ")}</span>
              </div>
              {exp.description && <p style={{ fontSize: "12px", lineHeight: 1.5, margin: "3px 0 0" }}>{exp.description}</p>}
            </div>
          ))}
        </div>
      )}

      {d.education?.length > 0 && (
        <div>
          {sec("Education")}
          {d.education.map((ed, i) => (
            <div key={i} style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "12.5px" }}><strong>{ed.degree}</strong>{ed.school ? `, ${ed.school}` : ""}</span>
              <span style={{ fontSize: "11px" }}>{[formatMonth(ed.start), formatMonth(ed.end)].filter(Boolean).join(" - ")}</span>
            </div>
          ))}
        </div>
      )}

      {d.projects?.length > 0 && (
        <div>
          {sec("Projects")}
          {d.projects.map((p, i) => (
            <div key={i} style={{ marginBottom: "8px" }}>
              <span style={{ fontSize: "12.5px", fontWeight: 700 }}>{p.name}</span>
              {p.description && <p style={{ fontSize: "12px", lineHeight: 1.5, margin: "2px 0 0" }}>{p.description}</p>}
            </div>
          ))}
        </div>
      )}

      {d.skills?.length > 0 && (
        <div>
          {sec("Skills")}
          <p style={{ fontSize: "12px", lineHeight: 1.6, margin: 0 }}>{d.skills.map(skillName).join(", ")}</p>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* MINIMAL — elegant serif headings, hairline rules, lots of air     */
/* ---------------------------------------------------------------- */
function MinimalTemplate({ d, title, phone }) {
  const serif = "'Georgia', 'Times New Roman', serif";
  const sans = "'Helvetica Neue', Arial, sans-serif";
  const sec = (label) => (
    <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "2.2px", color: "#9ca3af", margin: "0 0 10px", fontFamily: sans }}>{label}</p>
  );
  return (
    <div style={{ width: "794px", minHeight: "1123px", background: "#fff", color: "#1f2937", fontFamily: sans, padding: "56px 64px", boxSizing: "border-box" }}>
      <h1 style={{ fontSize: "32px", fontWeight: 400, margin: 0, color: "#111827", fontFamily: serif, letterSpacing: "0.4px" }}>{d.full_name || "Your Name"}</h1>
      <p style={{ fontSize: "12px", color: "#6b7280", margin: "6px 0 16px", letterSpacing: "0.5px" }}>{title || "Resume"}</p>
      <p style={{ fontSize: "11.5px", color: "#6b7280", margin: 0 }}>
        {[d.email, phone, d.address].filter(Boolean).join("   ·   ")}
      </p>
      <div style={{ borderTop: "1px solid #e5e7eb", margin: "22px 0" }} />

      {d.summary && (
        <div style={{ marginBottom: "26px" }}>
          <p style={{ fontSize: "13px", lineHeight: 1.75, color: "#374151", margin: 0, fontFamily: serif }}>{d.summary}</p>
        </div>
      )}

      {d.experience?.length > 0 && (
        <div style={{ marginBottom: "26px" }}>
          {sec("Experience")}
          {d.experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827", fontFamily: serif }}>{exp.role}</span>
                <span style={{ fontSize: "10.5px", color: "#9ca3af" }}>{[formatMonth(exp.start), formatMonth(exp.end)].filter(Boolean).join(" — ")}</span>
              </div>
              {exp.company && <p style={{ fontSize: "11.5px", color: "#9ca3af", margin: "1px 0 4px" }}>{exp.company}</p>}
              {exp.description && <p style={{ fontSize: "12.5px", lineHeight: 1.65, color: "#4b5563", margin: 0 }}>{exp.description}</p>}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: "40px" }}>
        {d.education?.length > 0 && (
          <div style={{ flex: 1 }}>
            {sec("Education")}
            {d.education.map((ed, i) => (
              <div key={i} style={{ marginBottom: "10px" }}>
                <p style={{ fontSize: "12.5px", fontWeight: 600, color: "#111827", margin: 0, fontFamily: serif }}>{ed.degree}</p>
                <p style={{ fontSize: "11px", color: "#9ca3af", margin: "1px 0 0" }}>{ed.school}</p>
              </div>
            ))}
          </div>
        )}
        {d.skills?.length > 0 && (
          <div style={{ flex: 1 }}>
            {sec("Skills")}
            <p style={{ fontSize: "12px", lineHeight: 1.9, color: "#4b5563", margin: 0 }}>{d.skills.map(skillName).join(" · ")}</p>
          </div>
        )}
      </div>

      {d.projects?.length > 0 && (
        <div style={{ marginTop: "22px" }}>
          {sec("Projects")}
          {d.projects.map((p, i) => (
            <div key={i} style={{ marginBottom: "8px" }}>
              <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#111827", fontFamily: serif }}>{p.name}</span>
              {p.description && <p style={{ fontSize: "12px", lineHeight: 1.6, color: "#4b5563", margin: "2px 0 0" }}>{p.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const ResumePDFTemplate = forwardRef(function ResumePDFTemplate({ resume }, ref) {
  const d = resume?.data || {};
  const variant = resume?.template_key || "modern";
  const phone = d.phone ? `${d.phone_country_code || ""} ${d.phone}`.trim() : "";
  const props = { d, title: resume?.title, phone };

  return (
    <div ref={ref}>
      {variant === "classic" && <ClassicTemplate {...props} />}
      {variant === "minimal" && <MinimalTemplate {...props} />}
      {(variant === "modern" || !["classic", "minimal"].includes(variant)) && <ModernTemplate {...props} />}
    </div>
  );
});

export default ResumePDFTemplate;
