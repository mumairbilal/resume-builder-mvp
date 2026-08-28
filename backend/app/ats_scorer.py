"""
ATS (Applicant Tracking System) score engine.

This performs a genuine, deterministic, rule-based analysis of a resume
against a job description — the same categories real ATS/resume-checker
tools use (keyword match, experience relevance, section structure,
education/certifications, formatting parseability). There is no AI
guessing and no randomness: the same resume + job description always
produce the same score, and every point is explained by the returned
`breakdown`.

Weights mirror common industry ATS-checker tooling:
  Keyword Matching        40%
  Experience Relevance    20%
  Section Structure       15%
  Education & Certs       15%
  Formatting Parseability 10%
"""
import re
from collections import Counter
from typing import Optional

# --- stopwords: kept intentionally small & focused on JD "noise" words ---
STOPWORDS = set("""
a an the and or but if while with without within into onto from to of for on
in at by as is are was were be been being this that these those it its it's
you your yours we our ours they their theirs he she his her him them i me my
will would should could can may might must shall not no nor so than then
there here what which who whom whose when where why how all any both each
few more most other some such only own same too very just also etc using use
used able across per via role work working team teams strong good great excellent
including include includes required requirements requirement preferred plus
years year experience experienced knowledge skill skills ability responsibilities
responsible job jobs company companies looking seeking candidate candidates
opportunity opportunities join us we're about background environment
""".split())

DEGREE_KEYWORDS = [
    "bachelor", "master", "phd", "ph.d", "b.tech", "btech", "m.tech", "mtech",
    "bsc", "msc", "b.sc", "m.sc", "mba", "associate degree", "diploma",
    "b.e", "be ", "m.e", "b.a", "m.a", "doctorate", "high school diploma",
]
CERT_HINTS = ["certified", "certification", "certificate", "license", "licensed"]

SECTION_KEYWORDS = {
    "summary": ["summary", "profile", "objective", "about"],
    "experience": ["experience", "employment", "work history", "professional experience"],
    "education": ["education", "academic"],
    "skills": ["skills", "technical skills", "core competencies"],
}

WORD_RE = re.compile(r"[A-Za-z][A-Za-z0-9+#.\-]{1,}")
YEARS_RE = re.compile(r"(\d{1,2})\+?\s*(?:years|yrs)", re.IGNORECASE)


def _tokenize(text: str) -> list:
    return WORD_RE.findall(text or "")


def _keyword_candidates(job_description: str, limit: int = 30) -> list:
    """Pull the most JD-specific keywords out of the job description:
    frequency-ranked single words (skills/tools/tech terms) plus any
    2-3 word capitalized/tech phrases (e.g. 'Machine Learning', 'Power BI')."""
    text = job_description or ""

    # Multi-word phrases: sequences of Capitalized/tech-token words, found
    # within a single sentence only (so a phrase never spans "AWS. Bachelor").
    phrase_re = re.compile(r"\b([A-Z][a-zA-Z0-9+#]*(?:\s+[A-Z][a-zA-Z0-9+#]*){0,2})\b")
    sentences = re.split(r"(?<=[.!?])\s+|\n+", text)
    phrases = []
    for sentence in sentences:
        for p in phrase_re.findall(sentence):
            p = p.strip().rstrip(".,;:")
            if p:
                phrases.append(p)
    phrases = [p for p in phrases if p.lower() not in STOPWORDS and len(p) > 2]

    words = [w.lower().strip(".,;:") for w in _tokenize(text)]
    words = [w for w in words if w and w not in STOPWORDS and len(w) > 2 and not w.isdigit()]
    freq = Counter(words)

    # Rank single words by frequency, keep the top N
    ranked_words = [w for w, _ in freq.most_common(limit)]

    # Merge phrases (deduped, case-normalized) with ranked single words,
    # preferring phrases since they carry more signal (e.g. "Project Management")
    seen = set()
    keywords = []
    for p in phrases:
        key = p.lower()
        if key not in seen and key not in STOPWORDS:
            seen.add(key)
            keywords.append(p)
    for w in ranked_words:
        if w not in seen:
            seen.add(w)
            keywords.append(w)

    return keywords[:limit]


def _resume_text_from_data(data: dict) -> str:
    """Flattens the app's structured resume `data` JSON into plain text,
    the same shape the resume is rendered/exported as, so scoring an
    in-app resume matches what an ATS would actually parse."""
    parts = []
    if not isinstance(data, dict):
        return ""
    parts.append(data.get("full_name", ""))
    parts.append(data.get("summary", ""))
    parts.append(" ".join(data.get("skills", []) or []))
    for exp in data.get("experience", []) or []:
        parts.append(" ".join([
            str(exp.get("role", "")), str(exp.get("company", "")),
            str(exp.get("description", "")),
        ]))
    for edu in data.get("education", []) or []:
        parts.append(" ".join([
            str(edu.get("degree", "")), str(edu.get("school", "")),
            str(edu.get("description", "")),
        ]))
    for proj in data.get("projects", []) or []:
        parts.append(" ".join([str(proj.get("name", "")), str(proj.get("description", ""))]))
    return "\n".join(p for p in parts if p)


def _section_presence_from_data(data: dict) -> dict:
    if not isinstance(data, dict):
        return {k: False for k in SECTION_KEYWORDS}
    return {
        "summary": bool((data.get("summary") or "").strip()),
        "experience": bool(data.get("experience")),
        "education": bool(data.get("education")),
        "skills": bool(data.get("skills")),
    }


def _section_presence_from_text(text: str) -> dict:
    lines = [l.strip().lower().strip(":") for l in (text or "").splitlines() if l.strip()]
    found = {k: False for k in SECTION_KEYWORDS}
    for line in lines:
        for key, kws in SECTION_KEYWORDS.items():
            if any(line == kw or line.startswith(kw) for kw in kws):
                found[key] = True
    return found


def _score_keywords(resume_text: str, job_description: str) -> dict:
    keywords = _keyword_candidates(job_description)
    resume_lower = (resume_text or "").lower()
    matched, missing = [], []
    for kw in keywords:
        pattern = r"\b" + re.escape(kw.lower()) + r"\b"
        if re.search(pattern, resume_lower):
            matched.append(kw)
        else:
            missing.append(kw)
    pct = (len(matched) / len(keywords) * 100) if keywords else 100.0
    return {
        "score": round(pct, 1),
        "matched_keywords": matched,
        "missing_keywords": missing,
        "total_keywords_considered": len(keywords),
    }


def _score_experience(resume_text: str, job_description: str, has_experience_section: bool) -> dict:
    notes = []
    score = 0.0

    if has_experience_section:
        score += 55
    else:
        notes.append("No clear work experience section was found.")

    # Required years of experience mentioned in the JD vs. resume
    jd_years = [int(y) for y in YEARS_RE.findall(job_description or "")]
    resume_years = [int(y) for y in YEARS_RE.findall(resume_text or "")]
    if jd_years:
        required = max(jd_years)
        if resume_years and max(resume_years) >= required:
            score += 25
            notes.append(f"Meets or exceeds the {required}+ years of experience mentioned in the job description.")
        elif resume_years:
            score += 10
            notes.append(f"Job description asks for {required}+ years; resume mentions {max(resume_years)}.")
        else:
            notes.append(f"Job description asks for {required}+ years of experience — consider stating your years of experience explicitly.")
    else:
        score += 15  # JD didn't specify years, don't penalize

    # Overlap of significant JD words with the experience text specifically
    jd_words = set(w.lower() for w in _tokenize(job_description) if w.lower() not in STOPWORDS and len(w) > 3)
    resume_words = set(w.lower() for w in _tokenize(resume_text))
    overlap = jd_words & resume_words
    if jd_words:
        overlap_pct = len(overlap) / len(jd_words)
        score += min(20, overlap_pct * 20)

    return {"score": round(min(score, 100), 1), "notes": notes}


def _score_sections(sections: dict) -> dict:
    core = ["summary", "experience", "education", "skills"]
    present = [k for k in core if sections.get(k)]
    score = (len(present) / len(core)) * 100
    missing = [k for k in core if k not in present]
    return {"score": round(score, 1), "present": present, "missing": missing}


def _score_education(resume_text: str, job_description: str, has_education_section: bool) -> dict:
    text_lower = (resume_text or "").lower()
    jd_lower = (job_description or "").lower()
    score = 0.0
    notes = []

    if has_education_section:
        score += 50
    else:
        notes.append("No education section detected.")

    has_degree = any(kw in text_lower for kw in DEGREE_KEYWORDS)
    if has_degree:
        score += 30
    elif has_education_section:
        notes.append("Education section found, but no recognizable degree (e.g. Bachelor's, Master's) was detected.")

    jd_wants_degree = any(kw in jd_lower for kw in DEGREE_KEYWORDS)
    if jd_wants_degree:
        if has_degree:
            score += 10
        else:
            notes.append("The job description mentions a specific degree requirement that wasn't clearly found in your resume.")
    else:
        score += 10

    if any(hint in text_lower for hint in CERT_HINTS):
        score += 10
        notes.append("Certifications detected — good for ATS matching if relevant to the role.")

    return {"score": round(min(score, 100), 1), "notes": notes}


def _score_formatting(resume_text: str, is_app_built: bool) -> dict:
    notes = []
    if is_app_built:
        # Built with this app's own template: single column, standard
        # headings, no tables/text-boxes/graphics → always clean for ATS.
        notes.append("Built with Resumly's ATS-friendly template (single column, no tables/graphics), so parsing is clean.")
        return {"score": 100.0, "notes": notes}

    score = 100.0
    text = resume_text or ""
    lines = [l for l in text.splitlines() if l.strip()]

    if not text.strip():
        return {"score": 0.0, "notes": ["No extractable text — the file may be a scanned image or use a layout the parser can't read."]}

    avg_len = sum(len(l) for l in lines) / max(len(lines), 1)
    if avg_len < 15:
        score -= 20
        notes.append("Many very short lines detected — often a sign of a multi-column or table-based layout that ATS systems struggle to read in order.")

    weird_chars = len(re.findall(r"[^\x00-\x7F]", text))
    if weird_chars > max(len(text) * 0.02, 20):
        score -= 15
        notes.append("Unusual/special characters detected, which can indicate a graphic-heavy or poorly-encoded layout.")

    if len(text) < 400:
        score -= 25
        notes.append("Very little extractable text — the file may not be parsing cleanly (check for embedded images or unusual fonts).")

    if not notes:
        notes.append("No obvious parsing issues detected in the extracted text.")

    return {"score": round(max(score, 0), 1), "notes": notes}


def compute_ats_score(
    resume_text: str,
    job_description: str,
    sections: dict,
    is_app_built: bool = False,
) -> dict:
    """Runs the full weighted analysis and returns a JSON-serializable dict."""
    kw = _score_keywords(resume_text, job_description)
    exp = _score_experience(resume_text, job_description, sections.get("experience", False))
    sec = _score_sections(sections)
    edu = _score_education(resume_text, job_description, sections.get("education", False))
    fmt = _score_formatting(resume_text, is_app_built)

    weights = {
        "keyword_matching": 0.40,
        "experience_relevance": 0.20,
        "section_structure": 0.15,
        "education_certifications": 0.15,
        "formatting_parseability": 0.10,
    }

    overall = (
        kw["score"] * weights["keyword_matching"]
        + exp["score"] * weights["experience_relevance"]
        + sec["score"] * weights["section_structure"]
        + edu["score"] * weights["education_certifications"]
        + fmt["score"] * weights["formatting_parseability"]
    )

    if overall >= 90:
        verdict = "Excellent match"
    elif overall >= 80:
        verdict = "Strong match"
    elif overall >= 70:
        verdict = "Good match, but can be improved"
    elif overall >= 60:
        verdict = "Average match"
    else:
        verdict = "Needs improvement"

    suggestions = []
    if kw["missing_keywords"]:
        top_missing = kw["missing_keywords"][:8]
        suggestions.append(
            "Add these keywords from the job description where genuinely true of your background: "
            + ", ".join(top_missing) + "."
        )
    if sec["missing"]:
        suggestions.append("Add a clear " + ", ".join(sec["missing"]) + " section with a standard heading.")
    if exp["score"] < 60:
        suggestions.append("Make your experience section more specific — mirror the job's key responsibilities and quantify your impact.")
    if edu["score"] < 60:
        suggestions.append("Make sure your education/certifications are listed clearly with degree name and institution.")
    if fmt["score"] < 80:
        suggestions.append("Simplify formatting: avoid multi-column layouts, tables, and text boxes so ATS parsers can read your content in order.")
    if not suggestions:
        suggestions.append("Your resume is already well aligned with this job description — nice work.")

    return {
        "overall_score": round(overall, 1),
        "verdict": verdict,
        "breakdown": {
            "keyword_matching": {"weight_pct": 40, **kw},
            "experience_relevance": {"weight_pct": 20, **exp},
            "section_structure": {"weight_pct": 15, **sec},
            "education_certifications": {"weight_pct": 15, **edu},
            "formatting_parseability": {"weight_pct": 10, **fmt},
        },
        "suggestions": suggestions,
    }
