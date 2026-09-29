from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


def create_alerts_from_prediction(db: Session, project: models.Project, result: dict) -> None:
    """
    Alerts are generated from the ACTUAL prediction result and raw project
    fields — not scheduled randomly. Each condition maps to a documented
    alert type from the spec.
    """
    candidates = []

    if result["risk_category"] == "CRITICAL":
        candidates.append(("CRITICAL_RISK", "CRITICAL", f"{project.project_name} is at CRITICAL risk (score {result['risk_score']})."))
    elif result["risk_category"] == "HIGH":
        candidates.append(("HIGH_RISK", "HIGH", f"{project.project_name} is at HIGH risk (score {result['risk_score']})."))

    if project.approval_pending_days > 120:
        candidates.append(("APPROVAL_OVERDUE", "HIGH", f"Approval pending {project.approval_pending_days} days for {project.project_name}."))

    if project.compensation_assessed > 0 and (project.compensation_pending / project.compensation_assessed) > 0.6:
        candidates.append(("COMPENSATION_OVERDUE", "HIGH", f"Over 60% of assessed compensation is unpaid for {project.project_name}."))

    if project.legal_dispute_severity in ("Medium", "High"):
        candidates.append(("LEGAL_CASE", "CRITICAL" if project.legal_dispute_severity == "High" else "HIGH",
                            f"{project.legal_dispute_severity}-severity legal dispute active on {project.project_name}."))

    if project.rr_completion_percentage < 30 and project.current_stage in ("Possession", "Rehabilitation", "Closure"):
        candidates.append(("RR_DELAY", "MEDIUM", f"R&R only {project.rr_completion_percentage}% complete for {project.project_name}."))

    for alert_type, severity, message in candidates:
        exists = (
            db.query(models.Alert)
            .filter(models.Alert.project_pk == project.id, models.Alert.alert_type == alert_type, models.Alert.status != models.AlertStatus.RESOLVED)
            .first()
        )
        if not exists:
            db.add(models.Alert(project_pk=project.id, alert_type=alert_type, severity=severity, message=message))
    db.commit()


@router.get("", response_model=list[schemas.AlertOut])
def list_alerts(
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Alert)
    if status:
        query = query.filter(models.Alert.status == status)
    return query.order_by(models.Alert.created_at.desc()).all()


@router.post("/{alert_id}/acknowledge", response_model=schemas.AlertOut)
def acknowledge_alert(alert_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = models.AlertStatus.ACKNOWLEDGED
    alert.acknowledged_at = datetime.utcnow()
    alert.acknowledged_by = current_user.email
    db.commit()
    db.refresh(alert)

    from .audit import write_audit_log
    write_audit_log(db, current_user.email, "ALERT_ACKNOWLEDGED", "Alert", str(alert_id))
    return alert


@router.post("/{alert_id}/resolve", response_model=schemas.AlertOut)
def resolve_alert(alert_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = models.AlertStatus.RESOLVED
    alert.resolved_at = datetime.utcnow()
    alert.resolved_by = current_user.email
    db.commit()
    db.refresh(alert)

    from .audit import write_audit_log
    write_audit_log(db, current_user.email, "ALERT_RESOLVED", "Alert", str(alert_id))
    return alert
