from typing import List
import logging

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..database import get_db
from ..email_utils import send_resume_email, EmailNotConfigured
from ..models_extra import ShareEvent
from ..resume_parser import extract_text, parse_resume_text
from ..cache import TTLValue

logger = logging.getLogger("resumes")

router = APIRouter(prefix="/resumes", tags=["Resumes"])

ALLOWED_UPLOAD_TYPES = (".pdf", ".docx", ".txt")

# Per-user resume list cache. Keyed by (user_id, search, limit) so
# different filter combos don't collide; cleared for that user on any
# create/update/delete/restore so the list is never stale after a write.
_resume_list_cache: dict[tuple, TTLValue] = {}
_RESUME_LIST_TTL = 120  # seconds


def _list_cache_for(user_id: int, search, limit: int) -> TTLValue:
    key = (user_id, search, limit)
    if key not in _resume_list_cache:
        _resume_list_cache[key] = TTLValue(ttl_seconds=_RESUME_LIST_TTL)
    return _resume_list_cache[key]


def _invalidate_resume_list(user_id: int):
    for key in [k for k in _resume_list_cache if k[0] == user_id]:
        del _resume_list_cache[key]


@router.post("/parse")
async def parse_uploaded_resume(
    file: UploadFile = File(...),
    user: models.User = Depends(auth.get_current_user),
):
    """Accepts a PDF/DOCX/TXT resume, extracts its text, and returns a
    best-effort structured draft the frontend pre-fills into the editor.
    This is heuristic (regex + keyword sections), not full AI parsing —
    the user is expected to review and clean up the result."""
    filename = (file.filename or "").lower()
    if not filename.endswith(ALLOWED_UPLOAD_TYPES):
        raise HTTPException(status_code=400, detail="Please upload a PDF, DOCX, or TXT file.")

    content = await file.read()
    if len(content) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File is too large (max 8MB).")

    try:
        text = extract_text(file.filename, content)
    except ValueError as e:
        # extract_text raises ValueError with a specific, user-facing reason
        # (password-protected, corrupted, unsupported type, etc.)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        # Anything unexpected: log the full traceback so it's diagnosable
        # from the backend console, but keep the user-facing message generic.
        logger.exception("Unexpected error parsing uploaded resume %r", file.filename)
        raise HTTPException(status_code=400, detail="Couldn't read that file. Try a different PDF/DOCX export.")

    if not text.strip():
        raise HTTPException(status_code=400, detail="No readable text found in that file (it may be a scanned image).")

    data = parse_resume_text(text)
    suggested_title = f"{data['full_name']} Resume".strip() if data["full_name"] else "Uploaded Resume"
    return {"title": suggested_title, "data": data}


def _get_owned_resume(resume_id: int, db: Session, user: models.User) -> models.Resume:
    resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    if resume.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this resume")
    return resume


@router.get("/", response_model=List[schemas.ResumeOut])
def list_resumes(
    search: str = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    # Cached per-user for 2 minutes — the dashboard list doesn't need to
    # hit the DB on every single visit, and any create/update/delete
    # below clears this user's cache immediately so it never shows stale data.
    slot = _list_cache_for(user.id, search, limit)
    hit = slot.get()
    if hit is not None:
        return hit

    # SQL equivalent:
    #   SELECT * FROM resumes
    #   WHERE owner_id = :user_id AND title ILIKE '%search%'   (only if search given)
    #   ORDER BY updated_at DESC
    #   LIMIT :limit
    query = db.query(models.Resume).filter(models.Resume.owner_id == user.id)
    if search:
        query = query.filter(models.Resume.title.ilike(f"%{search}%"))
    result = query.order_by(models.Resume.updated_at.desc()).limit(limit).all()
    slot.set(result)
    return result


@router.post("/", response_model=schemas.ResumeOut, status_code=status.HTTP_201_CREATED)
def create_resume(payload: schemas.ResumeCreate, db: Session = Depends(get_db), user: models.User = Depends(auth.get_current_user)):
    resume = models.Resume(
        owner_id=user.id,
        title=payload.title,
        data=payload.data.model_dump(),
        template_key=payload.template_key,
        is_fresher=int(bool(payload.is_fresher)),
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    # save initial version snapshot
    version = models.ResumeVersion(resume_id=resume.id, title=resume.title, data=resume.data)
    db.add(version)
    db.commit()

    _invalidate_resume_list(user.id)
    return resume


@router.get("/{resume_id}", response_model=schemas.ResumeOut)
def get_resume(resume_id: int, db: Session = Depends(get_db), user: models.User = Depends(auth.get_current_user)):
    return _get_owned_resume(resume_id, db, user)


@router.put("/{resume_id}", response_model=schemas.ResumeOut)
def update_resume(resume_id: int, payload: schemas.ResumeUpdate, db: Session = Depends(get_db), user: models.User = Depends(auth.get_current_user)):
    resume = _get_owned_resume(resume_id, db, user)

    if payload.title is not None:
        resume.title = payload.title
    if payload.data is not None:
        resume.data = payload.data.model_dump()
    if payload.template_key is not None:
        resume.template_key = payload.template_key
    if payload.is_fresher is not None:
        resume.is_fresher = int(bool(payload.is_fresher))

    db.commit()
    db.refresh(resume)

    # snapshot every update -> resume history
    version = models.ResumeVersion(resume_id=resume.id, title=resume.title, data=resume.data)
    db.add(version)
    db.commit()

    _invalidate_resume_list(user.id)
    return resume


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(resume_id: int, db: Session = Depends(get_db), user: models.User = Depends(auth.get_current_user)):
    resume = _get_owned_resume(resume_id, db, user)
    db.delete(resume)
    db.commit()
    _invalidate_resume_list(user.id)
    return None


@router.get("/{resume_id}/history", response_model=List[schemas.ResumeVersionOut])
def get_resume_history(resume_id: int, db: Session = Depends(get_db), user: models.User = Depends(auth.get_current_user)):
    resume = _get_owned_resume(resume_id, db, user)
    return db.query(models.ResumeVersion).filter(models.ResumeVersion.resume_id == resume.id).order_by(models.ResumeVersion.created_at.desc()).all()


@router.post("/{resume_id}/restore/{version_id}", response_model=schemas.ResumeOut)
def restore_version(resume_id: int, version_id: int, db: Session = Depends(get_db), user: models.User = Depends(auth.get_current_user)):
    resume = _get_owned_resume(resume_id, db, user)
    version = db.query(models.ResumeVersion).filter(
        models.ResumeVersion.id == version_id, models.ResumeVersion.resume_id == resume.id
    ).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    resume.title = version.title
    resume.data = version.data
    db.commit()
    db.refresh(resume)

    # restoring also creates a new history entry
    new_version = models.ResumeVersion(resume_id=resume.id, title=resume.title, data=resume.data)
    db.add(new_version)
    db.commit()

    _invalidate_resume_list(user.id)
    return resume


@router.post("/{resume_id}/share")
def share_resume(
    resume_id: int,
    payload: schemas.ShareResumeRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    """Emails the generated resume PDF (sent as base64 from the frontend) to the given address."""
    resume = _get_owned_resume(resume_id, db, user)

    filename = f"{(resume.title or 'resume').strip().replace(' ', '_')}.pdf"
    subject = f"{resume.title or 'Resume'} — shared via Resumly"
    sender_name = user.name or user.email
    body = (
        f"Hi,\n\n{sender_name} shared their resume \"{resume.title}\" with you via Resumly.\n"
        f"{payload.message or ''}\n\nThe PDF is attached.\n\n— Resumly"
    )

    try:
        send_resume_email(payload.email, subject, body, payload.pdf_base64, filename)
    except EmailNotConfigured as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {e}")

    db.add(ShareEvent(resume_id=resume.id, sent_to=payload.email))
    db.commit()

    return {"message": f"Resume sent to {payload.email}"}
