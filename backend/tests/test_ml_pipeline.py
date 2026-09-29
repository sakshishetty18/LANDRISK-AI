from __future__ import annotations

import json
import os
import sys

import pandas as pd
import pytest

ML_SRC = os.path.join(os.path.dirname(__file__), "..", "..", "ml", "src")
sys.path.insert(0, os.path.abspath(ML_SRC))

from feature_engineering import FEATURE_NAMES, engineer_features  # noqa: E402

BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "..")
RAW_PATH = os.path.join(BASE_DIR, "data", "raw", "projects_raw.csv")
MODELS_DIR = os.path.join(BASE_DIR, "ml", "models")


@pytest.fixture(scope="module")
def raw_df():
    return pd.read_csv(RAW_PATH)


def test_raw_dataset_exists_and_labeled(raw_df):
    assert len(raw_df) >= 100
    assert "delayed" in raw_df.columns
    assert "delay_days" in raw_df.columns
    assert raw_df["delayed"].isin([0, 1]).all()


def test_feature_engineering_no_leakage(raw_df):
    features = engineer_features(raw_df)
    assert list(features.columns) == FEATURE_NAMES
    assert "delayed" not in features.columns
    assert "delay_days" not in features.columns


def test_feature_engineering_ranges(raw_df):
    features = engineer_features(raw_df)
    assert features["compensation_pending_ratio"].between(0, 1).all()
    assert features["documentation_completeness_ratio"].between(0, 1).all()
    assert features["current_stage_index"].between(0, 10).all()
    assert not features.isna().any().any()


def test_model_artifacts_exist():
    for filename in ["best_classifier.joblib", "best_regressor.joblib", "preprocessor.joblib", "metrics.json", "model_metadata.json", "feature_names.json"]:
        assert os.path.exists(os.path.join(MODELS_DIR, filename)), f"missing {filename}"


def test_metrics_json_has_real_comparison():
    with open(os.path.join(MODELS_DIR, "metrics.json")) as f:
        metrics = json.load(f)
    clf = metrics["classification"]["all_models"]
    assert set(clf.keys()) == {"LogisticRegression", "RandomForest", "XGBoost"}
    for name, m in clf.items():
        assert 0.0 <= m["accuracy"] <= 1.0
        assert 0.0 <= m["roc_auc"] <= 1.0
        assert len(m["confusion_matrix"]) == 2

    reg = metrics["regression"]["all_models"]
    assert set(reg.keys()) == {"LinearRegression", "RandomForest", "XGBoost"}
    for name, m in reg.items():
        assert m["mae"] >= 0
        assert m["rmse"] >= 0


def test_selected_model_is_best_by_metric():
    with open(os.path.join(MODELS_DIR, "metrics.json")) as f:
        metrics = json.load(f)
    clf = metrics["classification"]
    best = clf["selected_model"]
    best_auc = clf["all_models"][best]["roc_auc"]
    assert all(best_auc >= m["roc_auc"] for m in clf["all_models"].values())


def test_prediction_engine_end_to_end(raw_df):
    sys.path.insert(0, ML_SRC)
    from predict import PredictionEngine

    engine = PredictionEngine()
    row = raw_df.iloc[0].to_dict()
    result = engine.predict(row)

    assert 0.0 <= result["probability_of_delay"] <= 1.0
    assert 0.0 <= result["risk_score"] <= 100.0
    assert result["risk_category"] in ("LOW", "MEDIUM", "HIGH", "CRITICAL")
    assert result["expected_delay_days"] >= 0
    assert len(result["stage_risks"]) == 11
    assert len(result["top_positive_drivers"]) <= 5
    assert all(d["feature"] in FEATURE_NAMES for d in result["top_positive_drivers"])


def test_prediction_is_deterministic(raw_df):
    sys.path.insert(0, ML_SRC)
    from predict import PredictionEngine

    engine = PredictionEngine()
    row = raw_df.iloc[5].to_dict()
    r1 = engine.predict(row)
    r2 = engine.predict(row)
    assert r1["probability_of_delay"] == r2["probability_of_delay"]
    assert r1["risk_score"] == r2["risk_score"]


def test_higher_compensation_pending_raises_risk(raw_df):
    """Sanity check that the model responds directionally as expected: holding
    everything else fixed, increasing compensation_pending should not lower
    the predicted delay probability for a project already at moderate risk."""
    sys.path.insert(0, ML_SRC)
    from predict import PredictionEngine

    engine = PredictionEngine()
    row = raw_df.iloc[2].to_dict()
    row_low = dict(row, compensation_pending=0.0)
    row_high = dict(row, compensation_pending=row["compensation_assessed"] * 0.95)

    result_low = engine.predict(row_low)
    result_high = engine.predict(row_high)
    assert result_high["probability_of_delay"] >= result_low["probability_of_delay"]
