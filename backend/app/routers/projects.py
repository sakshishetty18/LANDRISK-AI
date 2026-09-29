from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user, require_roles
from .audit import write_audit_log

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[schemas.ProjectOut])
def list_projects(
    state: str | None = None,
    district: str | None = None,
    project_type: str | None = None,
    current_stage: str | None = None,
    limit: int = 500,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Project)
    if state:
        query = query.filter(models.Project.state == state)
    if district:
        query = query.filter(models.Project.district == district)
    if project_type:
        query = query.filter(models.Project.project_type == project_type)
    if current_stage:
        query = query.filter(models.Project.current_stage == current_stage)
    return query.order_by(models.Project.id).offset(offset).limit(limit).all()


@router.post("", response_model=schemas.ProjectOut, status_code=201)
def create_project(
    payload: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("SUPER_ADMIN", "CENTRAL_ADMIN", "STATE_ADMIN", "PROJECT_OFFICER")),
):
    if db.query(models.Project).filter(models.Project.project_id == payload.project_id).first():
        raise HTTPException(status_code=409, detail="project_id already exists")
    project = models.Project(**payload.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    write_audit_log(db, current_user.email, "PROJECT_CREATED", "Project", project.project_id)
    return project


@router.get("/{project_id}", response_model=schemas.ProjectOut)
def get_project(project_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    project = db.query(models.Project).filter(models.Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/{project_id}", response_model=schemas.ProjectOut)
def update_project(
    project_id: str,
    payload: schemas.ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("SUPER_ADMIN", "CENTRAL_ADMIN", "STATE_ADMIN", "PROJECT_OFFICER")),
):
    project = db.query(models.Project).filter(models.Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    write_audit_log(db, current_user.email, "PROJECT_UPDATED", "Project", project.project_id)
    return project


@router.delete("/{project_id}", status_code=204)
def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("SUPER_ADMIN", "CENTRAL_ADMIN")),
):
    project = db.query(models.Project).filter(models.Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
    write_audit_log(db, current_user.email, "PROJECT_DELETED", "Project", project_id)
    return None
