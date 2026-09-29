"""
ACQUINOVA backend configuration.

Everything environment-dependent (DB, secrets, CORS) comes from
environment variables — see backend/.env.example. Nothing here is
hard-coded for a specific host.
"""
from __future__ import annotations

import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "sqlite:///./acquinova.db"
    SECRET_KEY: str = "dev-only-insecure-secret-change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8
    ALGORITHM: str = "HS256"
    CORS_ORIGINS: str = "http://localhost:5173"

    ML_MODELS_DIR: str = os.path.join(os.path.dirname(__file__), "..", "..", "ml", "models")
    DATA_RAW_DIR: str = os.path.join(os.path.dirname(__file__), "..", "..", "data", "raw")
    DOCUMENT_STORAGE_DIR: str = os.path.abspath(os.getenv(
        "DOCUMENT_STORAGE_DIR",
        os.path.join(os.path.dirname(__file__), "..", "..", "storage", "documents"),
    ))

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
