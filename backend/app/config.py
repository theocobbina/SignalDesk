from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

OPENROUTER_BASE_URL = "https://openrouter.ai/api"
ENV_FILE = Path(__file__).resolve().parent.parent / ".env"  # backend/.env


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")

    openrouter_api_key: str = ""
    jev_model: str = "jev-1.13"
    # Below this category confidence a request goes to the human review queue.
    category_confidence_threshold: float = 0.7
    # Probability above which a request is flagged as a safety hazard.
    safety_hazard_threshold: float = 0.5
    # Cosine similarity at or above which two requests count as "similar".
    similarity_threshold: float = 0.5
    # Emerging issues: this many similar reports from one building within the window.
    cluster_min_size: int = 3
    cluster_window_hours: int = 48
    cluster_similarity_threshold: float = 0.55
    database_url: str = ""
    frontend_origin: str = "http://localhost:5173"

    @property
    def sqlalchemy_url(self) -> str:
        # Supabase gives "postgresql://..."; SQLAlchemy needs the psycopg3 driver named.
        return self.database_url.replace("postgresql://", "postgresql+psycopg://", 1)


@lru_cache
def get_settings() -> Settings:
    return Settings()
