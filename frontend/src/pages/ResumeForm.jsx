import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import * as api from "../api/client";
import { IconUser, IconStar, IconBriefcase, IconCap, IconFolder, IconSpark, IconLayers, IconChart, IconTarget, IconClipboard, IconCheck } from "../icons.jsx";
import { COUNTRY_CODES } from "../utils/countryCodes";
import { isValidEmail } from "../utils/validation";
import ResumePDFTemplate, { ACCENT_PRESETS } from "./ResumePDFTemplate.jsx";

const emptyData = {
  full_name: "",
  email: "",
  phone: "",
  phone_country_code: "+1",
  address: "",
  photo: "",
  accent_color: "#4338ca",
  summary: "",
  skills: [],
  experience: [],
  education: [],
  projects: [],
};

const SKILL_LEVELS = [
  { key: "basic", label: "Basic" },
  { key: "intermediate", label: "Intermediate" },
  { key: "expert", label: "Expert" },
];

// Skills can be an old plain string or the current { name, level } shape —
// normalize once so the editor works with both saved formats.
function normalizeSkill(s) {
  if (s && typeof s === "object") return { name: s.name || "", level: s.level || "intermediate" };
  return { name: s || "", level: "intermediate" };
}

const ATS_TEMPLATES = [
  { key: "modern", name: "Modern", blurb: "Two-column, dark photo sidebar with skill bars." },
  { key: "classic", name: "Classic ATS", blurb: "Pure black & white, maximum ATS compatibility." },
  { key: "minimal", name: "Minimal", blurb: "Compact spacing, subtle dividers." },
  { key: "creative", name: "Creative", blurb: "Bold color header with photo, great for design/marketing roles." },
  { key: "executive", name: "Executive", blurb: "Elegant banner header, two-column body for senior roles." },
];

const TABS = [
  { key: "personal", label: "Personal", icon: IconUser },
  { key: "skills", label: "Skills", icon: IconStar },
  { key: "experience", label: "Experience", icon: IconBriefcase },
  { key: "education", label: "Education", icon: IconCap },
  { key: "projects", label: "Projects", icon: IconFolder },
];

/* ---------------- Starter templates ---------------- */
const TEMPLATES = [
  {
    key: "software-engineer",
    name: "Software Engineer",
    blurb: "Backend/frontend roles, built around impact-driven bullet points.",
    icon: IconBriefcase,
    title: "Software Engineer Resume",
    accent: "#4338ca",
    persona: {
      name: "Daniel Reyes", title: "Software Engineer Resume", contact: "daniel.reyes@mail.com · Austin, TX", photo: false,
      exp: { role: "Software Engineer", company: "Tech Company", line: "Built REST APIs serving 100k+ daily requests." },
      edu: "BSc Computer Science — University Name", skills: ["Python", "React", "SQL", "Docker"],
    },
    data: {
      ...emptyData,
      full_name: "Daniel Reyes",
      email: "daniel.reyes@mail.com",
      phone: "512 555 0148",
      address: "Austin, TX",
      summary: "Results-driven software engineer with 5+ years of experience building scalable web applications and REST APIs. Comfortable owning features end-to-end, from design through deployment and monitoring.",
      skills: ["Python", "JavaScript", "React", "Node.js", "SQL", "Git", "Docker", "AWS"],
      experience: [
        { company: "Tech Company", role: "Software Engineer", start: "2023-01", end: "Present", description: "Built and maintained REST APIs serving 100k+ daily requests. Partnered with product and design to ship features on schedule. Reduced average API response time by 35% through query optimization and caching." },
        { company: "StartUp Labs", role: "Junior Developer", start: "2021-06", end: "2022-12", description: "Developed internal tooling that cut manual QA time by 20 hours a week. Wrote unit and integration tests, raising code coverage from 40% to 85%." },
      ],
      education: [{ school: "University Name", degree: "BSc Computer Science", start: "2019", end: "2023" }],
      projects: [
        { name: "Personal Portfolio", link: "", description: "Designed and built a portfolio site to showcase side projects and case studies, deployed with CI/CD on Vercel." },
        { name: "Task Tracker API", link: "", description: "Open-source REST API for task management with JWT auth, rate limiting, and full test coverage." },
      ],
    },
  },
  {
    key: "marketing",
    name: "Marketing Professional",
    blurb: "Campaign and growth-focused, with room for measurable results.",
    icon: IconSpark,
    title: "Marketing Resume",
    accent: "#c026d3",
    persona: {
      name: "Priya Nair", title: "Marketing Resume", contact: "priya.nair@mail.com · Chicago, IL", photo: true,
      exp: { role: "Marketing Specialist", company: "Brand Co.", line: "Grew organic traffic 40% year over year." },
      edu: "BA Marketing — University Name", skills: ["SEO", "Campaigns", "Analytics"],
    },
    data: {
      ...emptyData,
      full_name: "Priya Nair",
      email: "priya.nair@mail.com",
      phone: "312 555 0148",
      address: "Chicago, IL",
      photo: "https://i.pravatar.cc/300?img=47",
      summary: "Marketing professional with 6+ years of experience focused on growth campaigns, brand strategy, and cross-channel storytelling that turns audiences into customers.",
      skills: ["Campaign Strategy", "SEO", "Content Marketing", "Analytics", "Social Media", "Email Marketing", "A/B Testing"],
      experience: [
        { company: "Brand Co.", role: "Marketing Specialist", start: "2022-03", end: "Present", description: "Led campaigns that grew organic traffic by 40% year over year. Managed a $50k quarterly ad budget across channels and built a reporting dashboard the leadership team relies on weekly." },
        { company: "Growth Studio", role: "Marketing Coordinator", start: "2019-07", end: "2022-02", description: "Coordinated email and social campaigns for 8 client accounts, improving average open rates from 18% to 29%." },
      ],
      education: [{ school: "University Name", degree: "BA Marketing", start: "2018", end: "2022" }],
      projects: [
        { name: "Brand Refresh Campaign", link: "", description: "Directed a full brand refresh, coordinating design, copy, and launch strategy across web and social." },
        { name: "Referral Program Launch", link: "", description: "Designed and launched a customer referral program that drove 1,200+ new signups in its first quarter." },
      ],
    },
  },
  {
    key: "fresh-graduate",
    name: "Fresh Graduate",
    blurb: "Education-first layout for early-career and first job applications.",
    icon: IconCap,
    title: "Graduate Resume",
    accent: "#0891b2",
    persona: {
      name: "Ahmed Khan", title: "Graduate Resume", contact: "ahmed.khan@mail.com · Lahore, PK", photo: false,
      exp: { role: "Intern", company: "Campus Internship", line: "Supported operations with data entry & reporting." },
      edu: "BSc in Progress — 2021–2025", skills: ["Excel", "Communication", "Teamwork"],
    },
    data: {
      ...emptyData,
      full_name: "Ahmed Khan",
      email: "ahmed.khan@mail.com",
      phone: "300 1234567",
      address: "Lahore, PK",
      summary: "Recent graduate eager to apply strong analytical and communication skills to an entry-level role. Fast learner with hands-on project and internship experience.",
      skills: ["Microsoft Excel", "Communication", "Teamwork", "Problem Solving", "Data Entry", "Time Management"],
      experience: [
        { company: "Campus Internship", role: "Operations Intern", start: "2025-06", end: "2025-08", description: "Supported the operations team with data entry, reporting, and process documentation, helping reduce report turnaround time by 15%." },
        { company: "Student Society", role: "Events Volunteer", start: "2023-09", end: "2024-05", description: "Helped organize 3 campus events with 200+ attendees each, coordinating logistics and vendor communication." },
      ],
      education: [{ school: "University Name", degree: "BSc in your field", start: "2021", end: "2025" }],
      projects: [
        { name: "Capstone Project", link: "", description: "Final-year project summary — what you built, the tools used, and the measurable outcome." },
        { name: "Class Scheduling Tool", link: "", description: "Built a simple spreadsheet-based tool that helped classmates avoid timetable conflicts each semester." },
      ],
    },
  },
  {
    key: "product-designer",
    name: "Product Designer",
    blurb: "Portfolio-forward layout that leads with process and outcomes.",
    icon: IconLayers,
    title: "Product Designer Resume",
    accent: "#7c3aed",
    persona: {
      name: "Lucía Fernández", title: "Product Designer Resume", contact: "lucia.f@mail.com · Madrid, ES", photo: true,
      exp: { role: "Product Designer", company: "Studio Name", line: "Led end-to-end design for a core product surface." },
      edu: "BFA Design — University Name", skills: ["Figma", "Research", "Prototyping"],
    },
    data: {
      ...emptyData,
      full_name: "Lucía Fernández",
      email: "lucia.f@mail.com",
      phone: "612 345 678",
      address: "Madrid, ES",
      photo: "https://i.pravatar.cc/300?img=32",
      summary: "Product designer with 5+ years of experience focused on research-driven UX and clean, accessible interfaces that balance business goals with user needs.",
      skills: ["Figma", "User Research", "Prototyping", "Design Systems", "Usability Testing", "Interaction Design"],
      experience: [
        { company: "Studio Name", role: "Senior Product Designer", start: "2023-02", end: "Present", description: "Led end-to-end design for a core product surface, partnering closely with engineering and PM. Cut onboarding drop-off by 18% through a redesigned first-run experience." },
        { company: "Prior Company", role: "Product Designer", start: "2020-01", end: "2023-01", description: "Owned the design system, cutting design-to-dev handoff time in half across 4 product squads." },
      ],
      education: [{ school: "Universidad Complutense Madrid", degree: "BFA / BDes Design", start: "2018", end: "2022" }],
      projects: [
        { name: "Design System Overhaul", link: "", description: "Rebuilt the component library, cutting design-to-dev handoff time in half and improving cross-team consistency." },
        { name: "Onboarding Redesign", link: "", description: "Redesigned the new-user onboarding flow, improving activation rate by 22%." },
      ],
    },
  },
  {
    key: "data-analyst",
    name: "Data Analyst",
    blurb: "Metrics-led format that puts numbers and tools front and center.",
    icon: IconChart,
    title: "Data Analyst Resume",
    accent: "#0d9488",
    persona: {
      name: "Wei Zhang", title: "Data Analyst Resume", contact: "wei.zhang@mail.com · Toronto, CA", photo: false,
      exp: { role: "Data Analyst", company: "Company Name", line: "Built dashboards used weekly by leadership." },
      edu: "BSc Statistics — University Name", skills: ["SQL", "Python", "Tableau"],
    },
    data: {
      ...emptyData,
      full_name: "Wei Zhang",
      email: "wei.zhang@mail.com",
      phone: "416 555 0134",
      address: "Toronto, CA",
      summary: "Data analyst with 4+ years of experience turning raw data into clear, actionable business insight for cross-functional stakeholders.",
      skills: ["SQL", "Python", "Excel", "Tableau", "Statistics", "A/B Testing", "Power BI"],
      experience: [
        { company: "Company Name", role: "Data Analyst", start: "2022-05", end: "Present", description: "Built dashboards tracking key business metrics, used weekly by leadership for decisions. Automated a manual reporting process, saving the team 10+ hours a week." },
        { company: "Prior Company", role: "Junior Data Analyst", start: "2020-09", end: "2022-04", description: "Cleaned and modeled datasets from 5+ internal systems to support quarterly business reviews." },
      ],
      education: [{ school: "University of Toronto", degree: "BSc Statistics", start: "2018", end: "2022" }],
      projects: [
        { name: "Sales Forecasting Model", link: "", description: "Built a forecasting model that improved inventory planning accuracy by 15%." },
        { name: "Customer Churn Dashboard", link: "", description: "Built an interactive Tableau dashboard that helped the retention team prioritize at-risk accounts." },
      ],
    },
  },
  {
    key: "sales",
    name: "Sales & Business Dev",
    blurb: "Target-driven format that highlights quota and revenue wins.",
    icon: IconTarget,
    title: "Sales Resume",
    accent: "#d97706",
    persona: {
      name: "Marcus Bell", title: "Sales Resume", contact: "marcus.bell@mail.com · Dallas, TX", photo: false,
      exp: { role: "Account Executive", company: "Company Name", line: "Closed $500k+ in new business." },
      edu: "BBA Business — University Name", skills: ["Negotiation", "CRM", "Lead Gen"],
    },
    data: {
      ...emptyData,
      full_name: "Marcus Bell",
      email: "marcus.bell@mail.com",
      phone: "214 555 0176",
      address: "Dallas, TX",
      summary: "Sales professional with 6+ years of experience and a track record of exceeding quota and building lasting client relationships in competitive markets.",
      skills: ["Negotiation", "CRM (Salesforce)", "Lead Generation", "Account Management", "Cold Outreach", "Pipeline Management"],
      experience: [
        { company: "Company Name", role: "Account Executive", start: "2022-01", end: "Present", description: "Closed $500k+ in new business, exceeding quota by 20% for four consecutive quarters. Mentored 2 new hires on the sales process." },
        { company: "Prior Company", role: "Sales Development Rep", start: "2019-06", end: "2021-12", description: "Generated 300+ qualified leads per quarter, converting 25% into closed-won opportunities." },
      ],
      education: [{ school: "University Name", degree: "BBA / BA Business", start: "2017", end: "2021" }],
      projects: [
        { name: "Territory Expansion", link: "", description: "Opened a new regional territory from zero to a top-performing pipeline within 12 months." },
        { name: "Sales Playbook", link: "", description: "Authored the team's outbound sales playbook, now used to onboard every new rep." },
      ],
    },
  },
  {
    key: "project-manager",
    name: "Project Manager",
    blurb: "Delivery-focused layout emphasizing scope, timelines, and outcomes.",
    icon: IconClipboard,
    title: "Project Manager Resume",
    accent: "#4f46e5",
    persona: {
      name: "Sofia Rossi", title: "Project Manager Resume", contact: "sofia.rossi@mail.com · Milan, IT", photo: true,
      exp: { role: "Project Manager", company: "Company Name", line: "Delivered 5+ concurrent projects on time." },
      edu: "BSc / PMP Certified", skills: ["Agile", "Jira", "Roadmapping"],
    },
    data: {
      ...emptyData,
      full_name: "Sofia Rossi",
      email: "sofia.rossi@mail.com",
      phone: "339 555 0123",
      address: "Milan, IT",
      photo: "https://i.pravatar.cc/300?img=44",
      summary: "Project manager with 7+ years of experience skilled at keeping cross-functional teams aligned, managing scope, and shipping on time and under budget.",
      skills: ["Agile/Scrum", "Jira", "Stakeholder Management", "Roadmapping", "Risk Management", "Budgeting"],
      experience: [
        { company: "Company Name", role: "Project Manager", start: "2021-03", end: "Present", description: "Managed a portfolio of 5+ concurrent projects, delivering 95% on time and under budget. Introduced a risk-tracking process adopted company-wide." },
        { company: "Prior Company", role: "Associate Project Manager", start: "2018-04", end: "2021-02", description: "Coordinated cross-team delivery for a 12-person product squad, running sprint planning and retros." },
      ],
      education: [{ school: "Politecnico di Milano", degree: "BSc / PMP Certified", start: "2016", end: "2020" }],
      projects: [
        { name: "Platform Migration", link: "", description: "Led a company-wide platform migration across 6 teams with zero downtime." },
        { name: "PMO Process Overhaul", link: "", description: "Redesigned the project intake and reporting process, cutting status-update time by 30%." },
      ],
    },
  },
];

/* ---------------- Template picker screen (domain-specific content) ---------------- */
function TemplatePicker({ onPick, presetTemplateKey }) {
  const styleLabel = { modern: "Modern", classic: "Classic ATS", minimal: "Minimal", creative: "Creative", executive: "Executive" }[presetTemplateKey];
  const styleCycle = ["modern", "classic", "minimal", "creative", "executive"];
  return (
    <div>
      <div className="page-header">
        <div>
          <span className="eyebrow">Step 1 of 2</span>
          <h1>Choose a starting point</h1>
          {styleLabel && <p className="muted" style={{ marginTop: 4 }}>Using your <strong>{styleLabel}</strong> style — pick the content to start with.</p>}
        </div>
      </div>
      <div className="template-grid">
        <button
          type="button"
          className="template-card blank"
          onClick={() => onPick("Untitled Resume", emptyData, presetTemplateKey)}
        >
          <div className="template-preview template-preview-blank">
            <IconLayers />
          </div>
          <div className="template-card-body">
            <div className="template-icon"><IconLayers /></div>
            <div>
              <h4>Start from Scratch</h4>
              <p>A completely blank resume — build it your way.</p>
            </div>
          </div>
        </button>
        {TEMPLATES.map((t, i) => {
          const Icon = t.icon;
          const cardStyle = presetTemplateKey || styleCycle[i % styleCycle.length];
          return (
            <button
              key={t.key}
              type="button"
              className="template-card"
              style={{ animationDelay: `${(i + 1) * 0.05}s` }}
              onClick={() => onPick(t.title, t.data, cardStyle)}
            >
              <div className="template-preview template-preview-full">
                <div className="template-preview-full-scale">
                  <ResumePDFTemplate resume={{ title: t.title, data: t.data, template_key: cardStyle }} />
                </div>
                <div className="template-preview-overlay">
                  <span className="btn-primary">Customize</span>
                </div>
              </div>
              <div className="template-card-body">
                <div className="template-icon"><Icon /></div>
                <div>
                  <h4>{t.name}</h4>
                  <p>{t.blurb}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ResumeForm() {
  const { id } = useParams();
  const location = useLocation();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const presetStyle = location.state?.style; // "modern" | "classic" | "minimal", from Dashboard style cards
  const uploadedTitle = location.state?.uploadedTitle;
  const uploadedData = location.state?.uploadedData;

  const [pickedTemplate, setPickedTemplate] = useState(isEdit || Boolean(uploadedData)); // skip picker when editing or arriving from an upload
  const [activeTab, setActiveTab] = useState("personal");
  const [title, setTitle] = useState(uploadedTitle || "Untitled Resume");
  const [data, setData] = useState(uploadedData ? { ...emptyData, ...uploadedData } : emptyData);
  const [skillInput, setSkillInput] = useState("");
  const [skillLevel, setSkillLevel] = useState("intermediate");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [isFresher, setIsFresher] = useState(false);
  const [templateKey, setTemplateKey] = useState(presetStyle || "modern");
  const [emailTouched, setEmailTouched] = useState(false);
  const [personalTouched, setPersonalTouched] = useState({});

  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [autoSavedAt, setAutoSavedAt] = useState(null);
  const skipNextAutoSave = React.useRef(true); // don't fire right after initial load

  useEffect(() => {
    if (isEdit) {
      api.getResume(id).then((r) => {
        setTitle(r.title);
        setData({ ...emptyData, ...r.data });
        setIsFresher(Boolean(r.is_fresher));
        setTemplateKey(r.template_key || "modern");
        skipNextAutoSave.current = true; // reset so the load itself isn't treated as a change
      }).catch((e) => setError(e.message));
    }
  }, [id]);

  // Auto-save: only in edit mode, only once the required fields are present,
  // debounced so it doesn't fire on every keystroke.
  useEffect(() => {
    if (!isEdit) return;
    if (skipNextAutoSave.current) {
      skipNextAutoSave.current = false;
      return;
    }
    if (!data.full_name.trim() || !data.email.trim() || !isValidEmail(data.email)) return;

    const t = setTimeout(async () => {
      setAutoSaving(true);
      try {
        await api.updateResume(id, { title, data, template_key: templateKey, is_fresher: isFresher });
        setAutoSavedAt(new Date());
      } catch {
        // stay silent — the user still has the manual Save button as a fallback
      } finally {
        setAutoSaving(false);
      }
    }, 1500);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, title, templateKey, isFresher, isEdit, id]);

  function update(field, value) {
    setData((d) => ({ ...d, [field]: value }));
  }

  function addSkill() {
    if (skillInput.trim()) {
      update("skills", [...data.skills, { name: skillInput.trim(), level: skillLevel }]);
      setSkillInput("");
    }
  }

  function removeSkill(i) {
    update("skills", data.skills.filter((_, idx) => idx !== i));
  }

  function setSkillLevelAt(i, level) {
    const arr = [...data.skills];
    arr[i] = { ...normalizeSkill(arr[i]), level };
    update("skills", arr);
  }

  function addEntry(field, template) {
    update(field, [...data[field], template]);
  }

  function updateEntry(field, i, key, value) {
    const arr = [...data[field]];
    arr[i] = { ...arr[i], [key]: value };
    update(field, arr);
  }

  function removeEntry(field, i) {
    update(field, data[field].filter((_, idx) => idx !== i));
  }

  function handlePhotoFile(file) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("Photo must be smaller than 2MB."); return; }
    const reader = new FileReader();
    reader.onload = () => update("photo", reader.result);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    setError("");

    if (!data.full_name.trim() || !data.email.trim() || !data.phone.trim()) {
      setPersonalTouched({ full_name: true, email: true, phone: true });
      setEmailTouched(true);
      setActiveTab("personal");
      setError("Full name, email, and phone are required before saving.");
      return;
    }
    if (!isValidEmail(data.email)) {
      setEmailTouched(true);
      setActiveTab("personal");
      setError("Please enter a valid email address before saving.");
      return;
    }
    if (!isFresher && data.experience.length === 0) {
      setError("Add at least one work experience entry, or toggle \"I'm a fresh graduate\" if you don't have any yet.");
      setActiveTab("experience");
      return;
    }
    if ((templateKey === "modern" || templateKey === "creative") && !data.photo) {
      setError("This template has a photo sidebar — please upload a profile photo before saving, or switch to Classic ATS / Minimal / Executive.");
      setActiveTab("personal");
      return;
    }

    setSaving(true);
    const payload = { title, data, template_key: templateKey, is_fresher: isFresher };
    try {
      if (isEdit) {
        await api.updateResume(id, payload);
        navigate(`/resumes/${id}?view=document`);
      } else {
        const created = await api.createResume(payload);
        navigate(`/resumes/${created.id}?view=document`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!pickedTemplate) {
    return (
      <TemplatePicker
        presetTemplateKey={presetStyle}
        onPick={(pickedTitle, pickedData, pickedStyle) => {
          setTitle(pickedTitle);
          setData(pickedData);
          if (pickedStyle) setTemplateKey(pickedStyle);
          setPickedTemplate(true);
        }}
      />
    );
  }

  const activeTabInfo = TABS.find((t) => t.key === activeTab);

  return (
    <div>
      <div className="page-header">
        <h1>{isEdit ? "Edit Resume" : "New Resume"}</h1>
        {isEdit && (
          <span className="muted" style={{ fontSize: 13 }}>
            {autoSaving
              ? "Saving..."
              : autoSavedAt
              ? `Saved at ${autoSavedAt.toLocaleTimeString()}`
              : ""}
          </span>
        )}
      </div>

      {uploadedData && !isEdit && (
        <p className="muted" style={{ marginTop: -10, marginBottom: 18 }}>
          Pre-filled from your uploaded file — review each section and fix anything that didn't come through cleanly.
        </p>
      )}

      {error && <p className="error">{error}</p>}

      <div
        className="resume-form"
        onKeyDown={(e) => {
          // Extra safety net: even though this is no longer a native <form>
          // (so there's nothing to "implicitly submit"), still stop Enter
          // from doing anything unexpected inside single-line inputs.
          if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
            e.preventDefault();
          }
        }}
      >
        <input
          id="resume-photo-input"
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => handlePhotoFile(e.target.files?.[0])}
        />

        <div className="form-top-row">
          <div className="form-top-field">
            <label>Resume Title<span className="required-star">*</span></label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="form-top-field">
            <label>Template</label>
            <div className="ats-template-pills">
              {ATS_TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`ats-pill ${templateKey === t.key ? "active" : ""}`}
                  title={t.blurb}
                  onClick={() => setTemplateKey(t.key)}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
          <div className="form-top-field">
            <label>Accent Color</label>
            <div className="color-swatch-row">
              {ACCENT_PRESETS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  title={c.label}
                  className={`color-swatch ${data.accent_color === c.value ? "active" : ""}`}
                  style={{ background: c.value }}
                  onClick={() => update("accent_color", c.value)}
                />
              ))}
              <span className="color-swatch-divider" />
              <span className="color-swatch-custom-wrap">
                <label
                  className={`color-swatch color-swatch-custom ${!ACCENT_PRESETS.some((c) => c.value === data.accent_color) ? "active" : ""}`}
                  title="Custom color — pick any hex value"
                  style={{ background: data.accent_color }}
                >
                  <input
                    type="color"
                    value={data.accent_color || "#4338ca"}
                    onChange={(e) => update("accent_color", e.target.value)}
                  />
                </label>
                <span className="color-swatch-custom-label">Custom</span>
              </span>
            </div>
          </div>
        </div>

        <label className="fresher-toggle">
          <input type="checkbox" checked={isFresher} onChange={(e) => setIsFresher(e.target.checked)} />
          <span>I'm a fresh graduate / new to the job market (work experience won't be required)</span>
        </label>

        <div className={`split-screen ${previewMaximized ? "split-maximized" : ""}`}>
          <div className="split-left">
            <div className="form-timeline">
              {TABS.map((t, i) => {
                const count = t.key === "skills" ? data.skills.length
                  : t.key === "experience" ? data.experience.length
                  : t.key === "education" ? data.education.length
                  : t.key === "projects" ? data.projects.length
                  : null;
                const activeIdx = TABS.findIndex((x) => x.key === activeTab);
                const state = i < activeIdx ? "done" : i === activeIdx ? "active" : "upcoming";
                return (
                  <React.Fragment key={t.key}>
                    <button
                      type="button"
                      className={`timeline-step timeline-${state}`}
                      onClick={() => setActiveTab(t.key)}
                    >
                      <span className="timeline-dot">{state === "done" ? <IconCheck /> : i + 1}</span>
                      <span className="timeline-label">
                        {t.label}{t.key === "experience" && isFresher ? " (optional)" : ""}
                        {count > 0 && <span className="tab-count">{count}</span>}
                      </span>
                    </button>
                    {i < TABS.length - 1 && <span className={`timeline-connector ${i < activeIdx ? "timeline-connector-done" : ""}`} />}
                  </React.Fragment>
                );
              })}
            </div>

            {activeTab === "personal" && (
              <div className="tab-panel">
                {(templateKey === "modern" || templateKey === "creative") && (
                  <div className="photo-uploader">
                    <div className={`photo-uploader-circle ${!data.photo ? "photo-uploader-circle-required" : ""}`}>
                      {data.photo ? <img src={data.photo} alt="" /> : <IconUser />}
                    </div>
                    <div>
                      <label style={{ marginTop: 0 }}>Photo<span className="required-star">*</span></label>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" className="btn-secondary btn-xs" onClick={() => document.getElementById("resume-photo-input").click()}>
                          Upload photo
                        </button>
                        {data.photo && (
                          <button type="button" className="btn-link-danger" onClick={() => update("photo", "")}>Remove</button>
                        )}
                      </div>
                      <p className="muted" style={{ marginTop: 6 }}>
                        {data.photo ? "Shown on this template's photo sidebar/header." : "Required for the Modern and Creative templates — they have a photo sidebar. Switch to Classic ATS, Minimal, or Executive to skip it."}
                      </p>
                    </div>
                  </div>
                )}

                <label>Full Name<span className="required-star">*</span></label>
                <input
                  value={data.full_name}
                  onChange={(e) => update("full_name", e.target.value)}
                  onBlur={() => setPersonalTouched((t) => ({ ...t, full_name: true }))}
                  className={personalTouched.full_name && !data.full_name.trim() ? "input-error" : ""}
                  placeholder="Jane Doe"
                  required
                />
                {personalTouched.full_name && !data.full_name.trim() && <p className="field-error">Full name is required.</p>}

                <label>Email<span className="required-star">*</span></label>
                <input
                  type="email"
                  value={data.email}
                  onChange={(e) => update("email", e.target.value)}
                  onBlur={() => { setEmailTouched(true); setPersonalTouched((t) => ({ ...t, email: true })); }}
                  className={emailTouched && (!data.email || !isValidEmail(data.email)) ? "input-error" : ""}
                  placeholder="jane@example.com"
                  required
                />
                {emailTouched && !data.email && <p className="field-error">Email is required.</p>}
                {emailTouched && data.email && !isValidEmail(data.email) && (
                  <p className="field-error">Enter a valid email address.</p>
                )}

                <label>Phone<span className="required-star">*</span></label>
                <div className="phone-row">
                  <select
                    value={data.phone_country_code || "+1"}
                    onChange={(e) => update("phone_country_code", e.target.value)}
                    className="country-code-select"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code + c.country} value={c.code}>{c.flag} {c.code} {c.country}</option>
                    ))}
                  </select>
                  <input
                    value={data.phone}
                    onChange={(e) => update("phone", e.target.value.replace(/[^0-9 ()-]/g, ""))}
                    onBlur={() => setPersonalTouched((t) => ({ ...t, phone: true }))}
                    className={personalTouched.phone && !data.phone.trim() ? "input-error" : ""}
                    placeholder="300 1234567"
                    required
                  />
                </div>
                {personalTouched.phone && !data.phone.trim() && <p className="field-error">Phone number is required.</p>}

                <label>Address<span className="optional-tag">optional</span></label>
                <input value={data.address} onChange={(e) => update("address", e.target.value)} placeholder="City, Country" />

                <label>Summary <span className="optional-tag">optional</span></label>
                <textarea
                  value={data.summary}
                  onChange={(e) => update("summary", e.target.value)}
                  rows={4}
                  placeholder={isFresher ? "A short line about what you're looking for and your strengths (optional)." : "A 2-3 sentence overview of your experience (optional)."}
                />
              </div>
            )}

            {activeTab === "skills" && (
              <div className="tab-panel">
                <div className="skill-input-row">
                  <input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    placeholder="e.g. Python"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                  />
                  <select
                    value={skillLevel}
                    onChange={(e) => setSkillLevel(e.target.value)}
                    className="skill-level-select"
                    title="Proficiency level"
                  >
                    {SKILL_LEVELS.map((lvl) => (
                      <option key={lvl.key} value={lvl.key}>{lvl.label}</option>
                    ))}
                  </select>
                  <button type="button" onClick={addSkill}>Add</button>
                </div>
                <p className="muted" style={{ marginTop: 4 }}>
                  Proficiency level controls the skill bar shown on the Modern template's sidebar.
                </p>
                <div className="chip-row">
                  {data.skills.length === 0 && <p className="muted">No skills added yet.</p>}
                  {data.skills.map((raw, i) => {
                    const s = normalizeSkill(raw);
                    return (
                      <span key={i} className="chip skill-chip">
                        {s.name}
                        <select
                          value={s.level}
                          onChange={(e) => setSkillLevelAt(i, e.target.value)}
                          className="skill-level-select skill-level-select-xs"
                          title="Proficiency level"
                        >
                          {SKILL_LEVELS.map((lvl) => (
                            <option key={lvl.key} value={lvl.key}>{lvl.label}</option>
                          ))}
                        </select>
                        <button type="button" onClick={() => removeSkill(i)}>x</button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "experience" && (
              <div className="tab-panel timeline">
                {isFresher && data.experience.length === 0 && (
                  <p className="muted">Marked as optional since you're a fresh graduate. Add internships if you have any.</p>
                )}
                {data.experience.map((exp, i) => (
                  <div key={i} className="timeline-entry">
                    <div className="entry-block">
                      <input placeholder="Company" value={exp.company || ""} onChange={(e) => updateEntry("experience", i, "company", e.target.value)} />
                      <input placeholder="Role" value={exp.role || ""} onChange={(e) => updateEntry("experience", i, "role", e.target.value)} />
                      <div className="row-2">
                        <div className="date-field">
                          <label className="date-label">Start</label>
                          <input type="month" value={exp.start || ""} onChange={(e) => updateEntry("experience", i, "start", e.target.value)} />
                        </div>
                        <div className="date-field">
                          <label className="date-label">End</label>
                          <input
                            type="month"
                            value={exp.end === "Present" ? "" : (exp.end || "")}
                            disabled={exp.end === "Present"}
                            onChange={(e) => updateEntry("experience", i, "end", e.target.value)}
                          />
                        </div>
                      </div>
                      <label className="present-check">
                        <input
                          type="checkbox"
                          checked={exp.end === "Present"}
                          onChange={(e) => updateEntry("experience", i, "end", e.target.checked ? "Present" : "")}
                        />
                        <span>I currently work here</span>
                      </label>
                      <textarea placeholder="Description" value={exp.description || ""} onChange={(e) => updateEntry("experience", i, "description", e.target.value)} rows={2} />
                      <button type="button" className="btn-danger" onClick={() => removeEntry("experience", i)}>Remove</button>
                    </div>
                  </div>
                ))}
                <button type="button" className="btn-add" onClick={() => addEntry("experience", { company: "", role: "", start: "", end: "", description: "" })}>+ Add Experience</button>
              </div>
            )}

            {activeTab === "education" && (
              <div className="tab-panel timeline">
                {data.education.map((ed, i) => (
                  <div key={i} className="timeline-entry">
                    <div className="entry-block">
                      <input placeholder="School" value={ed.school || ""} onChange={(e) => updateEntry("education", i, "school", e.target.value)} />
                      <input placeholder="Degree" value={ed.degree || ""} onChange={(e) => updateEntry("education", i, "degree", e.target.value)} />
                      <div className="row-2">
                        <div className="date-field">
                          <label className="date-label">Start</label>
                          <input type="month" value={ed.start || ""} onChange={(e) => updateEntry("education", i, "start", e.target.value)} />
                        </div>
                        <div className="date-field">
                          <label className="date-label">End</label>
                          <input type="month" value={ed.end || ""} onChange={(e) => updateEntry("education", i, "end", e.target.value)} />
                        </div>
                      </div>
                      <button type="button" className="btn-danger" onClick={() => removeEntry("education", i)}>Remove</button>
                    </div>
                  </div>
                ))}
                <button type="button" className="btn-add" onClick={() => addEntry("education", { school: "", degree: "", start: "", end: "" })}>+ Add Education</button>
              </div>
            )}

            {activeTab === "projects" && (
              <div className="tab-panel timeline">
                {data.projects.map((p, i) => (
                  <div key={i} className="timeline-entry">
                    <div className="entry-block">
                      <input placeholder="Project Name" value={p.name || ""} onChange={(e) => updateEntry("projects", i, "name", e.target.value)} />
                      <input placeholder="Link (optional)" value={p.link || ""} onChange={(e) => updateEntry("projects", i, "link", e.target.value)} />
                      <textarea placeholder="Description" value={p.description || ""} onChange={(e) => updateEntry("projects", i, "description", e.target.value)} rows={2} />
                      <button type="button" className="btn-danger" onClick={() => removeEntry("projects", i)}>Remove</button>
                    </div>
                  </div>
                ))}
                <button type="button" className="btn-add" onClick={() => addEntry("projects", { name: "", link: "", description: "" })}>+ Add Project</button>
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                disabled={activeTab === TABS[0].key}
                onClick={() => {
                  const i = TABS.findIndex((t) => t.key === activeTab);
                  if (i > 0) setActiveTab(TABS[i - 1].key);
                }}
              >
                Back
              </button>

              {activeTab !== TABS[TABS.length - 1].key ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    const i = TABS.findIndex((t) => t.key === activeTab);
                    if (i < TABS.length - 1) setActiveTab(TABS[i + 1].key);
                  }}
                >
                  Next
                </button>
              ) : (
                <button type="button" className="btn-primary" disabled={saving} onClick={handleSubmit}>{saving ? "Saving..." : "Save Resume"}</button>
              )}
            </div>
          </div>

          <div className="split-right">
            <div className="live-preview-label">
              Live Preview <span className="live-preview-hint">click any text on the resume to edit it directly</span>
              <span className="live-preview-spacer" />
              <button
                type="button"
                className="live-preview-maximize-btn"
                onClick={() => setPreviewMaximized((m) => !m)}
                title={previewMaximized ? "Show the form panel again" : "Hide the form panel and maximize the preview"}
              >
                {previewMaximized ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3v4a2 2 0 0 1-2 2H3M15 3v4a2 2 0 0 0 2 2h4M9 21v-4a2 2 0 0 0-2-2H3M15 21v-4a2 2 0 0 1 2-2h4" /></svg>
                    Exit maximize
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
                    Maximize
                  </>
                )}
              </button>
            </div>
            <div className="live-preview-frame">
              <div className="live-preview-scale">
                <ResumePDFTemplate
                  resume={{ title, data, template_key: templateKey }}
                  editable
                  onDataChange={setData}
                  onTitleChange={setTitle}
                  onPhotoClick={() => document.getElementById("resume-photo-input").click()}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
