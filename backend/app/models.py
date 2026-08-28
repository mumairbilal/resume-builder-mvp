from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, default="")
    profile_image = Column(String, default="")  # URL or base64 string
    phone_country_code = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    resumes = relationship("Resume", back_populates="owner", cascade="all, delete-orphan")


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, default="Untitled Resume")
    data = Column(JSON, nullable=False, default=dict)  # structured resume data
    template_key = Column(String, default="modern")
    is_fresher = Column(Integer, default=0)  # 0/1 flag: hides experience requirement
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="resumes")
    versions = relationship("ResumeVersion", back_populates="resume", cascade="all, delete-orphan")


class ResumeVersion(Base):
    """Stores a snapshot of resume data every time it is updated (history)."""
    __tablename__ = "resume_versions"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=False)
    data = Column(JSON, nullable=False)
    title = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    resume = relationship("Resume", back_populates="versions")


class AdminProfile(Base):
    """Single-row table (id is always 1) holding display info for the admin
    account — name/photo shown in the admin UI. Login credentials themselves
    stay in the backend .env file and are never stored here."""
    __tablename__ = "admin_profile"

    id = Column(Integer, primary_key=True, default=1)
    name = Column(String, default="Admin")
    profile_image = Column(String, default="")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
