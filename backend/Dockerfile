FROM python:3.12-slim

WORKDIR /app

ENV PIP_DEFAULT_TIMEOUT=120 \
    PIP_RETRIES=5

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./requirements.txt
RUN python -m pip install --upgrade pip setuptools wheel \
    && pip install --no-cache-dir --timeout 120 --retries 5 -r requirements.txt

COPY backend/ ./backend/
COPY ml/ ./ml/
COPY data/ ./data/

WORKDIR /app/backend

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

# Entry script: run Alembic migrations, seed if empty, then start the API.
COPY backend/docker-entrypoint.sh /app/backend/docker-entrypoint.sh
RUN chmod +x /app/backend/docker-entrypoint.sh

CMD ["./docker-entrypoint.sh"]
