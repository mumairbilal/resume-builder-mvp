<div align="center">

# 📄 Resumly

**Build, manage, and check your resume — all in one place.**

</div>

---

## ✨ What is Resumly?

Resumly is a full-stack web app that helps you create a professional,
ATS-friendly resume without needing any design skills. Pick a template,
fill in your details (or upload an existing resume and let the app
pre-fill it for you), and download a polished PDF — then check that same
resume against any job description to see exactly how well it matches
before you apply.

It's built for job seekers who want a fast, guided resume-building
experience combined with a genuine, explainable ATS compatibility check —
not a black-box AI score, but a transparent breakdown of what's working
and what isn't.

---

## 🚀 Features

- **Multiple resume templates** — Modern, Classic (ATS-safe), Minimal,
  Creative, and Executive styles, each with a customizable accent color.
- **Upload & auto-fill** — upload an existing resume (PDF / DOCX / TXT)
  and the app extracts your details into the editor automatically, so you
  can polish rather than start from a blank page.
- **Live editing** — fill in your summary, skills, work experience,
  education, and projects, with the resume preview updating as you type.
- **Skill proficiency levels** — mark each skill as Basic, Intermediate,
  or Expert, shown visually on templates that support it.
- **PDF export** — download a print-ready PDF at any time.
- **Share via email** — send your finished resume straight from the app.
- **Version history** — every save creates a snapshot, so you can always
  restore an earlier version.
- **ATS Score Checker** — paste a job description and get:
  - An overall compatibility score and verdict (Excellent → Needs
    improvement)
  - A weighted breakdown across keyword matching, experience relevance,
    section structure, education/certifications, and formatting
  - Lists of matched vs. missing keywords
  - Concrete, actionable suggestions to improve your score

  This is calculated with deterministic, rule-based text analysis — the
  same resume and job description always produce the same result, and
  every point is explainable. No AI guesswork, no randomness.
- **Admin dashboard** — a separate panel for the app owner to view usage
  stats and manage users and resumes.
- **Secure accounts** — email/password signup and login with hashed
  passwords and token-based sessions.

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI library / component architecture |
| **React Router** | Client-side routing / navigation |
| **Vite** | Dev server & build tool |
| **html2pdf.js** | In-browser PDF generation for resume downloads |
| **Plain CSS** (custom design system) | Styling — no external UI framework |

### Backend
| Technology | Purpose |
|---|---|
| **Python 3** | Backend language |
| **FastAPI** | REST API framework |
| **Uvicorn** | ASGI server |
| **SQLAlchemy** | Database ORM |
| **SQLite** | Database (file-based, zero-config) |
| **Pydantic** | Request/response validation |
| **python-jose** + **passlib / bcrypt** | JWT authentication & password hashing |
| **pdfplumber / PyPDF2** | Extracting text from uploaded PDF resumes |
| **python-docx** | Extracting text from uploaded DOCX resumes |

### Architecture

A single-page React app talks to a FastAPI backend over a REST API. The
backend handles authentication, stores resume data as structured JSON in
SQLite, and runs the resume-parsing and ATS-scoring logic in plain
Python — no external AI service is used for either feature.

---

## 📁 Project Layout

The **frontend** folder contains the React app — all pages, components,
and styling. The **backend** folder contains the FastAPI app — API
routes, database models, and business logic.

---

## ▶️ Running It Locally

The **backend** is a FastAPI (Python) app — install its dependencies with
pip and start it with Uvicorn, and it runs on `http://localhost:8000`.

The **frontend** is a React + Vite app — install its dependencies with
npm and start the dev server, and it runs on `http://localhost:5173`,
talking to the backend API automatically.

---

<div align="center">

Built as a full-stack portfolio project — resume building meets real,
explainable ATS analysis.

</div>
