"""
ACQUINOVA — Database seeding script.

Creates all tables (for local/dev use — production should use Alembic
migrations, see backend/alembic/) and seeds:
  - one development user per role
  - the synthetic prototype project dataset (data/raw/projects_raw.csv)

Run:
    cd backend && python -m app.seed
"""
from __future__ import annotations

import os
import sys
import json

import pandas as pd
from sqlalchemy import text

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.database import Base, SessionLocal, engine  # noqa: E402
from app import models  # noqa: E402
from app.security import hash_password  # noqa: E402
from app.config import get_settings  # noqa: E402

settings = get_settings()

# Development-only credentials. CHANGE BEFORE ANY REAL DEPLOYMENT.
# Documented here and in README "Development credentials".
DEV_USERS = [
    ("admin@acquinova.gov.in", "Super Admin", "Admin@123", models.Role.SUPER_ADMIN),
    ("central.admin@acquinova.gov.in", "Central Admin", "Admin@123", models.Role.CENTRAL_ADMIN),
    ("state.admin@acquinova.gov.in", "State Admin (Karnataka)", "Admin@123", models.Role.STATE_ADMIN),
    ("district.officer@acquinova.gov.in", "District Officer (Mangaluru)", "Admin@123", models.Role.DISTRICT_OFFICER),
    ("project.officer@acquinova.gov.in", "Project Officer", "Admin@123", models.Role.PROJECT_OFFICER),
    ("analyst@acquinova.gov.in", "Portfolio Analyst", "Admin@123", models.Role.ANALYST),
    ("demo.officer@acquinova.gov.in", "Arjun Sharma", "acquinova", models.Role.VIEWER),
]


def seed_users(db):
    for email, name, password, role in DEV_USERS:
        if db.query(models.User).filter(models.User.email == email).first():
            continue
        db.add(models.User(email=email, full_name=name, hashed_password=hash_password(password), role=role))
    db.commit()


def seed_projects(db):
    if db.query(models.Project).count() > 0:
        print("Projects already seeded, skipping.")
        return
    raw_path = os.path.join(settings.DATA_RAW_DIR, "projects_raw.csv")
    if not os.path.exists(raw_path):
        print(f"WARNING: {raw_path} not found. Run `python ml/src/generate_demo_data.py` first.")
        return
    df = pd.read_csv(raw_path).fillna("")
    for _, row in df.iterrows():
        project = models.Project(
            project_id=row["project_id"],
            project_code=row["project_code"],
            project_name=row["project_name"],
            project_type=row["project_type"],
            ministry=row["ministry"],
            implementing_agency=row["implementing_agency"],
            state=row["state"],
            district=row["district"],
            taluk=row["taluk"],
            village=row["village"],
            latitude=float(row["latitude"]),
            longitude=float(row["longitude"]),
            land_proposed_hectares=float(row["land_proposed_hectares"]),
            land_acquired_hectares=float(row["land_acquired_hectares"]),
            acquisition_percentage=float(row["acquisition_percentage"]),
            affected_families=int(row["affected_families"]),
            displaced_families=int(row["displaced_families"]),
            notification_status=row["notification_status"],
            notification_date=str(row["notification_date"]),
            survey_status=row["survey_status"],
            survey_completion_percentage=float(row["survey_completion_percentage"]),
            approval_status=row["approval_status"],
            approval_pending_days=int(row["approval_pending_days"]),
            award_status=row["award_status"],
            award_date=str(row["award_date"]),
            compensation_assessed=float(row["compensation_assessed"]),
            compensation_paid=float(row["compensation_paid"]),
            compensation_pending=float(row["compensation_pending"]),
            legal_cases=int(row["legal_cases"]),
            legal_dispute_severity=row["legal_dispute_severity"],
            possession_status=row["possession_status"],
            possession_percentage=float(row["possession_percentage"]),
            rr_status=row["rr_status"],
            rr_completion_percentage=float(row["rr_completion_percentage"]),
            documentation_completeness=float(row["documentation_completeness"]),
            stakeholder_responsiveness=float(row["stakeholder_responsiveness"]),
            current_stage=row["current_stage"],
            planned_completion_date=str(row["planned_completion_date"]),
            actual_completion_date=str(row["actual_completion_date"]),
            project_start_date=str(row["project_start_date"]),
            historical_agency_delay_rate=float(row["historical_agency_delay_rate"]),
        )
        db.add(project)
    db.commit()
    print(f"Seeded {len(df)} projects.")


def seed_parcels(db):
    if db.query(models.LandParcel).count() > 0:
        print("Parcels already seeded, skipping.")
        return
    projects = (
        db.query(models.Project)
        .filter(models.Project.project_id.like("ACQ-%"))
        .order_by(models.Project.project_id)
        .limit(20)
        .all()
    )
    if not projects:
        print("No ACQ synthetic projects found; skipping parcel demo seed.")
        return

    count = 0
    for project_index, project in enumerate(projects):
        for parcel_index in range(1, 3):
            latitude = project.latitude + parcel_index * 0.001
            longitude = project.longitude + parcel_index * 0.001
            offset = 0.00035
            geometry = {
                "type": "Polygon",
                "coordinates": [[
                    [longitude - offset, latitude - offset],
                    [longitude + offset, latitude - offset],
                    [longitude + offset, latitude + offset],
                    [longitude - offset, latitude + offset],
                    [longitude - offset, latitude - offset],
                ]],
            }
            parcel = models.LandParcel(
                parcel_id=f"PAR-{project.project_id[-4:]}-{parcel_index:02d}",
                project_pk=project.id,
                survey_number=f"{100 + project_index}/{parcel_index}",
                parcel_number=f"{parcel_index}",
                village=project.village,
                taluk=project.taluk,
                district=project.district,
                state=project.state,
                area_hectares=round(0.4 + 0.15 * parcel_index + 0.01 * project_index, 2),
                acquisition_status=("NOTIFIED" if parcel_index == 1 else "IDENTIFIED"),
                compensation_status=("PENDING" if parcel_index == 1 else "PARTIAL"),
                legal_status=("CLEAR" if project.legal_cases == 0 else "DISPUTED"),
                possession_status=("TAKEN" if project.possession_percentage >= 90 else "PENDING"),
                latitude=latitude,
                longitude=longitude,
                geom=None,
            )
            db.add(parcel)
            db.flush()
            if db.bind and db.bind.dialect.name == "postgresql":
                ring = geometry["coordinates"][0]
                points = ", ".join(f"{point[0]} {point[1]}" for point in ring)
                db.execute(
                    text("UPDATE land_parcels SET geom = ST_SetSRID(ST_GeomFromText(:wkt), 4326) WHERE id = :id"),
                    {"wkt": f"POLYGON(({points}))", "id": parcel.id},
                )
            else:
                parcel.geom = json.dumps(geometry)
            count += 1
    db.commit()
    print(f"Seeded {count} synthetic parcels across {len(projects)} ACQ projects.")


def seed_related_records(db):
    parcels = (
        db.query(models.LandParcel)
        .join(models.LandParcel.project)
        .filter(models.Project.project_id.like("ACQ-%"))
        .order_by(models.LandParcel.parcel_id)
        .all()
    )
    for index, parcel in enumerate(parcels, start=1):
        owner_id = f"OWN-DEMO-{index:04d}"
        owner = db.query(models.LandOwner).filter_by(owner_id=owner_id).first()
        if not owner:
            owner = models.LandOwner(
                owner_id=owner_id,
                parcel_pk=parcel.id,
                project_pk=parcel.project_pk,
                owner_name=f"Synthetic Landholder {index:04d}",
                ownership_share=100.0,
                ownership_type="PRIVATE",
                contact_status="VERIFIED" if index % 3 == 0 else "CONTACTED",
                compensation_status=parcel.compensation_status,
                legal_status=parcel.legal_status,
            )
            db.add(owner)
            db.flush()

        assessed = round(250000 + index * 12500, 2)
        paid = round(assessed * (0.35 if index % 3 == 0 else 0), 2)
        case_id = f"COMP-DEMO-{index:04d}"
        if not db.query(models.CompensationRecord).filter_by(case_id=case_id).first():
            db.add(models.CompensationRecord(
                case_id=case_id, project_pk=parcel.project_pk, parcel_pk=parcel.id, owner_pk=owner.id,
                assessed_amount=assessed, approved_amount=assessed, paid_amount=paid,
                payment_status="PAID" if paid == assessed else "PARTIAL" if paid else "PENDING",
                assessment_date="2026-06-15", approval_date="2026-07-01" if index % 2 == 0 else "",
                payment_date="2026-07-15" if paid else "", remarks="Synthetic academic prototype record",
            ))
        rr_id = f"RR-DEMO-{index:04d}"
        if not db.query(models.ResettlementRecord).filter_by(rr_id=rr_id).first():
            db.add(models.ResettlementRecord(
                rr_id=rr_id, project_pk=parcel.project_pk, parcel_pk=parcel.id, owner_pk=owner.id,
                beneficiary_name=owner.owner_name, entitlement_type="HOUSING_SUPPORT",
                status="IN_PROGRESS" if index % 2 else "PENDING", completion_percentage=40.0 if index % 2 else 0.0,
                package_assessed=150000.0, package_paid=60000.0 if index % 2 else 0.0,
                resettlement_site=f"Demo Site {((index - 1) % 4) + 1}", remarks="Synthetic academic prototype record",
            ))
        legal_case_id = f"LEGAL-DEMO-{index:04d}"
        if index % 4 == 0 and not db.query(models.LegalCase).filter_by(case_id=legal_case_id).first():
            db.add(models.LegalCase(
                case_id=legal_case_id, project_pk=parcel.project_pk, parcel_pk=parcel.id, owner_pk=owner.id,
                case_number=f"SYNTHETIC-{index:04d}/2026", court=f"Demo District Court {((index - 1) % 3) + 1}",
                case_type="COMPENSATION_DISPUTE", status="PENDING", severity="MEDIUM",
                filing_date="2026-07-20", next_hearing_date="2026-10-15", remarks="Synthetic case; not a real court filing",
            ))
        possession_id = f"POS-DEMO-{index:04d}"
        if not db.query(models.PossessionRecord).filter_by(possession_id=possession_id).first():
            db.add(models.PossessionRecord(
                possession_id=possession_id, project_pk=parcel.project_pk, parcel_pk=parcel.id,
                status="TAKEN" if parcel.possession_status == "TAKEN" else "PENDING",
                possession_date="2026-08-01" if parcel.possession_status == "TAKEN" else "",
                survey_status="COMPLETED" if index % 2 == 0 else "SCHEDULED",
                handover_date="2026-08-10" if parcel.possession_status == "TAKEN" else "",
                remarks="Synthetic academic prototype record",
            ))
    db.commit()
    print(f"Seeded synthetic owners and linked compensation/R&R/possession records for {len(parcels)} parcels.")


def seed_document_metadata(db):
    if db.query(models.Document).count() > 0:
        print("Document metadata already seeded, skipping.")
        return
    projects = db.query(models.Project).filter(models.Project.project_id.like("ACQ-%")).order_by(models.Project.project_id).limit(20).all()
    for index, project in enumerate(projects, start=1):
        db.add(models.Document(
            project_pk=project.id,
            document_name=f"SYNTHETIC DEMO - Survey record {index:04d}",
            document_type="Survey",
            uploaded_by="demo.officer@acquinova.gov.in",
            status="Pending Review",
        ))
    db.commit()
    print(f"Seeded {len(projects)} synthetic document metadata records; no files or OCR results were fabricated.")


def seed_predictions(db):
    if db.query(models.Prediction).count() > 0:
        print("Predictions already seeded, skipping.")
        return
    import json
    import sys as _sys
    _sys.path.insert(0, os.path.join(os.path.dirname(__file__), "."))
    from app.services.ml_service import get_prediction_engine, project_to_raw_dict
    from app.routers.alerts import create_alerts_from_prediction

    engine = get_prediction_engine()
    projects = db.query(models.Project).all()
    print(f"Running initial AI predictions for {len(projects)} projects (this calls the real trained model + SHAP)...")
    for project in projects:
        raw = project_to_raw_dict(project)
        result = engine.predict(raw)
        pred = models.Prediction(
            project_pk=project.id,
            probability_of_delay=result["probability_of_delay"],
            risk_score=result["risk_score"],
            risk_category=result["risk_category"],
            expected_delay_days=result["expected_delay_days"],
            model_version=result["model_version"],
            classifier_algorithm=result["classifier_algorithm"],
            regressor_algorithm=result["regressor_algorithm"],
            top_positive_drivers_json=json.dumps(result["top_positive_drivers"]),
            top_negative_drivers_json=json.dumps(result["top_negative_drivers"]),
            stage_risks_json=json.dumps(result["stage_risks"]),
            recommendations_json=json.dumps(result["recommendations"]),
        )
        db.add(pred)
        db.commit()
        db.refresh(pred)
        create_alerts_from_prediction(db, project, result)
    print(f"Generated {len(projects)} initial predictions + alerts.")


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_users(db)
        seed_projects(db)
        seed_parcels(db)
        seed_related_records(db)
        seed_document_metadata(db)
        seed_predictions(db)
    finally:
        db.close()
    print("Seeding complete.")
    print("\nDevelopment login credentials:")
    for email, name, password, role in DEV_USERS:
        print(f"  {email:<35} password: {password:<12} role: {role.value}")


if __name__ == "__main__":
    main()
