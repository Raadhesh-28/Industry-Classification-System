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


def register_and_get_headers(client: TestClient, email: str = "recruiter@talentai.io"):
    resp = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "full_name": "Alex Rivera",
            "password": "StrongPassword123!",
            "role": "recruiter",
        },
    )
    assert resp.status_code == 201, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}, resp.json()


def test_health_endpoint(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "healthy"
    assert body["database"] == "ok"


def test_register_login_and_me_flow(client):
    headers, reg_data = register_and_get_headers(client)
    assert reg_data["token_type"] == "bearer"
    assert reg_data["user"]["email"] == "recruiter@talentai.io"
    assert reg_data["user"]["role"] == "recruiter"

    # Duplicate email must return 409 Conflict
    dup = client.post(
        "/api/auth/register",
        json={
            "email": "RECRUITER@talentai.io",
            "full_name": "Duplicate User",
            "password": "StrongPassword123!",
        },
    )
    assert dup.status_code == 409

    # Login with valid credentials
    login_resp = client.post(
        "/api/auth/login",
        json={"email": "recruiter@talentai.io", "password": "StrongPassword123!"},
    )
    assert login_resp.status_code == 200
    assert login_resp.json()["access_token"]

    # Login with invalid password
    bad_login = client.post(
        "/api/auth/login",
        json={"email": "recruiter@talentai.io", "password": "WrongPassword!"},
    )
    assert bad_login.status_code == 401

    # Protected /me endpoint
    me_resp = client.get("/api/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "recruiter@talentai.io"


def test_candidates_routes_require_jwt(client):
    assert client.get("/api/candidates").status_code == 401
    assert client.get("/api/candidates/nonexistent").status_code == 401
    assert client.delete("/api/candidates/nonexistent").status_code == 401


def test_candidates_pagination_filtering_and_delete(client, test_db):
    headers, reg_data = register_and_get_headers(client)
    user_id = reg_data["user"]["id"]

    db = test_db()
    db.add_all(
        [
            Candidate(
                name="Jane Doe",
                role="Backend Engineer",
                primary_industry="INFORMATION-TECHNOLOGY",
                experience_level="Senior Level (6-10 years)",
                work_mode="Remote",
                resume_text="Senior Python FastAPI PostgreSQL engineer",
                skills=["Python", "FastAPI", "PostgreSQL"],
                uploaded_by_id=user_id,
            ),
            Candidate(
                name="John Smith",
                role="Financial Analyst",
                primary_industry="FINANCE",
                experience_level="Mid-Level (3-5 years)",
                work_mode="Hybrid",
                resume_text="Corporate finance FP&A Excel modeling",
                skills=["Excel", "FP&A"],
                uploaded_by_id=user_id,
            ),
        ]
    )
    db.commit()
    db.close()

    # Paginated list
    resp = client.get("/api/candidates?skip=0&limit=1", headers=headers)
    assert resp.status_code == 200
    assert resp.headers["X-Total-Count"] == "2"
    assert len(resp.json()) == 1

    # Filter by industry
    filtered = client.get(
        "/api/candidates?industry=INFORMATION-TECHNOLOGY", headers=headers
    )
    assert filtered.status_code == 200
    items = filtered.json()
    assert len(items) == 1
    assert items[0]["name"] == "Jane Doe"
    cand_id = items[0]["id"]

    # Fetch single candidate
    single = client.get(f"/api/candidates/{cand_id}", headers=headers)
    assert single.status_code == 200
    assert single.json()["id"] == cand_id

    # Delete candidate
    deleted = client.delete(f"/api/candidates/{cand_id}", headers=headers)
    assert deleted.status_code == 204
    assert client.get(f"/api/candidates/{cand_id}", headers=headers).status_code == 404
