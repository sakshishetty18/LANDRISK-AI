from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import require_roles
from ..security import hash_password
from .audit import write_audit_log

router = APIRouter(prefix="/api/admin/users", tags=["administration"])
ROLES = {role.value for role in models.Role}


def _validate_password(password: str) -> None:
    if len(password) < 12:
        raise HTTPException(status_code=422, detail="Passwords must contain at least 12 characters")
    if len(password.encode("utf-8")) > 72:
        raise HTTPException(status_code=422, detail="Passwords cannot exceed bcrypt's 72-byte limit")


@router.get("", response_model=list[schemas.UserOut])
def list_users(db: Session = Depends(get_db), current_user: models.User = Depends(require_roles("SUPER_ADMIN"))):
    return db.query(models.User).order_by(models.User.email).all()


@router.post("", response_model=schemas.UserOut, status_code=201)
def create_user(payload: schemas.AdminUserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_roles("SUPER_ADMIN"))):
    email = payload.email.strip().lower()
    full_name = payload.full_name.strip()
    role = payload.role.strip().upper()
    if not email or "@" not in email or not full_name:
        raise HTTPException(status_code=422, detail="A valid email and full name are required")
    if role not in ROLES:
        raise HTTPException(status_code=422, detail="Unknown role")
    _validate_password(payload.password)
    if db.query(models.User).filter_by(email=email).first():
        raise HTTPException(status_code=409, detail="Email already exists")
    user = models.User(email=email, full_name=full_name, hashed_password=hash_password(payload.password), role=models.Role(role))
    db.add(user); db.commit(); db.refresh(user)
    write_audit_log(db, current_user.email, "ADMIN_USER_CREATED", "User", str(user.id), details=f"role={user.role.value}")
    return user


@router.put("/{user_id}", response_model=schemas.UserOut)
def update_user(user_id: int, payload: schemas.AdminUserUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(require_roles("SUPER_ADMIN"))):
    user = db.query(models.User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    changes = payload.model_dump(exclude_unset=True)
    if "role" in changes and changes["role"] is not None:
        role = changes["role"].strip().upper()
        if role not in ROLES:
            raise HTTPException(status_code=422, detail="Unknown role")
        changes["role"] = models.Role(role)
    if "full_name" in changes and changes["full_name"] is not None:
        changes["full_name"] = changes["full_name"].strip()
        if not changes["full_name"]:
            raise HTTPException(status_code=422, detail="full_name cannot be blank")
    if "password" in changes:
        password = changes.pop("password")
        if password is not None:
            _validate_password(password)
            user.hashed_password = hash_password(password)
    if user.id == current_user.id and changes.get("is_active") is False:
        raise HTTPException(status_code=422, detail="You cannot deactivate your own account")
    for field, value in changes.items():
        setattr(user, field, value)
    db.commit(); db.refresh(user)
    write_audit_log(db, current_user.email, "ADMIN_USER_UPDATED", "User", str(user.id), details=f"fields={','.join(payload.model_fields_set)}")
    return user


@router.delete("/{user_id}", response_model=schemas.UserOut)
def deactivate_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_roles("SUPER_ADMIN"))):
    user = db.query(models.User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=422, detail="You cannot deactivate your own account")
    user.is_active = False
    db.commit(); db.refresh(user)
    write_audit_log(db, current_user.email, "ADMIN_USER_DEACTIVATED", "User", str(user.id))
    return user