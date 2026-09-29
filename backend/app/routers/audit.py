from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/api/audit", tags=["audit"])


def write_audit_log(db: Session, user_email: str, action: str, entity: str, entity_id: str, details: str = "") -> None:
    log = models.AuditLog(user_email=user_email, action=action, entity=entity, entity_id=entity_id, details=details)
    db.add(log)
    db.commit()


@router.get("", response_model=list[schemas.AuditLogOut])
def list_audit_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    logs = db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).limit(limit).all()
    return logs
