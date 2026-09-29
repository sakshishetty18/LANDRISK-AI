"""
ACQUINOVA — Model Training
=============================

Trains and compares real models for:
  MODEL 1 (classification): probability_of_delay  (target: `delayed`)
  MODEL 2 (regression):     expected_delay_days    (target: `delay_days`)

For each task we train Logistic/Linear Regression, Random Forest, and
XGBoost, evaluate all three on a held-out validation split, and keep
the best performer per task — the winner is NOT assumed in advance.

Outputs (ml/models/):
  best_classifier.joblib
  best_regressor.joblib
  preprocessor.joblib      (StandardScaler fit on training features)
  metrics.json             (full comparison table + winning model's metrics)
  feature_names.json
  model_metadata.json      (version, algorithm, training date, dataset size)

Run:
    python ml/src/train.py
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    precision_score,
    r2_score,
    recall_score,
    roc_auc_score,
)
from sklearn.metrics import mean_squared_error
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier, XGBRegressor

sys.path.insert(0, os.path.dirname(__file__))
from feature_engineering import FEATURE_NAMES, engineer_features  # noqa: E402

SEED = 42
BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "..")
RAW_PATH = os.path.join(BASE_DIR, "data", "raw", "projects_raw.csv")
MODELS_DIR = os.path.join(BASE_DIR, "ml", "models")
MODEL_VERSION = "v1.0.0"


def load_dataset():
    df = pd.read_csv(RAW_PATH)
    X = engineer_features(df)
    y_class = df["delayed"].values
    y_reg = df["delay_days"].values
    return df, X, y_class, y_reg


def train_classification(X_train, X_val, y_train, y_val):
    candidates = {
        "LogisticRegression": LogisticRegression(max_iter=2000, class_weight="balanced", random_state=SEED),
        "RandomForest": RandomForestClassifier(n_estimators=300, max_depth=8, min_samples_leaf=4, random_state=SEED, class_weight="balanced"),
        "XGBoost": XGBClassifier(
            n_estimators=250, max_depth=4, learning_rate=0.06, subsample=0.85, colsample_bytree=0.85,
            eval_metric="logloss", random_state=SEED,
            scale_pos_weight=(y_train == 0).sum() / max(1, (y_train == 1).sum()),
        ),
    }

    results = {}
    fitted = {}
    for name, model in candidates.items():
        model.fit(X_train, y_train)
        proba = model.predict_proba(X_val)[:, 1]
        pred = (proba >= 0.5).astype(int)
        results[name] = {
            "accuracy": round(float(accuracy_score(y_val, pred)), 4),
            "precision": round(float(precision_score(y_val, pred, zero_division=0)), 4),
            "recall": round(float(recall_score(y_val, pred, zero_division=0)), 4),
            "f1": round(float(f1_score(y_val, pred, zero_division=0)), 4),
            "roc_auc": round(float(roc_auc_score(y_val, proba)), 4),
            "confusion_matrix": confusion_matrix(y_val, pred).tolist(),
        }
        fitted[name] = model

    # Select by ROC-AUC (robust to class imbalance), tie-break on F1.
    best_name = max(results, key=lambda n: (results[n]["roc_auc"], results[n]["f1"]))
    return best_name, fitted[best_name], results


def train_regression(X_train, X_val, y_train, y_val):
    candidates = {
        "LinearRegression": LinearRegression(),
        "RandomForest": RandomForestRegressor(n_estimators=300, max_depth=8, min_samples_leaf=4, random_state=SEED),
        "XGBoost": XGBRegressor(
            n_estimators=300, max_depth=4, learning_rate=0.05, subsample=0.85, colsample_bytree=0.85,
            random_state=SEED,
        ),
    }

    results = {}
    fitted = {}
    for name, model in candidates.items():
        model.fit(X_train, y_train)
        pred = model.predict(X_val)
        mae = mean_absolute_error(y_val, pred)
        rmse = float(np.sqrt(mean_squared_error(y_val, pred)))
        r2 = r2_score(y_val, pred)
        results[name] = {
            "mae": round(float(mae), 3),
            "rmse": round(float(rmse), 3),
            "r2": round(float(r2), 4),
        }
        fitted[name] = model

    # Select by R^2, tie-break on lower RMSE.
    best_name = max(results, key=lambda n: (results[n]["r2"], -results[n]["rmse"]))
    return best_name, fitted[best_name], results


def main():
    os.makedirs(MODELS_DIR, exist_ok=True)
    df, X, y_class, y_reg = load_dataset()

    X_train, X_val, y_class_train, y_class_val, y_reg_train, y_reg_val = train_test_split(
        X, y_class, y_reg, test_size=0.25, random_state=SEED, stratify=y_class
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)

    print("Training classification models (target: delayed)...")
    best_clf_name, best_clf, clf_results = train_classification(X_train_scaled, X_val_scaled, y_class_train, y_class_val)
    print(f"  -> selected {best_clf_name} (ROC-AUC {clf_results[best_clf_name]['roc_auc']})")

    print("Training regression models (target: delay_days)...")
    best_reg_name, best_reg, reg_results = train_regression(X_train_scaled, X_val_scaled, y_reg_train, y_reg_val)
    print(f"  -> selected {best_reg_name} (R2 {reg_results[best_reg_name]['r2']})")

    joblib.dump(best_clf, os.path.join(MODELS_DIR, "best_classifier.joblib"))
    joblib.dump(best_reg, os.path.join(MODELS_DIR, "best_regressor.joblib"))
    joblib.dump(scaler, os.path.join(MODELS_DIR, "preprocessor.joblib"))

    with open(os.path.join(MODELS_DIR, "feature_names.json"), "w") as f:
        json.dump(FEATURE_NAMES, f, indent=2)

    metrics = {
        "classification": {"selected_model": best_clf_name, "all_models": clf_results},
        "regression": {"selected_model": best_reg_name, "all_models": reg_results},
    }
    with open(os.path.join(MODELS_DIR, "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)

    metadata = {
        "model_version": MODEL_VERSION,
        "classifier_algorithm": best_clf_name,
        "regressor_algorithm": best_reg_name,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "dataset_size": len(df),
        "train_size": len(X_train),
        "val_size": len(X_val),
        "feature_count": len(FEATURE_NAMES),
        "dataset_provenance": "Synthetic prototype dataset for demonstration and model development.",
    }
    with open(os.path.join(MODELS_DIR, "model_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    print("\nSaved models + metrics to", MODELS_DIR)
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()
