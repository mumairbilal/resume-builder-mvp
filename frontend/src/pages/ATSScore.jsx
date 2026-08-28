import { useEffect, useState } from "react";
import * as api from "../api/client";
import { IconTarget, IconCheck, IconClose } from "../icons.jsx";

const CATEGORY_LABELS = {
  keyword_matching: "Keyword Matching",
  experience_relevance: "Experience Relevance",
  section_structure: "Section Structure",
  education_certifications: "Education & Certifications",
  formatting_parseability: "Formatting Parseability",
};

function scoreColor(score) {
  if (score >= 90) return "#059669";
  if (score >= 80) return "#0d9488";
  if (score >= 70) return "#d97706";
  if (score >= 60) return "#ea580c";
  return "#dc2626";
}

function ScoreGauge({ score }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(score, 100) / 100) * circumference;
  const color = scoreColor(score);
  return (
    <svg
      viewBox="0 0 180 180"
      style={{ width: "180px", height: "180px", minWidth: "180px", flexShrink: 0 }}
    >
      <circle cx="90" cy="90" r={radius} fill="none" stroke="var(--border)" strokeWidth="16" />
      <circle
        cx="90" cy="90" r={radius} fill="none" stroke={color} strokeWidth="16"
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 90 90)" style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x="90" y="82" textAnchor="middle" fontSize="34" fontWeight="800" fill="var(--ink)" fontFamily="var(--font-display)">
        {Math.round(score)}
      </text>
      <text x="90" y="106" textAnchor="middle" fontSize="13" fill="var(--ink-soft)">ATS Score</text>
    </svg>
  );
}

function CategoryBar({ label, data }) {
  const color = scoreColor(data.score);
  return (
    <div className="ats-category">
      <div className="ats-category-head">
        <span>{label} <span className="ats-weight">({data.weight_pct}%)</span></span>
        <span style={{ color, fontWeight: 700 }}>{data.score}%</span>
      </div>
      <div className="ats-progress-track">
        <div className="ats-progress-fill" style={{ width: `${Math.min(data.score, 100)}%`, background: color }} />
      </div>
      {data.notes && data.notes.length > 0 && (
        <ul className="ats-notes">
          {data.notes.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      )}
    </div>
  );
}

export default function ATSScore() {
  const [resumes, setResumes] = useState([]);
  const [mode, setMode] = useState("saved"); // "saved" | "upload"
  const [resumeId, setResumeId] = useState("");
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.listResumes().then((data) => {
      setResumes(data);
      if (data.length) setResumeId(String(data[0].id));
    }).catch(() => {});
  }, []);

  async function handleCheck(e) {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!jobDescription.trim()) {
      setError("Please paste the job description you're targeting.");
      return;
    }
    if (mode === "saved" && !resumeId) {
      setError("Please select one of your saved resumes, or switch to file upload.");
      return;
    }
    if (mode === "upload" && !file) {
      setError("Please choose a resume file (PDF, DOCX, or TXT).");
      return;
    }

    setLoading(true);
    try {
      const data = mode === "saved"
        ? await api.scoreSavedResumeATS(resumeId, jobDescription)
        : await api.scoreUploadedResumeATS(file, jobDescription);
      setResult(data);
    } catch (err) {
      setError(err.message || "Couldn't calculate the ATS score. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 880, margin: "0 auto" }}>
      <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <IconTarget /> ATS SCORE CHECKER
      </div>
      <h2 style={{ marginTop: 4 }}>Check your resume against a job description</h2>
      <p style={{ color: "var(--ink-soft)", marginTop: -6, marginBottom: 28 }}>
        Get a real, rule-based ATS compatibility score — keyword matching, experience relevance,
        section structure, education, and formatting — calculated the same way applicant tracking
        systems actually parse resumes. No guesswork, no fake numbers.
      </p>

      <form onSubmit={handleCheck} className="ats-form">
        <div className="ats-mode-toggle">
          <button type="button" className={mode === "saved" ? "active" : ""} onClick={() => setMode("saved")}>
            Use a saved resume
          </button>
          <button type="button" className={mode === "upload" ? "active" : ""} onClick={() => setMode("upload")}>
            Upload a resume file
          </button>
        </div>

        {mode === "saved" ? (
          resumes.length ? (
            <select value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
              {resumes.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
          ) : (
            <p style={{ color: "var(--ink-soft)" }}>You don't have any saved resumes yet — upload a file instead.</p>
          )
        ) : (
          <input type="file" accept=".pdf,.docx,.txt" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        )}

        <label htmlFor="jd" style={{ fontWeight: 600, marginTop: 8 }}>Job description</label>
        <textarea
          id="jd"
          rows={9}
          placeholder="Paste the full job description here..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />

        {error && <p className="error">{error}</p>}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Analyzing..." : "Check ATS Score"}
        </button>
      </form>

      {result && (
        <div className="ats-result">
          <div className="ats-result-top">
            <ScoreGauge score={result.overall_score} />
            <div>
              <h3 style={{ margin: "0 0 4px" }}>{result.verdict}</h3>
              <p style={{ color: "var(--ink-soft)", margin: 0 }}>
                {result.source?.type === "saved_resume"
                  ? `Scored against "${result.source.title}"`
                  : `Scored against "${result.source?.filename}"`}
              </p>
            </div>
          </div>

          <h4 style={{ marginTop: 28, marginBottom: 12 }}>Score breakdown</h4>
          {Object.entries(result.breakdown).map(([key, data]) => (
            <CategoryBar key={key} label={CATEGORY_LABELS[key] || key} data={data} />
          ))}

          {result.breakdown.keyword_matching.matched_keywords.length > 0 && (
            <>
              <h4 style={{ marginTop: 28, marginBottom: 10 }}>Matched keywords</h4>
              <div className="ats-keyword-chips">
                {result.breakdown.keyword_matching.matched_keywords.map((k, i) => (
                  <span key={i} className="ats-chip ats-chip-good"><IconCheck /> {k}</span>
                ))}
              </div>
            </>
          )}

          {result.breakdown.keyword_matching.missing_keywords.length > 0 && (
            <>
              <h4 style={{ marginTop: 20, marginBottom: 10 }}>Missing keywords</h4>
              <div className="ats-keyword-chips">
                {result.breakdown.keyword_matching.missing_keywords.map((k, i) => (
                  <span key={i} className="ats-chip ats-chip-bad"><IconClose /> {k}</span>
                ))}
              </div>
            </>
          )}

          <h4 style={{ marginTop: 28, marginBottom: 10 }}>Suggestions</h4>
          <ul className="ats-suggestions">
            {result.suggestions.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
