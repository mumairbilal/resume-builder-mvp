import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  IconDoc, IconLayers, IconClock, IconShield, IconArrowRight,
  IconBriefcase, IconSpark, IconCap, IconChart, IconTarget, IconLogo,
} from "../icons.jsx";

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
          <span className="eyebrow landing-section-eyebrow">Starter templates</span>
          <h2 className="landing-h2">Pick a role, start with real content</h2>
          <p className="landing-section-sub">Every template comes pre-filled with realistic example content — edit it into your own story.</p>
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
