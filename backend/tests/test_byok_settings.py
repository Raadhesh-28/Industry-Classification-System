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
from services.llm_service import ResumeAnalysisResult


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
            "email": "security@strata.io",
            "full_name": "Security Admin",
            "password": "StrongPassword123!",
            "role": "recruiter",
        },
    )
    assert resp.status_code == 201
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def test_ai_status_distinguishes_byok_and_server_default(client):
    headers = _auth_headers(client)

    default_resp = client.get("/api/settings/ai-status", headers=headers)
    assert default_resp.status_code == 200
    body = default_resp.json()
    assert body["active_mode"] in ("server_default", "heuristic_only")
    assert "gemini-4-hydrogen" in body["available_models"]

    byok_resp = client.get(
        "/api/settings/ai-status",
        headers={
            **headers,
            "X-Gemini-API-Key": "AIzaSy-ephemeral-test-key",
            "X-Gemini-Model": "gemini-3.8-flash",
        },
    )
    assert byok_resp.status_code == 200
    byok_body = byok_resp.json()
    assert byok_body["active_mode"] == "byok"
    assert byok_body["active_model"] == "gemini-3.8-flash"
    # Key must never be echoed back
    assert "AIzaSy-ephemeral-test-key" not in byok_resp.text


def test_ai_key_verification_endpoint(client, monkeypatch):
    headers = _auth_headers(client)
    from api import routers

    monkeypatch.setattr(
        routers.llm_service,
        "verify_api_key",
        lambda api_key_override=None, model_override=None: (
            (True, 768, "Verified") if api_key_override == "valid-key" else (False, 0, "Invalid key")
        ),
    )

    ok_resp = client.post(
        "/api/settings/test-ai-key",
        headers={**headers, "X-Gemini-API-Key": "valid-key", "X-Gemini-Model": "gemini-3.8-flash"},
    )
    assert ok_resp.status_code == 200
    assert ok_resp.json()["mode"] == "byok"
    assert ok_resp.json()["embedding_dimensions"] == 768

    bad_resp = client.post(
        "/api/settings/test-ai-key",
        headers={**headers, "X-Gemini-API-Key": "bad-key"},
    )
    assert bad_resp.status_code == 400


def test_upload_forwards_byok_headers_without_persisting(client, monkeypatch):
    headers = _auth_headers(client)
    captured = {}

    from api import routers

    def mock_analyze(text, filename="resume.pdf", api_key_override=None, model_override=None):
        captured["analyze_key"] = api_key_override
        captured["analyze_model"] = model_override
        return ResumeAnalysisResult(
            candidate_name="Jordan Blake",
            role="Platform Engineer",
            primary_industry="INFORMATION-TECHNOLOGY",
            secondary_industry="DevOps/Infrastructure",
            confidence_score=0.92,
            skills=["Kubernetes", "Python"],
            redacted_resume_text="[REDACTED_NAME] Platform Engineer",
        )

    def mock_embed(text, task_type="RETRIEVAL_DOCUMENT", api_key_override=None):
        captured["embed_key"] = api_key_override
        return [0.02] * 768

    monkeypatch.setattr(routers.llm_service, "analyze_resume", mock_analyze)
    monkeypatch.setattr(routers.llm_service, "generate_embedding", mock_embed)

    resp = client.post(
        "/api/upload",
        headers={
            **headers,
            "X-Gemini-API-Key": "user-private-key-999",
            "X-Gemini-Model": "gemini-3.8-flash",
        },
        files={"files": ("jordan.txt", b"Jordan Blake Platform Engineer Kubernetes Python", "text/plain")},
    )
    assert resp.status_code == 200
    assert captured["analyze_key"] == "user-private-key-999"
    assert captured["analyze_model"] == "gemini-3.8-flash"
    assert captured["embed_key"] == "user-private-key-999"
    # Verify shared singleton was never mutated with user's private key
    assert routers.llm_service._cached_api_key != "user-private-key-999"
