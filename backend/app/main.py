import os

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from . import models, models_extra  # noqa: F401 (models_extra registers ShareEvent table)
from .database import engine, get_db
from .routers import auth as auth_router
from .routers import resumes as resumes_router
from .routers import admin as admin_router
from .routers import ats as ats_router

# Create all tables (simple MVP approach; use Alembic migrations in production)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Resume Builder API", version="1.0.0")

# Allow the React dev server (local) + the deployed frontend to call this API.
# Set FRONTEND_URL in the backend's environment (e.g. "https://your-app.vercel.app")
# once the frontend is deployed, so the browser doesn't block requests with a
# CORS error. Comma-separate multiple URLs if needed (e.g. preview + prod).
extra_origins = [o.strip() for o in os.getenv("FRONTEND_URL", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", *extra_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Compresses responses over 1KB (e.g. resume lists, ATS score breakdowns)
# before sending them over the network — smaller payload = faster load,
# especially over a slower/mobile connection.
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(auth_router.router)
app.include_router(resumes_router.router)
app.include_router(admin_router.router)
app.include_router(ats_router.router)


@app.get("/")
def root():
    return {"status": "ok", "message": "Resume Builder API is running"}


@app.get("/health/db")
def health_db(db: Session = Depends(get_db)):
    """
    Runs a trivial query against the database. Used as a keep-alive
    target (e.g. a free cron-job.org ping every few minutes) so that
    serverless Postgres providers like Neon see recent activity and
    don't suspend their compute — which is what causes the slow first
    request / cold start after periods of inactivity.
    """
    db.execute(text("SELECT 1"))
    return {"status": "ok"}
