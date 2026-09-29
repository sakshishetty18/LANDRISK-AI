# ACQUINOVA
**AI-Powered Predictive Land Acquisition Intelligence Platform** — *Predict. Prevent. Accelerate.*

Prototype for the Smart India Hackathon problem *"Predictive Analytics System for Early Detection of Land Acquisition Delays"*.

> **Data disclaimer.** All project records are a **synthetic prototype dataset for demonstration and model development** (`ml/src/generate_demo_data.py`, seed 42). They are *not* official Government of India / LACRRIS / data.gov.in data. Delay labels are simulated from a documented causal structure, so model metrics describe how well the pipeline recovers that structure — **not** real-world predictive performance.

## What is real vs. derived
| Output | Source |
|---|---|
| Delay probability, expected delay days | Trained classifier / regressor (`ml/models/*.joblib`) |
| Risk score (0–100) | `probability × 100`. Category thresholds 0-30 / 31-60 / 61-80 / 81-100 are **prototype, configurable** (`ml/src/predict.py: RISK_THRESHOLDS`), not official |
| SHAP drivers (local + global) | `shap` run against the actual trained classifier |
| Stage-wise risk | **Derived / rule-based**, blended with model probability. Labeled `derived/rule-based` — there is no per-stage ML model (insufficient stage-transition data) |
| Recommendations | Rule engine over the project's real feature values |
| Alerts | Generated from prediction results + field thresholds |
| Model metrics | Computed on a held-out split; all three algorithms compared, winner chosen by validation ROC-AUC / R² |

## Architecture
```
React (Vite, TS, Tailwind, Router, Recharts, Leaflet)  --REST/JWT-->  FastAPI
FastAPI -> SQLAlchemy -> PostgreSQL(+PostGIS) | SQLite (local default)
FastAPI -> ml/src (feature engineering -> scaler -> classifier/regressor -> SHAP)
```

## Repo layout
`frontend/` (original Figma UI, now wired to the API) · `backend/` (FastAPI, Alembic, tests) · `ml/src` + `ml/models` · `data/raw` (+ data dictionary) · `docker-compose.yml` · `netlify.toml`

## Run locally (no Docker needed)
```bash
# 1. ML (artifacts are already committed in ml/models; re-run to regenerate)
pip install -r backend/requirements.txt
python ml/src/generate_demo_data.py
python ml/src/train.py
python ml/src/evaluate.py

# 2. Backend  (SQLite by default)
cd backend
cp .env.example .env
python -m app.seed                 # users + 420 projects + initial predictions/alerts (~20 s)
uvicorn app.main:app --reload      # http://localhost:8000/docs

# 3. Frontend
cd frontend
cp .env.example .env               # VITE_API_URL=http://localhost:8000
npm install
npm run dev                        # http://localhost:5173
```
Map tiles load from OpenStreetMap, so the browser needs internet access.

## Development credentials (seeded by `backend/app/seed.py` — dev only, change before any deployment)
| Email | Password | Role |
|---|---|---|
| demo.officer@acquinova.gov.in | acquinova | VIEWER (login form default) |
| admin@acquinova.gov.in | Admin@123 | SUPER_ADMIN (can retrain, delete) |
| central.admin / state.admin / district.officer / project.officer / analyst `@acquinova.gov.in` | Admin@123 | matching roles |

Passwords are bcrypt-hashed. Create/update projects need SUPER/CENTRAL/STATE admin or PROJECT_OFFICER; delete and retrain need SUPER/CENTRAL admin. Use an admin account to demo **Retrain**.

## Docker
```bash
docker compose up --build     # frontend :8080, backend :8000, postgres(PostGIS image) :5432
```
The backend entrypoint waits for Postgres, runs `alembic upgrade head`, seeds, then starts uvicorn.
**Not verified in the authoring sandbox (no Docker daemon)** — the compose YAML is syntax-checked only; please run it once and report issues.

## Environment variables
Backend: `DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS`, `ENVIRONMENT` · Frontend: `VITE_API_URL`. No hosts, credentials or secrets are hard-coded; `.env` files are git-ignored.

## Tests
```bash
cd backend && python -m pytest tests/ -v     # 32 tests: auth, RBAC, CRUD, prediction, SHAP, alerts, analytics, GIS, audit, ML pipeline
cd frontend && npm run build                 # tsc typecheck + production build
```

## Deploy
Frontend → Netlify (`netlify.toml`: base `frontend`, SPA redirect; set `VITE_API_URL` to your backend URL, and add the Netlify origin to backend `CORS_ORIGINS`). Backend → any host that runs the `backend/Dockerfile` (needs the `ml/` and `data/` folders, as the image copies them) with a managed Postgres `DATABASE_URL`.

## API (all under `/api`, JWT bearer)
`POST auth/login` · `GET auth/me` · `GET|POST projects` · `GET|PUT|DELETE projects/{id}` · `POST predictions` · `GET predictions/{id}` · `GET projects/{id}/explanation|recommendations|stage-risks` · `GET analytics/overview|states|districts` · `GET map/projects` · `GET alerts` · `POST alerts/{id}/acknowledge|resolve` · `GET model/metrics|versions|feature-importance` · `POST model/retrain` · `GET audit` · `GET|POST documents` · `GET data-quality`

## Features (ML detail)
19 documented engineered features (`ml/src/feature_engineering.py`, `FEATURE_DOCS`); labels `delayed`/`delay_days` are never model inputs (no target leakage). Candidates: Logistic/Linear Regression, Random Forest, XGBoost. Current winners on the seeded data: LogisticRegression (ROC-AUC ≈ 0.81) and LinearRegression (R² ≈ 0.38, MAE ≈ 46 days). XGBoost did **not** win; the choice is metric-driven.

## Known limitations (honest list)
- Synthetic data; metrics are not evidence of real-world accuracy. Regression R² is modest.
- **PostGIS**: the DB stores `latitude`/`longitude` (used by Leaflet). The Postgres image is PostGIS-enabled, but no geometry column / spatial index is populated yet — a future migration.
- Documents: metadata only; no secured file storage.
- Administration, Users & Roles, Settings pages are static UI (RBAC itself is enforced by the backend); Audit Logs is real.
- Analytics lacks date-range/agency filters and "historical trend" charts (no time-series data exists); the dashboard lacks delay-trend, compensation and legal-dispute charts. State/risk/stage charts are real.
- Stage history/dates are not modeled per project (only `current_stage`).
- Data-quality is not used as an ML feature. Retraining is manual (`POST /api/model/retrain`); no continuous learning.
- Frontend bundle is ~950 kB (no code-splitting yet).

## Future scope
Real LACRRIS ingestion, per-stage models with transition logs, PostGIS spatial queries/district polygons, drift monitoring, secured document storage, full admin UI.
