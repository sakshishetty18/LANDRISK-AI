from __future__ import annotations

import json
import math
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user, require_roles
from .audit import write_audit_log

router = APIRouter(prefix="/api/parcels", tags=["parcels"])
WRITE_ROLES = ("SUPER_ADMIN", "CENTRAL_ADMIN", "STATE_ADMIN", "PROJECT_OFFICER")
DELETE_ROLES = ("SUPER_ADMIN", "CENTRAL_ADMIN")
STATUS_FIELDS = {
    "acquisition_status": {"IDENTIFIED", "NOTIFIED", "AWARDED", "ACQUIRED"},
    "compensation_status": {"NOT_APPLICABLE", "PENDING", "PARTIAL", "PAID", "DISPUTED"},
    "legal_status": {"CLEAR", "DISPUTED", "IN_CASE", "RESOLVED"},
    "possession_status": {"PENDING", "PARTIAL", "TAKEN", "STAYED"},
}


def _polygon_wkt(geometry: dict | None) -> str | None:
    if geometry is None:
        return None
    if geometry.get("type") != "Polygon":
        raise HTTPException(status_code=422, detail="geometry must be a GeoJSON Polygon")
    rings = geometry.get("coordinates")
    if not isinstance(rings, list) or not rings:
        raise HTTPException(status_code=422, detail="Polygon coordinates are required")
    wkt_rings = []
    for ring in rings:
        if not isinstance(ring, list) or len(ring) < 4:
            raise HTTPException(status_code=422, detail="Each polygon ring must contain at least four positions")
        positions = []
        for point in ring:
            if not isinstance(point, (list, tuple)) or len(point) < 2:
                raise HTTPException(status_code=422, detail="Each position must contain longitude and latitude")
            longitude, latitude = point[:2]
            if not isinstance(longitude, (int, float)) or not isinstance(latitude, (int, float)):
                raise HTTPException(status_code=422, detail="Polygon coordinates must be numeric")
            if not math.isfinite(longitude) or not math.isfinite(latitude) or not -180 <= longitude <= 180 or not -90 <= latitude <= 90:
                raise HTTPException(status_code=422, detail="Polygon coordinates must be valid WGS84 longitude/latitude")
            positions.append(f"{longitude} {latitude}")
        if ring[0][:2] != ring[-1][:2]:
            raise HTTPException(status_code=422, detail="Polygon rings must be closed")
        wkt_rings.append(f"({', '.join(positions)})")
    return f"POLYGON({', '.join(wkt_rings)})"


def _parcel_out(db: Session, parcel: models.LandParcel) -> schemas.LandParcelOut:
    geometry = None
    if db.bind and db.bind.dialect.name == "postgresql":
        geojson = db.execute(
            text("SELECT ST_AsGeoJSON(geom) FROM land_parcels WHERE id = :id"), {"id": parcel.id}
        ).scalar()
        if geojson:
            geometry = json.loads(geojson)
    elif isinstance(parcel.geom, str):
        geometry = json.loads(parcel.geom)
    return schemas.LandParcelOut(
        id=parcel.id,
        parcel_id=parcel.parcel_id,
        project_id=parcel.project.project_id,
        project_pk=parcel.project_pk,
        survey_number=parcel.survey_number,
        parcel_number=parcel.parcel_number,
        village=parcel.village,
        taluk=parcel.taluk,
        district=parcel.district,
        state=parcel.state,
        area_hectares=parcel.area_hectares,
        acquisition_status=parcel.acquisition_status,
        compensation_status=parcel.compensation_status,
        legal_status=parcel.legal_status,
        possession_status=parcel.possession_status,
        latitude=parcel.latitude,
        longitude=parcel.longitude,
        geometry=geometry,
        created_at=parcel.created_at,
        updated_at=parcel.updated_at,
    )


def _check_statuses(values: dict) -> None:
    for field, allowed in STATUS_FIELDS.items():
        if field in values and values[field] is not None:
            value = values[field].upper()
            if value not in allowed:
                raise HTTPException(status_code=422, detail=f"Unsupported {field}")
            values[field] = value


def _set_geometry(db: Session, parcel: models.LandParcel, geometry: dict | None) -> None:
    wkt = _polygon_wkt(geometry)
    if db.bind and db.bind.dialect.name == "postgresql":
        if wkt is None:
            db.execute(text("UPDATE land_parcels SET geom = NULL WHERE id = :id"), {"id": parcel.id})
        else:
            db.execute(
                text("UPDATE land_parcels SET geom = ST_SetSRID(ST_GeomFromText(:wkt), 4326) WHERE id = :id"),
                {"wkt": wkt, "id": parcel.id},
            )
    else:
        parcel.geom = json.dumps(geometry) if geometry is not None else None


@router.get("", response_model=list[schemas.LandParcelOut])
def list_parcels(
    project_id: str | None = None,
    state: str | None = None,
    district: str | None = None,
    acquisition_status: str | None = None,
    compensation_status: str | None = None,
    legal_status: str | None = None,
    possession_status: str | None = None,
    search: str | None = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.LandParcel)
    if project_id:
        query = query.join(models.LandParcel.project).filter(models.Project.project_id == project_id)
    for field, value in (("state", state), ("district", district), ("acquisition_status", acquisition_status),
                         ("compensation_status", compensation_status), ("legal_status", legal_status),
                         ("possession_status", possession_status)):
        if value:
            query = query.filter(getattr(models.LandParcel, field) == value.upper() if field.endswith("status") else getattr(models.LandParcel, field) == value)
    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter((models.LandParcel.parcel_id.ilike(pattern)) | (models.LandParcel.survey_number.ilike(pattern)) | (models.LandParcel.parcel_number.ilike(pattern)))
    parcels = query.order_by(models.LandParcel.parcel_id).offset(max(offset, 0)).limit(min(max(limit, 1), 500)).all()
    return [_parcel_out(db, parcel) for parcel in parcels]


@router.post("", response_model=schemas.LandParcelOut, status_code=201)
def create_parcel(
    payload: schemas.LandParcelCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(*WRITE_ROLES)),
):
    values = payload.model_dump(exclude={"project_id", "geometry"})
    _check_statuses(values)
    if payload.area_hectares <= 0:
        raise HTTPException(status_code=422, detail="area_hectares must be positive")
    project = db.query(models.Project).filter_by(project_id=payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if db.query(models.LandParcel).filter_by(parcel_id=payload.parcel_id).first():
        raise HTTPException(status_code=409, detail="parcel_id already exists")
    parcel = models.LandParcel(project_pk=project.id, **values)
    db.add(parcel)
    db.flush()
    _set_geometry(db, parcel, payload.geometry)
    db.commit()
    db.refresh(parcel)
    write_audit_log(db, current_user.email, "PARCEL_CREATED", "LandParcel", parcel.parcel_id)
    return _parcel_out(db, parcel)


@router.get("/{parcel_id}", response_model=schemas.LandParcelOut)
def get_parcel(
    parcel_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    parcel = db.query(models.LandParcel).filter_by(parcel_id=parcel_id).first()
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    return _parcel_out(db, parcel)


@router.put("/{parcel_id}", response_model=schemas.LandParcelOut)
def update_parcel(
    parcel_id: str,
    payload: schemas.LandParcelUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(*WRITE_ROLES)),
):
    parcel = db.query(models.LandParcel).filter_by(parcel_id=parcel_id).first()
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    changes = payload.model_dump(exclude_unset=True)
    geometry = changes.pop("geometry", ...)
    _check_statuses(changes)
    if "area_hectares" in changes and changes["area_hectares"] is not None and changes["area_hectares"] <= 0:
        raise HTTPException(status_code=422, detail="area_hectares must be positive")
    for field, value in changes.items():
        setattr(parcel, field, value)
    if geometry is not ...:
        _set_geometry(db, parcel, geometry)
    parcel.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(parcel)
    write_audit_log(db, current_user.email, "PARCEL_UPDATED", "LandParcel", parcel.parcel_id)
    return _parcel_out(db, parcel)


@router.delete("/{parcel_id}", status_code=204)
def delete_parcel(
    parcel_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(*DELETE_ROLES)),
):
    parcel = db.query(models.LandParcel).filter_by(parcel_id=parcel_id).first()
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    db.delete(parcel)
    db.commit()
    write_audit_log(db, current_user.email, "PARCEL_DELETED", "LandParcel", parcel_id)
    return None