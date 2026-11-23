import os
import sys

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import Base, get_db
from main import app
from models.models import Candidate
from services.llm_service import CandidateMatchEvaluation


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


def _auth_headers(client: TestClient):
    resp = client.post(
        "/api/auth/register",
        json={
            "email": "matcher@talentai.io",
            "full_name": "Hiring Lead",
            "password": "StrongPassword123!",
            "role": "hiring_manager",
        },
    )
    assert resp.status_code == 201
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}, resp.json()["user"]["id"]


def _unit_vec(axis: int, dims: int = 768):
    v = [0.0] * dims
    v[axis] = 1.0
    return v


def test_semantic_search_vector_ranking_and_blind_mode(client, test_db, monkeypatch):
    headers, user_id = _auth_headers(client)

    db = test_db()
    c_eng = Candidate(
        name="Alice Chen",
        email="alice@example.com",
        role="Senior Distributed Systems Engineer",
        primary_industry="INFORMATION-TECHNOLOGY",
        experience_level="Senior Level (6-10 years)",
        work_mode="Remote",
        resume_text="Alice Chen alice@example.com Python FastAPI PostgreSQL pgvector distributed systems",
        redacted_resume_text="[REDACTED_NAME] [REDACTED_EMAIL] Python FastAPI PostgreSQL pgvector distributed systems",
        is_blind_mode_ready=True,
        skills=["Python", "FastAPI", "PostgreSQL", "pgvector"],
        education=[{"institution": "MIT", "degree": "B.S. Computer Science"}],
        embedding=_unit_vec(0),
        uploaded_by_id=user_id,
    )
    c_fin = Candidate(
        name="Bob Vance",
        email="bob@example.com",
        role="Investment Banking Associate",
        primary_industry="FINANCE",
        experience_level="Mid-Level (3-5 years)",
        work_mode="On-site",
        resume_text="Bob Vance bob@example.com M&A financial modeling Excel valuation",
        redacted_resume_text="[REDACTED_NAME] [REDACTED_EMAIL] M&A financial modeling Excel valuation",
        is_blind_mode_ready=True,
        skills=["Financial Modeling", "Excel", "M&A"],
        embedding=_unit_vec(1),
        uploaded_by_id=user_id,
    )
    db.add_all([c_eng, c_fin])
    db.commit()
    db.close()

    from services import search_service

    # Query vector aligns with axis 0 (Alice Chen)
    monkeypatch.setattr(
        search_service.llm_service,
        "generate_embedding",
        lambda text, task_type="RETRIEVAL_QUERY", **kwargs: _unit_vec(0),
    )

    resp = client.get(
        "/api/candidates/search?q=Senior+Python+vector+database+engineer&blind_mode=true",
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["search_mode"] == "vector"
    assert body["blind_mode"] is True
    assert body["total"] == 2

    top = body["results"][0]
    assert top["similarity_score"] == pytest.approx(1.0)
    assert top["candidate"]["name"].startswith("Blind Candidate #")
    assert top["candidate"]["email"] is None
    assert "[REDACTED_NAME]" in top["candidate"]["resume_text"]
    assert top["candidate"]["education"][0]["institution"] == "[REDACTED_INSTITUTION]"


def test_agentic_jd_match_endpoint(client, test_db, monkeypatch):
    headers, user_id = _auth_headers(client)

    db = test_db()
    c1 = Candidate(
        name="Elena Rostova",
        email="elena@example.com",
        role="Backend Architect",
        primary_industry="INFORMATION-TECHNOLOGY",
        experience_level="Senior Level (6-10 years)",
        work_mode="Remote",
        resume_text="Elena Rostova Python FastAPI PostgreSQL AWS",
        redacted_resume_text="[REDACTED_NAME] Python FastAPI PostgreSQL AWS",
        is_blind_mode_ready=True,
        skills=["Python", "FastAPI", "PostgreSQL", "AWS"],
        embedding=_unit_vec(0),
        uploaded_by_id=user_id,
    )
    c2 = Candidate(
        name="Marcus Cole",
        email="marcus@example.com",
        role="Frontend Developer",
        primary_industry="INFORMATION-TECHNOLOGY",
        experience_level="Mid-Level (3-5 years)",
        work_mode="Hybrid",
        resume_text="Marcus Cole React TypeScript CSS",
        redacted_resume_text="[REDACTED_NAME] React TypeScript CSS",
        is_blind_mode_ready=True,
        skills=["React", "TypeScript"],
        embedding=_unit_vec(1),
        uploaded_by_id=user_id,
    )
    db.add_all([c1, c2])
    db.commit()
    c1_id, c2_id = c1.id, c2.id
    db.close()

    from api import routers
    from services import search_service

    monkeypatch.setattr(
        search_service.llm_service,
        "generate_embedding",
        lambda text, task_type="RETRIEVAL_QUERY", **kwargs: _unit_vec(0),
    )

    def mock_evaluate(job_description, candidates_payload, job_title=None, **kwargs):
        # Verify PII was NOT sent in payload
        for item in candidates_payload:
            assert "Elena" not in item["redacted_excerpt"]
            assert "Marcus" not in item["redacted_excerpt"]
        return (
            [
                CandidateMatchEvaluation(
                    candidate_id=c1_id,
                    match_score=93,
                    matched_skills=["Python", "FastAPI", "PostgreSQL"],
                    missing_skills=["Kubernetes"],
                    justification="Strong alignment with backend Python and PostgreSQL requirements; lacks explicit Kubernetes experience.",
                    recommended_interview_questions=[
                        "How have you tuned PostgreSQL indexes for high-throughput workloads?",
                        "What container orchestration patterns have you used in production?",
                    ],
                ),
                CandidateMatchEvaluation(
                    candidate_id=c2_id,
                    match_score=48,
                    matched_skills=["TypeScript"],
                    missing_skills=["Python", "FastAPI", "PostgreSQL"],
                    justification="Primarily frontend-focused with limited backend Python and database architecture exposure.",
                    recommended_interview_questions=[
                        "Have you built or maintained backend REST APIs in Python?",
                        "How do you approach relational database schema design?",
                    ],
                ),
            ],
            "gemini_agent",
        )

    monkeypatch.setattr(routers.llm_service, "evaluate_jd_matches", mock_evaluate)

    resp = client.post(
        "/api/match",
        headers=headers,
        json={
            "job_title": "Staff Backend Engineer",
            "job_description": "We need a Senior Python FastAPI PostgreSQL engineer with AWS and Kubernetes experience.",
            "top_k": 5,
            "blind_mode": True,
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["evaluation_mode"] == "gemini_agent"
    assert body["search_mode"] == "vector"
    assert body["blind_mode"] is True
    assert body["evaluated_count"] == 2
    assert body["matches"][0]["match_score"] == 93
    assert body["matches"][0]["candidate"]["name"].startswith("Blind Candidate #")
    assert "Kubernetes" in body["matches"][0]["missing_skills"]
    assert len(body["matches"][0]["recommended_interview_questions"]) == 2


def test_reindex_endpoint_backfills_missing_embeddings(client, test_db, monkeypatch):
    headers, user_id = _auth_headers(client)

    db = test_db()
    c = Candidate(
        name="Sam Lee",
        role="Data Scientist",
        primary_industry="INFORMATION-TECHNOLOGY",
        resume_text="Sam Lee sam@example.com Python Machine Learning",
        skills=["Python", "Machine Learning"],
        embedding=None,
        uploaded_by_id=user_id,
    )
    db.add(c)
    db.commit()
    cand_id = c.id
    db.close()

    from api import routers

    monkeypatch.setattr(
        routers.llm_service,
        "generate_embedding",
        lambda text, task_type="RETRIEVAL_DOCUMENT", **kwargs: _unit_vec(2),
    )

    resp = client.post("/api/candidates/reindex?batch_size=10", headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["processed"] == 1
    assert data["embedded"] == 1
    assert data["remaining_without_embeddings"] == 0

    db = test_db()
    updated = db.query(Candidate).filter(Candidate.id == cand_id).first()
    assert updated.embedding is not None
    assert updated.is_blind_mode_ready is True
    assert "[REDACTED_EMAIL]" in updated.redacted_resume_text
    db.close()
