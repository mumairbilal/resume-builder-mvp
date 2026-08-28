import os
import re
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from .auth import SECRET_KEY, ALGORITHM

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@resumly.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "ChangeMeAdmin123!")
ADMIN_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8 hours

admin_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="admin/login", auto_error=False)


# ---------------- Password strength ----------------
def password_strength(password: str) -> dict:
    """Returns a score 0-4 and label, mirrors common UX password meters."""
    score = 0
    checks = {
        "length": len(password) >= 8,
        "lowercase": bool(re.search(r"[a-z]", password)),
        "uppercase": bool(re.search(r"[A-Z]", password)),
        "digit": bool(re.search(r"\d", password)),
        "special": bool(re.search(r"[^A-Za-z0-9]", password)),
    }
    score = sum(checks.values())
    if len(password) >= 12 and score >= 4:
        score = 5

    labels = {0: "Very Weak", 1: "Very Weak", 2: "Weak", 3: "Fair", 4: "Strong", 5: "Very Strong"}
    return {
        "score": min(score, 5),
        "label": labels[min(score, 5)],
        "checks": checks,
    }


def validate_password_strength(password: str) -> None:
    """Raises HTTPException if password does not meet minimum bar."""
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
    result = password_strength(password)
    if result["score"] < 3:
        raise HTTPException(
            status_code=400,
            detail="Password is too weak. Use at least 8 characters with a mix of uppercase, "
                   "lowercase, numbers, and a special character.",
        )


EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")


def validate_email_format(email: str) -> bool:
    return bool(EMAIL_RE.match(email or ""))


# ---------------- Admin auth (separate from user auth, env-based) ----------------
def create_admin_token() -> str:
    expire = datetime.utcnow() + timedelta(minutes=ADMIN_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": "admin", "role": "admin", "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def get_current_admin(token: Optional[str] = Depends(admin_oauth2_scheme)):
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing admin credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise exc
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("role") != "admin":
            raise exc
    except JWTError:
        raise exc
    return True
