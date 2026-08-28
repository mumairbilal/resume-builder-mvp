import { forwardRef, useCallback } from "react";

/* ------------------------------------------------------------------
   EDITABLE TEXT — when `editable` is on, every piece of text on the
   live preview becomes a contentEditable span. Click it, type, click
   away — the change is written straight back into the form's data
   state via onEdit(path, value). No modal, no separate "edit" mode.
   ------------------------------------------------------------------ */
function Edit({ path, value, onEdit, editable, placeholder, style, as = "span", multiline = false }) {
  if (!editable || !onEdit) {
    return value ? <span style={style}>{value}</span> : (placeholder ? <span style={{ ...style, opacity: 0.45 }}>{placeholder}</span> : null);
  }
  const Tag = as;
  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      className="editable-field"
      data-placeholder={placeholder || ""}
      style={{
        ...style,
        outline: "none",
        cursor: "text",
        minWidth: value ? undefined : "60px",
        display: multiline ? "block" : "inline-block",
        whiteSpace: multiline ? "pre-wrap" : "pre-wrap",
      }}
      onBlur={(e) => {
        const text = e.currentTarget.innerText.replace(/\n$/, "");
        if (text !== (value || "")) onEdit(path, text);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !multiline) { e.preventDefault(); e.currentTarget.blur(); }
      }}
    >
      {value || ""}
    </Tag>
  );
}

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

/* ------------------------------------------------------------------
   DATE RANGE — the "Jan 2023 – Present" text under a role/degree.
   Read-only mode just prints the formatted string. Editable mode swaps
   it for two compact <input type="month"> fields plus a "Present"
   checkbox, so the dates on the live preview are actually clickable —
   not just decorative text. */
function DateRangeEdit({ pathPrefix, start, end, onEdit, editable, style, separator = " – " }) {
  if (!editable || !onEdit) {
    const text = [formatMonth(start), formatMonth(end)].filter(Boolean).join(separator);
    return text ? <span style={style}>{text}</span> : null;
  }
  const isPresent = end === "Present";
  return (
    <span
      className="date-range-edit"
      style={{ ...style, display: "inline-flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" }}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="month"
        value={start || ""}
        onChange={(e) => onEdit(`${pathPrefix}.start`, e.target.value)}
        className="inline-date-input"
        title="Start date"
      />
      <span style={{ opacity: 0.6 }}>{separator.trim()}</span>
      {isPresent ? (
        <button
          type="button"
          className="inline-date-present"
          onClick={() => onEdit(`${pathPrefix}.end`, "")}
          title="Currently here — click to set an end date"
        >
          Present
        </button>
      ) : (
        <input
          type="month"
          value={end || ""}
          onChange={(e) => onEdit(`${pathPrefix}.end`, e.target.value)}
          className="inline-date-input"
          title="End date"
        />
      )}
      <label className="inline-present-toggle" title="I currently do this">
        <input
          type="checkbox"
          checked={isPresent}
          onChange={(e) => onEdit(`${pathPrefix}.end`, e.target.checked ? "Present" : "")}
        />
        <span>Now</span>
      </label>
    </span>
  );
}

/* SKILL BAR — the little proficiency bar next to a skill name on the
   Modern/Creative sidebars. Read-only: just a static bar. Editable:
   clicking it cycles Basic → Intermediate → Expert → Basic, so the
   level can be tuned straight from the live preview. */
const SKILL_LEVEL_CYCLE = ["basic", "intermediate", "expert"];
function nextSkillLevel(level) {
  const idx = SKILL_LEVEL_CYCLE.indexOf(level);
  return SKILL_LEVEL_CYCLE[(idx + 1) % SKILL_LEVEL_CYCLE.length];
}
function SkillBar({ s, path, onEdit, editable, trackColor, fillColor }) {
  const level = skillObj(s).level;
  const width = skillBarWidth(s);
  return (
    <div
      onClick={editable && onEdit ? () => onEdit(`${path}.level`, nextSkillLevel(level)) : undefined}
      title={editable ? `Level: ${level} — click to change` : undefined}
      style={{ height: "4px", borderRadius: "2px", background: trackColor, cursor: editable ? "pointer" : "default" }}
    >
      <div style={{ height: "100%", width: `${width}%`, borderRadius: "2px", background: fillColor, transition: "width .15s ease" }} />
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* MODERN — dark sidebar with photo, contact, and skill bars         */
/* ---------------------------------------------------------------- */
function ModernTemplate({ d, title, phone, editable, onEdit, onTitleEdit, onPhotoClick, accent }) {
  const F = "'Calibri', 'Helvetica Neue', Arial, sans-serif";
  accent = accent || "#4338ca";
  return (
    <div style={{ width: "794px", minHeight: "1123px", display: "flex", background: "#fff", fontFamily: F, boxSizing: "border-box" }}>
      {/* Sidebar */}
      <div style={{ width: "270px", flexShrink: 0, background: "#1e1b3a", color: "#fff", padding: "40px 26px" }}>
        <div
          onClick={editable && onPhotoClick ? onPhotoClick : undefined}
          title={editable ? "Click to change photo" : undefined}
          style={{
            width: "104px", height: "104px", borderRadius: "50%", overflow: "hidden",
            background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px", border: `3px solid ${d.photo ? "rgba(255,255,255,0.25)" : "rgba(248,113,113,0.6)"}`,
            cursor: editable ? "pointer" : "default", position: "relative",
          }}>
          {d.photo
            ? <img src={d.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontSize: "30px", fontWeight: 700, color: "#fff" }}>{initials(d.full_name) || "?"}</span>}
          {editable && (
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity .15s" }} className="photo-hover-overlay">
              <span style={{ fontSize: "10px", color: "#fff", fontWeight: 700 }}>{d.photo ? "Change" : "Add photo"}</span>
            </div>
          )}
        </div>

        <div style={{ marginBottom: "26px" }}>
          <p style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "1.4px", color: "#a5b4fc", textTransform: "uppercase", margin: "0 0 8px" }}>Contact</p>
          <p style={{ fontSize: "11px", margin: "0 0 6px", wordBreak: "break-word", color: "#e0e0f5" }}>
            <Edit path="email" value={d.email} onEdit={onEdit} editable={editable} placeholder="you@email.com" />
          </p>
          <p style={{ fontSize: "11px", margin: "0 0 6px", color: "#e0e0f5" }}>
            <Edit path="phone" value={phone} onEdit={onEdit} editable={editable} placeholder="+1 555 0100" />
          </p>
          <p style={{ fontSize: "11px", margin: "0 0 6px", color: "#e0e0f5" }}>
            <Edit path="address" value={d.address} onEdit={onEdit} editable={editable} placeholder="City, Country" />
          </p>
          {d.links?.map((l, i) => l.url && <p key={i} style={{ fontSize: "11px", margin: "0 0 6px", color: "#e0e0f5", wordBreak: "break-word" }}>{l.url}</p>)}
        </div>

        {(d.skills?.length > 0 || editable) && (
          <div style={{ marginBottom: "26px" }}>
            <p style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "1.4px", color: "#a5b4fc", textTransform: "uppercase", margin: "0 0 10px" }}>Skills</p>
            {d.skills?.map((s, i) => (
              <div key={i} style={{ marginBottom: "9px" }}>
                <p style={{ fontSize: "11px", margin: "0 0 4px", color: "#f1f1fa" }}>
                  <Edit path={`skills.${i}.name`} value={skillName(s)} onEdit={onEdit} editable={editable} />
                </p>
                <SkillBar s={s} path={`skills.${i}`} onEdit={onEdit} editable={editable} trackColor="rgba(255,255,255,0.15)" fillColor="#818cf8" />
              </div>
            ))}
          </div>
        )}

        {d.education?.length > 0 && (
          <div>
            <p style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "1.4px", color: "#a5b4fc", textTransform: "uppercase", margin: "0 0 10px" }}>Education</p>
            {d.education.map((ed, i) => (
              <div key={i} style={{ marginBottom: "12px" }}>
                <p style={{ fontSize: "11.5px", fontWeight: 700, margin: 0, color: "#fff" }}>
                  <Edit path={`education.${i}.degree`} value={ed.degree} onEdit={onEdit} editable={editable} />
                </p>
                <p style={{ fontSize: "10.5px", margin: "2px 0 0", color: "#c7c9f0" }}>
                  <Edit path={`education.${i}.school`} value={ed.school} onEdit={onEdit} editable={editable} />
                </p>
                <p style={{ fontSize: "10px", margin: "1px 0 0", color: "#9294c9" }}><DateRangeEdit pathPrefix={`education.${i}`} start={ed.start} end={ed.end} onEdit={onEdit} editable={editable} /></p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: "40px 38px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 800, margin: 0, color: "#111827" }}>
          <Edit path="full_name" value={d.full_name} onEdit={onEdit} editable={editable} placeholder="Your Name" />
        </h1>
        <p style={{ fontSize: "13px", fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: "0.6px", margin: "4px 0 22px" }}>
          <Edit path="__title" value={title} onEdit={onTitleEdit} editable={editable} placeholder="Resume" />
        </p>

        {(d.summary || editable) && (
          <div style={{ marginBottom: "22px" }}>
            <p style={{ fontSize: "12.5px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: accent, margin: "0 0 8px" }}>Profile</p>
            <p style={{ fontSize: "12.5px", lineHeight: 1.6, color: "#374151", margin: 0 }}>
              <Edit path="summary" value={d.summary} onEdit={onEdit} editable={editable} multiline placeholder="A short professional summary…" />
            </p>
          </div>
        )}

        {d.experience?.length > 0 && (
          <div style={{ marginBottom: "22px" }}>
            <p style={{ fontSize: "12.5px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: accent, margin: "0 0 12px" }}>Employment History</p>
            {d.experience.map((exp, i) => (
              <div key={i} style={{ marginBottom: "14px", position: "relative", paddingLeft: "14px", borderLeft: "2px solid #e0e0f5" }}>
                <div style={{ position: "absolute", left: "-5px", top: "3px", width: "8px", height: "8px", borderRadius: "50%", background: accent }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#111827" }}>
                    <Edit path={`experience.${i}.role`} value={exp.role} onEdit={onEdit} editable={editable} placeholder="Role" />
                    {(exp.company || editable) && <>, <Edit path={`experience.${i}.company`} value={exp.company} onEdit={onEdit} editable={editable} placeholder="Company" /></>}
                  </span>
                  <span style={{ fontSize: "11px", color: "#6b7280", whiteSpace: "nowrap" }}><DateRangeEdit pathPrefix={`experience.${i}`} start={exp.start} end={exp.end} onEdit={onEdit} editable={editable} /></span>
                </div>
                {(exp.description || editable) && (
                  <p style={{ fontSize: "12px", lineHeight: 1.6, color: "#4b5563", margin: "4px 0 0" }}>
                    <Edit path={`experience.${i}.description`} value={exp.description} onEdit={onEdit} editable={editable} multiline placeholder="What did you do in this role?" />
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {d.projects?.length > 0 && (
          <div>
            <p style={{ fontSize: "12.5px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: accent, margin: "0 0 10px" }}>Projects</p>
            {d.projects.map((p, i) => (
              <div key={i} style={{ marginBottom: "10px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>
                  <Edit path={`projects.${i}.name`} value={p.name} onEdit={onEdit} editable={editable} placeholder="Project name" />
                </span>
                {(p.description || editable) && (
                  <p style={{ fontSize: "12px", lineHeight: 1.6, color: "#4b5563", margin: "2px 0 0" }}>
                    <Edit path={`projects.${i}.description`} value={p.description} onEdit={onEdit} editable={editable} multiline placeholder="What was it, what did it do?" />
                  </p>
                )}
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
function ClassicTemplate({ d, title, phone, editable, onEdit, accent }) {
  const F = "'Times New Roman', Georgia, serif";
  accent = accent || "#000";
  const sec = (label) => (
    <p style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: accent, margin: "18px 0 8px", borderBottom: `1px solid ${accent}`, paddingBottom: "3px" }}>{label}</p>
  );
  return (
    <div style={{ width: "794px", minHeight: "1123px", background: "#fff", color: "#000", fontFamily: F, padding: "50px 60px", boxSizing: "border-box" }}>
      <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0, textAlign: "center", letterSpacing: "0.5px", textTransform: "uppercase" }}>
        <Edit path="full_name" value={d.full_name} onEdit={onEdit} editable={editable} placeholder="Your Name" />
      </h1>
      <p style={{ fontSize: "11px", textAlign: "center", margin: "6px 0 0" }}>
        <Edit path="email" value={d.email} onEdit={onEdit} editable={editable} placeholder="you@email.com" />
        {"  |  "}
        <Edit path="phone" value={phone} onEdit={onEdit} editable={editable} placeholder="+1 555 0100" />
        {"  |  "}
        <Edit path="address" value={d.address} onEdit={onEdit} editable={editable} placeholder="City, Country" />
      </p>
      <div style={{ borderTop: `1.5px solid ${accent}`, margin: "14px 0 0" }} />

      {(d.summary || editable) && (
        <div>
          {sec("Summary")}
          <p style={{ fontSize: "12px", lineHeight: 1.55, margin: 0 }}>
            <Edit path="summary" value={d.summary} onEdit={onEdit} editable={editable} multiline placeholder="A short professional summary…" />
          </p>
        </div>
      )}

      {d.experience?.length > 0 && (
        <div>
          {sec("Professional Experience")}
          {d.experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12.5px", fontWeight: 700 }}>
                  <Edit path={`experience.${i}.role`} value={exp.role} onEdit={onEdit} editable={editable} placeholder="Role" />
                  {(exp.company || editable) && <>, <Edit path={`experience.${i}.company`} value={exp.company} onEdit={onEdit} editable={editable} placeholder="Company" /></>}
                </span>
                <span style={{ fontSize: "11px" }}><DateRangeEdit pathPrefix={`experience.${i}`} start={exp.start} end={exp.end} onEdit={onEdit} editable={editable} separator=" - " /></span>
              </div>
              {(exp.description || editable) && (
                <p style={{ fontSize: "12px", lineHeight: 1.5, margin: "3px 0 0" }}>
                  <Edit path={`experience.${i}.description`} value={exp.description} onEdit={onEdit} editable={editable} multiline placeholder="What did you do in this role?" />
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {d.education?.length > 0 && (
        <div>
          {sec("Education")}
          {d.education.map((ed, i) => (
            <div key={i} style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "12.5px" }}>
                <strong><Edit path={`education.${i}.degree`} value={ed.degree} onEdit={onEdit} editable={editable} placeholder="Degree" /></strong>
                {(ed.school || editable) && <>, <Edit path={`education.${i}.school`} value={ed.school} onEdit={onEdit} editable={editable} placeholder="School" /></>}
              </span>
              <span style={{ fontSize: "11px" }}><DateRangeEdit pathPrefix={`education.${i}`} start={ed.start} end={ed.end} onEdit={onEdit} editable={editable} separator=" - " /></span>
            </div>
          ))}
        </div>
      )}

      {d.projects?.length > 0 && (
        <div>
          {sec("Projects")}
          {d.projects.map((p, i) => (
            <div key={i} style={{ marginBottom: "8px" }}>
              <span style={{ fontSize: "12.5px", fontWeight: 700 }}>
                <Edit path={`projects.${i}.name`} value={p.name} onEdit={onEdit} editable={editable} placeholder="Project name" />
              </span>
              {(p.description || editable) && (
                <p style={{ fontSize: "12px", lineHeight: 1.5, margin: "2px 0 0" }}>
                  <Edit path={`projects.${i}.description`} value={p.description} onEdit={onEdit} editable={editable} multiline placeholder="What was it, what did it do?" />
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {(d.skills?.length > 0 || editable) && (
        <div>
          {sec("Skills")}
          <p style={{ fontSize: "12px", lineHeight: 1.6, margin: 0 }}>
            {d.skills?.map((s, i) => (
              <span key={i}>
                <Edit path={`skills.${i}.name`} value={skillName(s)} onEdit={onEdit} editable={editable} />
                {i < d.skills.length - 1 ? ", " : ""}
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* MINIMAL — elegant serif headings, hairline rules, lots of air     */
/* ---------------------------------------------------------------- */
function MinimalTemplate({ d, title, phone, editable, onEdit, onTitleEdit, accent }) {
  const serif = "'Georgia', 'Times New Roman', serif";
  const sans = "'Helvetica Neue', Arial, sans-serif";
  accent = accent || "#9ca3af";
  const sec = (label) => (
    <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "2.2px", color: accent, margin: "0 0 10px", fontFamily: sans }}>{label}</p>
  );
  return (
    <div style={{ width: "794px", minHeight: "1123px", background: "#fff", color: "#1f2937", fontFamily: sans, padding: "56px 64px", boxSizing: "border-box" }}>
      <h1 style={{ fontSize: "32px", fontWeight: 400, margin: 0, color: "#111827", fontFamily: serif, letterSpacing: "0.4px" }}>
        <Edit path="full_name" value={d.full_name} onEdit={onEdit} editable={editable} placeholder="Your Name" />
      </h1>
      <p style={{ fontSize: "12px", color: "#6b7280", margin: "6px 0 16px", letterSpacing: "0.5px" }}>
        <Edit path="__title" value={title} onEdit={onTitleEdit} editable={editable} placeholder="Resume" />
      </p>
      <p style={{ fontSize: "11.5px", color: "#6b7280", margin: 0 }}>
        <Edit path="email" value={d.email} onEdit={onEdit} editable={editable} placeholder="you@email.com" />
        {"   ·   "}
        <Edit path="phone" value={phone} onEdit={onEdit} editable={editable} placeholder="+1 555 0100" />
        {"   ·   "}
        <Edit path="address" value={d.address} onEdit={onEdit} editable={editable} placeholder="City, Country" />
      </p>
      <div style={{ borderTop: "1px solid #e5e7eb", margin: "22px 0" }} />

      {(d.summary || editable) && (
        <div style={{ marginBottom: "26px" }}>
          <p style={{ fontSize: "13px", lineHeight: 1.75, color: "#374151", margin: 0, fontFamily: serif }}>
            <Edit path="summary" value={d.summary} onEdit={onEdit} editable={editable} multiline placeholder="A short professional summary…" />
          </p>
        </div>
      )}

      {d.experience?.length > 0 && (
        <div style={{ marginBottom: "26px" }}>
          {sec("Experience")}
          {d.experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827", fontFamily: serif }}>
                  <Edit path={`experience.${i}.role`} value={exp.role} onEdit={onEdit} editable={editable} placeholder="Role" />
                </span>
                <span style={{ fontSize: "10.5px", color: "#9ca3af" }}><DateRangeEdit pathPrefix={`experience.${i}`} start={exp.start} end={exp.end} onEdit={onEdit} editable={editable} separator=" — " /></span>
              </div>
              {(exp.company || editable) && (
                <p style={{ fontSize: "11.5px", color: "#9ca3af", margin: "1px 0 4px" }}>
                  <Edit path={`experience.${i}.company`} value={exp.company} onEdit={onEdit} editable={editable} placeholder="Company" />
                </p>
              )}
              {(exp.description || editable) && (
                <p style={{ fontSize: "12.5px", lineHeight: 1.65, color: "#4b5563", margin: 0 }}>
                  <Edit path={`experience.${i}.description`} value={exp.description} onEdit={onEdit} editable={editable} multiline placeholder="What did you do in this role?" />
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: "40px" }}>
        {(d.education?.length > 0 || editable) && (
          <div style={{ flex: 1 }}>
            {sec("Education")}
            {d.education?.map((ed, i) => (
              <div key={i} style={{ marginBottom: "10px" }}>
                <p style={{ fontSize: "12.5px", fontWeight: 600, color: "#111827", margin: 0, fontFamily: serif }}>
                  <Edit path={`education.${i}.degree`} value={ed.degree} onEdit={onEdit} editable={editable} placeholder="Degree" />
                </p>
                <p style={{ fontSize: "11px", color: "#9ca3af", margin: "1px 0 0" }}>
                  <Edit path={`education.${i}.school`} value={ed.school} onEdit={onEdit} editable={editable} placeholder="School" />
                </p>
              </div>
            ))}
          </div>
        )}
        {(d.skills?.length > 0 || editable) && (
          <div style={{ flex: 1 }}>
            {sec("Skills")}
            <p style={{ fontSize: "12px", lineHeight: 1.9, color: "#4b5563", margin: 0 }}>
              {d.skills?.map((s, i) => (
                <span key={i}>
                  <Edit path={`skills.${i}.name`} value={skillName(s)} onEdit={onEdit} editable={editable} />
                  {i < d.skills.length - 1 ? " · " : ""}
                </span>
              ))}
            </p>
          </div>
        )}
      </div>

      {d.projects?.length > 0 && (
        <div style={{ marginTop: "22px" }}>
          {sec("Projects")}
          {d.projects.map((p, i) => (
            <div key={i} style={{ marginBottom: "8px" }}>
              <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#111827", fontFamily: serif }}>
                <Edit path={`projects.${i}.name`} value={p.name} onEdit={onEdit} editable={editable} placeholder="Project name" />
              </span>
              {(p.description || editable) && (
                <p style={{ fontSize: "12px", lineHeight: 1.6, color: "#4b5563", margin: "2px 0 0" }}>
                  <Edit path={`projects.${i}.description`} value={p.description} onEdit={onEdit} editable={editable} multiline placeholder="What was it, what did it do?" />
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* CREATIVE — bold color header band with photo, two-column body     */
/* ---------------------------------------------------------------- */
function CreativeTemplate({ d, title, phone, editable, onEdit, onTitleEdit, onPhotoClick, accent }) {
  const F = "'Poppins', 'Helvetica Neue', Arial, sans-serif";
  accent = accent || "#c026d3";
  const sec = (label) => (
    <p style={{ fontSize: "11.5px", fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: accent, margin: "0 0 10px" }}>{label}</p>
  );
  return (
    <div style={{ width: "794px", minHeight: "1123px", background: "#fff", fontFamily: F, boxSizing: "border-box" }}>
      <div style={{ background: accent, padding: "36px 42px", display: "flex", alignItems: "center", gap: "22px", color: "#fff" }}>
        <div
          onClick={editable && onPhotoClick ? onPhotoClick : undefined}
          title={editable ? "Click to change photo" : undefined}
          style={{
            width: "92px", height: "92px", borderRadius: "50%", overflow: "hidden", flexShrink: 0,
            background: "rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center",
            border: `3px solid rgba(255,255,255,0.55)`, cursor: editable ? "pointer" : "default", position: "relative",
          }}>
          {d.photo
            ? <img src={d.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontSize: "26px", fontWeight: 700, color: "#fff" }}>{initials(d.full_name) || "?"}</span>}
          {editable && (
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0 }} className="photo-hover-overlay">
              <span style={{ fontSize: "10px", color: "#fff", fontWeight: 700 }}>{d.photo ? "Change" : "Add photo"}</span>
            </div>
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: "26px", fontWeight: 800, margin: 0 }}>
            <Edit path="full_name" value={d.full_name} onEdit={onEdit} editable={editable} placeholder="Your Name" />
          </h1>
          <p style={{ fontSize: "12.5px", fontWeight: 600, margin: "4px 0 10px", color: "rgba(255,255,255,0.9)" }}>
            <Edit path="__title" value={title} onEdit={onTitleEdit} editable={editable} placeholder="Resume" />
          </p>
          <p style={{ fontSize: "11px", margin: 0, color: "rgba(255,255,255,0.92)" }}>
            <Edit path="email" value={d.email} onEdit={onEdit} editable={editable} placeholder="you@email.com" />
            {"   ·   "}
            <Edit path="phone" value={phone} onEdit={onEdit} editable={editable} placeholder="+1 555 0100" />
            {"   ·   "}
            <Edit path="address" value={d.address} onEdit={onEdit} editable={editable} placeholder="City, Country" />
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0" }}>
        <div style={{ flex: "0 0 240px", background: "#faf5ff", padding: "28px 26px", boxSizing: "border-box" }}>
          {(d.skills?.length > 0 || editable) && (
            <div style={{ marginBottom: "24px" }}>
              {sec("Skills")}
              {d.skills?.map((s, i) => (
                <div key={i} style={{ marginBottom: "9px" }}>
                  <p style={{ fontSize: "11px", margin: "0 0 4px", color: "#374151" }}>
                    <Edit path={`skills.${i}.name`} value={skillName(s)} onEdit={onEdit} editable={editable} />
                  </p>
                  <SkillBar s={s} path={`skills.${i}`} onEdit={onEdit} editable={editable} trackColor="#ecdffa" fillColor={accent} />
                </div>
              ))}
            </div>
          )}
          {d.education?.length > 0 && (
            <div>
              {sec("Education")}
              {d.education.map((ed, i) => (
                <div key={i} style={{ marginBottom: "12px" }}>
                  <p style={{ fontSize: "11.5px", fontWeight: 700, margin: 0, color: "#111827" }}>
                    <Edit path={`education.${i}.degree`} value={ed.degree} onEdit={onEdit} editable={editable} />
                  </p>
                  <p style={{ fontSize: "10.5px", margin: "2px 0 0", color: "#6b7280" }}>
                    <Edit path={`education.${i}.school`} value={ed.school} onEdit={onEdit} editable={editable} />
                  </p>
                  <p style={{ fontSize: "10px", margin: "1px 0 0", color: "#9ca3af" }}><DateRangeEdit pathPrefix={`education.${i}`} start={ed.start} end={ed.end} onEdit={onEdit} editable={editable} /></p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 1, padding: "28px 32px", minWidth: 0 }}>
          {(d.summary || editable) && (
            <div style={{ marginBottom: "22px" }}>
              {sec("Profile")}
              <p style={{ fontSize: "12.5px", lineHeight: 1.6, color: "#374151", margin: 0 }}>
                <Edit path="summary" value={d.summary} onEdit={onEdit} editable={editable} multiline placeholder="A short professional summary…" />
              </p>
            </div>
          )}
          {d.experience?.length > 0 && (
            <div style={{ marginBottom: "22px" }}>
              {sec("Experience")}
              {d.experience.map((exp, i) => (
                <div key={i} style={{ marginBottom: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>
                      <Edit path={`experience.${i}.role`} value={exp.role} onEdit={onEdit} editable={editable} placeholder="Role" />
                    </span>
                    <span style={{ fontSize: "10.5px", color: "#9ca3af" }}><DateRangeEdit pathPrefix={`experience.${i}`} start={exp.start} end={exp.end} onEdit={onEdit} editable={editable} /></span>
                  </div>
                  {(exp.company || editable) && (
                    <p style={{ fontSize: "11.5px", color: accent, fontWeight: 600, margin: "1px 0 4px" }}>
                      <Edit path={`experience.${i}.company`} value={exp.company} onEdit={onEdit} editable={editable} placeholder="Company" />
                    </p>
                  )}
                  {(exp.description || editable) && (
                    <p style={{ fontSize: "12px", lineHeight: 1.6, color: "#4b5563", margin: 0 }}>
                      <Edit path={`experience.${i}.description`} value={exp.description} onEdit={onEdit} editable={editable} multiline placeholder="What did you do in this role?" />
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          {d.projects?.length > 0 && (
            <div>
              {sec("Projects")}
              {d.projects.map((p, i) => (
                <div key={i} style={{ marginBottom: "10px" }}>
                  <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#111827" }}>
                    <Edit path={`projects.${i}.name`} value={p.name} onEdit={onEdit} editable={editable} placeholder="Project name" />
                  </span>
                  {(p.description || editable) && (
                    <p style={{ fontSize: "12px", lineHeight: 1.6, color: "#4b5563", margin: "2px 0 0" }}>
                      <Edit path={`projects.${i}.description`} value={p.description} onEdit={onEdit} editable={editable} multiline placeholder="What was it, what did it do?" />
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* EXECUTIVE — elegant banner header, two-column body, no photo      */
/* ---------------------------------------------------------------- */
function ExecutiveTemplate({ d, title, phone, editable, onEdit, onTitleEdit, accent }) {
  const serif = "'Georgia', 'Times New Roman', serif";
  const sans = "'Helvetica Neue', Arial, sans-serif";
  accent = accent || "#4f46e5";
  const sec = (label) => (
    <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1.6px", textTransform: "uppercase", color: accent, margin: "0 0 10px", fontFamily: sans, borderBottom: `2px solid ${accent}`, paddingBottom: "5px" }}>{label}</p>
  );
  return (
    <div style={{ width: "794px", minHeight: "1123px", background: "#fff", color: "#1f2937", fontFamily: sans, boxSizing: "border-box" }}>
      <div style={{ padding: "42px 56px 26px", borderBottom: `4px solid ${accent}` }}>
        <h1 style={{ fontSize: "34px", fontWeight: 700, margin: 0, color: "#111827", fontFamily: serif }}>
          <Edit path="full_name" value={d.full_name} onEdit={onEdit} editable={editable} placeholder="Your Name" />
        </h1>
        <p style={{ fontSize: "13.5px", fontWeight: 600, color: accent, margin: "6px 0 12px", letterSpacing: "0.4px" }}>
          <Edit path="__title" value={title} onEdit={onTitleEdit} editable={editable} placeholder="Resume" />
        </p>
        <p style={{ fontSize: "11.5px", color: "#6b7280", margin: 0 }}>
          <Edit path="email" value={d.email} onEdit={onEdit} editable={editable} placeholder="you@email.com" />
          {"   ·   "}
          <Edit path="phone" value={phone} onEdit={onEdit} editable={editable} placeholder="+1 555 0100" />
          {"   ·   "}
          <Edit path="address" value={d.address} onEdit={onEdit} editable={editable} placeholder="City, Country" />
        </p>
      </div>

      <div style={{ display: "flex", gap: "36px", padding: "28px 56px 50px" }}>
        <div style={{ flex: "0 0 210px" }}>
          {(d.skills?.length > 0 || editable) && (
            <div style={{ marginBottom: "26px" }}>
              {sec("Skills")}
              {d.skills?.map((s, i) => (
                <p key={i} style={{ fontSize: "12px", margin: "0 0 8px", color: "#374151" }}>
                  <Edit path={`skills.${i}.name`} value={skillName(s)} onEdit={onEdit} editable={editable} />
                </p>
              ))}
            </div>
          )}
          {d.education?.length > 0 && (
            <div>
              {sec("Education")}
              {d.education.map((ed, i) => (
                <div key={i} style={{ marginBottom: "14px" }}>
                  <p style={{ fontSize: "12px", fontWeight: 700, margin: 0, color: "#111827" }}>
                    <Edit path={`education.${i}.degree`} value={ed.degree} onEdit={onEdit} editable={editable} />
                  </p>
                  <p style={{ fontSize: "11px", margin: "2px 0 0", color: "#6b7280" }}>
                    <Edit path={`education.${i}.school`} value={ed.school} onEdit={onEdit} editable={editable} />
                  </p>
                  <p style={{ fontSize: "10.5px", margin: "1px 0 0", color: "#9ca3af" }}><DateRangeEdit pathPrefix={`education.${i}`} start={ed.start} end={ed.end} onEdit={onEdit} editable={editable} /></p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {(d.summary || editable) && (
            <div style={{ marginBottom: "24px" }}>
              {sec("Executive Summary")}
              <p style={{ fontSize: "13px", lineHeight: 1.7, color: "#374151", margin: 0, fontFamily: serif }}>
                <Edit path="summary" value={d.summary} onEdit={onEdit} editable={editable} multiline placeholder="A short professional summary…" />
              </p>
            </div>
          )}
          {d.experience?.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              {sec("Experience")}
              {d.experience.map((exp, i) => (
                <div key={i} style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#111827", fontFamily: serif }}>
                      <Edit path={`experience.${i}.role`} value={exp.role} onEdit={onEdit} editable={editable} placeholder="Role" />
                    </span>
                    <span style={{ fontSize: "10.5px", color: "#9ca3af" }}><DateRangeEdit pathPrefix={`experience.${i}`} start={exp.start} end={exp.end} onEdit={onEdit} editable={editable} /></span>
                  </div>
                  {(exp.company || editable) && (
                    <p style={{ fontSize: "11.5px", color: accent, fontWeight: 600, margin: "1px 0 4px" }}>
                      <Edit path={`experience.${i}.company`} value={exp.company} onEdit={onEdit} editable={editable} placeholder="Company" />
                    </p>
                  )}
                  {(exp.description || editable) && (
                    <p style={{ fontSize: "12.5px", lineHeight: 1.65, color: "#4b5563", margin: 0 }}>
                      <Edit path={`experience.${i}.description`} value={exp.description} onEdit={onEdit} editable={editable} multiline placeholder="What did you do in this role?" />
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          {d.projects?.length > 0 && (
            <div>
              {sec("Projects")}
              {d.projects.map((p, i) => (
                <div key={i} style={{ marginBottom: "10px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#111827", fontFamily: serif }}>
                    <Edit path={`projects.${i}.name`} value={p.name} onEdit={onEdit} editable={editable} placeholder="Project name" />
                  </span>
                  {(p.description || editable) && (
                    <p style={{ fontSize: "12px", lineHeight: 1.6, color: "#4b5563", margin: "2px 0 0" }}>
                      <Edit path={`projects.${i}.description`} value={p.description} onEdit={onEdit} editable={editable} multiline placeholder="What was it, what did it do?" />
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Preset accent palettes offered in the color picker — a few per template
   mood so "customizable colors" means real, distinct looks, not just a
   single hue slider. */
export const ACCENT_PRESETS = [
  { key: "indigo", label: "Indigo", value: "#4338ca" },
  { key: "violet", label: "Violet", value: "#7c3aed" },
  { key: "magenta", label: "Magenta", value: "#c026d3" },
  { key: "teal", label: "Teal", value: "#0d9488" },
  { key: "cyan", label: "Cyan", value: "#0891b2" },
  { key: "amber", label: "Amber", value: "#d97706" },
  { key: "rose", label: "Rose", value: "#e11d48" },
  { key: "forest", label: "Forest", value: "#166534" },
  { key: "slate", label: "Slate (B&W)", value: "#1e293b" },
];

/* Writes a value at a dotted path like "experience.2.role" or "skills.0.name"
   into a fresh copy of `data`, without mutating the original. Used by the
   editable live-preview so clicking straight on the template updates the
   same state the sidebar form reads from. */
export function setDataAtPath(data, path, value) {
  const parts = path.split(".");
  const next = Array.isArray(data) ? [...data] : { ...data };
  let cursor = next;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = /^\d+$/.test(parts[i]) ? Number(parts[i]) : parts[i];
    const nextKey = parts[i + 1];
    const isArrayNext = /^\d+$/.test(nextKey);
    const existing = cursor[key];
    cursor[key] = Array.isArray(existing) ? [...existing] : (existing && typeof existing === "object" ? { ...existing } : (isArrayNext ? [] : {}));
    cursor = cursor[key];
  }
  const lastKey = /^\d+$/.test(parts[parts.length - 1]) ? Number(parts[parts.length - 1]) : parts[parts.length - 1];
  cursor[lastKey] = value;
  return next;
}

const ResumePDFTemplate = forwardRef(function ResumePDFTemplate({ resume, editable = false, onDataChange, onTitleChange, onPhotoClick }, ref) {
  const d = resume?.data || {};
  const variant = resume?.template_key || "modern";
  const phone = d.phone ? `${d.phone_country_code || ""} ${d.phone}`.trim() : "";
  const accent = d.accent_color || null;

  const handleEdit = useCallback((path, value) => {
    if (!onDataChange) return;
    if (path === "phone") {
      // phone is rendered with its country code prefixed — strip that back off
      const prefix = d.phone_country_code || "";
      const clean = prefix && value.startsWith(prefix) ? value.slice(prefix.length).trim() : value;
      onDataChange(setDataAtPath(d, "phone", clean));
      return;
    }
    onDataChange(setDataAtPath(d, path, value));
  }, [onDataChange, d]);

  const props = {
    d, title: resume?.title, phone, accent,
    editable, onEdit: handleEdit,
    onTitleEdit: (_path, value) => onTitleChange && onTitleChange(value),
    onPhotoClick,
  };

  return (
    <div ref={ref} className={editable ? "resume-template-editable" : ""}>
      {variant === "classic" && <ClassicTemplate {...props} />}
      {variant === "minimal" && <MinimalTemplate {...props} />}
      {variant === "creative" && <CreativeTemplate {...props} />}
      {variant === "executive" && <ExecutiveTemplate {...props} />}
      {(variant === "modern" || !["classic", "minimal", "creative", "executive"].includes(variant)) && <ModernTemplate {...props} />}
    </div>
  );
});

export default ResumePDFTemplate;
