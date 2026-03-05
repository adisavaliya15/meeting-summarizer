import os
import socket
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env", encoding="utf-8-sig")


@dataclass(frozen=True)
class Settings:
    supabase_url: str
    supabase_service_role_key: str
    supabase_db_url: str
    ollama_url: str
    whisper_model: str
    ollama_model: str
    poll_interval_sec: int
    max_attempts: int
    worker_id: str


settings = Settings(
    supabase_url=os.getenv("SUPABASE_URL", "").rstrip("/"),
    supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
    supabase_db_url=os.getenv("SUPABASE_DB_URL", ""),
    ollama_url=os.getenv("OLLAMA_URL", "http://localhost:11434").rstrip("/"),
    whisper_model=os.getenv("WHISPER_MODEL", "large-v3"),
    ollama_model=os.getenv("OLLAMA_MODEL", "llama3.1:8b"),
    poll_interval_sec=int(os.getenv("POLL_INTERVAL_SEC", "5")),
    max_attempts=int(os.getenv("MAX_ATTEMPTS", "3")),
    worker_id=os.getenv("WORKER_ID", f"{socket.gethostname()}-worker"),
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

