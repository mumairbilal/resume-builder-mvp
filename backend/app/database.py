import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Set DATABASE_URL in production (e.g. Neon/Supabase/Railway Postgres
# connection string) so data survives restarts. Falls back to a local
# SQLite file for local development if it's not set.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./resume_builder.db")

# Some hosts give a "postgres://" URL; SQLAlchemy needs "postgresql://"
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# Neon (and most serverless Postgres providers) silently close idle
# connections on their end after a short period, and can suspend the
# underlying compute entirely when idle. Without these settings,
# SQLAlchemy's connection pool keeps reusing a connection it thinks is
# still alive, and the first query after any idle period fails with:
#   sqlalchemy.exc.OperationalError: SSL connection has been closed unexpectedly
#
# pool_pre_ping: runs a cheap "SELECT 1" before handing out a pooled
#   connection, and transparently reconnects if it's dead. This is what
#   actually fixes the crash.
# pool_recycle: proactively discards connections older than this many
#   seconds, so we recycle *before* Neon's own idle timeout kicks in
#   rather than finding out the hard way.
# pool_size / max_overflow: kept small on purpose — serverless Postgres
#   plans cap total concurrent connections, and a small web app doesn't
#   need a large pool.
engine_kwargs = {"connect_args": connect_args}
if not DATABASE_URL.startswith("sqlite"):
    engine_kwargs.update(
        pool_pre_ping=True,
        pool_recycle=280,
        pool_size=5,
        max_overflow=5,
    )

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
