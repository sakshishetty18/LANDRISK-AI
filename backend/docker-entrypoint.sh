#!/usr/bin/env bash
set -e

echo "ACQUINOVA backend starting..."

# Wait for Postgres if that's what we're pointed at.
if [[ "$DATABASE_URL" == postgresql* ]]; then
  echo "Waiting for Postgres..."
  python - <<'PY'
import os, time, sys
import psycopg2
from urllib.parse import urlparse

url = urlparse(os.environ["DATABASE_URL"])
for attempt in range(30):
    try:
        conn = psycopg2.connect(
            dbname=url.path.lstrip("/"), user=url.username, password=url.password,
            host=url.hostname, port=url.port or 5432,
        )
        conn.close()
        print("Postgres is ready.")
        sys.exit(0)
    except Exception as e:
        print(f"  attempt {attempt+1}: {e}")
        time.sleep(2)
print("Postgres did not become ready in time.")
sys.exit(1)
PY
fi

# Ensure ML models exist (train on first run if the joblib artifacts are missing).
if [ ! -f "../ml/models/best_classifier.joblib" ]; then
  echo "No trained model found — generating data and training..."
  python ../ml/src/generate_demo_data.py
  python ../ml/src/train.py
fi

echo "Running database migrations..."
alembic upgrade head

echo "Seeding database (no-op if already seeded)..."
python -m app.seed

echo "Starting API server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
