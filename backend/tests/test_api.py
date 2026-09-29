from __future__ import annotations

from .conftest import SAMPLE_PROJECT


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_login_success(client):
    r = client.post("/api/auth/login", data={"username": "admin@test.local", "password": "Test@123"})
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_login_wrong_password(client):
    r = client.post("/api/auth/login", data={"username": "admin@test.local", "password": "wrong"})
    assert r.status_code == 401


def test_me_requires_auth(client):
    r = client.get("/api/auth/me")
    assert r.status_code == 401


def test_me_with_token(client, admin_headers):
    r = client.get("/api/auth/me", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["email"] == "admin@test.local"


def test_project_crud_lifecycle(client, admin_headers):
    # Create
    r = client.post("/api/projects", headers=admin_headers, json=SAMPLE_PROJECT)
    assert r.status_code == 201
    created = r.json()

    # Duplicate create fails
    r = client.post("/api/projects", headers=admin_headers, json=SAMPLE_PROJECT)
    assert r.status_code == 409

    # Read
    r = client.get(f"/api/projects/{SAMPLE_PROJECT['project_id']}", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["project_name"] == "Test Highway Project"

    # Update
    r = client.put(
        f"/api/projects/{SAMPLE_PROJECT['project_id']}", headers=admin_headers,
        json={"approval_pending_days": 200},
    )
    assert r.status_code == 200
    assert r.json()["approval_pending_days"] == 200

    # List
    r = client.get("/api/projects", headers=admin_headers)
    assert r.status_code == 200
    assert any(p["project_id"] == SAMPLE_PROJECT["project_id"] for p in r.json())


def test_parcel_crud_filter_geometry_and_rbac(client, admin_headers, viewer_headers):
    project_response = client.post("/api/projects", headers=admin_headers, json=SAMPLE_PROJECT)
    assert project_response.status_code in (201, 409)
    payload = {
        "parcel_id": "PARCEL-TEST-001",
        "project_id": SAMPLE_PROJECT["project_id"],
        "survey_number": "147/2A",
        "parcel_number": "1",
        "village": "Test Village",
        "taluk": "Mangaluru Taluk",
        "district": "Mangaluru",
        "state": "Karnataka",
        "area_hectares": 1.25,
        "geometry": {"type": "Polygon", "coordinates": [[[74.88, 12.87], [74.89, 12.87], [74.89, 12.88], [74.88, 12.87]]]},
    }
    created = client.post("/api/parcels", headers=admin_headers, json=payload)
    assert created.status_code == 201
    assert created.json()["geometry"]["type"] == "Polygon"
    assert created.json()["project_id"] == SAMPLE_PROJECT["project_id"]

    listed = client.get("/api/parcels?state=Karnataka&search=147%2F2A", headers=admin_headers)
    assert listed.status_code == 200
    assert [row["parcel_id"] for row in listed.json()] == ["PARCEL-TEST-001"]
    assert client.get("/api/parcels/PARCEL-TEST-001", headers=admin_headers).status_code == 200

    updated = client.put("/api/parcels/PARCEL-TEST-001", headers=admin_headers, json={"possession_status": "TAKEN"})
    assert updated.status_code == 200
    assert updated.json()["possession_status"] == "TAKEN"
    assert client.post("/api/parcels", headers=viewer_headers, json={**payload, "parcel_id": "PARCEL-TEST-002"}).status_code == 403
    assert client.delete("/api/parcels/PARCEL-TEST-001", headers=admin_headers).status_code == 204


def test_parcel_rejects_invalid_geometry(client, admin_headers):
    payload = {
        "parcel_id": "PARCEL-BAD-GEOM",
        "project_id": SAMPLE_PROJECT["project_id"],
        "survey_number": "1",
        "village": "Test Village",
        "taluk": "Mangaluru Taluk",
        "district": "Mangaluru",
        "state": "Karnataka",
        "area_hectares": 1.0,
        "geometry": {"type": "Polygon", "coordinates": [[[74.88, 12.87], [74.89, 12.87], [74.89, 12.88], [74.88, 12.88]]]},
    }
    response = client.post("/api/parcels", headers=admin_headers, json=payload)
    assert response.status_code == 422


def test_owner_crud_relationship_validation_and_rbac(client, admin_headers, viewer_headers):
    project_response = client.post("/api/projects", headers=admin_headers, json=SAMPLE_PROJECT)
    assert project_response.status_code in (201, 409)
    parcel_payload = {
        "parcel_id": "OWNER-PARCEL-001", "project_id": SAMPLE_PROJECT["project_id"],
        "survey_number": "200/1", "village": "Test Village", "taluk": "Mangaluru Taluk",
        "district": "Mangaluru", "state": "Karnataka", "area_hectares": 1.0,
    }
    parcel = client.post("/api/parcels", headers=admin_headers, json=parcel_payload)
    assert parcel.status_code == 201
    owner_payload = {
        "owner_id": "OWNER-TEST-001", "parcel_id": "OWNER-PARCEL-001",
        "project_id": SAMPLE_PROJECT["project_id"], "owner_name": "Synthetic Owner 001",
        "ownership_share": 50, "ownership_type": "PRIVATE",
    }
    created = client.post("/api/owners", headers=admin_headers, json=owner_payload)
    assert created.status_code == 201
    assert created.json()["owner_name"] == "Synthetic Owner 001"
    assert created.json()["parcel_id"] == "OWNER-PARCEL-001"
    assert client.get("/api/owners?project_id=TEST-0001", headers=admin_headers).json()[0]["owner_id"] == "OWNER-TEST-001"
    updated = client.put("/api/owners/OWNER-TEST-001", headers=admin_headers, json={"contact_status": "VERIFIED"})
    assert updated.status_code == 200
    assert updated.json()["contact_status"] == "VERIFIED"
    assert client.post("/api/owners", headers=viewer_headers, json={**owner_payload, "owner_id": "OWNER-TEST-002"}).status_code == 403
    assert client.delete("/api/owners/OWNER-TEST-001", headers=viewer_headers).status_code == 403
    assert client.delete("/api/owners/OWNER-TEST-001", headers=admin_headers).status_code == 204


def test_compensation_crud_pending_balance_and_validation(client, admin_headers, viewer_headers):
    project_response = client.post("/api/projects", headers=admin_headers, json=SAMPLE_PROJECT)
    assert project_response.status_code in (201, 409)
    payload = {
        "case_id": "COMP-TEST-001", "project_id": SAMPLE_PROJECT["project_id"],
        "assessed_amount": 1000, "approved_amount": 800, "paid_amount": 250,
        "payment_status": "PARTIAL", "assessment_date": "2026-09-01",
    }
    created = client.post("/api/compensation", headers=admin_headers, json=payload)
    assert created.status_code == 201
    assert created.json()["pending_amount"] == 550
    assert client.get("/api/compensation?payment_status=partial", headers=admin_headers).json()[0]["case_id"] == "COMP-TEST-001"
    updated = client.put("/api/compensation/COMP-TEST-001", headers=admin_headers, json={"paid_amount": 800, "payment_status": "PAID"})
    assert updated.status_code == 200
    assert updated.json()["pending_amount"] == 0
    assert client.post("/api/compensation", headers=viewer_headers, json={**payload, "case_id": "COMP-TEST-002"}).status_code == 403
    invalid = client.put("/api/compensation/COMP-TEST-001", headers=admin_headers, json={"paid_amount": 900})
    assert invalid.status_code == 422


def test_legal_rr_possession_workflows(client, admin_headers, viewer_headers):
    project_response = client.post("/api/projects", headers=admin_headers, json=SAMPLE_PROJECT)
    assert project_response.status_code in (201, 409)
    parcel = client.post("/api/parcels", headers=admin_headers, json={
        "parcel_id": "RECORD-PARCEL-001", "project_id": SAMPLE_PROJECT["project_id"],
        "survey_number": "300/1", "village": "Test Village", "taluk": "Mangaluru Taluk",
        "district": "Mangaluru", "state": "Karnataka", "area_hectares": 1,
    })
    assert parcel.status_code == 201
    owner = client.post("/api/owners", headers=admin_headers, json={
        "owner_id": "RECORD-OWNER-001", "parcel_id": "RECORD-PARCEL-001",
        "project_id": SAMPLE_PROJECT["project_id"], "owner_name": "Synthetic Owner 002",
        "ownership_share": 100, "ownership_type": "PRIVATE",
    })
    assert owner.status_code == 201
    legal = client.post("/api/legal-cases", headers=admin_headers, json={
        "case_id": "LEGAL-TEST-001", "project_id": SAMPLE_PROJECT["project_id"],
        "parcel_id": "RECORD-PARCEL-001", "owner_id": "RECORD-OWNER-001",
        "case_number": "SYNTHETIC-CASE-1", "court": "Prototype District Court", "case_type": "TITLE_DISPUTE",
    })
    assert legal.status_code == 201
    rr = client.post("/api/rr-records", headers=admin_headers, json={
        "rr_id": "RR-TEST-001", "project_id": SAMPLE_PROJECT["project_id"],
        "parcel_id": "RECORD-PARCEL-001", "owner_id": "RECORD-OWNER-001",
        "beneficiary_name": "Synthetic Owner 002", "entitlement_type": "RESETTLEMENT",
    })
    assert rr.status_code == 201
    possession = client.post("/api/possession-records", headers=admin_headers, json={
        "possession_id": "POS-TEST-001", "project_id": SAMPLE_PROJECT["project_id"],
        "parcel_id": "RECORD-PARCEL-001", "status": "PARTIAL",
    })
    assert possession.status_code == 201
    assert client.get("/api/legal-cases?parcel_id=RECORD-PARCEL-001", headers=admin_headers).json()[0]["case_id"] == "LEGAL-TEST-001"
    assert client.get("/api/rr-records?owner_id=RECORD-OWNER-001", headers=admin_headers).json()[0]["rr_id"] == "RR-TEST-001"
    assert client.get("/api/possession-records?project_id=TEST-0001", headers=admin_headers).json()[0]["possession_id"] == "POS-TEST-001"
    assert client.put("/api/legal-cases/LEGAL-TEST-001", headers=viewer_headers, json={"status": "RESOLVED"}).status_code == 403


def test_rbac_viewer_cannot_create_project(client, viewer_headers):
    payload = dict(SAMPLE_PROJECT, project_id="TEST-RBAC-0001")
    r = client.post("/api/projects", headers=viewer_headers, json=payload)
    assert r.status_code == 403


def test_rbac_viewer_can_read_projects(client, viewer_headers):
    r = client.get("/api/projects", headers=viewer_headers)
    assert r.status_code == 200


def test_prediction_real_model_output(client, admin_headers):
    r = client.post("/api/predictions", headers=admin_headers, json={"project_id": SAMPLE_PROJECT["project_id"]})
    assert r.status_code == 200
    body = r.json()

    # Probability and risk score must be internally consistent (risk score is
    # literally probability * 100 — see ml/src/predict.py)
    assert 0.0 <= body["probability_of_delay"] <= 1.0
    assert abs(body["risk_score"] - round(body["probability_of_delay"] * 100, 1)) < 0.01
    assert body["risk_category"] in ("LOW", "MEDIUM", "HIGH", "CRITICAL")
    assert body["expected_delay_days"] >= 0
    assert body["classifier_algorithm"] in ("LogisticRegression", "RandomForest", "XGBoost")
    assert body["regressor_algorithm"] in ("LinearRegression", "RandomForest", "XGBoost")

    # Real SHAP output: drivers must reference actual engineered feature names
    from feature_engineering import FEATURE_NAMES
    all_driver_names = {d["feature"] for d in body["top_positive_drivers"]} | {d["feature"] for d in body["top_negative_drivers"]}
    assert all_driver_names.issubset(set(FEATURE_NAMES))

    # 11-stage lifecycle risk must be present and each entry labeled as derived
    assert len(body["stage_risks"]) == 11
    assert all(s["methodology"] == "derived/rule-based" for s in body["stage_risks"])

    # This project has high compensation-pending ratio -> recommendation engine must surface it
    reasons = [rec["reason"] for rec in body["recommendations"]]
    assert any("compensation" in reason.lower() for reason in reasons)


def test_prediction_unknown_project_404(client, admin_headers):
    r = client.post("/api/predictions", headers=admin_headers, json={"project_id": "DOES-NOT-EXIST"})
    assert r.status_code == 404


def test_get_predictions_history(client, admin_headers):
    r = client.get(f"/api/predictions/{SAMPLE_PROJECT['project_id']}", headers=admin_headers)
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_explanation_endpoint(client, admin_headers):
    r = client.get(f"/api/projects/{SAMPLE_PROJECT['project_id']}/explanation", headers=admin_headers)
    assert r.status_code == 200
    assert "top_positive_drivers" in r.json()


def test_recommendations_endpoint(client, admin_headers):
    r = client.get(f"/api/projects/{SAMPLE_PROJECT['project_id']}/recommendations", headers=admin_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list) and len(r.json()) >= 1


def test_stage_risks_endpoint(client, admin_headers):
    r = client.get(f"/api/projects/{SAMPLE_PROJECT['project_id']}/stage-risks", headers=admin_headers)
    assert r.status_code == 200
    assert len(r.json()) == 11


def test_alerts_generated_from_prediction(client, admin_headers):
    r = client.get("/api/alerts", headers=admin_headers)
    assert r.status_code == 200
    alerts = r.json()
    assert len(alerts) >= 1
    # This sample project has >60% compensation pending -> COMPENSATION_OVERDUE alert expected
    assert any(a["alert_type"] == "COMPENSATION_OVERDUE" for a in alerts)


def test_alert_acknowledge_and_resolve(client, admin_headers):
    alerts = client.get("/api/alerts", headers=admin_headers).json()
    alert_id = alerts[0]["id"]

    r = client.post(f"/api/alerts/{alert_id}/acknowledge", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "ACKNOWLEDGED"

    r = client.post(f"/api/alerts/{alert_id}/resolve", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "RESOLVED"


def test_analytics_overview(client, admin_headers):
    r = client.get("/api/analytics/overview", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["total_projects"] >= 1


def test_domain_overview_counts_persisted_records(client, admin_headers):
    project_payload = dict(SAMPLE_PROJECT, project_id="TEST-DOMAIN-OVERVIEW")
    assert client.post("/api/projects", headers=admin_headers, json=project_payload).status_code == 201
    parcel_response = client.post("/api/parcels", headers=admin_headers, json={
        "parcel_id": "OVERVIEW-PARCEL-1", "project_id": project_payload["project_id"],
        "survey_number": "1/1", "village": "Test Village", "taluk": "Mangaluru Taluk",
        "district": "Mangaluru", "state": "Karnataka", "area_hectares": 1.0,
    })
    assert parcel_response.status_code == 201
    result = client.get("/api/analytics/domain-overview", headers=admin_headers)
    assert result.status_code == 200
    body = result.json()
    assert body["total_projects"] >= 1
    assert body["total_parcels"] >= 1
    assert body["compensation_cases"] >= 0
    assert body["documents_pending_review"] >= 0


def test_user_administration_is_super_admin_only_and_never_exposes_hash(client, admin_headers, viewer_headers):
    assert client.get("/api/admin/users", headers=viewer_headers).status_code == 403
    listed = client.get("/api/admin/users", headers=admin_headers)
    assert listed.status_code == 200
    assert all("hashed_password" not in row for row in listed.json())
    created = client.post("/api/admin/users", headers=admin_headers, json={
        "email": "synthetic.owner@test.local", "full_name": "Synthetic Test Account",
        "password": "Local-Test-Password-42", "role": "VIEWER",
    })
    assert created.status_code == 201
    user_id = created.json()["id"]
    assert "hashed_password" not in created.json()
    assert client.put(f"/api/admin/users/{user_id}", headers=admin_headers, json={"role": "ANALYST"}).json()["role"] == "ANALYST"
    assert client.delete(f"/api/admin/users/{user_id}", headers=admin_headers).json()["is_active"] is False


def test_analytics_states(client, admin_headers):
    r = client.get("/api/analytics/states", headers=admin_headers)
    assert r.status_code == 200
    assert any(s["state"] == "Karnataka" for s in r.json())


def test_gis_map_projects(client, admin_headers):
    r = client.get("/api/map/projects", headers=admin_headers)
    assert r.status_code == 200
    assert any(p["project_id"] == SAMPLE_PROJECT["project_id"] for p in r.json())


def test_model_metrics_are_real_not_fake(client, admin_headers):
    r = client.get("/api/model/metrics", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    clf_metrics = body["metrics"]["classification"]["all_models"]
    # All three candidate algorithms must have been actually evaluated
    assert set(clf_metrics.keys()) == {"LogisticRegression", "RandomForest", "XGBoost"}
    for m in clf_metrics.values():
        assert 0.0 <= m["roc_auc"] <= 1.0
    assert body["metadata"]["dataset_provenance"].startswith("Synthetic prototype dataset")


def test_data_quality_endpoint(client, admin_headers):
    r = client.get("/api/data-quality", headers=admin_headers)
    assert r.status_code == 200
    assert any(d["project_id"] == SAMPLE_PROJECT["project_id"] for d in r.json())


def test_documents_create_and_list(client, admin_headers):
    project_r = client.post("/api/projects", headers=admin_headers, json=SAMPLE_PROJECT)
    assert project_r.status_code in (201, 409)

    r = client.post("/api/documents", headers=admin_headers, json={
        "project_id": SAMPLE_PROJECT["project_id"],
        "document_name": "Notification Order.pdf",
        "document_type": "Notification",
        "uploaded_by": "admin@test.local",
    })
    assert r.status_code == 201

    r = client.get(f"/api/documents?project_id={SAMPLE_PROJECT['project_id']}", headers=admin_headers)
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_document_verification_workflow_and_private_file(client, admin_headers, viewer_headers):
    project_payload = dict(SAMPLE_PROJECT, project_id="TEST-DOC-001")
    assert client.post("/api/projects", headers=admin_headers, json=project_payload).status_code == 201
    parcel_payload = {
        "parcel_id": "DOC-PARCEL-001", "project_id": "TEST-DOC-001", "survey_number": "88/4",
        "village": "Test Village", "taluk": "Mangaluru Taluk", "district": "Mangaluru",
        "state": "Karnataka", "area_hectares": 2.5,
    }
    assert client.post("/api/parcels", headers=admin_headers, json=parcel_payload).status_code == 201
    uploaded = client.post(
        "/api/documents/upload",
        headers=admin_headers,
        data={"project_id": "TEST-DOC-001", "document_type": "Survey"},
        files={"file": ("synthetic-survey.pdf", b"%PDF-1.4 synthetic prototype", "application/pdf")},
    )
    assert uploaded.status_code == 201
    document_id = uploaded.json()["id"]
    assert "stored_filename" not in uploaded.json()
    download = client.get(f"/api/documents/{document_id}/file", headers=viewer_headers)
    assert download.status_code == 200
    assert download.content.startswith(b"%PDF")

    captured = client.post(f"/api/documents/{document_id}/extract", headers=admin_headers, json={
        "extracted_fields": {"parcel_id": "DOC-PARCEL-001", "survey_number": "88/4", "area_hectares": "99"},
        "notes": "Manually entered prototype values; OCR was not run.",
    })
    assert captured.status_code == 200
    assert captured.json()["extraction_status"] == "CAPTURED_MANUAL"
    assert "not OCR" in captured.json()["method_label"]

    comparison = client.post(f"/api/documents/{document_id}/compare", headers=admin_headers)
    assert comparison.status_code == 200
    assert comparison.json()["comparison_status"] == "MISMATCH"
    assert any(row["field_name"] == "area_hectares" and row["result"] == "MISMATCH" for row in comparison.json()["mismatches"])

    review = client.post(f"/api/documents/{document_id}/review", headers=admin_headers, json={"status": "UNDER_REVIEW", "remarks": "Checked synthetic sample"})
    assert review.status_code == 201
    decision = client.post(f"/api/documents/{document_id}/decision", headers=admin_headers, json={"decision": "VERIFIED", "remarks": "Prototype review complete"})
    assert decision.status_code == 200
    assert decision.json()["decision"] == "VERIFIED"
    workflow = client.get(f"/api/documents/{document_id}/workflow", headers=viewer_headers)
    assert workflow.status_code == 200
    assert workflow.json()["document"]["status"] == "Verified"
    assert workflow.json()["comparison"]["comparison_status"] == "MISMATCH"
    assert len(workflow.json()["reviews"]) == 1

    denied = client.post(
        "/api/documents/upload", headers=viewer_headers,
        data={"project_id": "TEST-DOC-001", "document_type": "Survey"},
        files={"file": ("another.pdf", b"%PDF demo", "application/pdf")},
    )
    assert denied.status_code == 403


def test_documents_require_valid_metadata(client, admin_headers):
    r = client.post("/api/documents", headers=admin_headers, json={
        "project_id": "   ",
        "document_name": "",
        "document_type": "   ",
        "uploaded_by": "admin@test.local",
    })
    assert r.status_code == 422


def test_audit_log_records_actions(client, admin_headers):
    r = client.get("/api/audit", headers=admin_headers)
    assert r.status_code == 200
    actions = {log["action"] for log in r.json()}
    assert "LOGIN" in actions
    assert "PROJECT_CREATED" in actions
    assert "PREDICTION_GENERATED" in actions
