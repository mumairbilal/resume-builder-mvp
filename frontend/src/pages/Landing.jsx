import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  IconDoc, IconLayers, IconClock, IconShield, IconArrowRight,
  IconBriefcase, IconSpark, IconCap, IconChart, IconTarget, IconLogo,
} from "../icons.jsx";
import ResumePDFTemplate from "./ResumePDFTemplate.jsx";

function useInView() {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, inView];
}

function Reveal({ children, delay = 0, className = "" }) {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} className={`reveal ${inView ? "in-view" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

const FEATURES = [
  { icon: IconDoc, title: "Structured, not messy", text: "Guided sections for summary, skills, experience, education, and projects — no blank-page panic." },
  { icon: IconLayers, title: "Start from a template", text: "Six professional starting points across roles, pre-filled with real example content you can edit." },
  { icon: IconClock, title: "Full version history", text: "Every save is kept. Made a change you regret? Restore any earlier version in one click." },
  { icon: IconShield, title: "Private by default", text: "Your resumes are tied to your account only — secured with hashed passwords and JWT auth." },
];

const TEMPLATE_PREVIEWS = [
  { icon: IconBriefcase, name: "Software Engineer" },
  { icon: IconSpark, name: "Marketing" },
  { icon: IconCap, name: "Fresh Graduate" },
  { icon: IconChart, name: "Data Analyst" },
  { icon: IconTarget, name: "Sales" },
];

/* Real, fully-filled sample resumes rendered through the actual
   ResumePDFTemplate component — same code path used when a user builds
   their own — so what's shown on the landing page is exactly what
   they'll get, not a mockup. One per layout style, with a distinct
   accent color to show off the customization. */
const SHOWCASE_RESUMES = [
  {
    key: "modern",
    label: "Modern",
    tag: "Photo sidebar · color accents",
    resume: {
      title: "Product Designer Resume",
      template_key: "modern",
      data: {
        full_name: "Lucía Fernández",
        email: "lucia.fernandez@mail.com",
        phone: "612 345 678",
        phone_country_code: "+34",
        address: "Madrid, Spain",
        photo: "https://i.pravatar.cc/300?img=32",
        accent_color: "#7c3aed",
        summary: "Product designer focused on research-driven UX and clean, accessible interfaces, with 5+ years shipping consumer products end to end.",
        skills: [
          { name: "Figma", level: "expert" },
          { name: "User Research", level: "expert" },
          { name: "Prototyping", level: "intermediate" },
          { name: "Design Systems", level: "expert" },
          { name: "Usability Testing", level: "intermediate" },
        ],
        experience: [
          { company: "Studio Name", role: "Senior Product Designer", start: "2023-02", end: "Present", description: "Led end-to-end design for a core product surface, partnering closely with engineering and PM to ship a 40% faster onboarding flow." },
          { company: "Prior Company", role: "Product Designer", start: "2020-06", end: "2023-01", description: "Owned the design system rebuild, cutting design-to-dev handoff time in half across 6 squads." },
        ],
        education: [{ school: "Universidad Complutense Madrid", degree: "BFA Design", start: "2016-09", end: "2020-06" }],
        projects: [
          { name: "Design System Overhaul", link: "", description: "Rebuilt the component library from scratch, now used by every product team." },
          { name: "Onboarding Redesign", link: "", description: "Redesigned new-user onboarding, improving activation rate by 22%." },
        ],
      },
    },
  },
  {
    key: "classic",
    label: "Classic ATS",
    tag: "Black & white · parser-safe",
    resume: {
      title: "Data Analyst Resume",
      template_key: "classic",
      data: {
        full_name: "Wei Zhang",
        email: "wei.zhang@mail.com",
        phone: "416 555 0134",
        phone_country_code: "+1",
        address: "Toronto, ON, Canada",
        photo: "",
        accent_color: "#000000",
        summary: "Data analyst experienced in turning raw data into clear, actionable business insight for cross-functional stakeholders.",
        skills: [
          { name: "SQL", level: "expert" }, { name: "Python", level: "expert" },
          { name: "Tableau", level: "intermediate" }, { name: "Statistics", level: "expert" },
          { name: "Power BI", level: "intermediate" },
        ],
        experience: [
          { company: "Company Name", role: "Data Analyst", start: "2022-05", end: "Present", description: "Built dashboards tracking key business metrics, used weekly by leadership for decisions covering $2M+ in quarterly spend." },
          { company: "Prior Company", role: "Junior Data Analyst", start: "2020-06", end: "2022-04", description: "Cleaned and modeled datasets from 5+ internal systems to support quarterly business reviews." },
        ],
        education: [{ school: "University of Toronto", degree: "BSc Statistics", start: "2018-09", end: "2022-04" }],
        projects: [
          { name: "Sales Forecasting Model", link: "", description: "Built a forecasting model that improved inventory planning accuracy by 18%." },
          { name: "Customer Churn Dashboard", link: "", description: "Built an interactive Tableau dashboard used by the retention team weekly." },
        ],
      },
    },
  },
  {
    key: "minimal",
    label: "Minimal",
    tag: "Serif headings · generous space",
    resume: {
      title: "Software Engineer Resume",
      template_key: "minimal",
      data: {
        full_name: "Daniel Reyes",
        email: "daniel.reyes@mail.com",
        phone: "512 555 0198",
        phone_country_code: "+1",
        address: "Austin, TX",
        photo: "",
        accent_color: "#0d9488",
        summary: "Results-driven software engineer with experience building scalable web applications and REST APIs used by 100k+ daily users.",
        skills: [
          { name: "Python", level: "expert" }, { name: "React", level: "expert" },
          { name: "SQL", level: "intermediate" }, { name: "Docker", level: "intermediate" },
          { name: "AWS", level: "intermediate" },
        ],
        experience: [
          { company: "Tech Company", role: "Software Engineer", start: "2023-01", end: "Present", description: "Built and maintained REST APIs serving 100k+ daily requests. Partnered with product and design to ship features on schedule." },
          { company: "StartUp Labs", role: "Junior Developer", start: "2021-06", end: "2022-12", description: "Built internal tooling that cut manual QA time by 20 hours a week and raised test coverage from 40% to 85%." },
        ],
        education: [{ school: "University Name", degree: "BSc Computer Science", start: "2019-09", end: "2023-05" }],
        projects: [
          { name: "Personal Portfolio", link: "", description: "Designed and built a portfolio site to showcase side projects and case studies." },
          { name: "Task Tracker API", link: "", description: "Open-source REST API for task management with JWT auth and full test coverage." },
        ],
      },
    },
  },
  {
    key: "creative",
    label: "Creative",
    tag: "Color header · photo",
    resume: {
      title: "Brand Designer Resume",
      template_key: "creative",
      data: {
        full_name: "Maya Thompson",
        email: "maya.thompson@mail.com",
        phone: "917 555 0110",
        phone_country_code: "+1",
        address: "New York, NY",
        photo: "https://i.pravatar.cc/300?img=25",
        accent_color: "#c026d3",
        summary: "Brand designer blending strategy and craft to build memorable, consistent visual identities across digital and print.",
        skills: [
          { name: "Brand Identity", level: "expert" }, { name: "Art Direction", level: "expert" },
          { name: "Illustration", level: "intermediate" }, { name: "Typography", level: "expert" },
        ],
        experience: [
          { company: "Studio Nine", role: "Senior Brand Designer", start: "2021-04", end: "Present", description: "Led rebrands for 6 mid-size companies, growing brand recognition scores by an average of 30%." },
          { company: "Creative Collective", role: "Graphic Designer", start: "2018-06", end: "2021-03", description: "Designed campaign assets for 15+ clients across social, print, and out-of-home." },
        ],
        education: [{ school: "Parsons School of Design", degree: "BFA Graphic Design", start: "2014-09", end: "2018-05" }],
        projects: [{ name: "Café Rebrand", link: "", description: "Full visual identity redesign for a 5-location café chain, including packaging and signage." }],
      },
    },
  },
  {
    key: "executive",
    label: "Executive",
    tag: "Banner header · senior roles",
    resume: {
      title: "VP of Operations Resume",
      template_key: "executive",
      data: {
        full_name: "Richard Hale",
        email: "richard.hale@mail.com",
        phone: "646 555 0199",
        phone_country_code: "+1",
        address: "New York, NY",
        photo: "",
        accent_color: "#4f46e5",
        summary: "Senior operations executive with 15+ years leading multi-site teams, driving efficiency programs that delivered measurable cost savings at scale.",
        skills: [
          { name: "P&L Ownership", level: "expert" }, { name: "Operations Strategy", level: "expert" },
          { name: "Team Leadership", level: "expert" }, { name: "Change Management", level: "intermediate" },
        ],
        experience: [
          { company: "Global Retail Group", role: "VP of Operations", start: "2019-01", end: "Present", description: "Oversee operations across 40+ locations and a $200M budget, delivering a 12% year-over-year efficiency gain." },
          { company: "Northfield Holdings", role: "Director of Operations", start: "2013-03", end: "2018-12", description: "Led a company-wide process redesign that cut fulfillment costs by 18% while improving on-time delivery." },
        ],
        education: [{ school: "University Name", degree: "MBA", start: "2011-09", end: "2013-05" }],
        projects: [{ name: "National Rollout Program", link: "", description: "Directed the operational rollout of a new store format to 25 locations within one fiscal year." }],
      },
    },
  },
];

export default function Landing() {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <span className="landing-brand">
          <span className="brand-mark"><IconLogo /></span>
          Resumly
        </span>
        <div className="landing-nav-links">
          <Link to="/login" className="landing-nav-link">Sign In</Link>
          <Link to="/signup" className="btn-primary">Get Started</Link>
        </div>
      </nav>

      <header className="landing-hero">
        <div className="landing-blob landing-blob-1" />
        <div className="landing-blob landing-blob-2" />
        <div className="landing-hero-inner">
          <span className="landing-kicker">Free · No credit card needed</span>
          <h1 className="landing-h1">
            Build a resume that<br />
            actually gets <span className="text-gradient">read</span>
          </h1>
          <p className="landing-sub">
            Resumly gives you a structured, guided way to put your career on paper —
            pick a template, fill in your story, and keep every version you ever save.
          </p>
          <div className="landing-cta-row">
            <Link to="/signup" className="btn-primary btn-lg">
              Build Your Resume <IconArrowRight />
            </Link>
            <Link to="/login" className="btn-ghost btn-lg">I already have an account</Link>
          </div>
        </div>
      </header>

      <section className="landing-section">
        <Reveal>
          <span className="eyebrow landing-section-eyebrow">Why Resumly</span>
          <h2 className="landing-h2">Everything you need, nothing you don't</h2>
        </Reveal>
        <div className="feature-grid">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.title} delay={i * 80}>
                <div className="feature-card">
                  <div className="feature-icon"><Icon /></div>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="landing-section landing-section-alt">
        <Reveal>
          <span className="eyebrow landing-section-eyebrow">See it before you build it</span>
          <h2 className="landing-h2">This is exactly how it'll look</h2>
          <p className="landing-section-sub">
            Real layouts, filled with realistic info — not mockups. Every color you see is adjustable, and every template supports the same live, click-to-edit builder.
          </p>
        </Reveal>
        <div className="showcase-grid">
          {SHOWCASE_RESUMES.map((s, i) => (
            <Reveal key={s.key} delay={i * 90} className="showcase-card">
              <div className="showcase-preview">
                <div className="showcase-preview-scale">
                  <ResumePDFTemplate resume={s.resume} />
                </div>
              </div>
              <div className="showcase-card-body">
                <div className="showcase-card-title-row">
                  <h4>{s.label}</h4>
                  <span className="showcase-swatch" style={{ background: s.resume.data.accent_color }} />
                </div>
                <p>{s.tag}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120}>
          <p className="landing-section-sub" style={{ marginTop: 8 }}>Also available as starting points for these roles:</p>
        </Reveal>
        <div className="template-strip">
          {TEMPLATE_PREVIEWS.map((t, i) => {
            const Icon = t.icon;
            return (
              <Reveal key={t.name} delay={i * 60} className="template-strip-item">
                <div className="template-strip-icon"><Icon /></div>
                <span>{t.name}</span>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="landing-cta-band">
        <Reveal>
          <h2>Ready to build yours?</h2>
          <p>It takes about five minutes to go from blank to done.</p>
          <Link to="/signup" className="btn-on-dark btn-primary btn-lg">
            Get Started Free <IconArrowRight />
          </Link>
        </Reveal>
      </section>

      <footer className="landing-footer">
        <span className="landing-brand landing-brand-sm">
          <span className="landing-brand-dot" /> Resumly
        </span>
        <span className="muted">Built to help you land the interview.</span>
        <div className="admin-link-footer"><Link to="/admin/login">Admin</Link></div>
      </footer>
    </div>
  );
}
