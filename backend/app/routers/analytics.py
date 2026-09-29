from __future__ import annotations

from sqlalchemy import case, func
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def _latest_predictions_subquery(db: Session):
    """Latest prediction per project, via a correlated max(created_at)."""
    latest_ids = (
        db.query(
            models.Prediction.project_pk,
            func.max(models.Prediction.created_at).label("max_created"),
        )
        .group_by(models.Prediction.project_pk)
        .subquery()
    )
    return (
        db.query(models.Prediction)
        .join(
            latest_ids,
            (models.Prediction.project_pk == latest_ids.c.project_pk)
            & (models.Prediction.created_at == latest_ids.c.max_created),
        )
    )


@router.get("/overview", response_model=schemas.AnalyticsOverview)
def overview(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    total_projects = db.query(models.Project).count()
    latest_preds = _latest_predictions_subquery(db).all()

    at_risk = sum(1 for p in latest_preds if p.risk_category in ("MEDIUM", "HIGH", "CRITICAL"))
    critical = sum(1 for p in latest_preds if p.risk_category == "CRITICAL")
    avg_risk = round(sum(p.risk_score for p in latest_preds) / len(latest_preds), 1) if latest_preds else 0.0
    avg_delay = round(sum(p.expected_delay_days for p in latest_preds) / len(latest_preds), 1) if latest_preds else 0.0
    intervention = sum(1 for p in latest_preds if p.risk_category in ("HIGH", "CRITICAL"))

    return schemas.AnalyticsOverview(
        total_projects=total_projects,
        projects_at_risk=at_risk,
        critical_projects=critical,
        average_risk_score=avg_risk,
        average_predicted_delay=avg_delay,
        projects_requiring_intervention=intervention,
    )


@router.get("/domain-overview", response_model=schemas.DomainOverview)
def domain_overview(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    latest = _latest_predictions_subquery(db).all()
    payable_amount = func.coalesce(models.CompensationRecord.approved_amount, models.CompensationRecord.assessed_amount)
    pending_expr = case((payable_amount > models.CompensationRecord.paid_amount, payable_amount - models.CompensationRecord.paid_amount), else_=0.0)
    pending_amount = db.query(func.coalesce(func.sum(pending_expr), 0)).scalar() or 0
    return schemas.DomainOverview(
        total_projects=db.query(models.Project).count(),
        total_parcels=db.query(models.LandParcel).count(),
        total_owners=db.query(models.LandOwner).count(),
        compensation_cases=db.query(models.CompensationRecord).count(),
        compensation_pending_amount=float(pending_amount),
        legal_cases=db.query(models.LegalCase).count(),
        documents=db.query(models.Document).count(),
        documents_pending_review=db.query(models.Document).filter(models.Document.status.in_(("Pending Review", "Under Review", "Needs Information", "Mismatch Detected"))).count(),
        rr_records=db.query(models.ResettlementRecord).count(),
        rr_completed=db.query(models.ResettlementRecord).filter(models.ResettlementRecord.status == "COMPLETED").count(),
        possession_records=db.query(models.PossessionRecord).count(),
        possession_taken=db.query(models.PossessionRecord).filter(models.PossessionRecord.status == "TAKEN").count(),
        projects_at_risk=sum(1 for prediction in latest if prediction.risk_category in ("MEDIUM", "HIGH", "CRITICAL")),
    )


@router.get("/states")
def by_state(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    rows = (
        db.query(models.Project.state, func.count(models.Project.id))
        .group_by(models.Project.state)
        .all()
    )
    latest_preds = {p.project_pk: p for p in _latest_predictions_subquery(db).all()}
    projects = db.query(models.Project).all()

    state_stats: dict[str, dict] = {}
    for project in projects:
        s = state_stats.setdefault(project.state, {"state": project.state, "project_count": 0, "risk_scores": []})
        s["project_count"] += 1
        pred = latest_preds.get(project.id)
        if pred:
            s["risk_scores"].append(pred.risk_score)

    result = []
    for s in state_stats.values():
        avg_risk = round(sum(s["risk_scores"]) / len(s["risk_scores"]), 1) if s["risk_scores"] else 0.0
        result.append({"state": s["state"], "project_count": s["project_count"], "average_risk_score": avg_risk})
    return sorted(result, key=lambda r: r["average_risk_score"], reverse=True)


@router.get("/districts")
def by_district(state: str | None = None, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    query = db.query(models.Project)
    if state:
        query = query.filter(models.Project.state == state)
    projects = query.all()
    latest_preds = {p.project_pk: p for p in _latest_predictions_subquery(db).all()}

    district_stats: dict[str, dict] = {}
    for project in projects:
        key = f"{project.state}::{project.district}"
        d = district_stats.setdefault(key, {"state": project.state, "district": project.district, "project_count": 0, "risk_scores": []})
        d["project_count"] += 1
        pred = latest_preds.get(project.id)
        if pred:
            d["risk_scores"].append(pred.risk_score)

    result = []
    for d in district_stats.values():
        avg_risk = round(sum(d["risk_scores"]) / len(d["risk_scores"]), 1) if d["risk_scores"] else 0.0
        result.append({"state": d["state"], "district": d["district"], "project_count": d["project_count"], "average_risk_score": avg_risk})
    return sorted(result, key=lambda r: r["average_risk_score"], reverse=True)
