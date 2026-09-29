"""
ACQUINOVA — Feature Engineering
=================================

Derives model-ready features from raw project records. This module is
shared by training (ml/src/train.py) and online inference
(backend app.services.prediction), so the exact same transformation
is used whether we're building the training matrix or scoring one
project on demand — this is what "no fake AI" means in practice: the
numbers shown in the UI are the literal output of this code path.

LEAKAGE NOTE: `delayed` and `delay_days` (the training labels) are
never read by this module. Every feature below is computed only from
fields that would be genuinely known about a project while it is
still in progress.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

STAGES = [
    "Proposal", "Scrutiny", "Approval", "Notification", "Survey",
    "Award", "Compensation", "Legal", "Possession", "Rehabilitation", "Closure",
]

LEGAL_SEVERITY_MAP = {"None": 0, "Low": 1, "Medium": 2, "High": 3}

# Every engineered feature, documented, in the exact order fed to the models.
FEATURE_NAMES = [
    "land_acquisition_ratio",
    "compensation_pending_ratio",
    "affected_family_density",
    "approval_delay_ratio",
    "documentation_completeness_ratio",
    "legal_case_density",
    "possession_gap",
    "rr_progress_gap",
    "survey_completion_gap",
    "stakeholder_response_score",
    "historical_agency_delay_rate",
    "days_in_current_stage",
    "milestone_delay_count",
    "notification_age_days",
    "compensation_delay_days",
    "land_remaining_percentage",
    "project_complexity_score",
    "current_stage_index",
    "legal_dispute_severity_score",
]

FEATURE_DOCS = {
    "land_acquisition_ratio": "land_acquired_hectares / land_proposed_hectares — how much of the proposed land is actually in hand.",
    "compensation_pending_ratio": "compensation_pending / compensation_assessed — unresolved financial obligation.",
    "affected_family_density": "affected_families / land_proposed_hectares — social complexity per hectare.",
    "approval_delay_ratio": "approval_pending_days / 180 — administrative approval backlog, normalized to a 6-month baseline.",
    "documentation_completeness_ratio": "documentation_completeness / 100.",
    "legal_case_density": "legal_cases / (affected_families / 100 + 1) — litigation intensity relative to project scale.",
    "possession_gap": "1 - possession_percentage / 100 — physical possession still outstanding.",
    "rr_progress_gap": "1 - rr_completion_percentage / 100 — rehabilitation & resettlement still outstanding.",
    "survey_completion_gap": "1 - survey_completion_percentage / 100.",
    "stakeholder_response_score": "stakeholder_responsiveness / 100 (higher = more responsive, lower risk).",
    "historical_agency_delay_rate": "Rolling historical delay rate of the implementing agency (0-1).",
    "days_in_current_stage": "Approximate days elapsed since project_start_date, scaled by stage position (proxy in the absence of stage-transition logs).",
    "milestone_delay_count": "Count of stage-relevant delay signals present: notification pending, approval overdue (>90d), award pending while past-approval stage.",
    "notification_age_days": "Days since notification_date if completed, else 0.",
    "compensation_delay_days": "approval_pending_days scaled by compensation_pending_ratio — proxy for compensation-linked delay.",
    "land_remaining_percentage": "100 - acquisition_percentage.",
    "project_complexity_score": "Composite of land_proposed_hectares (log), affected_families (log) and number of lifecycle stages remaining.",
    "current_stage_index": "Ordinal position of current_stage in the 11-stage lifecycle (0-10).",
    "legal_dispute_severity_score": "Ordinal encoding of legal_dispute_severity: None=0, Low=1, Medium=2, High=3.",
}


def _safe_div(a: pd.Series, b: pd.Series) -> pd.Series:
    return (a / b.replace(0, np.nan)).fillna(0)


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Input: DataFrame with raw project fields (see data dictionary).
    Output: DataFrame with exactly FEATURE_NAMES columns, in order,
    ready to feed to the preprocessor / model.
    """
    out = pd.DataFrame(index=df.index)

    out["land_acquisition_ratio"] = _safe_div(df["land_acquired_hectares"], df["land_proposed_hectares"]).clip(0, 1.5)
    out["compensation_pending_ratio"] = _safe_div(df["compensation_pending"], df["compensation_assessed"]).clip(0, 1)
    out["affected_family_density"] = _safe_div(df["affected_families"], df["land_proposed_hectares"]).clip(0, 200)
    out["approval_delay_ratio"] = (df["approval_pending_days"] / 180.0).clip(0, 3)
    out["documentation_completeness_ratio"] = (df["documentation_completeness"] / 100.0).clip(0, 1)
    out["legal_case_density"] = _safe_div(df["legal_cases"], (df["affected_families"] / 100.0 + 1))
    out["possession_gap"] = (1 - df["possession_percentage"] / 100.0).clip(0, 1)
    out["rr_progress_gap"] = (1 - df["rr_completion_percentage"] / 100.0).clip(0, 1)
    out["survey_completion_gap"] = (1 - df["survey_completion_percentage"] / 100.0).clip(0, 1)
    out["stakeholder_response_score"] = (df["stakeholder_responsiveness"] / 100.0).clip(0, 1)
    out["historical_agency_delay_rate"] = df["historical_agency_delay_rate"].clip(0, 1)

    stage_index = df["current_stage"].map(lambda s: STAGES.index(s) if s in STAGES else 0)
    out["current_stage_index"] = stage_index

    start = pd.to_datetime(df["project_start_date"], errors="coerce")
    reference_date = pd.Timestamp("2026-09-01")
    project_age_days = (reference_date - start).dt.days.fillna(0).clip(lower=0)
    out["days_in_current_stage"] = (project_age_days * ((stage_index + 1) / len(STAGES))).clip(0, 3000)

    notif_date = pd.to_datetime(df["notification_date"].replace("", pd.NaT), errors="coerce")
    out["notification_age_days"] = (reference_date - notif_date).dt.days.fillna(0).clip(lower=0)

    milestone_delay = (
        (df["notification_status"] != "Completed").astype(int)
        + (df["approval_pending_days"] > 90).astype(int)
        + ((df["award_status"] != "Completed") & (stage_index > STAGES.index("Award"))).astype(int)
    )
    out["milestone_delay_count"] = milestone_delay

    out["compensation_delay_days"] = df["approval_pending_days"] * out["compensation_pending_ratio"]
    out["land_remaining_percentage"] = (100 - df["acquisition_percentage"]).clip(0, 100)

    out["project_complexity_score"] = (
        np.log1p(df["land_proposed_hectares"]) * 0.4
        + np.log1p(df["affected_families"]) * 0.4
        + (len(STAGES) - 1 - stage_index) * 0.2
    )

    out["legal_dispute_severity_score"] = df["legal_dispute_severity"].map(LEGAL_SEVERITY_MAP).fillna(0)

    return out[FEATURE_NAMES]


if __name__ == "__main__":
    import os

    raw_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "raw", "projects_raw.csv")
    df = pd.read_csv(raw_path)
    features = engineer_features(df)
    processed_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data", "processed")
    os.makedirs(processed_dir, exist_ok=True)
    features.to_csv(os.path.join(processed_dir, "features.csv"), index=False)
    print(features.describe().T)
