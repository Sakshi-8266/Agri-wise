import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

# Ensure .env is loaded from both backend/.env and root .env
backend_dir = Path(__file__).resolve().parent.parent
root_dir = backend_dir.parent

# Load backend/.env first, then root .env if present (system/cloud env takes precedence)
if (backend_dir / ".env").exists():
    load_dotenv(dotenv_path=backend_dir / ".env", override=False)
if (root_dir / ".env").exists():
    load_dotenv(dotenv_path=root_dir / ".env", override=False)
load_dotenv(override=False)

def get_database_url() -> str:
    raw = os.getenv("DATABASE_URL", "sqlite:///./agriwise.db")
    # Render PostgreSQL URLs start with postgres://, SQLAlchemy 2 requires postgresql://
    if raw.startswith("postgres://"):
        raw = raw.replace("postgres://", "postgresql://", 1)
    
    # If generic postgresql:// URL, verify if psycopg (v3) or psycopg2 is available
    if raw.startswith("postgresql://") and not raw.startswith("postgresql+"):
        try:
            import psycopg2
            return raw.replace("postgresql://", "postgresql+psycopg2://", 1)
        except ImportError:
            try:
                import psycopg
                return raw.replace("postgresql://", "postgresql+psycopg://", 1)
            except ImportError:
                pass
    return raw

def get_allowed_origins() -> list[str]:
    origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:8001",
        "http://127.0.0.1:8001"
    ]
    env_origins = os.getenv("ALLOWED_ORIGINS")
    if env_origins:
        for o in env_origins.split(","):
            cleaned = o.strip()
            if cleaned and cleaned not in origins:
                origins.append(cleaned)
    return origins

class Settings(BaseModel):
    PROJECT_NAME: str = "Agri-Wise (Agrovia) API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "agriwise-secret-key-production-ready-2026-super-secure")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    DATABASE_URL: str = get_database_url()

    # ElevenLabs Conversational AI & Voice Agent Settings
    ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY", "elevenlabs_agriwise_voice_agent_key_ready")
    ELEVENLABS_AGENT_ID: str = os.getenv("ELEVENLABS_AGENT_ID", "agent_agriwise_rakshak_multilingual")
    ELEVENLABS_VOICE_ID: str = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")  # Rachel / Multilingual v2

    ALLOWED_ORIGINS: list[str] = get_allowed_origins()

settings = Settings()
