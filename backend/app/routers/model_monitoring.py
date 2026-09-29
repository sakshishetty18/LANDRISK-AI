from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models
from ..config import get_settings
from ..database import get_db
from ..deps import require_roles, get_current_user
from .audit import write_audit_log

router = APIRouter(prefix="/api/model", tags=["model_monitoring"])
settings = get_settings()


def _load_json(filename: str) -> dict:
    path = os.path.join(settings.ML_MODELS_DIR, filename)
    with open(path) as f:
        return json.load(f)


@router.get("/metrics")
def model_metrics(current_user: models.User = Depends(get_current_user)):
    metrics = _load_json("metrics.json")
    metadata = _load_json("model_metadata.json")
    return {"metadata": metadata, "metrics": metrics}


@router.get("/feature-importance")
def feature_importance(current_user: models.User = Depends(get_current_user)):
    """
    Portfolio-level (global) SHAP feature importance — mean |SHAP value| across
    a sample of real projects, computed against the actual trained classifier.
    Not hard-coded.
    """
    from ..services.ml_service import get_explainer

    explainer = get_explainer()
    return explainer.global_importance()


@router.get("/versions")
def model_versions(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    versions = db.query(models.ModelVersion).order_by(models.ModelVersion.trained_at.desc()).all()
    if not versions:
        # Fall back to the metadata file if no DB-recorded version exists yet (fresh install)
        metadata = _load_json("model_metadata.json")
        return [metadata]
    return [
        {
            "version": v.version,
            "classifier_algorithm": v.classifier_algorithm,
            "regressor_algorithm": v.regressor_algorithm,
            "trained_at": v.trained_at.isoformat(),
            "dataset_size": v.dataset_size,
            "is_active": v.is_active,
        }
        for v in versions
    ]


@router.post("/retrain")
def retrain_model(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("SUPER_ADMIN", "CENTRAL_ADMIN")),
):
    """
    Manual retraining endpoint. Runs the actual ml/src/train.py pipeline
    synchronously and reloads the metadata. This is a manual trigger only —
    ACQUINOVA does NOT claim automatic continuous learning.
    """
    train_script = os.path.join(settings.ML_MODELS_DIR, "..", "src", "train.py")
    result = subprocess.run(
        [sys.executable, os.path.abspath(train_script)],
        capture_output=True, text=True, timeout=600,
    )
    if result.returncode != 0:
        return {"status": "failed", "stderr": result.stderr[-2000:]}

    # Invalidate the cached in-process prediction engine so the next request reloads new artifacts.
    from ..services import ml_service
    ml_service._engine = None
    ml_service._explainer = None

    metadata = _load_json("model_metadata.json")
    version = models.ModelVersion(
        version=metadata["model_version"],
        classifier_algorithm=metadata["classifier_algorithm"],
        regressor_algorithm=metadata["regressor_algorithm"],
        trained_at=datetime.fromisoformat(metadata["trained_at"]),
        dataset_size=metadata["dataset_size"],
        metrics_json=json.dumps(_load_json("metrics.json")),
        is_active=True,
    )
    db.query(models.ModelVersion).update({models.ModelVersion.is_active: False})
    db.add(version)
    db.commit()

    write_audit_log(db, current_user.email, "MODEL_UPDATED", "Model", metadata["model_version"])
    return {"status": "success", "metadata": metadata}
