"""
Lightweight heuristic parser for uploaded resume files (PDF / DOCX).

This is NOT a full NLP resume parser — it extracts plain text and uses
simple pattern matching (regex for email/phone, keyword section headers)
to pre-fill the resume editor so the user can upload an existing resume
and finish/clean it up in the app instead of starting from a blank form.
"""
import io
import logging
import re
from typing import Optional

logger = logging.getLogger("resume_parser")

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
PHONE_RE = re.compile(r"(\+?\d[\d\s().-]{7,}\d)")

SECTION_KEYWORDS = {
    "summary": ["summary", "profile", "objective", "about"],
    "experience": ["experience", "employment", "work history"],
    "education": ["education", "academic"],
    "skills": ["skills", "technical skills", "core competencies"],
    "projects": ["projects"],
}


class UnreadablePDFError(Exception):
    """Raised when a PDF can't be read at all (e.g. it's password-protected)."""


def _extract_pdf_text(content: bytes) -> str:
    """Try pdfplumber first (better layout handling); if that fails outright
    (corrupt file, unsupported encoding, missing dependency, etc.) fall back
    to PyPDF2. Individual broken pages are skipped rather than aborting the
    whole file, so a resume with one bad page still comes through mostly
    intact."""
    text_parts = []
    pdfplumber_available = True
    try:
        import pdfplumber
    except ImportError:
        pdfplumber_available = False
        logger.warning("pdfplumber is not installed — skipping straight to the PyPDF2 fallback")

    if pdfplumber_available:
        try:
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                if getattr(pdf, "is_encrypted", False):
                    raise UnreadablePDFError("This PDF is password-protected.")
                for i, page in enumerate(pdf.pages):
                    try:
                        text_parts.append(page.extract_text() or "")
                    except Exception:
                        logger.warning("pdfplumber failed on page %d, skipping", i, exc_info=True)
            text = "\n".join(text_parts)
            if text.strip():
                return text
        except UnreadablePDFError:
            raise
        except Exception:
            logger.warning("pdfplumber failed to open the PDF, trying PyPDF2 fallback", exc_info=True)

    # Fallback: PyPDF2 (handles some files pdfplumber chokes on, and vice
    # versa — and is used directly if pdfplumber isn't installed at all)
    try:
        from PyPDF2 import PdfReader
        reader = PdfReader(io.BytesIO(content))
        if reader.is_encrypted:
            try:
                reader.decrypt("")  # some "encrypted" PDFs have an empty owner password
            except Exception:
                raise UnreadablePDFError("This PDF is password-protected.")
        text_parts = []
        for i, page in enumerate(reader.pages):
            try:
                text_parts.append(page.extract_text() or "")
            except Exception:
                logger.warning("PyPDF2 failed on page %d, skipping", i, exc_info=True)
        return "\n".join(text_parts)
    except UnreadablePDFError:
        raise
    except ImportError:
        logger.exception("Neither pdfplumber nor PyPDF2 is installed")
        raise ValueError("PDF reading isn't set up on the server yet (missing pdfplumber/PyPDF2). Run: pip install -r requirements.txt")
    except Exception:
        logger.exception("Both pdfplumber and PyPDF2 failed to read this PDF")
        raise ValueError("Couldn't extract text from this PDF — it may be corrupted, password-protected, or a scanned image.")


def extract_text(filename: str, content: bytes) -> str:
    lower = filename.lower()
    if lower.endswith(".pdf"):
        return _extract_pdf_text(content)
    if lower.endswith(".docx"):
        import docx
        try:
            document = docx.Document(io.BytesIO(content))
        except Exception:
            logger.exception("Failed to open DOCX file")
            raise ValueError("Couldn't open this DOCX file — it may be corrupted or not a real .docx export.")
        return "\n".join(p.text for p in document.paragraphs)
    if lower.endswith(".txt"):
        return content.decode("utf-8", errors="ignore")
    raise ValueError("Unsupported file type. Please upload a PDF, DOCX, or TXT file.")


def _match_section(line: str) -> Optional[str]:
    lower = line.strip().lower().strip(":")
    for key, keywords in SECTION_KEYWORDS.items():
        if lower in keywords or any(lower == kw for kw in keywords):
            return key
    return None


def parse_resume_text(text: str) -> dict:
    lines = [l.strip() for l in text.splitlines()]
    lines = [l for l in lines if l]

    full_name = lines[0] if lines else ""
    # Guard against the first line actually being a section header or contact line
    if full_name and (EMAIL_RE.search(full_name) or _match_section(full_name)):
        full_name = ""

    email_match = EMAIL_RE.search(text)
    phone_match = PHONE_RE.search(text)

    buckets = {"summary": [], "experience": [], "education": [], "skills": [], "projects": []}
    current = "summary"
    for line in lines[1:]:
        section = _match_section(line)
        if section:
            current = section
            continue
        buckets[current].append(line)

    skills = []
    for line in buckets["skills"]:
        parts = re.split(r"[,•|/]", line)
        skills.extend([p.strip() for p in parts if p.strip()])

    return {
        "full_name": full_name,
        "email": email_match.group(0) if email_match else "",
        "phone": phone_match.group(0).strip() if phone_match else "",
        "phone_country_code": "+1",
        "address": "",
        "photo": "",
        "summary": " ".join(buckets["summary"])[:900],
        "skills": skills[:20],
        "experience": [{"company": "", "role": "", "start": "", "end": "", "description": " ".join(buckets["experience"])[:1500]}] if buckets["experience"] else [],
        "education": [{"school": "", "degree": "", "start": "", "end": "", "description": " ".join(buckets["education"])[:600]}] if buckets["education"] else [],
        "projects": [{"name": "", "link": "", "description": " ".join(buckets["projects"])[:900]}] if buckets["projects"] else [],
    }
