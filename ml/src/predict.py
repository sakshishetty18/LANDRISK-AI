"""
ACQUINOVA — Prediction Pipeline
==================================

Single entry point that turns one raw project record into a full
prediction result. This is the exact code path the FastAPI backend
calls for `POST /api/predictions` — nothing in the API layer computes
its own numbers; it all comes from here.

Pipeline (matches the spec's PREDICTION FLOW):
  1. engineer_features()          -- feature engineering
  2. preprocessor.transform()     -- scaling
  3. classifier.predict_proba()   -- probability_of_delay (REAL MODEL)
  4. risk_score_from_probability()-- 0-100 risk score (rule-based, documented, configurable)
  5. regressor.predict()          -- expected_delay_days (REAL MODEL)
  6. explainer.explain_instance() -- SHAP top drivers (REAL SHAP)
  7. stage_risk()                 -- rule-based stage-wise risk (explicitly labeled derived, not modeled)
  8. recommendations()            -- generated from the actual risk factors present
"""

from __future__ import annotations

import json
import os
from typing import Any

import joblib
import numpy as np
import pandas as pd

from explain import Explainer
from feature_engineering import STAGES, engineer_features

BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "..")
MODELS_DIR = os.path.join(BASE_DIR, "ml", "models")

# Prototype risk-score thresholds. NOT official government thresholds —
# configurable, documented here as the single source of truth.
RISK_THRESHOLDS = {"LOW": (0, 30), "MEDIUM": (31, 60), "HIGH": (61, 80), "CRITICAL": (81, 100)}


def risk_category_from_score(score: float) -> str:
    for category, (low, high) in RISK_THRESHOLDS.items():
        if low <= score <= high:
            return category
    return "CRITICAL"


class PredictionEngine:
    """Loads model artifacts once; call `.predict(project_row)` per request."""

    def __init__(self):
        self.classifier = joblib.load(os.path.join(MODELS_DIR, "best_classifier.joblib"))
        self.regressor = joblib.load(os.path.join(MODELS_DIR, "best_regressor.joblib"))
        self.scaler = joblib.load(os.path.join(MODELS_DIR, "preprocessor.joblib"))
        with open(os.path.join(MODELS_DIR, "model_metadata.json")) as f:
            self.metadata = json.load(f)
        self._explainer: Explainer | None = None  # lazy — SHAP setup is relatively expensive

    @property
    def explainer(self) -> Explainer:
        if self._explainer is None:
            self._explainer = Explainer()
        return self._explainer

    def predict(self, project_row: dict[str, Any]) -> dict[str, Any]:
        df = pd.DataFrame([project_row])
        features = engineer_features(df)
        features_scaled = self.scaler.transform(features)

        proba_delay = float(self.classifier.predict_proba(features_scaled)[0, 1])
        expected_delay_days = float(max(0.0, self.regressor.predict(features_scaled)[0]))

        risk_score = round(proba_delay * 100, 1)
        risk_category = risk_category_from_score(risk_score)

        explanation = self.explainer.explain_instance(features_scaled)
        stage_risks = compute_stage_risks(project_row, proba_delay)
        recs = generate_recommendations(project_row, features.iloc[0].to_dict(), explanation)

        return {
            "probability_of_delay": round(proba_delay, 4),
            "risk_score": risk_score,
            "risk_category": risk_category,
            "expected_delay_days": round(expected_delay_days, 1),
            "current_stage": project_row.get("current_stage"),
            "stage_risks": stage_risks,
            "top_positive_drivers": explanation["top_positive_drivers"],
            "top_negative_drivers": explanation["top_negative_drivers"],
            "recommendations": recs,
            "model_version": self.metadata["model_version"],
            "classifier_algorithm": self.metadata["classifier_algorithm"],
            "regressor_algorithm": self.metadata["regressor_algorithm"],
        }


def compute_stage_risks(project_row: dict[str, Any], overall_probability: float) -> list[dict[str, Any]]:
    """
    Rule-based / derived stage-wise risk (NOT a separate ML model per stage —
    the dataset does not have enough per-stage transition history to justify
    training 11 independent models). Explicitly labeled as derived below.

    Method: each stage gets a risk weight from directly relevant raw signals,
    blended with the model's overall delay probability so stage risk still
    reflects the AI prediction rather than being fully independent of it.
    """
    comp_pending_ratio = project_row.get("compensation_pending", 0) / max(1, project_row.get("compensation_assessed", 1))
    legal_score = {"None": 0, "Low": 0.3, "Medium": 0.6, "High": 1.0}.get(project_row.get("legal_dispute_severity", "None"), 0)
    approval_norm = min(1.0, project_row.get("approval_pending_days", 0) / 180)
    doc_gap = 1 - project_row.get("documentation_completeness", 100) / 100
    rr_gap = 1 - project_row.get("rr_completion_percentage", 100) / 100
    survey_gap = 1 - project_row.get("survey_completion_percentage", 100) / 100
    possession_gap = 1 - project_row.get("possession_percentage", 100) / 100

    stage_signal = {
        "Proposal": 0.15,
        "Scrutiny": 0.15 + 0.3 * doc_gap,
        "Approval": 0.2 + 0.6 * approval_norm,
        "Notification": 0.15 + 0.2 * doc_gap,
        "Survey": 0.15 + 0.5 * survey_gap,
        "Award": 0.15 + 0.3 * approval_norm,
        "Compensation": 0.15 + 0.7 * comp_pending_ratio,
        "Legal": 0.1 + 0.8 * legal_score,
        "Possession": 0.15 + 0.6 * possession_gap,
        "Rehabilitation": 0.15 + 0.6 * rr_gap,
        "Closure": 0.1 + 0.3 * possession_gap,
    }

    results = []
    for stage in STAGES:
        raw_signal = min(1.0, stage_signal[stage])
        blended = 0.6 * raw_signal + 0.4 * overall_probability
        score = round(blended * 100, 1)
        results.append({
            "stage": stage,
            "risk_score": score,
            "risk_category": risk_category_from_score(score),
            "methodology": "derived/rule-based",
        })
    return results


RECOMMENDATION_RULES = [
    # (condition_fn, priority, reason, action, role, impact)
    (
        lambda r, f: f["compensation_pending_ratio"] > 0.5,
        "HIGH", "Compensation pending ratio exceeds 50% of assessed value.",
        "Prioritize verification and disbursement of pending compensation.",
        "District Officer", "Reduces the largest single driver of possession delay.",
    ),
    (
        lambda r, f: f["approval_delay_ratio"] > 0.75,
        "HIGH", "Approval has been pending well beyond the 6-month baseline.",
        "Escalate the pending approval to the responsible sanctioning authority.",
        "State Admin", "Unblocks downstream award and compensation stages.",
    ),
    (
        lambda r, f: f["legal_dispute_severity_score"] >= 2,
        "CRITICAL", "Medium/high-severity legal disputes are active on this project.",
        "Review pending legal/objection cases and assign resolution priority.",
        "Legal Cell / Project Officer", "Legal resolution is typically the longest single blocker once triggered.",
    ),
    (
        lambda r, f: f["documentation_completeness_ratio"] < 0.6,
        "MEDIUM", "Documentation completeness is below 60%.",
        "Initiate document verification and resolve missing mandatory records.",
        "Project Officer", "Improves data quality and reduces downstream approval friction.",
    ),
    (
        lambda r, f: f["rr_progress_gap"] > 0.5,
        "MEDIUM", "Rehabilitation & Resettlement progress is under 50%.",
        "Prioritize rehabilitation and resettlement activities for affected families.",
        "District Officer", "R&R completion is typically a precondition for possession.",
    ),
    (
        lambda r, f: f["stakeholder_response_score"] < 0.4,
        "LOW", "Stakeholder responsiveness score is low.",
        "Increase engagement frequency with local stakeholders and affected families.",
        "Project Officer", "Improves cooperation and reduces objection risk.",
    ),
]


def generate_recommendations(project_row: dict, features: dict, explanation: dict) -> list[dict]:
    recs = []
    for condition, priority, reason, action, role, impact in RECOMMENDATION_RULES:
        if condition(project_row, features):
            recs.append({
                "priority": priority,
                "reason": reason,
                "recommended_action": action,
                "responsible_role": role,
                "expected_impact": impact,
            })
    if not recs:
        recs.append({
            "priority": "LOW",
            "reason": "No individual risk factor exceeds its threshold.",
            "recommended_action": "Continue routine monitoring; no immediate intervention required.",
            "responsible_role": "Project Officer",
            "expected_impact": "Maintains current low-risk trajectory.",
        })
    priority_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    recs.sort(key=lambda r: priority_order[r["priority"]])
    return recs


if __name__ == "__main__":
    raw = pd.read_csv(os.path.join(BASE_DIR, "data", "raw", "projects_raw.csv"))
    engine = PredictionEngine()
    sample_row = raw.iloc[0].to_dict()
    result = engine.predict(sample_row)
    print(json.dumps(result, indent=2, default=str))
