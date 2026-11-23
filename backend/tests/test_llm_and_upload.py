import os
import sys
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import Base, get_db
from main import app
from models.models import Candidate
from services.llm_service import (
    EducationEntry,
    LLMService,
    ResumeAnalysisResult,
    RoleEntry,
    redact_pii_fallback,
)


@pytest.fixture()
def test_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestingSessionLocal
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(test_db):
    return TestClient(app)


def test_redact_pii_fallback_strips_sensitive_fields():
    raw = "Jane Doe\njane.doe@example.com | +1 (415) 555-1234\nhttps://linkedin.com/in/janedoe\nPython Engineer"
    redacted = redact_pii_fallback(raw, "Jane Doe")
    assert "jane.doe@example.com" not in redacted
    assert "555-1234" not in redacted
    assert "linkedin.com" not in redacted
    assert "Jane" not in redacted
    assert "[REDACTED_EMAIL]" in redacted
    assert "[REDACTED_PHONE]" in redacted
    assert "[REDACTED_NAME]" in redacted


def test_llm_service_structured_extraction_with_mock_client():
    service = LLMService()
    mock_result = ResumeAnalysisResult(
        candidate_name="Alex Mercer",
        candidate_email="alex@example.com",
        role="Senior Backend Engineer",
        primary_industry="INFORMATION-TECHNOLOGY",
        secondary_industry="Software Development",
        confidence_score=0.94,
        experience_level="Senior Level (6-10 years)",
        work_mode="Remote",
        skills=["Python", "FastAPI", "PostgreSQL", "pgvector"],
        education=[EducationEntry(institution="[REDACTED_INSTITUTION]", degree="B.S. CS")],
        previous_roles=[RoleEntry(title="Staff Engineer", company="Acme Corp", duration="2021-2026")],
        career_summary="Experienced backend engineer specializing in distributed APIs and vector search.",
        redacted_resume_text="[REDACTED_NAME]\n[REDACTED_EMAIL]\nSenior Backend Engineer with Python & FastAPI.",
        is_blind_mode_ready=True,
    )

    mock_response = MagicMock()
    mock_response.parsed = mock_result

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response
    service._get_client = MagicMock(return_value=mock_client)

    result = service.analyze_resume("Alex Mercer\nalex@example.com\nSenior Backend Engineer", "alex.pdf")
    assert result.primary_industry == "INFORMATION-TECHNOLOGY"
    assert result.confidence_score == pytest.approx(0.94)
    assert "FastAPI" in result.skills
    assert "[REDACTED_NAME]" in result.redacted_resume_text
    assert result.is_blind_mode_ready is True


def test_llm_service_falls_back_cleanly_on_error():
    service = LLMService()
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = RuntimeError("429 Quota exceeded")
    service._get_client = MagicMock(return_value=mock_client)

    result = service.analyze_resume(
        "John Smith\njohn@acme.io\nSenior Python AWS Docker Kubernetes Engineer\n2018 - Present",
        "john.pdf",
    )
    assert result.primary_industry == "INFORMATION-TECHNOLOGY"
    assert "john@acme.io" not in result.redacted_resume_text
    assert result.is_blind_mode_ready is True


def test_upload_endpoint_saves_ai_extraction_and_embedding(client, test_db, monkeypatch):
    reg = client.post(
        "/api/auth/register",
        json={
            "email": "hr@talentai.io",
            "full_name": "HR Lead",
            "password": "StrongPassword123!",
        },
    )
    assert reg.status_code == 201
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    mock_analysis = ResumeAnalysisResult(
        candidate_name="Priya Nair",
        candidate_email="priya@example.com",
        role="ML Infrastructure Engineer",
        primary_industry="INFORMATION-TECHNOLOGY",
        secondary_industry="Data Science/Analytics",
        confidence_score=0.96,
        experience_level="Senior Level (6-10 years)",
        work_mode="Hybrid",
        skills=["Python", "PyTorch", "pgvector", "Kubernetes"],
        education=[EducationEntry(institution="[REDACTED_INSTITUTION]", degree="M.S. AI")],
        previous_roles=[RoleEntry(title="ML Engineer", company="CloudScale", duration="2020-2026")],
        career_summary="Builds production RAG and vector search pipelines.",
        redacted_resume_text="[REDACTED_NAME]\n[REDACTED_EMAIL]\nML Infrastructure Engineer.",
        is_blind_mode_ready=True,
    )
    fake_vector = [0.01] * 768

    from api import routers

    monkeypatch.setattr(routers.llm_service, "analyze_resume", lambda text, filename="resume.pdf", **kwargs: mock_analysis)
    monkeypatch.setattr(routers.llm_service, "generate_embedding", lambda text, task_type="RETRIEVAL_DOCUMENT", **kwargs: fake_vector)

    resp = client.post(
        "/api/upload",
        headers=headers,
        files={"files": ("priya_resume.txt", b"Priya Nair\npriya@example.com\nML Infrastructure Engineer", "text/plain")},
    )
    assert resp.status_code == 200, resp.text
    payload = resp.json()
    assert payload[0]["status"] == "Success"
    candidate_id = payload[0]["candidate_id"]

    cand_resp = client.get(f"/api/candidates/{candidate_id}", headers=headers)
    assert cand_resp.status_code == 200
    cand = cand_resp.json()
    assert cand["role"] == "ML Infrastructure Engineer"
    assert cand["confidence_score"] == pytest.approx(0.96)
    assert cand["is_blind_mode_ready"] is True
    assert "[REDACTED_NAME]" in cand["redacted_resume_text"]
    assert cand["career_summary"] == "Builds production RAG and vector search pipelines."

    db = test_db()
    db_cand = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    assert len(db_cand.embedding) == 768
    db.close()
