from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..database import get_db
from ..security_utils import password_strength, validate_password_strength

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/password-strength")
def check_password_strength(payload: schemas.PasswordStrengthCheck):
    """Live password strength check used by the signup/password-change UI."""
    return password_strength(payload.password)


@router.post("/signup", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def signup(payload: schemas.UserSignup, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    validate_password_strength(payload.password)

    user = models.User(
        email=payload.email,
        hashed_password=auth.hash_password(payload.password),
        name=payload.name or "",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=schemas.Token)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not auth.verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = auth.create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}


@router.post("/logout")
def logout():
    # JWT is stateless: logout is handled client-side by discarding the token.
    # (For real revocation you'd maintain a token blacklist / short-lived tokens + refresh tokens.)
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


@router.put("/me", response_model=schemas.UserOut)
def update_profile(
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if payload.name is not None:
        current_user.name = payload.name
    if payload.profile_image is not None:
        current_user.profile_image = payload.profile_image
    if payload.phone_country_code is not None:
        current_user.phone_country_code = payload.phone_country_code
    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/me/password")
def update_password(
    payload: schemas.PasswordUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if not auth.verify_password(payload.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Old password is incorrect")
    validate_password_strength(payload.new_password)
    current_user.hashed_password = auth.hash_password(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully"}
