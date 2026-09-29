"""
Bridges the FastAPI backend to the real ML pipeline in ml/src.
The prediction engine (models, scaler, SHAP explainer) is loaded once
per process and reused across requests.
"""
from __future__ import annotations

import os
import sys

from ..config import get_settings

settings = get_settings()
ML_SRC_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml", "src")
if ML_SRC_DIR not in sys.path:
    sys.path.insert(0, os.path.abspath(ML_SRC_DIR))

_engine = None
_explainer = None


def get_prediction_engine():
    global _engine
    if _engine is None:
        from predict import PredictionEngine  # imported lazily from ml/src

        _engine = PredictionEngine()
    return _engine


def get_explainer():
    """Shared SHAP explainer instance for global (portfolio-level) importance."""
    global _explainer
    if _explainer is None:
        from explain import Explainer

        _explainer = Explainer()
    return _explainer


def project_to_raw_dict(project) -> dict:
    """Convert a SQLAlchemy Project row into the raw-field dict the ML pipeline expects."""
    return {
        "project_id": project.project_id,
        "project_type": project.project_type,
        "land_proposed_hectares": project.land_proposed_hectares,
        "land_acquired_hectares": project.land_acquired_hectares,
        "acquisition_percentage": project.acquisition_percentage,
        "affected_families": project.affected_families,
        "displaced_families": project.displaced_families,
        "notification_status": project.notification_status,
        "notification_date": project.notification_date,
        "survey_status": project.survey_status,
        "survey_completion_percentage": project.survey_completion_percentage,
        "approval_status": project.approval_status,
        "approval_pending_days": project.approval_pending_days,
        "award_status": project.award_status,
        "award_date": project.award_date,
        "compensation_assessed": project.compensation_assessed,
        "compensation_paid": project.compensation_paid,
        "compensation_pending": project.compensation_pending,
        "legal_cases": project.legal_cases,
        "legal_dispute_severity": project.legal_dispute_severity,
        "possession_status": project.possession_status,
        "possession_percentage": project.possession_percentage,
        "rr_status": project.rr_status,
        "rr_completion_percentage": project.rr_completion_percentage,
        "documentation_completeness": project.documentation_completeness,
        "stakeholder_responsiveness": project.stakeholder_responsiveness,
        "current_stage": project.current_stage,
        "project_start_date": project.project_start_date,
        "historical_agency_delay_rate": project.historical_agency_delay_rate,
    }
