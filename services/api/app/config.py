import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env", encoding="utf-8-sig")


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    supabase_url: str
    supabase_service_role_key: str
    supabase_db_url: str
    ollama_url: str
    ollama_model: str
    cors_origins: list[str]
    api_host: str
    api_port: int


settings = Settings(
    supabase_url=os.getenv("SUPABASE_URL", "").rstrip("/"),
    supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
    supabase_db_url=os.getenv("SUPABASE_DB_URL", ""),
    ollama_url=os.getenv("OLLAMA_URL", "http://localhost:11434").rstrip("/"),
    ollama_model=os.getenv("OLLAMA_MODEL", "llama3.2:3b"),
    cors_origins=_split_csv(os.getenv("CORS_ORIGINS", "http://localhost:5173")),
    api_host=os.getenv("API_HOST", "0.0.0.0"),
    api_port=int(os.getenv("API_PORT", "8000")),
)


def validate_settings() -> None:
    missing = []
    if not settings.supabase_url:
        missing.append("SUPABASE_URL")
    if not settings.supabase_service_role_key:
        missing.append("SUPABASE_SERVICE_ROLE_KEY")
    if not settings.supabase_db_url:
        missing.append("SUPABASE_DB_URL")
    if missing:
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")
