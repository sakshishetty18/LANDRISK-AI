from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user, require_roles
from .audit import write_audit_log

router = APIRouter(prefix="/api/owners", tags=["owners"])
WRITE_ROLES = ("SUPER_ADMIN", "CENTRAL_ADMIN", "STATE_ADMIN", "PROJECT_OFFICER")
DELETE_ROLES = ("SUPER_ADMIN", "CENTRAL_ADMIN")
CONTACT_STATUSES = {"NOT_CONTACTED", "CONTACTED", "VERIFIED", "UNREACHABLE"}
COMPENSATION_STATUSES = {"PENDING", "PARTIAL", "PAID", "DISPUTED", "NOT_APPLICABLE"}
LEGAL_STATUSES = {"CLEAR", "DISPUTED", "IN_CASE", "RESOLVED"}


def _owner_out(owner: models.LandOwner) -> schemas.LandOwnerOut:
    return schemas.LandOwnerOut(
        id=owner.id,
        owner_id=owner.owner_id,
        parcel_id=owner.parcel.parcel_id,
        project_id=owner.project.project_id,
        owner_name=owner.owner_name,
        ownership_share=owner.ownership_share,
        ownership_type=owner.ownership_type,
        contact_status=owner.contact_status,
        compensation_status=owner.compensation_status,
        legal_status=owner.legal_status,
        created_at=owner.created_at,
        updated_at=owner.updated_at,
    )


def _validate_statuses(values: dict) -> None:
    for field, allowed in (("contact_status", CONTACT_STATUSES), ("compensation_status", COMPENSATION_STATUSES), ("legal_status", LEGAL_STATUSES)):
        if field in values and values[field] is not None:
            values[field] = values[field].upper()
            if values[field] not in allowed:
                raise HTTPException(status_code=422, detail=f"Unsupported {field}")


@router.get("", response_model=list[schemas.LandOwnerOut])
def list_owners(
    project_id: str | None = None,
    parcel_id: str | None = None,
    contact_status: str | None = None,
    compensation_status: str | None = None,
    legal_status: str | None = None,
    search: str | None = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.LandOwner).join(models.LandOwner.parcel).join(models.LandOwner.project)
    if project_id:
        query = query.filter(models.Project.project_id == project_id)
    if parcel_id:
        query = query.filter(models.LandParcel.parcel_id == parcel_id)
    for field, value in (("contact_status", contact_status), ("compensation_status", compensation_status), ("legal_status", legal_status)):
        if value:
            query = query.filter(getattr(models.LandOwner, field) == value.upper())
    if search:
        query = query.filter(models.LandOwner.owner_name.ilike(f"%{search.strip()}%"))
    owners = query.order_by(models.LandOwner.owner_id).offset(max(offset, 0)).limit(min(max(limit, 1), 500)).all()
    return [_owner_out(owner) for owner in owners]


@router.post("", response_model=schemas.LandOwnerOut, status_code=201)
def create_owner(
    payload: schemas.LandOwnerCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(*WRITE_ROLES)),
):
    if not 0 < payload.ownership_share <= 100:
        raise HTTPException(status_code=422, detail="ownership_share must be greater than 0 and at most 100")
    values = payload.model_dump(exclude={"parcel_id", "project_id"})
    _validate_statuses(values)
    project = db.query(models.Project).filter_by(project_id=payload.project_id).first()
    parcel = db.query(models.LandParcel).filter_by(parcel_id=payload.parcel_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    if parcel.project_pk != project.id:
        raise HTTPException(status_code=422, detail="Parcel does not belong to the selected project")
    if db.query(models.LandOwner).filter_by(owner_id=payload.owner_id).first():
        raise HTTPException(status_code=409, detail="owner_id already exists")
    owner = models.LandOwner(parcel_pk=parcel.id, project_pk=project.id, **values)
    db.add(owner)
    db.commit()
    db.refresh(owner)
    write_audit_log(db, current_user.email, "LAND_OWNER_CREATED", "LandOwner", owner.owner_id)
    return _owner_out(owner)


@router.get("/{owner_id}", response_model=schemas.LandOwnerOut)
def get_owner(owner_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    owner = db.query(models.LandOwner).filter_by(owner_id=owner_id).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    return _owner_out(owner)


@router.put("/{owner_id}", response_model=schemas.LandOwnerOut)
def update_owner(
    owner_id: str,
    payload: schemas.LandOwnerUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(*WRITE_ROLES)),
):
    owner = db.query(models.LandOwner).filter_by(owner_id=owner_id).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    changes = payload.model_dump(exclude_unset=True)
    _validate_statuses(changes)
    share = changes.get("ownership_share", owner.ownership_share)
    if share is not None and not 0 < share <= 100:
        raise HTTPException(status_code=422, detail="ownership_share must be greater than 0 and at most 100")
    for field, value in changes.items():
        setattr(owner, field, value)
    owner.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(owner)
    write_audit_log(db, current_user.email, "LAND_OWNER_UPDATED", "LandOwner", owner.owner_id)
    return _owner_out(owner)


@router.delete("/{owner_id}", status_code=204)
def delete_owner(
    owner_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(*DELETE_ROLES)),
):
    owner = db.query(models.LandOwner).filter_by(owner_id=owner_id).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    db.delete(owner)
    db.commit()
    write_audit_log(db, current_user.email, "LAND_OWNER_DELETED", "LandOwner", owner_id)
    return None