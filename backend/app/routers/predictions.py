from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user
from ..services.ml_service import get_prediction_engine, project_to_raw_dict
from .audit import write_audit_log
from .alerts import create_alerts_from_prediction

router = APIRouter(prefix="/api", tags=["predictions"])


def _prediction_to_out(pred: models.Prediction, project_id: str) -> schemas.PredictionOut:
    return schemas.PredictionOut(
        id=pred.id,
        project_id=project_id,
        probability_of_delay=pred.probability_of_delay,
        risk_score=pred.risk_score,
        risk_category=pred.risk_category,
        expected_delay_days=pred.expected_delay_days,
        current_stage=pred.project.current_stage,
        stage_risks=json.loads(pred.stage_risks_json),
        top_positive_drivers=json.loads(pred.top_positive_drivers_json),
        top_negative_drivers=json.loads(pred.top_negative_drivers_json),
        recommendations=json.loads(pred.recommendations_json),
        model_version=pred.model_version,
        classifier_algorithm=pred.classifier_algorithm,
        regressor_algorithm=pred.regressor_algorithm,
        created_at=pred.created_at,
    )


@router.post("/predictions", response_model=schemas.PredictionOut)
def run_prediction(
    payload: schemas.PredictionRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    project = db.query(models.Project).filter(models.Project.project_id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    engine = get_prediction_engine()
    raw = project_to_raw_dict(project)
    result = engine.predict(raw)

    pred = models.Prediction(
        project_pk=project.id,
        probability_of_delay=result["probability_of_delay"],
        risk_score=result["risk_score"],
        risk_category=result["risk_category"],
        expected_delay_days=result["expected_delay_days"],
        model_version=result["model_version"],
        classifier_algorithm=result["classifier_algorithm"],
        regressor_algorithm=result["regressor_algorithm"],
        top_positive_drivers_json=json.dumps(result["top_positive_drivers"]),
        top_negative_drivers_json=json.dumps(result["top_negative_drivers"]),
        stage_risks_json=json.dumps(result["stage_risks"]),
        recommendations_json=json.dumps(result["recommendations"]),
    )
    db.add(pred)
    db.commit()
    db.refresh(pred)

    write_audit_log(db, current_user.email, "PREDICTION_GENERATED", "Project", project.project_id,
                     details=f"risk_score={result['risk_score']}")
    create_alerts_from_prediction(db, project, result)

    return _prediction_to_out(pred, project.project_id)


@router.get("/predictions/{project_id}", response_model=list[schemas.PredictionOut])
def get_predictions(project_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    project = db.query(models.Project).filter(models.Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    preds = (
        db.query(models.Prediction)
        .filter(models.Prediction.project_pk == project.id)
        .order_by(models.Prediction.created_at.desc())
        .all()
    )
    return [_prediction_to_out(p, project_id) for p in preds]


def _latest_prediction(db: Session, project_id: str) -> models.Prediction:
    project = db.query(models.Project).filter(models.Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    pred = (
        db.query(models.Prediction)
        .filter(models.Prediction.project_pk == project.id)
        .order_by(models.Prediction.created_at.desc())
        .first()
    )
    if not pred:
        raise HTTPException(status_code=404, detail="No prediction has been generated for this project yet. POST /api/predictions first.")
    return pred


@router.get("/projects/{project_id}/explanation")
def get_explanation(project_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    pred = _latest_prediction(db, project_id)
    return {
        "top_positive_drivers": json.loads(pred.top_positive_drivers_json),
        "top_negative_drivers": json.loads(pred.top_negative_drivers_json),
        "model_version": pred.model_version,
    }


@router.get("/projects/{project_id}/recommendations")
def get_recommendations(project_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    pred = _latest_prediction(db, project_id)
    return json.loads(pred.recommendations_json)


@router.get("/projects/{project_id}/stage-risks")
def get_stage_risks(project_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    pred = _latest_prediction(db, project_id)
    return json.loads(pred.stage_risks_json)
