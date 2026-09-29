from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/api/data-quality", tags=["data_quality"])

# Fields we check for real "missingness" on a project record — string fields
# that are legitimately optional (e.g. actual_completion_date before closure)
# are excluded from the completeness denominator.
REQUIRED_STRING_FIELDS = [
    "project_name", "project_type", "ministry", "implementing_agency",
    "state", "district", "taluk", "village", "notification_status",
    "survey_status", "approval_status", "award_status", "legal_dispute_severity",
    "possession_status", "rr_status", "current_stage", "project_start_date",
]


def _assess_project(project: models.Project) -> dict:
    missing = [f for f in REQUIRED_STRING_FIELDS if not getattr(project, f, None)]
    completeness = round(100 * (len(REQUIRED_STRING_FIELDS) - len(missing)) / len(REQUIRED_STRING_FIELDS), 1)

    invalid_dates = False
    try:
        from datetime import date
        if project.project_start_date:
            date.fromisoformat(project.project_start_date)
        if project.planned_completion_date:
            date.fromisoformat(project.planned_completion_date)
    except ValueError:
        invalid_dates = True

    conflicting = project.land_acquired_hectares > project.land_proposed_hectares * 1.05 or project.compensation_paid > project.compensation_assessed * 1.05

    confidence = completeness
    if invalid_dates:
        confidence -= 15
    if conflicting:
        confidence -= 15
    confidence = max(0.0, confidence)

    return {
        "project_id": project.project_id,
        "completeness_percentage": completeness,
        "missing_fields": missing,
        "has_duplicates": False,  # duplicate detection requires cross-project comparison; see /api/data-quality (batch)
        "has_invalid_dates": invalid_dates,
        "has_conflicting_values": conflicting,
        "confidence_score": round(confidence, 1),
    }


@router.get("", response_model=list[schemas.DataQualityOut])
def data_quality_report(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    projects = db.query(models.Project).all()

    # duplicate detection across the whole portfolio: same project_name + state + district
    seen: dict[tuple, int] = {}
    for p in projects:
        key = (p.project_name, p.state, p.district)
        seen[key] = seen.get(key, 0) + 1

    results = []
    for project in projects:
        report = _assess_project(project)
        key = (project.project_name, project.state, project.district)
        if seen[key] > 1:
            report["has_duplicates"] = True
            report["confidence_score"] = max(0.0, report["confidence_score"] - 20)
        results.append(report)
    return results
