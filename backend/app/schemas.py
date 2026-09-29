from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool


class AdminUserCreate(BaseModel):
    email: str
    full_name: str
    password: str
    role: str = "VIEWER"


class AdminUserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    full_name: str | None = None
    role: str | None = None
    is_active: bool | None = None
    password: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


class ProjectBase(BaseModel):
    project_id: str
    project_code: str
    project_name: str
    project_type: str
    ministry: str
    implementing_agency: str
    state: str
    district: str
    taluk: str
    village: str
    latitude: float
    longitude: float
    land_proposed_hectares: float
    land_acquired_hectares: float
    acquisition_percentage: float
    affected_families: int
    displaced_families: int
    notification_status: str
    notification_date: str = ""
    survey_status: str
    survey_completion_percentage: float
    approval_status: str
    approval_pending_days: int
    award_status: str
    award_date: str = ""
    compensation_assessed: float
    compensation_paid: float
    compensation_pending: float
    legal_cases: int
    legal_dispute_severity: str
    possession_status: str
    possession_percentage: float
    rr_status: str
    rr_completion_percentage: float
    documentation_completeness: float
    stakeholder_responsiveness: float
    current_stage: str
    planned_completion_date: str = ""
    actual_completion_date: str = ""
    project_start_date: str = ""
    historical_agency_delay_rate: float


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    # Partial update — any subset of ProjectBase fields, all optional
    project_name: str | None = None
    project_type: str | None = None
    ministry: str | None = None
    implementing_agency: str | None = None
    state: str | None = None
    district: str | None = None
    taluk: str | None = None
    village: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    land_proposed_hectares: float | None = None
    land_acquired_hectares: float | None = None
    acquisition_percentage: float | None = None
    affected_families: int | None = None
    displaced_families: int | None = None
    notification_status: str | None = None
    notification_date: str | None = None
    survey_status: str | None = None
    survey_completion_percentage: float | None = None
    approval_status: str | None = None
    approval_pending_days: int | None = None
    award_status: str | None = None
    award_date: str | None = None
    compensation_assessed: float | None = None
    compensation_paid: float | None = None
    compensation_pending: float | None = None
    legal_cases: int | None = None
    legal_dispute_severity: str | None = None
    possession_status: str | None = None
    possession_percentage: float | None = None
    rr_status: str | None = None
    rr_completion_percentage: float | None = None
    documentation_completeness: float | None = None
    stakeholder_responsiveness: float | None = None
    current_stage: str | None = None
    planned_completion_date: str | None = None
    actual_completion_date: str | None = None
    project_start_date: str | None = None
    historical_agency_delay_rate: float | None = None


class ProjectOut(ProjectBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


class LandParcelBase(BaseModel):
    parcel_id: str
    project_id: str
    survey_number: str
    parcel_number: str = ""
    village: str
    taluk: str
    district: str
    state: str
    area_hectares: float
    acquisition_status: str = "IDENTIFIED"
    compensation_status: str = "PENDING"
    legal_status: str = "CLEAR"
    possession_status: str = "PENDING"
    latitude: float | None = None
    longitude: float | None = None
    geometry: dict[str, Any] | None = None


class LandParcelCreate(LandParcelBase):
    pass


class LandParcelUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    survey_number: str | None = None
    parcel_number: str | None = None
    village: str | None = None
    taluk: str | None = None
    district: str | None = None
    state: str | None = None
    area_hectares: float | None = None
    acquisition_status: str | None = None
    compensation_status: str | None = None
    legal_status: str | None = None
    possession_status: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    geometry: dict[str, Any] | None = None


class LandParcelOut(BaseModel):
    id: int
    parcel_id: str
    project_id: str
    project_pk: int
    survey_number: str
    parcel_number: str
    village: str
    taluk: str
    district: str
    state: str
    area_hectares: float
    acquisition_status: str
    compensation_status: str
    legal_status: str
    possession_status: str
    latitude: float | None
    longitude: float | None
    geometry: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime


class LandOwnerCreate(BaseModel):
    owner_id: str
    parcel_id: str
    project_id: str
    owner_name: str
    ownership_share: float
    ownership_type: str
    contact_status: str = "NOT_CONTACTED"
    compensation_status: str = "PENDING"
    legal_status: str = "CLEAR"


class LandOwnerUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    owner_name: str | None = None
    ownership_share: float | None = None
    ownership_type: str | None = None
    contact_status: str | None = None
    compensation_status: str | None = None
    legal_status: str | None = None


class LandOwnerOut(BaseModel):
    id: int
    owner_id: str
    parcel_id: str
    project_id: str
    owner_name: str
    ownership_share: float
    ownership_type: str
    contact_status: str
    compensation_status: str
    legal_status: str
    created_at: datetime
    updated_at: datetime


class CompensationRecordCreate(BaseModel):
    case_id: str
    project_id: str
    parcel_id: str | None = None
    owner_id: str | None = None
    assessed_amount: float
    approved_amount: float | None = None
    paid_amount: float = 0
    payment_status: str = "PENDING"
    assessment_date: str = ""
    approval_date: str = ""
    payment_date: str = ""
    remarks: str = ""


class CompensationRecordUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    assessed_amount: float | None = None
    approved_amount: float | None = None
    paid_amount: float | None = None
    payment_status: str | None = None
    assessment_date: str | None = None
    approval_date: str | None = None
    payment_date: str | None = None
    remarks: str | None = None


class CompensationRecordOut(BaseModel):
    id: int
    case_id: str
    project_id: str
    parcel_id: str | None
    owner_id: str | None
    assessed_amount: float
    approved_amount: float | None
    paid_amount: float
    pending_amount: float
    payment_status: str
    assessment_date: str
    approval_date: str
    payment_date: str
    remarks: str
    created_at: datetime
    updated_at: datetime


class LegalCaseCreate(BaseModel):
    case_id: str
    project_id: str
    parcel_id: str | None = None
    owner_id: str | None = None
    case_number: str
    court: str = ""
    case_type: str
    status: str = "PENDING"
    severity: str = "MEDIUM"
    filing_date: str = ""
    next_hearing_date: str = ""
    resolution_date: str = ""
    assigned_officer: str = ""
    remarks: str = ""


class LegalCaseUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    case_number: str | None = None
    court: str | None = None
    case_type: str | None = None
    status: str | None = None
    severity: str | None = None
    filing_date: str | None = None
    next_hearing_date: str | None = None
    resolution_date: str | None = None
    assigned_officer: str | None = None
    remarks: str | None = None


class LegalCaseOut(BaseModel):
    id: int
    case_id: str
    project_id: str
    parcel_id: str | None
    owner_id: str | None
    case_number: str
    court: str
    case_type: str
    status: str
    severity: str
    filing_date: str
    next_hearing_date: str
    resolution_date: str
    assigned_officer: str
    remarks: str
    created_at: datetime
    updated_at: datetime


class ResettlementRecordCreate(BaseModel):
    rr_id: str
    project_id: str
    parcel_id: str | None = None
    owner_id: str | None = None
    beneficiary_name: str = ""
    entitlement_type: str = ""
    status: str = "PENDING"
    completion_percentage: float = 0
    package_assessed: float = 0
    package_paid: float = 0
    resettlement_site: str = ""
    remarks: str = ""


class ResettlementRecordUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    beneficiary_name: str | None = None
    entitlement_type: str | None = None
    status: str | None = None
    completion_percentage: float | None = None
    package_assessed: float | None = None
    package_paid: float | None = None
    resettlement_site: str | None = None
    remarks: str | None = None


class ResettlementRecordOut(BaseModel):
    id: int
    rr_id: str
    project_id: str
    parcel_id: str | None
    owner_id: str | None
    beneficiary_name: str
    entitlement_type: str
    status: str
    completion_percentage: float
    package_assessed: float
    package_paid: float
    resettlement_site: str
    remarks: str
    created_at: datetime
    updated_at: datetime


class PossessionRecordCreate(BaseModel):
    possession_id: str
    project_id: str
    parcel_id: str
    status: str = "PENDING"
    possession_date: str = ""
    survey_status: str = "PENDING"
    handover_date: str = ""
    remarks: str = ""


class PossessionRecordUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: str | None = None
    possession_date: str | None = None
    survey_status: str | None = None
    handover_date: str | None = None
    remarks: str | None = None


class PossessionRecordOut(BaseModel):
    id: int
    possession_id: str
    project_id: str
    parcel_id: str
    status: str
    possession_date: str
    survey_status: str
    handover_date: str
    remarks: str
    created_at: datetime
    updated_at: datetime


class PredictionRequest(BaseModel):
    project_id: str


class DriverOut(BaseModel):
    feature: str
    contribution: float


class StageRiskOut(BaseModel):
    stage: str
    risk_score: float
    risk_category: str
    methodology: str


class RecommendationOut(BaseModel):
    priority: str
    reason: str
    recommended_action: str
    responsible_role: str
    expected_impact: str


class PredictionOut(BaseModel):
    id: int
    project_id: str
    probability_of_delay: float
    risk_score: float
    risk_category: str
    expected_delay_days: float
    current_stage: str
    stage_risks: list[StageRiskOut]
    top_positive_drivers: list[DriverOut]
    top_negative_drivers: list[DriverOut]
    recommendations: list[RecommendationOut]
    model_version: str
    classifier_algorithm: str
    regressor_algorithm: str
    created_at: datetime


class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_pk: int
    alert_type: str
    severity: str
    message: str
    status: str
    created_at: datetime
    acknowledged_at: datetime | None = None
    resolved_at: datetime | None = None


class DocumentCreate(BaseModel):
    project_id: str
    document_name: str
    document_type: str
    uploaded_by: str

    @field_validator("project_id", "document_name", "document_type", "uploaded_by")
    @classmethod
    def validate_required_text(cls, value: str, info) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError(f"{info.field_name} is required")
        return cleaned


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_pk: int
    document_name: str
    document_type: str
    uploaded_by: str
    uploaded_at: datetime
    status: str

class DocumentExtractionIn(BaseModel):
    extracted_fields: dict[str, Any]
    notes: str = ""


class DocumentExtractionOut(BaseModel):
    id: int
    document_id: int
    extraction_status: str
    extracted_fields: dict[str, Any]
    method_label: str
    notes: str
    updated_at: datetime


class DocumentMismatchOut(BaseModel):
    field_name: str
    database_value: str
    captured_value: str
    result: str


class DocumentComparisonOut(BaseModel):
    id: int
    document_id: int
    comparison_status: str
    compared_by: str
    compared_at: datetime
    mismatches: list[DocumentMismatchOut]


class DocumentReviewIn(BaseModel):
    status: str
    remarks: str = ""


class DocumentReviewOut(BaseModel):
    id: int
    document_id: int
    reviewer_email: str
    status: str
    remarks: str
    reviewed_at: datetime


class DocumentDecisionIn(BaseModel):
    decision: str
    remarks: str = ""


class DocumentDecisionOut(BaseModel):
    id: int
    document_id: int
    decision: str
    officer_email: str
    remarks: str
    decided_at: datetime


class AnalyticsOverview(BaseModel):
    total_projects: int
    projects_at_risk: int
    critical_projects: int
    average_risk_score: float
    average_predicted_delay: float
    projects_requiring_intervention: int


class DomainOverview(BaseModel):
    total_projects: int
    total_parcels: int
    total_owners: int
    compensation_cases: int
    compensation_pending_amount: float
    legal_cases: int
    documents: int
    documents_pending_review: int
    rr_records: int
    rr_completed: int
    possession_records: int
    possession_taken: int
    projects_at_risk: int


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_email: str
    action: str
    entity: str
    entity_id: str
    details: str
    timestamp: datetime


class DataQualityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    project_id: str
    completeness_percentage: float
    missing_fields: list[str]
    has_duplicates: bool
    has_invalid_dates: bool
    has_conflicting_values: bool
    confidence_score: float
