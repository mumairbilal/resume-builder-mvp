from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from .. import models, schemas
from ..database import get_db
from ..models_extra import ShareEvent
from ..security_utils import ADMIN_EMAIL, ADMIN_PASSWORD, create_admin_token, get_current_admin

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/login", response_model=schemas.AdminToken)
def admin_login(payload: schemas.AdminLogin):
    if payload.email != ADMIN_EMAIL or payload.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    return {"access_token": create_admin_token(), "token_type": "bearer"}


@router.get("/profile", response_model=schemas.AdminProfileOut)
def get_admin_profile(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    row = db.query(models.AdminProfile).filter(models.AdminProfile.id == 1).first()
    if not row:
        row = models.AdminProfile(id=1, name="Admin", profile_image="")
        db.add(row)
        db.commit()
        db.refresh(row)
    return {"name": row.name, "profile_image": row.profile_image, "email": ADMIN_EMAIL}


@router.put("/profile", response_model=schemas.AdminProfileOut)
def update_admin_profile(
    payload: schemas.AdminProfileUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    row = db.query(models.AdminProfile).filter(models.AdminProfile.id == 1).first()
    if not row:
        row = models.AdminProfile(id=1, name="Admin", profile_image="")
        db.add(row)
    if payload.name is not None:
        row.name = payload.name
    if payload.profile_image is not None:
        row.profile_image = payload.profile_image
    db.commit()
    db.refresh(row)
    return {"name": row.name, "profile_image": row.profile_image, "email": ADMIN_EMAIL}


@router.get("/stats")
def get_stats(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    total_users = db.query(func.count(models.User.id)).scalar() or 0
    total_resumes = db.query(func.count(models.Resume.id)).scalar() or 0
    total_shares = db.query(func.count(ShareEvent.id)).scalar() or 0

    # resumes created per template
    by_template = (
        db.query(models.Resume.template_key, func.count(models.Resume.id))
        .group_by(models.Resume.template_key)
        .all()
    )

    # signups per day (last 30 rows by created_at) - simple grouping by date string
    users = db.query(models.User.created_at).all()
    signups_by_day = {}
    for (created_at,) in users:
        if created_at:
            key = created_at.strftime("%Y-%m-%d")
            signups_by_day[key] = signups_by_day.get(key, 0) + 1

    resumes = db.query(models.Resume.created_at).all()
    resumes_by_day = {}
    for (created_at,) in resumes:
        if created_at:
            key = created_at.strftime("%Y-%m-%d")
            resumes_by_day[key] = resumes_by_day.get(key, 0) + 1

    avg_resumes_per_user = round(total_resumes / total_users, 2) if total_users else 0

    return {
        "total_users": total_users,
        "total_resumes": total_resumes,
        "total_shares": total_shares,
        "avg_resumes_per_user": avg_resumes_per_user,
        "resumes_by_template": [{"template": t or "modern", "count": c} for t, c in by_template],
        "signups_by_day": [{"date": k, "count": v} for k, v in sorted(signups_by_day.items())],
        "resumes_by_day": [{"date": k, "count": v} for k, v in sorted(resumes_by_day.items())],
    }


@router.get("/users", response_model=List[schemas.UserOut])
def list_users(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    return db.query(models.User).order_by(models.User.created_at.desc()).all()


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}


@router.put("/users/{user_id}", response_model=schemas.UserOut)
def admin_update_user(
    user_id: int,
    payload: schemas.AdminUserUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.name is not None:
        user.name = payload.name
    if payload.email is not None:
        existing = db.query(models.User).filter(models.User.email == payload.email, models.User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = payload.email
    db.commit()
    db.refresh(user)
    return user


@router.get("/resumes")
def list_all_resumes(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    rows = (
        db.query(models.Resume, models.User.email)
        .join(models.User, models.Resume.owner_id == models.User.id)
        .order_by(models.Resume.created_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "title": r.title,
            "owner_email": email,
            "template_key": r.template_key,
            "is_fresher": bool(r.is_fresher),
            "created_at": r.created_at,
            "updated_at": r.updated_at,
        }
        for r, email in rows
    ]


@router.get("/resumes/{resume_id}")
def admin_get_resume(resume_id: int, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    row = (
        db.query(models.Resume, models.User.email)
        .join(models.User, models.Resume.owner_id == models.User.id)
        .filter(models.Resume.id == resume_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Resume not found")
    resume, email = row
    return {
        "id": resume.id,
        "title": resume.title,
        "owner_email": email,
        "template_key": resume.template_key,
        "is_fresher": bool(resume.is_fresher),
        "data": resume.data,
        "created_at": resume.created_at,
        "updated_at": resume.updated_at,
    }


@router.put("/resumes/{resume_id}")
def admin_update_resume(
    resume_id: int,
    payload: schemas.AdminResumeUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    if payload.title is not None:
        resume.title = payload.title
    if payload.template_key is not None:
        resume.template_key = payload.template_key
    db.commit()
    return {"message": "Resume updated"}


@router.delete("/resumes/{resume_id}")
def admin_delete_resume(resume_id: int, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    db.delete(resume)
    db.commit()
    return {"message": "Resume deleted"}
