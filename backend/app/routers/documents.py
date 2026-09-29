from __future__ import annotations

import json
import os
import re
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .. import models, schemas
from ..config import get_settings
from ..database import get_db
from ..deps import get_current_user, require_roles
from .audit import write_audit_log

router = APIRouter(prefix="/api/documents", tags=["documents"])
settings = get_settings()
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
WRITE_ROLES = ("SUPER_ADMIN", "CENTRAL_ADMIN", "STATE_ADMIN", "PROJECT_OFFICER")
REVIEW_STATUSES = {"UNDER_REVIEW", "NEEDS_INFORMATION"}
DECISIONS = {"VERIFIED", "REJECTED", "REQUEST_REUPLOAD"}


@router.get("", response_model=list[schemas.DocumentOut])
def list_documents(project_id: str | None = None, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    query = db.query(models.Document)
    if project_id:
        project = db.query(models.Project).filter(models.Project.project_id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        query = query.filter(models.Document.project_pk == project.id)
    return query.order_by(models.Document.uploaded_at.desc()).all()


@router.post("", response_model=schemas.DocumentOut, status_code=201)
def create_document(payload: schemas.DocumentCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    payload.project_id = payload.project_id.strip()
    payload.document_name = payload.document_name.strip()
    payload.document_type = payload.document_type.strip()
    payload.uploaded_by = payload.uploaded_by.strip()

    project = db.query(models.Project).filter(models.Project.project_id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail=f"Project not found: {payload.project_id}")
    doc = models.Document(
        project_pk=project.id,
        document_name=payload.document_name,
        document_type=payload.document_type,
        uploaded_by=payload.uploaded_by,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    write_audit_log(db, current_user.email, "DOCUMENT_UPLOADED", "Document", str(doc.id))
    return doc


def _get_document(db: Session, document_id: int) -> models.Document:
    document = db.query(models.Document).filter_by(id=document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


def _safe_storage_path(filename: str) -> Path:
    root = Path(settings.DOCUMENT_STORAGE_DIR).resolve()
    candidate = (root / filename).resolve()
    if candidate.parent != root:
        raise HTTPException(status_code=404, detail="Document file not found")
    return candidate


def _extraction_out(row: models.DocumentExtraction) -> schemas.DocumentExtractionOut:
    return schemas.DocumentExtractionOut(
        id=row.id, document_id=row.document_pk, extraction_status=row.extraction_status,
        extracted_fields=json.loads(row.extracted_fields_json), method_label=row.method_label,
        notes=row.notes, updated_at=row.updated_at,
    )


def _comparison_out(row: models.DocumentComparison) -> schemas.DocumentComparisonOut:
    return schemas.DocumentComparisonOut(
        id=row.id, document_id=row.document_pk, comparison_status=row.comparison_status,
        compared_by=row.compared_by, compared_at=row.compared_at,
        mismatches=[schemas.DocumentMismatchOut(
            field_name=item.field_name, database_value=item.database_value,
            captured_value=item.captured_value, result=item.result,
        ) for item in row.mismatches],
    )


@router.post("/upload", response_model=schemas.DocumentOut, status_code=201)
async def upload_document(
    project_id: str = Form(...),
    document_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(*WRITE_ROLES)),
):
    original_name = Path(file.filename or "").name
    extension = Path(original_name).suffix.lower()
    if not original_name or extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=415, detail="Only PDF, PNG, and JPEG files are accepted")
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Maximum document size is 10 MiB")
    if not content:
        raise HTTPException(status_code=422, detail="Uploaded file is empty")
    project = db.query(models.Project).filter_by(project_id=project_id.strip()).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    stored_filename = f"{uuid.uuid4().hex}{extension}"
    root = Path(settings.DOCUMENT_STORAGE_DIR).resolve()
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    path = _safe_storage_path(stored_filename)
    try:
        with path.open("xb") as output:
            output.write(content)
        if os.name != "nt":
            os.chmod(path, 0o600)
        document = models.Document(
            project_pk=project.id, document_name=original_name,
            document_type=document_type.strip(), uploaded_by=current_user.email,
            status="Pending Review",
        )
        db.add(document)
        db.flush()
        db.add(models.DocumentFile(
            document_pk=document.id, stored_filename=stored_filename,
            original_filename=original_name, content_type=file.content_type or "application/octet-stream",
            size_bytes=len(content),
        ))
        db.add(models.DocumentExtraction(document_pk=document.id))
        db.commit()
        db.refresh(document)
    except Exception:
        db.rollback()
        path.unlink(missing_ok=True)
        raise
    write_audit_log(db, current_user.email, "DOCUMENT_FILE_UPLOADED", "Document", str(document.id))
    return document


@router.get("/{document_id}/file")
def download_document_file(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    document = _get_document(db, document_id)
    file_record = db.query(models.DocumentFile).filter_by(document_pk=document.id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="No stored file for this metadata-only document")
    path = _safe_storage_path(file_record.stored_filename)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Stored document file is missing")
    return FileResponse(path, media_type=file_record.content_type, filename=file_record.original_filename, content_disposition_type="attachment")


@router.get("/{document_id}/workflow")
def document_workflow(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    document = _get_document(db, document_id)
    latest_comparison = db.query(models.DocumentComparison).filter_by(document_pk=document.id).order_by(models.DocumentComparison.compared_at.desc()).first()
    decision = db.query(models.DocumentVerificationDecision).filter_by(document_pk=document.id).first()
    file_record = db.query(models.DocumentFile).filter_by(document_pk=document.id).first()
    return {
        "document": schemas.DocumentOut.model_validate(document).model_dump(mode="json"),
        "file": ({"original_filename": file_record.original_filename, "content_type": file_record.content_type, "size_bytes": file_record.size_bytes} if file_record else None),
        "extraction": (_extraction_out(document.extraction).model_dump(mode="json") if document.extraction else None),
        "comparison": (_comparison_out(latest_comparison).model_dump(mode="json") if latest_comparison else None),
        "reviews": [schemas.DocumentReviewOut(id=row.id, document_id=row.document_pk, reviewer_email=row.reviewer_email, status=row.status, remarks=row.remarks, reviewed_at=row.reviewed_at).model_dump(mode="json") for row in db.query(models.DocumentReview).filter_by(document_pk=document.id).order_by(models.DocumentReview.reviewed_at.desc()).all()],
        "decision": (schemas.DocumentDecisionOut(id=decision.id, document_id=decision.document_pk, decision=decision.decision, officer_email=decision.officer_email, remarks=decision.remarks, decided_at=decision.decided_at).model_dump(mode="json") if decision else None),
        "workflow_label": "Prototype manual capture; no OCR is performed",
    }


@router.post("/{document_id}/extract", response_model=schemas.DocumentExtractionOut)
def capture_extracted_fields(
    document_id: int,
    payload: schemas.DocumentExtractionIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(*WRITE_ROLES)),
):
    document = _get_document(db, document_id)
    if len(payload.extracted_fields) > 100:
        raise HTTPException(status_code=422, detail="At most 100 fields may be captured")
    fields = {}
    for key, value in payload.extracted_fields.items():
        if not re.fullmatch(r"[a-zA-Z][a-zA-Z0-9_]{0,79}", key):
            raise HTTPException(status_code=422, detail="Field names may contain only letters, numbers, and underscores")
        if not isinstance(value, (str, int, float, bool)):
            raise HTTPException(status_code=422, detail="Captured values must be text or numbers")
        if len(str(value)) > 1000:
            raise HTTPException(status_code=422, detail="Captured values may not exceed 1000 characters")
        fields[key] = value
    if not fields:
        raise HTTPException(status_code=422, detail="Enter at least one manually captured field")
    row = document.extraction or models.DocumentExtraction(document_pk=document.id)
    row.extraction_status = "CAPTURED_MANUAL"
    row.extracted_fields_json = json.dumps(fields)
    row.method_label = "Manual prototype field capture; not OCR"
    row.notes = payload.notes
    document.status = "Under Review"
    db.add(row); db.commit(); db.refresh(row)
    write_audit_log(db, current_user.email, "DOCUMENT_FIELDS_CAPTURED", "Document", str(document.id))
    return _extraction_out(row)


@router.get("/{document_id}/extraction", response_model=schemas.DocumentExtractionOut)
def get_extraction(document_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    document = _get_document(db, document_id)
    if not document.extraction:
        raise HTTPException(status_code=404, detail="No captured extraction fields")
    return _extraction_out(document.extraction)


@router.post("/{document_id}/compare", response_model=schemas.DocumentComparisonOut)
def compare_document_fields(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(*WRITE_ROLES)),
):
    document = _get_document(db, document_id)
    if not document.extraction or document.extraction.extraction_status != "CAPTURED_MANUAL":
        raise HTTPException(status_code=409, detail="Capture document fields before comparison")
    captured = json.loads(document.extraction.extracted_fields_json)
    project = db.query(models.Project).filter_by(id=document.project_pk).first()
    database_values = {field: getattr(project, field) for field in (
        "project_id", "project_name", "project_type", "state", "district", "taluk", "village", "latitude", "longitude",
    )}
    parcel = None
    if captured.get("parcel_id"):
        parcel = db.query(models.LandParcel).filter_by(parcel_id=str(captured["parcel_id"]), project_pk=project.id).first()
        if not parcel:
            raise HTTPException(status_code=404, detail="Captured parcel_id was not found under this project")
        database_values.update({field: getattr(parcel, field) for field in (
            "parcel_id", "survey_number", "parcel_number", "village", "taluk", "district", "state", "area_hectares", "acquisition_status",
        )})
    if captured.get("owner_id"):
        owner = db.query(models.LandOwner).filter_by(owner_id=str(captured["owner_id"]), project_pk=project.id).first()
        if not owner:
            raise HTTPException(status_code=404, detail="Captured owner_id was not found under this project")
        database_values.update({field: getattr(owner, field) for field in ("owner_id", "owner_name", "ownership_share", "ownership_type")})

    comparison = models.DocumentComparison(document_pk=document.id, comparison_status="MATCH", compared_by=current_user.email)
    db.add(comparison); db.flush()
    results = []
    compared_count = 0
    has_mismatch = False
    for field, captured_value in captured.items():
        if field not in database_values:
            result = "NOT_COMPARABLE"
            db_value = ""
        else:
            db_value = str(database_values[field])
            result = "MATCH" if db_value.strip().casefold() == str(captured_value).strip().casefold() else "MISMATCH"
            compared_count += 1
            has_mismatch = has_mismatch or result == "MISMATCH"
        mismatch = models.DocumentMismatch(comparison_pk=comparison.id, field_name=field, database_value=db_value, captured_value=str(captured_value), result=result)
        db.add(mismatch)
        results.append(mismatch)
    comparison.comparison_status = "NOT_COMPARABLE" if compared_count == 0 else "MISMATCH" if has_mismatch else "MATCH"
    document.status = "Mismatch Detected" if has_mismatch else "Under Review"
    db.commit(); db.refresh(comparison)
    write_audit_log(db, current_user.email, "DOCUMENT_FIELDS_COMPARED", "Document", str(document.id))
    return _comparison_out(comparison)


@router.get("/{document_id}/comparison", response_model=schemas.DocumentComparisonOut)
def get_latest_comparison(document_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    _get_document(db, document_id)
    row = db.query(models.DocumentComparison).filter_by(document_pk=document_id).order_by(models.DocumentComparison.compared_at.desc()).first()
    if not row:
        raise HTTPException(status_code=404, detail="No comparison has been run")
    return _comparison_out(row)


@router.post("/{document_id}/review", response_model=schemas.DocumentReviewOut, status_code=201)
def review_document(document_id: int, payload: schemas.DocumentReviewIn, db: Session = Depends(get_db), current_user: models.User = Depends(require_roles(*WRITE_ROLES))):
    document = _get_document(db, document_id)
    status = payload.status.upper()
    if status not in REVIEW_STATUSES:
        raise HTTPException(status_code=422, detail="Review status must be UNDER_REVIEW or NEEDS_INFORMATION")
    row = models.DocumentReview(document_pk=document.id, reviewer_email=current_user.email, status=status, remarks=payload.remarks)
    document.status = "Under Review" if status == "UNDER_REVIEW" else "Needs Information"
    db.add(row); db.commit(); db.refresh(row)
    write_audit_log(db, current_user.email, "DOCUMENT_REVIEWED", "Document", str(document.id), details=status)
    return schemas.DocumentReviewOut(id=row.id, document_id=row.document_pk, reviewer_email=row.reviewer_email, status=row.status, remarks=row.remarks, reviewed_at=row.reviewed_at)


@router.post("/{document_id}/decision", response_model=schemas.DocumentDecisionOut)
def decide_document(document_id: int, payload: schemas.DocumentDecisionIn, db: Session = Depends(get_db), current_user: models.User = Depends(require_roles(*WRITE_ROLES))):
    document = _get_document(db, document_id)
    decision = payload.decision.upper()
    if decision not in DECISIONS:
        raise HTTPException(status_code=422, detail="Decision must be VERIFIED, REJECTED, or REQUEST_REUPLOAD")
    row = document.verification_decision or models.DocumentVerificationDecision(document_pk=document.id)
    row.decision = decision
    row.officer_email = current_user.email
    row.remarks = payload.remarks
    row.decided_at = datetime.utcnow()
    document.status = {"VERIFIED": "Verified", "REJECTED": "Rejected", "REQUEST_REUPLOAD": "Re-upload Requested"}[decision]
    db.add(row); db.commit(); db.refresh(row)
    write_audit_log(db, current_user.email, "DOCUMENT_DECISION", "Document", str(document.id), details=decision)
    return schemas.DocumentDecisionOut(id=row.id, document_id=row.document_pk, decision=row.decision, officer_email=row.officer_email, remarks=row.remarks, decided_at=row.decided_at)
