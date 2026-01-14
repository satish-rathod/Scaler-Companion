# Backend Initialization Plan

## 1. Directory Structure

The backend will be built using FastAPI. It will reside in the `backend/` directory at the project root.

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # Application entry point
│   ├── api/
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── api.py          # Router aggregation
│   │   │   └── endpoints/      # API Route handlers
│   │   │       ├── __init__.py
│   │   │       ├── download.py
│   │   │       ├── process.py
│   │   │       └── content.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py           # Pydantic settings & env vars
│   │   └── exceptions.py       # Custom exception handlers
│   ├── models/                 # Pydantic schemas (Shared with Frontend via TS generator ideally, but manual for now)
│   │   ├── __init__.py
│   │   └── schemas.py
│   ├── services/               # Business logic & AI Integrations
│   │   ├── __init__.py
│   │   ├── downloader.py       # HLS/FFmpeg logic
│   │   ├── whisper_service.py  # Wrapper for OpenAI Whisper
│   │   ├── ollama_service.py   # Wrapper for Ollama interactions
│   │   ├── vision_service.py   # EasyOCR / Vision LLM logic
│   │   └── pipeline.py         # Orchestration of the processing steps
│   └── utils/
│       ├── __init__.py
│       └── file_utils.py       # Path management, cleanup
├── tests/
│   ├── __init__.py
│   └── test_api.py
├── .env.example
├── .gitignore
├── requirements.txt
└── README.md
```

## 2. Dependencies

The `requirements.txt` will include the following key packages:

### Core Framework
- `fastapi` - Web framework
- `uvicorn[standard]` - ASGI Server
- `pydantic-settings` - Configuration management
- `python-multipart` - Form data support (file uploads)
- `httpx` - Async HTTP client (for calling Ollama if needed, or downloading chunks)
- `aiofiles` - Async file I/O

### AI & Media Processing
- `openai-whisper` - Audio transcription
- `librosa` - Audio analysis (legacy support/optional)
- `ollama` - Python client for Ollama (or direct HTTP calls)
- `easyocr` - Optical Character Recognition for slides
- `imagehash` - For slide deduplication
- `Pillow` - Image processing
- `ffmpeg-python` - Python bindings/wrapper for FFmpeg (or `subprocess`)
- `torch` - Required by Whisper (need to ensure CPU/MPS/CUDA version matches env)

### Development
- `pytest` - Testing
- `black` - Formatting
- `isort` - Import sorting

## 3. Configuration Scaffolding

We will use `pydantic-settings` to manage configuration.

**`backend/app/core/config.py`**
```python
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
    WHISPER_MODEL: str = "medium"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "gpt-oss:20b"

    class Config:
        env_file = ".env"

settings = Settings()
```

## 4. Execution Plan (Initialization)

To initialize the backend:

1.  **Create Directory:** `mkdir backend`
2.  **Navigate:** `cd backend`
3.  **Virtual Env:** `python3 -m venv venv`
4.  **Activate:** `source venv/bin/activate`
5.  **Install Deps:** `pip install -r requirements.txt` (This will take time due to Torch/Whisper)
6.  **Create Folders:** Create the `app/`, `output/` structure.
7.  **Run Server:** `uvicorn app.main:app --reload`
