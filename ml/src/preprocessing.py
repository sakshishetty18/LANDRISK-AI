"""
ACQUINOVA — Preprocessing / validation / cleaning.

Validates the raw project table before feature engineering: required columns,
numeric coercion, range clipping and duplicate removal. Used by evaluate.py and
available to train.py-style pipelines.
"""
from __future__ import annotations

import pandas as pd

REQUIRED_COLUMNS = [
    "project_id", "land_proposed_hectares", "land_acquired_hectares", "acquisition_percentage",
    "affected_families", "compensation_assessed", "compensation_paid", "compensation_pending",
    "legal_cases", "legal_dispute_severity", "possession_percentage", "rr_completion_percentage",
    "survey_completion_percentage", "documentation_completeness", "stakeholder_responsiveness",
    "current_stage", "project_start_date", "historical_agency_delay_rate", "approval_pending_days",
    "notification_status", "award_status",
]
PERCENT_COLUMNS = [
    "acquisition_percentage", "possession_percentage", "rr_completion_percentage",
    "survey_completion_percentage", "documentation_completeness", "stakeholder_responsiveness",
]


def validate(df: pd.DataFrame) -> None:
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"Raw dataset is missing required columns: {missing}")


def clean(df: pd.DataFrame) -> pd.DataFrame:
    validate(df)
    out = df.drop_duplicates(subset="project_id").copy()
    for col in PERCENT_COLUMNS:
        out[col] = pd.to_numeric(out[col], errors="coerce").fillna(0).clip(0, 100)
    for col in ["notification_date", "award_date", "actual_completion_date"]:
        if col in out.columns:
            out[col] = out[col].fillna("")
    return out
