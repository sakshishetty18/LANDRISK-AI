from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..deps import get_current_user
from .analytics import _latest_predictions_subquery

router = APIRouter(prefix="/api/map", tags=["gis"])


@router.get("/projects")
def map_projects(
    state: str | None = None,
    district: str | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Project)
    if state:
        query = query.filter(models.Project.state == state)
    if district:
        query = query.filter(models.Project.district == district)
    projects = query.all()

    latest_preds = {p.project_pk: p for p in _latest_predictions_subquery(db).all()}

    features = []
    for project in projects:
        pred = latest_preds.get(project.id)
        features.append({
            "project_id": project.project_id,
            "project_name": project.project_name,
            "state": project.state,
            "district": project.district,
            "latitude": project.latitude,
            "longitude": project.longitude,
            "current_stage": project.current_stage,
            "risk_score": pred.risk_score if pred else None,
            "risk_category": pred.risk_category if pred else "UNSCORED",
            "probability_of_delay": pred.probability_of_delay if pred else None,
            "expected_delay_days": pred.expected_delay_days if pred else None,
        })
    return features
