from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UserDefinedType

from .database import Base


class Polygon4326(UserDefinedType):
    cache_ok = True


@compiles(Polygon4326)
def _compile_polygon_sqlite(type_, compiler, **kwargs):
    return "TEXT"


@compiles(Polygon4326, "postgresql")
def _compile_polygon_postgres(type_, compiler, **kwargs):
    return "geometry(POLYGON,4326)"


class Role(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    CENTRAL_ADMIN = "CENTRAL_ADMIN"
    STATE_ADMIN = "STATE_ADMIN"
    DISTRICT_OFFICER = "DISTRICT_OFFICER"
    PROJECT_OFFICER = "PROJECT_OFFICER"
    ANALYST = "ANALYST"
    VIEWER = "VIEWER"


class AlertStatus(str, enum.Enum):
    NEW = "NEW"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(Enum(Role), default=Role.VIEWER)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    project_code: Mapped[str] = mapped_column(String(50))
    project_name: Mapped[str] = mapped_column(String(255))
    project_type: Mapped[str] = mapped_column(String(100), index=True)
    ministry: Mapped[str] = mapped_column(String(255))
    implementing_agency: Mapped[str] = mapped_column(String(255), index=True)

    state: Mapped[str] = mapped_column(String(100), index=True)
    district: Mapped[str] = mapped_column(String(100), index=True)
    taluk: Mapped[str] = mapped_column(String(100))
    village: Mapped[str] = mapped_column(String(100))

    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    # geom: populated only when running against PostGIS-enabled Postgres — see
    # backend/alembic/versions and README "PostGIS" section. Latitude/longitude
    # above are the source of truth used by the app; geometry is an optional
    # spatial-query enhancement for production Postgres deployments.

    land_proposed_hectares: Mapped[float] = mapped_column(Float)
    land_acquired_hectares: Mapped[float] = mapped_column(Float)
    acquisition_percentage: Mapped[float] = mapped_column(Float)

    affected_families: Mapped[int] = mapped_column(Integer)
    displaced_families: Mapped[int] = mapped_column(Integer)

    notification_status: Mapped[str] = mapped_column(String(50))
    notification_date: Mapped[str] = mapped_column(String(20), default="")

    survey_status: Mapped[str] = mapped_column(String(50))
    survey_completion_percentage: Mapped[float] = mapped_column(Float)

    approval_status: Mapped[str] = mapped_column(String(50))
    approval_pending_days: Mapped[int] = mapped_column(Integer)

    award_status: Mapped[str] = mapped_column(String(50))
    award_date: Mapped[str] = mapped_column(String(20), default="")

    compensation_assessed: Mapped[float] = mapped_column(Float)
    compensation_paid: Mapped[float] = mapped_column(Float)
    compensation_pending: Mapped[float] = mapped_column(Float)

    legal_cases: Mapped[int] = mapped_column(Integer)
    legal_dispute_severity: Mapped[str] = mapped_column(String(20))

    possession_status: Mapped[str] = mapped_column(String(50))
    possession_percentage: Mapped[float] = mapped_column(Float)

    rr_status: Mapped[str] = mapped_column(String(50))
    rr_completion_percentage: Mapped[float] = mapped_column(Float)

    documentation_completeness: Mapped[float] = mapped_column(Float)
    stakeholder_responsiveness: Mapped[float] = mapped_column(Float)

    current_stage: Mapped[str] = mapped_column(String(50), index=True)

    planned_completion_date: Mapped[str] = mapped_column(String(20), default="")
    actual_completion_date: Mapped[str] = mapped_column(String(20), default="")
    project_start_date: Mapped[str] = mapped_column(String(20), default="")

    historical_agency_delay_rate: Mapped[float] = mapped_column(Float)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    predictions: Mapped[list["Prediction"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    alerts: Mapped[list["Alert"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    documents: Mapped[list["Document"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    parcels: Mapped[list["LandParcel"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    owners: Mapped[list["LandOwner"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    compensation_records: Mapped[list["CompensationRecord"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    legal_case_records: Mapped[list["LegalCase"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    rr_records: Mapped[list["ResettlementRecord"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    possession_records: Mapped[list["PossessionRecord"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class LandParcel(Base):
    __tablename__ = "land_parcels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    parcel_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    project_pk: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    survey_number: Mapped[str] = mapped_column(String(100), index=True)
    parcel_number: Mapped[str] = mapped_column(String(100), default="")
    village: Mapped[str] = mapped_column(String(100))
    taluk: Mapped[str] = mapped_column(String(100))
    district: Mapped[str] = mapped_column(String(100), index=True)
    state: Mapped[str] = mapped_column(String(100), index=True)
    area_hectares: Mapped[float] = mapped_column(Float)
    acquisition_status: Mapped[str] = mapped_column(String(40), default="IDENTIFIED", index=True)
    compensation_status: Mapped[str] = mapped_column(String(40), default="PENDING")
    legal_status: Mapped[str] = mapped_column(String(40), default="CLEAR")
    possession_status: Mapped[str] = mapped_column(String(40), default="PENDING")
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    geom: Mapped[object | None] = mapped_column(Polygon4326(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project: Mapped["Project"] = relationship(back_populates="parcels")
    owners: Mapped[list["LandOwner"]] = relationship(back_populates="parcel", cascade="all, delete-orphan")
    compensation_records: Mapped[list["CompensationRecord"]] = relationship(back_populates="parcel")
    legal_case_records: Mapped[list["LegalCase"]] = relationship(back_populates="parcel")
    rr_records: Mapped[list["ResettlementRecord"]] = relationship(back_populates="parcel")
    possession_records: Mapped[list["PossessionRecord"]] = relationship(back_populates="parcel")


class LandOwner(Base):
    __tablename__ = "land_owners"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    owner_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    parcel_pk: Mapped[int] = mapped_column(ForeignKey("land_parcels.id", ondelete="CASCADE"), index=True)
    project_pk: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    owner_name: Mapped[str] = mapped_column(String(255))
    ownership_share: Mapped[float] = mapped_column(Float)
    ownership_type: Mapped[str] = mapped_column(String(40))
    contact_status: Mapped[str] = mapped_column(String(40), default="NOT_CONTACTED")
    compensation_status: Mapped[str] = mapped_column(String(40), default="PENDING")
    legal_status: Mapped[str] = mapped_column(String(40), default="CLEAR")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    parcel: Mapped["LandParcel"] = relationship(back_populates="owners")
    project: Mapped["Project"] = relationship(back_populates="owners")
    legal_case_records: Mapped[list["LegalCase"]] = relationship(back_populates="owner")
    rr_records: Mapped[list["ResettlementRecord"]] = relationship(back_populates="owner")


class CompensationRecord(Base):
    __tablename__ = "compensation_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    case_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    project_pk: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    parcel_pk: Mapped[int | None] = mapped_column(ForeignKey("land_parcels.id", ondelete="SET NULL"), index=True, nullable=True)
    owner_pk: Mapped[int | None] = mapped_column(ForeignKey("land_owners.id", ondelete="SET NULL"), index=True, nullable=True)
    assessed_amount: Mapped[float] = mapped_column(Float)
    approved_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    paid_amount: Mapped[float] = mapped_column(Float, default=0)
    payment_status: Mapped[str] = mapped_column(String(30), default="PENDING", index=True)
    assessment_date: Mapped[str] = mapped_column(String(20), default="")
    approval_date: Mapped[str] = mapped_column(String(20), default="")
    payment_date: Mapped[str] = mapped_column(String(20), default="")
    remarks: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project: Mapped["Project"] = relationship(back_populates="compensation_records")
    parcel: Mapped["LandParcel | None"] = relationship(back_populates="compensation_records")
    owner: Mapped["LandOwner | None"] = relationship()

    @property
    def pending_amount(self) -> float:
        payable = self.approved_amount if self.approved_amount is not None else self.assessed_amount
        return max(0.0, payable - self.paid_amount)


class LegalCase(Base):
    __tablename__ = "legal_cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    case_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    project_pk: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    parcel_pk: Mapped[int | None] = mapped_column(ForeignKey("land_parcels.id", ondelete="SET NULL"), index=True, nullable=True)
    owner_pk: Mapped[int | None] = mapped_column(ForeignKey("land_owners.id", ondelete="SET NULL"), index=True, nullable=True)
    case_number: Mapped[str] = mapped_column(String(100), index=True)
    court: Mapped[str] = mapped_column(String(255), default="")
    case_type: Mapped[str] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(40), default="PENDING", index=True)
    severity: Mapped[str] = mapped_column(String(30), default="MEDIUM", index=True)
    filing_date: Mapped[str] = mapped_column(String(20), default="")
    next_hearing_date: Mapped[str] = mapped_column(String(20), default="")
    resolution_date: Mapped[str] = mapped_column(String(20), default="")
    assigned_officer: Mapped[str] = mapped_column(String(255), default="")
    remarks: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project: Mapped["Project"] = relationship(back_populates="legal_case_records")
    parcel: Mapped["LandParcel | None"] = relationship(back_populates="legal_case_records")
    owner: Mapped["LandOwner | None"] = relationship(back_populates="legal_case_records")


class ResettlementRecord(Base):
    __tablename__ = "rr_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    rr_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    project_pk: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    parcel_pk: Mapped[int | None] = mapped_column(ForeignKey("land_parcels.id", ondelete="SET NULL"), index=True, nullable=True)
    owner_pk: Mapped[int | None] = mapped_column(ForeignKey("land_owners.id", ondelete="SET NULL"), index=True, nullable=True)
    beneficiary_name: Mapped[str] = mapped_column(String(255), default="")
    entitlement_type: Mapped[str] = mapped_column(String(100), default="")
    status: Mapped[str] = mapped_column(String(40), default="PENDING", index=True)
    completion_percentage: Mapped[float] = mapped_column(Float, default=0)
    package_assessed: Mapped[float] = mapped_column(Float, default=0)
    package_paid: Mapped[float] = mapped_column(Float, default=0)
    resettlement_site: Mapped[str] = mapped_column(String(255), default="")
    remarks: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project: Mapped["Project"] = relationship(back_populates="rr_records")
    parcel: Mapped["LandParcel | None"] = relationship(back_populates="rr_records")
    owner: Mapped["LandOwner | None"] = relationship(back_populates="rr_records")


class PossessionRecord(Base):
    __tablename__ = "possession_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    possession_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    project_pk: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    parcel_pk: Mapped[int] = mapped_column(ForeignKey("land_parcels.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(40), default="PENDING", index=True)
    possession_date: Mapped[str] = mapped_column(String(20), default="")
    survey_status: Mapped[str] = mapped_column(String(40), default="PENDING")
    handover_date: Mapped[str] = mapped_column(String(20), default="")
    remarks: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project: Mapped["Project"] = relationship(back_populates="possession_records")
    parcel: Mapped["LandParcel"] = relationship(back_populates="possession_records")


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_pk: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    probability_of_delay: Mapped[float] = mapped_column(Float)
    risk_score: Mapped[float] = mapped_column(Float)
    risk_category: Mapped[str] = mapped_column(String(20))
    expected_delay_days: Mapped[float] = mapped_column(Float)
    model_version: Mapped[str] = mapped_column(String(50))
    classifier_algorithm: Mapped[str] = mapped_column(String(50))
    regressor_algorithm: Mapped[str] = mapped_column(String(50))
    top_positive_drivers_json: Mapped[str] = mapped_column(Text)
    top_negative_drivers_json: Mapped[str] = mapped_column(Text)
    stage_risks_json: Mapped[str] = mapped_column(Text)
    recommendations_json: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    project: Mapped["Project"] = relationship(back_populates="predictions")


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_pk: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    alert_type: Mapped[str] = mapped_column(String(50))
    severity: Mapped[str] = mapped_column(String(20))
    message: Mapped[str] = mapped_column(String(500))
    status: Mapped[AlertStatus] = mapped_column(Enum(AlertStatus), default=AlertStatus.NEW)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    acknowledged_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    resolved_by: Mapped[str | None] = mapped_column(String(255), nullable=True)

    project: Mapped["Project"] = relationship(back_populates="alerts")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_pk: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    document_name: Mapped[str] = mapped_column(String(255))
    document_type: Mapped[str] = mapped_column(String(50))
    uploaded_by: Mapped[str] = mapped_column(String(255))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    status: Mapped[str] = mapped_column(String(50), default="Pending Review")
    file: Mapped["DocumentFile | None"] = relationship(back_populates="document", cascade="all, delete-orphan", uselist=False)
    extraction: Mapped["DocumentExtraction | None"] = relationship(back_populates="document", cascade="all, delete-orphan", uselist=False)
    comparisons: Mapped[list["DocumentComparison"]] = relationship(back_populates="document", cascade="all, delete-orphan")
    reviews: Mapped[list["DocumentReview"]] = relationship(back_populates="document", cascade="all, delete-orphan")
    verification_decision: Mapped["DocumentVerificationDecision | None"] = relationship(back_populates="document", cascade="all, delete-orphan", uselist=False)
    project: Mapped["Project"] = relationship(back_populates="documents")


class DocumentFile(Base):
    __tablename__ = "document_files"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_pk: Mapped[int] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), unique=True, index=True)
    stored_filename: Mapped[str] = mapped_column(String(100), unique=True)
    original_filename: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(100))
    size_bytes: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    document: Mapped["Document"] = relationship(back_populates="file")


class DocumentExtraction(Base):
    __tablename__ = "document_extractions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_pk: Mapped[int] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), unique=True, index=True)
    extraction_status: Mapped[str] = mapped_column(String(40), default="PENDING")
    extracted_fields_json: Mapped[str] = mapped_column(Text, default="{}")
    method_label: Mapped[str] = mapped_column(String(100), default="Manual prototype field capture")
    notes: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    document: Mapped["Document"] = relationship(back_populates="extraction")


class DocumentComparison(Base):
    __tablename__ = "document_comparisons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_pk: Mapped[int] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), index=True)
    comparison_status: Mapped[str] = mapped_column(String(40))
    compared_by: Mapped[str] = mapped_column(String(255))
    compared_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    document: Mapped["Document"] = relationship(back_populates="comparisons")
    mismatches: Mapped[list["DocumentMismatch"]] = relationship(back_populates="comparison", cascade="all, delete-orphan")


class DocumentMismatch(Base):
    __tablename__ = "document_mismatches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    comparison_pk: Mapped[int] = mapped_column(ForeignKey("document_comparisons.id", ondelete="CASCADE"), index=True)
    field_name: Mapped[str] = mapped_column(String(100))
    database_value: Mapped[str] = mapped_column(Text, default="")
    captured_value: Mapped[str] = mapped_column(Text, default="")
    result: Mapped[str] = mapped_column(String(20))

    comparison: Mapped["DocumentComparison"] = relationship(back_populates="mismatches")


class DocumentReview(Base):
    __tablename__ = "document_reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_pk: Mapped[int] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), index=True)
    reviewer_email: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(40))
    remarks: Mapped[str] = mapped_column(Text, default="")
    reviewed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    document: Mapped["Document"] = relationship(back_populates="reviews")


class DocumentVerificationDecision(Base):
    __tablename__ = "document_verification_decisions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_pk: Mapped[int] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), unique=True, index=True)
    decision: Mapped[str] = mapped_column(String(40))
    officer_email: Mapped[str] = mapped_column(String(255))
    remarks: Mapped[str] = mapped_column(Text, default="")
    decided_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    document: Mapped["Document"] = relationship(back_populates="verification_decision")


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    version: Mapped[str] = mapped_column(String(50))
    classifier_algorithm: Mapped[str] = mapped_column(String(50))
    regressor_algorithm: Mapped[str] = mapped_column(String(50))
    trained_at: Mapped[datetime] = mapped_column(DateTime)
    dataset_size: Mapped[int] = mapped_column(Integer)
    metrics_json: Mapped[str] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_email: Mapped[str] = mapped_column(String(255))
    action: Mapped[str] = mapped_column(String(100), index=True)
    entity: Mapped[str] = mapped_column(String(100))
    entity_id: Mapped[str] = mapped_column(String(100))
    details: Mapped[str] = mapped_column(Text, default="")
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class DataQualityRecord(Base):
    __tablename__ = "data_quality_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_pk: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    completeness_percentage: Mapped[float] = mapped_column(Float)
    missing_fields_json: Mapped[str] = mapped_column(Text)
    has_duplicates: Mapped[bool] = mapped_column(Boolean, default=False)
    has_invalid_dates: Mapped[bool] = mapped_column(Boolean, default=False)
    has_conflicting_values: Mapped[bool] = mapped_column(Boolean, default=False)
    confidence_score: Mapped[float] = mapped_column(Float)
    checked_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
