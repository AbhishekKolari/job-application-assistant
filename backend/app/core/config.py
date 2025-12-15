from functools import lru_cache
from pathlib import Path
from typing import List, Optional

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralized application configuration."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    PROJECT_NAME: str = "JobFlow AI - Job Application Assistant"
    API_V1_PREFIX: str = "/api/v1"
    FRONTEND_ORIGINS: List[AnyHttpUrl] = Field(default_factory=list)

    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/job_assistant"

    # Auth / OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"
    GOOGLE_SCOPES: List[str] = Field(
        default_factory=lambda: [
            "openid",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/drive.file",
        ]
    )
    JWT_SECRET_KEY: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # Storage
    UPLOAD_DIR: Path = Path("./storage/uploads")

    # LLM/Ollama
    OLLAMA_MODEL: str = "qwen3:4b"
    OLLAMA_HOST: str = "http://localhost:11434"

    # External services
    JOB_SEARCH_API_KEY: Optional[str] = ""
    JOB_SEARCH_PROVIDER: str = "jsearch"

    # Telemetry
    LOG_LEVEL: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()
