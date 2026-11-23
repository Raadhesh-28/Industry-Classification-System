import uuid
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    JSON,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from core.config import settings
from core.database import Base

# Use native PostgreSQL JSONB and pgvector Vector(768) as the primary types
# (keeping Vector's .cosine_distance() comparator on Candidate.embedding),
# with clean JSON fallback on SQLite for isolated unit tests.
JSONField = JSON(none_as_null=True).with_variant(JSONB(none_as_null=True), "postgresql")
EmbeddingField = Vector(settings.EMBEDDING_DIMENSIONS).with_variant(
    JSON(none_as_null=True), "sqlite"
)


def generate_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, index=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="recruiter")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    candidates = relationship("Candidate", back_populates="uploaded_by")


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(String(36), primary_key=True, index=True, default=generate_uuid)
    name = Column(String(255), nullable=True)
    role = Column(String(255), nullable=True)
    email = Column(String(255), unique=True, index=True, nullable=True)
    primary_industry = Column(String(120), index=True, nullable=True)
    secondary_industry = Column(String(120), nullable=True)
    confidence_score = Column(Float, nullable=True)
    experience_level = Column(String(120), index=True, nullable=True)
    work_mode = Column(String(60), index=True, nullable=True)

    resume_text = Column(Text, nullable=True)
    redacted_resume_text = Column(Text, nullable=True)
    is_blind_mode_ready = Column(Boolean, nullable=False, default=False)

    skills = Column(JSONField, nullable=False, default=list)
    education = Column(JSONField, nullable=False, default=list)
    previous_roles = Column(JSONField, nullable=False, default=list)
    career_summary = Column(Text, nullable=True)

    embedding = Column(EmbeddingField, nullable=True)

    uploaded_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    uploaded_by = relationship("User", back_populates="candidates")
