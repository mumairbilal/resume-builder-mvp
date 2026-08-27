from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models, models_extra  # noqa: F401 (models_extra registers ShareEvent table)
from .database import engine
from .routers import auth as auth_router
from .routers import resumes as resumes_router
from .routers import admin as admin_router

# Create all tables (simple MVP approach; use Alembic migrations in production)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Resume Builder API", version="1.0.0")

# Allow the React dev server to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(resumes_router.router)
app.include_router(admin_router.router)


@app.get("/")
def root():
    return {"status": "ok", "message": "Resume Builder API is running"}
