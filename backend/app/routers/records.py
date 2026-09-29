from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user, require_roles
from .audit import write_audit_log

legal_router = APIRouter(prefix="/api/legal-cases", tags=["legal-cases"])
rr_router = APIRouter(prefix="/api/rr-records", tags=["rr"])
possession_router = APIRouter(prefix="/api/possession-records", tags=["possession"])
WRITE_ROLES = ("SUPER_ADMIN", "CENTRAL_ADMIN", "STATE_ADMIN", "PROJECT_OFFICER")
DELETE_ROLES = ("SUPER_ADMIN", "CENTRAL_ADMIN")
LEGAL_STATUSES = {"PENDING", "ACTIVE", "RESOLVED", "DISMISSED", "STAYED"}
SEVERITIES = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
RR_STATUSES = {"PENDING", "IN_PROGRESS", "COMPLETED", "ON_HOLD"}
POSSESSION_STATUSES = {"PENDING", "PARTIAL", "TAKEN", "STAYED"}
SURVEY_STATUSES = {"PENDING", "SCHEDULED", "COMPLETED", "DISPUTED"}


def _related(db: Session, project_id: str, parcel_id: str | None, owner_id: str | None = None):
    project = db.query(models.Project).filter_by(project_id=project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    parcel = db.query(models.LandParcel).filter_by(parcel_id=parcel_id).first() if parcel_id else None
    owner = db.query(models.LandOwner).filter_by(owner_id=owner_id).first() if owner_id else None
    if parcel_id and not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    if owner_id and not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    if parcel and parcel.project_pk != project.id:
        raise HTTPException(status_code=422, detail="Parcel does not belong to the selected project")
    if owner and owner.project_pk != project.id:
        raise HTTPException(status_code=422, detail="Owner does not belong to the selected project")
    return project, parcel, owner


def _relations(row):
    return (
        row.project.project_id,
        row.parcel.parcel_id if row.parcel else None,
        row.owner.owner_id if getattr(row, "owner", None) else None,
    )


def _legal_out(row: models.LegalCase) -> schemas.LegalCaseOut:
    project_id, parcel_id, owner_id = _relations(row)
    return schemas.LegalCaseOut(id=row.id, case_id=row.case_id, project_id=project_id, parcel_id=parcel_id, owner_id=owner_id,
        case_number=row.case_number, court=row.court, case_type=row.case_type, status=row.status, severity=row.severity,
        filing_date=row.filing_date, next_hearing_date=row.next_hearing_date, resolution_date=row.resolution_date,
        assigned_officer=row.assigned_officer, remarks=row.remarks, created_at=row.created_at, updated_at=row.updated_at)


def _rr_out(row: models.ResettlementRecord) -> schemas.ResettlementRecordOut:
    project_id, parcel_id, owner_id = _relations(row)
    return schemas.ResettlementRecordOut(id=row.id, rr_id=row.rr_id, project_id=project_id, parcel_id=parcel_id, owner_id=owner_id,
        beneficiary_name=row.beneficiary_name, entitlement_type=row.entitlement_type, status=row.status,
        completion_percentage=row.completion_percentage, package_assessed=row.package_assessed, package_paid=row.package_paid,
        resettlement_site=row.resettlement_site, remarks=row.remarks, created_at=row.created_at, updated_at=row.updated_at)


def _possession_out(row: models.PossessionRecord) -> schemas.PossessionRecordOut:
    return schemas.PossessionRecordOut(id=row.id, possession_id=row.possession_id, project_id=row.project.project_id,
        parcel_id=row.parcel.parcel_id, status=row.status, possession_date=row.possession_date, survey_status=row.survey_status,
        handover_date=row.handover_date, remarks=row.remarks, created_at=row.created_at, updated_at=row.updated_at)


@legal_router.get("", response_model=list[schemas.LegalCaseOut])
def list_legal_cases(project_id: str | None = None, parcel_id: str | None = None, status: str | None = None,
                     db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    query = db.query(models.LegalCase).join(models.LegalCase.project).outerjoin(models.LegalCase.parcel)
    if project_id: query = query.filter(models.Project.project_id == project_id)
    if parcel_id: query = query.filter(models.LandParcel.parcel_id == parcel_id)
    if status: query = query.filter(models.LegalCase.status == status.upper())
    return [_legal_out(row) for row in query.order_by(models.LegalCase.created_at.desc()).limit(500).all()]


@legal_router.post("", response_model=schemas.LegalCaseOut, status_code=201)
def create_legal_case(payload: schemas.LegalCaseCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_roles(*WRITE_ROLES))):
    values = payload.model_dump(exclude={"project_id", "parcel_id", "owner_id"})
    values["status"], values["severity"] = values["status"].upper(), values["severity"].upper()
    if values["status"] not in LEGAL_STATUSES or values["severity"] not in SEVERITIES:
        raise HTTPException(status_code=422, detail="Unsupported legal status or severity")
    project, parcel, owner = _related(db, payload.project_id, payload.parcel_id, payload.owner_id)
    if db.query(models.LegalCase).filter_by(case_id=payload.case_id).first(): raise HTTPException(status_code=409, detail="case_id already exists")
    row = models.LegalCase(project_pk=project.id, parcel_pk=parcel.id if parcel else None, owner_pk=owner.id if owner else None, **values)
    db.add(row); db.commit(); db.refresh(row)
    write_audit_log(db, current_user.email, "LEGAL_CASE_CREATED", "LegalCase", row.case_id)
    return _legal_out(row)


@legal_router.get("/{case_id}", response_model=schemas.LegalCaseOut)
def get_legal_case(case_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    row = db.query(models.LegalCase).filter_by(case_id=case_id).first()
    if not row: raise HTTPException(status_code=404, detail="Legal case not found")
    return _legal_out(row)


@legal_router.put("/{case_id}", response_model=schemas.LegalCaseOut)
def update_legal_case(case_id: str, payload: schemas.LegalCaseUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(require_roles(*WRITE_ROLES))):
    row = db.query(models.LegalCase).filter_by(case_id=case_id).first()
    if not row: raise HTTPException(status_code=404, detail="Legal case not found")
    changes = payload.model_dump(exclude_unset=True)
    if "status" in changes and changes["status"] is not None:
        changes["status"] = changes["status"].upper()
        if changes["status"] not in LEGAL_STATUSES: raise HTTPException(status_code=422, detail="Unsupported case status")
    if "severity" in changes and changes["severity"] is not None:
        changes["severity"] = changes["severity"].upper()
        if changes["severity"] not in SEVERITIES: raise HTTPException(status_code=422, detail="Unsupported severity")
    for field, value in changes.items(): setattr(row, field, value)
    row.updated_at = datetime.utcnow(); db.commit(); db.refresh(row)
    write_audit_log(db, current_user.email, "LEGAL_CASE_UPDATED", "LegalCase", row.case_id)
    return _legal_out(row)


@legal_router.delete("/{case_id}", status_code=204)
def delete_legal_case(case_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(require_roles(*DELETE_ROLES))):
    row = db.query(models.LegalCase).filter_by(case_id=case_id).first()
    if not row: raise HTTPException(status_code=404, detail="Legal case not found")
    db.delete(row); db.commit(); write_audit_log(db, current_user.email, "LEGAL_CASE_DELETED", "LegalCase", case_id)


@rr_router.get("", response_model=list[schemas.ResettlementRecordOut])
def list_rr_records(project_id: str | None = None, owner_id: str | None = None, status: str | None = None,
                    db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    query = db.query(models.ResettlementRecord).join(models.ResettlementRecord.project).outerjoin(models.ResettlementRecord.owner)
    if project_id: query = query.filter(models.Project.project_id == project_id)
    if owner_id: query = query.filter(models.LandOwner.owner_id == owner_id)
    if status: query = query.filter(models.ResettlementRecord.status == status.upper())
    return [_rr_out(row) for row in query.order_by(models.ResettlementRecord.created_at.desc()).limit(500).all()]


@rr_router.post("", response_model=schemas.ResettlementRecordOut, status_code=201)
def create_rr_record(payload: schemas.ResettlementRecordCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_roles(*WRITE_ROLES))):
    values = payload.model_dump(exclude={"project_id", "parcel_id", "owner_id"})
    values["status"] = values["status"].upper()
    if values["status"] not in RR_STATUSES: raise HTTPException(status_code=422, detail="Unsupported R&R status")
    if not 0 <= values["completion_percentage"] <= 100: raise HTTPException(status_code=422, detail="completion_percentage must be between 0 and 100")
    if values["package_assessed"] < 0 or values["package_paid"] < 0 or values["package_paid"] > values["package_assessed"]: raise HTTPException(status_code=422, detail="R&R package amounts are invalid")
    project, parcel, owner = _related(db, payload.project_id, payload.parcel_id, payload.owner_id)
    if db.query(models.ResettlementRecord).filter_by(rr_id=payload.rr_id).first(): raise HTTPException(status_code=409, detail="rr_id already exists")
    row = models.ResettlementRecord(project_pk=project.id, parcel_pk=parcel.id if parcel else None, owner_pk=owner.id if owner else None, **values)
    db.add(row); db.commit(); db.refresh(row); write_audit_log(db, current_user.email, "RR_RECORD_CREATED", "ResettlementRecord", row.rr_id)
    return _rr_out(row)


@rr_router.get("/{rr_id}", response_model=schemas.ResettlementRecordOut)
def get_rr_record(rr_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    row = db.query(models.ResettlementRecord).filter_by(rr_id=rr_id).first()
    if not row: raise HTTPException(status_code=404, detail="R&R record not found")
    return _rr_out(row)


@rr_router.put("/{rr_id}", response_model=schemas.ResettlementRecordOut)
def update_rr_record(rr_id: str, payload: schemas.ResettlementRecordUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(require_roles(*WRITE_ROLES))):
    row = db.query(models.ResettlementRecord).filter_by(rr_id=rr_id).first()
    if not row: raise HTTPException(status_code=404, detail="R&R record not found")
    changes = payload.model_dump(exclude_unset=True)
    status = changes.get("status", row.status)
    completion = changes.get("completion_percentage", row.completion_percentage)
    assessed, paid = changes.get("package_assessed", row.package_assessed), changes.get("package_paid", row.package_paid)
    if status is not None and status.upper() not in RR_STATUSES: raise HTTPException(status_code=422, detail="Unsupported R&R status")
    if not 0 <= completion <= 100 or assessed < 0 or paid < 0 or paid > assessed: raise HTTPException(status_code=422, detail="Invalid R&R completion or package amounts")
    if "status" in changes and changes["status"] is not None: changes["status"] = changes["status"].upper()
    for field, value in changes.items(): setattr(row, field, value)
    row.updated_at = datetime.utcnow(); db.commit(); db.refresh(row); write_audit_log(db, current_user.email, "RR_RECORD_UPDATED", "ResettlementRecord", row.rr_id)
    return _rr_out(row)


@rr_router.delete("/{rr_id}", status_code=204)
def delete_rr_record(rr_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(require_roles(*DELETE_ROLES))):
    row = db.query(models.ResettlementRecord).filter_by(rr_id=rr_id).first()
    if not row: raise HTTPException(status_code=404, detail="R&R record not found")
    db.delete(row); db.commit(); write_audit_log(db, current_user.email, "RR_RECORD_DELETED", "ResettlementRecord", rr_id)


@possession_router.get("", response_model=list[schemas.PossessionRecordOut])
def list_possession_records(project_id: str | None = None, parcel_id: str | None = None, status: str | None = None,
                            db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    query = db.query(models.PossessionRecord).join(models.PossessionRecord.project).join(models.PossessionRecord.parcel)
    if project_id: query = query.filter(models.Project.project_id == project_id)
    if parcel_id: query = query.filter(models.LandParcel.parcel_id == parcel_id)
    if status: query = query.filter(models.PossessionRecord.status == status.upper())
    return [_possession_out(row) for row in query.order_by(models.PossessionRecord.created_at.desc()).limit(500).all()]


@possession_router.post("", response_model=schemas.PossessionRecordOut, status_code=201)
def create_possession_record(payload: schemas.PossessionRecordCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_roles(*WRITE_ROLES))):
    project, parcel, _ = _related(db, payload.project_id, payload.parcel_id)
    values = payload.model_dump(exclude={"project_id", "parcel_id"})
    values["status"], values["survey_status"] = values["status"].upper(), values["survey_status"].upper()
    if values["status"] not in POSSESSION_STATUSES or values["survey_status"] not in SURVEY_STATUSES: raise HTTPException(status_code=422, detail="Unsupported possession or survey status")
    if db.query(models.PossessionRecord).filter_by(possession_id=payload.possession_id).first(): raise HTTPException(status_code=409, detail="possession_id already exists")
    row = models.PossessionRecord(project_pk=project.id, parcel_pk=parcel.id, **values)
    db.add(row); db.commit(); db.refresh(row); write_audit_log(db, current_user.email, "POSSESSION_CREATED", "PossessionRecord", row.possession_id)
    return _possession_out(row)


@possession_router.get("/{possession_id}", response_model=schemas.PossessionRecordOut)
def get_possession_record(possession_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    row = db.query(models.PossessionRecord).filter_by(possession_id=possession_id).first()
    if not row: raise HTTPException(status_code=404, detail="Possession record not found")
    return _possession_out(row)


@possession_router.put("/{possession_id}", response_model=schemas.PossessionRecordOut)
def update_possession_record(possession_id: str, payload: schemas.PossessionRecordUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(require_roles(*WRITE_ROLES))):
    row = db.query(models.PossessionRecord).filter_by(possession_id=possession_id).first()
    if not row: raise HTTPException(status_code=404, detail="Possession record not found")
    changes = payload.model_dump(exclude_unset=True)
    for field, allowed in (("status", POSSESSION_STATUSES), ("survey_status", SURVEY_STATUSES)):
        if field in changes and changes[field] is not None:
            changes[field] = changes[field].upper()
            if changes[field] not in allowed: raise HTTPException(status_code=422, detail=f"Unsupported {field}")
    for field, value in changes.items(): setattr(row, field, value)
    row.updated_at = datetime.utcnow(); db.commit(); db.refresh(row); write_audit_log(db, current_user.email, "POSSESSION_UPDATED", "PossessionRecord", row.possession_id)
    return _possession_out(row)


@possession_router.delete("/{possession_id}", status_code=204)
def delete_possession_record(possession_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(require_roles(*DELETE_ROLES))):
    row = db.query(models.PossessionRecord).filter_by(possession_id=possession_id).first()
    if not row: raise HTTPException(status_code=404, detail="Possession record not found")
    db.delete(row); db.commit(); write_audit_log(db, current_user.email, "POSSESSION_DELETED", "PossessionRecord", possession_id)