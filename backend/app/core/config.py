from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    PROJECT_NAME: str = "Scaler Companion V2"
    API_V1_STR: str = "/api/v1"

    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    OUTPUT_DIR: Path = BASE_DIR / "output"
    VIDEO_DIR: Path = OUTPUT_DIR / "videos"

    # AI Settings
    WHISPER_MODEL: str = "turbo"  # large-v3-turbo - fastest and most accurate
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "gpt-oss:20b"

    class Config:
        env_file = ".env"

settings = Settings()
