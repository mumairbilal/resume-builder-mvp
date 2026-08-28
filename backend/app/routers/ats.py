import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel

from .. import models, auth
from ..database import get_db
from ..resume_parser import extract_text
from ..ats_scorer import compute_ats_score, _resume_text_from_data, _section_presence_from_data, _section_presence_from_text

logger = logging.getLogger("ats")

router = APIRouter(prefix="/ats", tags=["ATS Score"])

ALLOWED_UPLOAD_TYPES = (".pdf", ".docx", ".txt")


class ScoreSavedResumeRequest(BaseModel):
    job_description: str


@router.post("/score/{resume_id}")
def score_saved_resume(
    resume_id: int,
    payload: ScoreSavedResumeRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    """Scores one of the user's own saved resumes against a job description."""
    if not payload.job_description or not payload.job_description.strip():
        raise HTTPException(status_code=400, detail="Please paste the job description.")

    resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    if resume.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this resume")

    resume_text = _resume_text_from_data(resume.data)
    if not resume_text.strip():
        raise HTTPException(status_code=400, detail="This resume doesn't have enough content yet to score.")

    sections = _section_presence_from_data(resume.data)
    result = compute_ats_score(resume_text, payload.job_description, sections, is_app_built=True)
    result["source"] = {"type": "saved_resume", "resume_id": resume.id, "title": resume.title}
    return result


@router.post("/score-upload")
async def score_uploaded_resume(
    job_description: str = Form(...),
    file: UploadFile = File(...),
    user: models.User = Depends(auth.get_current_user),
):
    """Scores an uploaded PDF/DOCX/TXT resume against a job description."""
    if not job_description or not job_description.strip():
        raise HTTPException(status_code=400, detail="Please paste the job description.")

    filename = (file.filename or "").lower()
    if not filename.endswith(ALLOWED_UPLOAD_TYPES):
        raise HTTPException(status_code=400, detail="Please upload a PDF, DOCX, or TXT file.")

    content = await file.read()
    if len(content) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File is too large (max 8MB).")

    try:
        resume_text = extract_text(file.filename, content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        logger.exception("Unexpected error extracting text for ATS scoring: %r", file.filename)
        raise HTTPException(status_code=400, detail="Couldn't read that file. Try a different PDF/DOCX export.")

    if not resume_text.strip():
        raise HTTPException(status_code=400, detail="No readable text found in that file (it may be a scanned image).")

    sections = _section_presence_from_text(resume_text)
    result = compute_ats_score(resume_text, job_description, sections, is_app_built=False)
    result["source"] = {"type": "uploaded_file", "filename": file.filename}
    return result
