from typing import List, Optional, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Strata — Enterprise Talent Intelligence API"
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/strata_db"
    CORS_ORIGINS: Union[List[str], str] = ["http://localhost:3000"]

    # JWT Configuration
    JWT_SECRET_KEY: str = "dev-insecure-secret-change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Gemini AI Configuration (Phase 2 & 3)
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-4-hydrogen"
    GEMINI_FALLBACK_MODELS: List[str] = [
        "gemini-3.8-flash",
        "gemini-3.5-flash-lite",
    ]
    GEMINI_EMBEDDING_MODEL: str = "gemini-embedding-001"
    EMBEDDING_DIMENSIONS: int = 768

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        # Strip accidental quotes/spaces from cloud env dashboards and normalize scheme
        if isinstance(value, str):
            cleaned = value.strip().strip('"').strip("'")
            if cleaned.startswith("postgres://"):
                return cleaned.replace("postgres://", "postgresql+psycopg2://", 1)
            if cleaned.startswith("postgresql+psycopg://"):
                return cleaned.replace("postgresql+psycopg://", "postgresql+psycopg2://", 1)
            if cleaned.startswith("postgresql://"):
                return cleaned.replace("postgresql://", "postgresql+psycopg2://", 1)
            return cleaned
        return value

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Union[List[str], str]) -> List[str]:
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("["):
                import json
                return json.loads(stripped)
            return [origin.strip() for origin in stripped.split(",") if origin.strip()]
        return value


settings = Settings()
