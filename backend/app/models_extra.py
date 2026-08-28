# Extra models appended here to avoid re-touching models.py repeatedly.
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from datetime import datetime

from .database import Base


class ShareEvent(Base):
    __tablename__ = "share_events"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=False)
    sent_to = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
