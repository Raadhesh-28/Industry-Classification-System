"""Initial schema with pgvector, users, and upgraded candidates tables

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-11-20 20:45:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector

revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    if is_postgres:
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    json_col_type = postgresql.JSONB(astext_type=sa.Text()) if is_postgres else sa.JSON()
    embedding_col_type = Vector(768) if is_postgres else sa.JSON()

    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False, server_default="recruiter"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_users_id", "users", ["id"], unique=False)
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "candidates",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("role", sa.String(length=255), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("primary_industry", sa.String(length=120), nullable=True),
        sa.Column("secondary_industry", sa.String(length=120), nullable=True),
        sa.Column("confidence_score", sa.Float(), nullable=True),
        sa.Column("experience_level", sa.String(length=120), nullable=True),
        sa.Column("work_mode", sa.String(length=60), nullable=True),
        sa.Column("resume_text", sa.Text(), nullable=True),
        sa.Column("redacted_resume_text", sa.Text(), nullable=True),
        sa.Column(
            "is_blind_mode_ready",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("skills", json_col_type, nullable=False, server_default="[]"),
        sa.Column("education", json_col_type, nullable=False, server_default="[]"),
        sa.Column("previous_roles", json_col_type, nullable=False, server_default="[]"),
        sa.Column("career_summary", sa.Text(), nullable=True),
        sa.Column("embedding", embedding_col_type, nullable=True),
        sa.Column(
            "uploaded_by_id",
            sa.String(length=36),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_candidates_id", "candidates", ["id"], unique=False)
    op.create_index("ix_candidates_email", "candidates", ["email"], unique=True)
    op.create_index("ix_candidates_primary_industry", "candidates", ["primary_industry"], unique=False)
    op.create_index("ix_candidates_experience_level", "candidates", ["experience_level"], unique=False)
    op.create_index("ix_candidates_work_mode", "candidates", ["work_mode"], unique=False)

    if is_postgres:
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_candidates_embedding_hnsw "
            "ON candidates USING hnsw (embedding vector_cosine_ops)"
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP INDEX IF EXISTS ix_candidates_embedding_hnsw")

    op.drop_index("ix_candidates_work_mode", table_name="candidates")
    op.drop_index("ix_candidates_experience_level", table_name="candidates")
    op.drop_index("ix_candidates_primary_industry", table_name="candidates")
    op.drop_index("ix_candidates_email", table_name="candidates")
    op.drop_index("ix_candidates_id", table_name="candidates")
    op.drop_table("candidates")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_id", table_name="users")
    op.drop_table("users")
