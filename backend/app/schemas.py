from pydantic import BaseModel, EmailStr
from typing import Optional, Any, Dict, List
from datetime import datetime


# ---------- Auth ----------
class UserSignup(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = ""


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: EmailStr
    name: str
    profile_image: str
    phone_country_code: str = ""
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    name: Optional[str] = None
    profile_image: Optional[str] = None
    phone_country_code: Optional[str] = None


class PasswordUpdate(BaseModel):
    old_password: str
    new_password: str


class PasswordStrengthCheck(BaseModel):
    password: str


# ---------- Share ----------
class ShareResumeRequest(BaseModel):
    email: EmailStr
    pdf_base64: str
    message: Optional[str] = ""


# ---------- Admin ----------
class AdminLogin(BaseModel):
    email: EmailStr
    password: str


class AdminToken(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AdminUserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None


class AdminResumeUpdate(BaseModel):
    title: Optional[str] = None
    template_key: Optional[str] = None


class AdminProfileOut(BaseModel):
    name: str
    profile_image: str
    email: str  # comes from ADMIN_EMAIL in .env, read-only here

    class Config:
        from_attributes = True


class AdminProfileUpdate(BaseModel):
    name: Optional[str] = None
    profile_image: Optional[str] = None


# ---------- Resume structured data ----------
class ResumeData(BaseModel):
    """Structured resume form data (default template fields)."""
    full_name: str = ""
    email: str = ""
    phone: str = ""
    phone_country_code: str = ""
    address: str = ""
    photo: str = ""  # base64 data URL, shown on the "modern" sidebar template
    summary: str = ""
    # Each skill is normally {"name": str, "level": "basic"|"intermediate"|"expert"},
    # but plain strings are still accepted for backward compatibility with
    # resumes saved before proficiency levels were added.
    skills: List[Any] = []
    experience: List[Dict[str, Any]] = []   # {company, role, start, end, description}
    education: List[Dict[str, Any]] = []    # {school, degree, start, end}
    projects: List[Dict[str, Any]] = []     # {name, description, link}


class ResumeCreate(BaseModel):
    title: str = "Untitled Resume"
    data: ResumeData
    template_key: str = "modern"
    is_fresher: bool = False


class ResumeUpdate(BaseModel):
    title: Optional[str] = None
    data: Optional[ResumeData] = None
    template_key: Optional[str] = None
    is_fresher: Optional[bool] = None


class ResumeOut(BaseModel):
    id: int
    title: str
    data: Dict[str, Any]
    template_key: str = "modern"
    is_fresher: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ResumeVersionOut(BaseModel):
    id: int
    title: str
    data: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True
