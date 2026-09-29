from __future__ import annotations

import os
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

_DB_PATH = os.path.join(os.path.dirname(__file__), "test_conftest.db")

# Remove any leftover DB file BEFORE importing app modules, so the engine's
# connection pool (created at import time via app.main's module-level
# Base.metadata.create_all) never touches a file we then delete out from
# under it. Deleting the file *after* the engine already opened a pooled
# connection to it left stale connections pointing at the unlinked inode,
# which SQLite then reports as "attempt to write a readonly database".
if os.path.exists(_DB_PATH):
    os.remove(_DB_PATH)

os.environ["DATABASE_URL"] = f"sqlite:///{_DB_PATH}"
os.environ["SECRET_KEY"] = "test-secret-key"

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app import models  # noqa: E402
from app.security import hash_password  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _setup_db():
    # Tables were already created by app.main's module-level create_all()
    # above, against this same engine — don't drop/recreate the file here,
    # just seed it.
    db = SessionLocal()
    db.add(models.User(
        email="admin@test.local", full_name="Test Admin",
        hashed_password=hash_password("Test@123"), role=models.Role.SUPER_ADMIN,
    ))
    db.add(models.User(
        email="viewer@test.local", full_name="Test Viewer",
        hashed_password=hash_password("Test@123"), role=models.Role.VIEWER,
    ))
    db.commit()
    db.close()
    yield
    engine.dispose()
    if os.path.exists(_DB_PATH):
        os.remove(_DB_PATH)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def admin_token(client):
    r = client.post("/api/auth/login", data={"username": "admin@test.local", "password": "Test@123"})
    return r.json()["access_token"]


@pytest.fixture
def viewer_token(client):
    r = client.post("/api/auth/login", data={"username": "viewer@test.local", "password": "Test@123"})
    return r.json()["access_token"]


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def viewer_headers(viewer_token):
    return {"Authorization": f"Bearer {viewer_token}"}


SAMPLE_PROJECT = {
    "project_id": "TEST-0001",
    "project_code": "TST-KA-0001",
    "project_name": "Test Highway Project",
    "project_type": "National Highway",
    "ministry": "Ministry of Road Transport and Highways",
    "implementing_agency": "National Highways Authority of India",
    "state": "Karnataka",
    "district": "Mangaluru",
    "taluk": "Mangaluru Taluk",
    "village": "Test Village",
    "latitude": 12.87,
    "longitude": 74.88,
    "land_proposed_hectares": 45.5,
    "land_acquired_hectares": 20.0,
    "acquisition_percentage": 44.0,
    "affected_families": 120,
    "displaced_families": 30,
    "notification_status": "Completed",
    "notification_date": "2024-01-15",
    "survey_status": "In Progress",
    "survey_completion_percentage": 60.0,
    "approval_status": "Pending",
    "approval_pending_days": 140,
    "award_status": "Not Started",
    "award_date": "",
    "compensation_assessed": 50000000.0,
    "compensation_paid": 15000000.0,
    "compensation_pending": 35000000.0,
    "legal_cases": 3,
    "legal_dispute_severity": "Medium",
    "possession_status": "In Progress",
    "possession_percentage": 40.0,
    "rr_status": "In Progress",
    "rr_completion_percentage": 25.0,
    "documentation_completeness": 55.0,
    "stakeholder_responsiveness": 45.0,
    "current_stage": "Compensation",
    "planned_completion_date": "2027-01-01",
    "actual_completion_date": "",
    "project_start_date": "2023-06-01",
    "historical_agency_delay_rate": 0.35,
}
