"""
ACQUINOVA — Evaluation report.

Re-validates the saved artifacts against a fresh, seeded hold-out split
(same split as train.py) and prints the metrics stored in metrics.json next to
the recomputed ones, so drift between saved and recomputed numbers is visible.

Run:  python ml/src/evaluate.py
"""
from __future__ import annotations

import json
import os
import sys

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, r2_score, roc_auc_score
from sklearn.model_selection import train_test_split

sys.path.insert(0, os.path.dirname(__file__))
from feature_engineering import engineer_features  # noqa: E402
from preprocessing import clean  # noqa: E402

BASE = os.path.join(os.path.dirname(__file__), "..", "..")
MODELS = os.path.join(BASE, "ml", "models")


def main():
    df = clean(pd.read_csv(os.path.join(BASE, "data", "raw", "projects_raw.csv")))
    X = engineer_features(df)
    _, X_val, _, yc_val, _, yr_val = train_test_split(
        X, df["delayed"].values, df["delay_days"].values, test_size=0.25, random_state=42, stratify=df["delayed"].values)
    scaler = joblib.load(os.path.join(MODELS, "preprocessor.joblib"))
    clf = joblib.load(os.path.join(MODELS, "best_classifier.joblib"))
    reg = joblib.load(os.path.join(MODELS, "best_regressor.joblib"))
    Xs = scaler.transform(X_val)
    auc = roc_auc_score(yc_val, clf.predict_proba(Xs)[:, 1])
    pred = reg.predict(Xs)
    saved = json.load(open(os.path.join(MODELS, "metrics.json")))
    sc, sr = saved["classification"], saved["regression"]
    print(f"Classifier {sc['selected_model']}: recomputed ROC-AUC={auc:.4f} | saved={sc['all_models'][sc['selected_model']]['roc_auc']}")
    print(f"Regressor  {sr['selected_model']}: recomputed MAE={mean_absolute_error(yr_val, pred):.3f}, "
          f"R2={r2_score(yr_val, pred):.4f} | saved R2={sr['all_models'][sr['selected_model']]['r2']}")


if __name__ == "__main__":
    main()
