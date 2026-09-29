from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import Base, engine
from .routers import (
    alerts,
    admin,
    analytics,
    audit,
    auth,
    compensation,
    data_quality,
    documents,
    gis,
    model_monitoring,
    owners,
    parcels,
    records,
    predictions,
    projects,
)

settings = get_settings()

# Prototype convenience: auto-create tables if they don't exist yet (SQLite
# local dev). Production Postgres deployments should run Alembic migrations
# instead — see backend/alembic/ and README "Database migrations".
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ACQUINOVA API",
    description="AI-Powered Predictive Land Acquisition Intelligence Platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(projects.router)
app.include_router(parcels.router)
app.include_router(owners.router)
app.include_router(compensation.router)
app.include_router(records.legal_router)
app.include_router(records.rr_router)
app.include_router(records.possession_router)
app.include_router(predictions.router)
app.include_router(analytics.router)
app.include_router(gis.router)
app.include_router(alerts.router)
app.include_router(model_monitoring.router)
app.include_router(documents.router)
app.include_router(data_quality.router)
app.include_router(audit.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "environment": settings.ENVIRONMENT}
