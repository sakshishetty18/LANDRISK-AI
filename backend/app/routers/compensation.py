from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user, require_roles
from .audit import write_audit_log

router = APIRouter(prefix="/api/compensation", tags=["compensation"])
WRITE_ROLES = ("SUPER_ADMIN", "CENTRAL_ADMIN", "STATE_ADMIN", "PROJECT_OFFICER")
DELETE_ROLES = ("SUPER_ADMIN", "CENTRAL_ADMIN")
PAYMENT_STATUSES = {"PENDING", "PARTIAL", "PAID", "OVERDUE", "DISPUTED"}


def _validate_amounts(assessed: float, approved: float | None, paid: float) -> None:
    if assessed < 0 or (approved is not None and approved < 0) or paid < 0:
        raise HTTPException(status_code=422, detail="Compensation amounts cannot be negative")
    payable = approved if approved is not None else assessed
    if paid > payable:
        raise HTTPException(status_code=422, detail="paid_amount cannot exceed the approved or assessed amount")


def _out(record: models.CompensationRecord) -> schemas.CompensationRecordOut:
    return schemas.CompensationRecordOut(
        id=record.id,
        case_id=record.case_id,
        project_id=record.project.project_id,
        parcel_id=record.parcel.parcel_id if record.parcel else None,
        owner_id=record.owner.owner_id if record.owner else None,
        assessed_amount=record.assessed_amount,
        approved_amount=record.approved_amount,
        paid_amount=record.paid_amount,
        pending_amount=record.pending_amount,
        payment_status=record.payment_status,
        assessment_date=record.assessment_date,
        approval_date=record.approval_date,
        payment_date=record.payment_date,
        remarks=record.remarks,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


@router.get("", response_model=list[schemas.CompensationRecordOut])
def list_compensation(
    project_id: str | None = None,
    parcel_id: str | None = None,
    payment_status: str | None = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.CompensationRecord).join(models.CompensationRecord.project).outerjoin(models.CompensationRecord.parcel)
    if project_id:
        query = query.filter(models.Project.project_id == project_id)
    if parcel_id:
        query = query.filter(models.LandParcel.parcel_id == parcel_id)
    if payment_status:
        query = query.filter(models.CompensationRecord.payment_status == payment_status.upper())
    rows = query.order_by(models.CompensationRecord.created_at.desc()).offset(max(offset, 0)).limit(min(max(limit, 1), 500)).all()
    return [_out(row) for row in rows]


@router.post("", response_model=schemas.CompensationRecordOut, status_code=201)
def create_compensation(
    payload: schemas.CompensationRecordCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(*WRITE_ROLES)),
):
    _validate_amounts(payload.assessed_amount, payload.approved_amount, payload.paid_amount)
    values = payload.model_dump(exclude={"project_id", "parcel_id", "owner_id"})
    values["payment_status"] = values["payment_status"].upper()
    if values["payment_status"] not in PAYMENT_STATUSES:
        raise HTTPException(status_code=422, detail="Unsupported payment_status")
    project = db.query(models.Project).filter_by(project_id=payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    parcel = db.query(models.LandParcel).filter_by(parcel_id=payload.parcel_id).first() if payload.parcel_id else None
    owner = db.query(models.LandOwner).filter_by(owner_id=payload.owner_id).first() if payload.owner_id else None
    if payload.parcel_id and not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    if payload.owner_id and not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    if parcel and parcel.project_pk != project.id:
        raise HTTPException(status_code=422, detail="Parcel does not belong to the selected project")
    if owner and owner.project_pk != project.id:
        raise HTTPException(status_code=422, detail="Owner does not belong to the selected project")
    if db.query(models.CompensationRecord).filter_by(case_id=payload.case_id).first():
        raise HTTPException(status_code=409, detail="case_id already exists")
    record = models.CompensationRecord(project_pk=project.id, parcel_pk=parcel.id if parcel else None, owner_pk=owner.id if owner else None, **values)
    db.add(record)
    db.commit()
    db.refresh(record)
    write_audit_log(db, current_user.email, "COMPENSATION_CREATED", "CompensationRecord", record.case_id)
    return _out(record)


@router.get("/{case_id}", response_model=schemas.CompensationRecordOut)
def get_compensation(case_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    record = db.query(models.CompensationRecord).filter_by(case_id=case_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Compensation case not found")
    return _out(record)


@router.put("/{case_id}", response_model=schemas.CompensationRecordOut)
def update_compensation(
    case_id: str,
    payload: schemas.CompensationRecordUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(*WRITE_ROLES)),
):
    record = db.query(models.CompensationRecord).filter_by(case_id=case_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Compensation case not found")
    changes = payload.model_dump(exclude_unset=True)
    _validate_amounts(changes.get("assessed_amount", record.assessed_amount), changes.get("approved_amount", record.approved_amount), changes.get("paid_amount", record.paid_amount))
    if "payment_status" in changes:
        changes["payment_status"] = changes["payment_status"].upper()
        if changes["payment_status"] not in PAYMENT_STATUSES:
            raise HTTPException(status_code=422, detail="Unsupported payment_status")
    for field, value in changes.items():
        setattr(record, field, value)
    record.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(record)
    write_audit_log(db, current_user.email, "COMPENSATION_UPDATED", "CompensationRecord", record.case_id)
    return _out(record)


@router.delete("/{case_id}", status_code=204)
def delete_compensation(case_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(require_roles(*DELETE_ROLES))):
    record = db.query(models.CompensationRecord).filter_by(case_id=case_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Compensation case not found")
    db.delete(record)
    db.commit()
    write_audit_log(db, current_user.email, "COMPENSATION_DELETED", "CompensationRecord", case_id)
    return None