"""
ACQUINOVA — Explainability (SHAP)
====================================

Computes real SHAP values against the trained classifier. Used both
by evaluate.py (global feature importance, for Model Monitoring) and
by the backend prediction service (local, per-project explanation).

No hard-coded contribution numbers anywhere — everything here is the
literal output of shap.Explainer against the actual fitted model.
"""

from __future__ import annotations

import os

import joblib
import numpy as np
import pandas as pd
import shap

from feature_engineering import FEATURE_NAMES

BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "..")
MODELS_DIR = os.path.join(BASE_DIR, "ml", "models")


class Explainer:
    """Lazily builds a SHAP explainer for the current classifier + a background sample."""

    def __init__(self):
        self.classifier = joblib.load(os.path.join(MODELS_DIR, "best_classifier.joblib"))
        self.scaler = joblib.load(os.path.join(MODELS_DIR, "preprocessor.joblib"))

        # Background reference set for SHAP, drawn from the training distribution.
        raw = pd.read_csv(os.path.join(BASE_DIR, "data", "raw", "projects_raw.csv"))
        from feature_engineering import engineer_features

        bg_features = engineer_features(raw).sample(n=min(100, len(raw)), random_state=42)
        bg_scaled = self.scaler.transform(bg_features)

        model_type = type(self.classifier).__name__
        if model_type in ("RandomForestClassifier", "XGBClassifier"):
            self._explainer = shap.TreeExplainer(self.classifier, bg_scaled)
        else:
            # Linear / other models: use the general Explainer with the background sample.
            self._explainer = shap.Explainer(self.classifier.predict_proba, bg_scaled, feature_names=FEATURE_NAMES)

    def explain_instance(self, feature_row_scaled: np.ndarray) -> dict:
        """feature_row_scaled: shape (1, n_features), already scaled by the same preprocessor."""
        shap_values = self._explainer(feature_row_scaled)

        # Normalize output across explainer types to a single 1D array of per-feature contributions
        # toward the POSITIVE (delayed=1) class.
        values = shap_values.values
        if values.ndim == 3:  # (n_samples, n_features, n_classes)
            contrib = values[0, :, 1]
        elif values.ndim == 2:
            contrib = values[0]
        else:
            contrib = np.ravel(values)

        drivers = list(zip(FEATURE_NAMES, contrib.tolist()))
        drivers.sort(key=lambda x: abs(x[1]), reverse=True)

        positive = [{"feature": f, "contribution": round(v, 4)} for f, v in drivers if v > 0][:5]
        negative = [{"feature": f, "contribution": round(v, 4)} for f, v in drivers if v < 0][:5]

        return {
            "top_positive_drivers": positive,
            "top_negative_drivers": negative,
            "all_contributions": [{"feature": f, "contribution": round(v, 4)} for f, v in drivers],
        }

    def global_importance(self, sample_size: int = 100) -> list[dict]:
        raw = pd.read_csv(os.path.join(BASE_DIR, "data", "raw", "projects_raw.csv"))
        from feature_engineering import engineer_features

        sample = engineer_features(raw).sample(n=min(sample_size, len(raw)), random_state=7)
        sample_scaled = self.scaler.transform(sample)
        shap_values = self._explainer(sample_scaled)

        values = shap_values.values
        if values.ndim == 3:
            mean_abs = np.abs(values[:, :, 1]).mean(axis=0)
        else:
            mean_abs = np.abs(values).mean(axis=0)

        importance = sorted(zip(FEATURE_NAMES, mean_abs.tolist()), key=lambda x: x[1], reverse=True)
        return [{"feature": f, "mean_abs_shap": round(v, 4)} for f, v in importance]


if __name__ == "__main__":
    explainer = Explainer()
    print("Global feature importance (mean |SHAP|):")
    for row in explainer.global_importance():
        print(f"  {row['feature']:<35} {row['mean_abs_shap']}")
