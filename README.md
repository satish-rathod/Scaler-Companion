# Scaler Companion

A local-first lecture processing toolkit for Scaler Academy students. Scaler Companion captures HLS video streams directly from the browser, downloads them, and runs a fully local AI pipeline to produce transcripts, structured lecture notes, summaries, Q&A flashcards, and slide OCR -- all without sending any data to the cloud.

The system is composed of three parts: a **Chrome Extension** that intercepts and captures authenticated HLS streams on Scaler Academy pages, a **FastAPI backend** that orchestrates downloading, transcription (OpenAI Whisper), slide extraction and OCR (EasyOCR), and note generation (Ollama LLM), and a **React dashboard** for browsing, reading, searching, and exporting the resulting study materials.

---

## Features

- **One-Click Stream Capture** -- The Chrome Extension detects HLS streams and CloudFront authentication cookies on Scaler Academy pages automatically. Click download in the popup and the backend handles the rest.
- **Local Transcription** -- Audio is extracted with FFmpeg and transcribed using OpenAI Whisper running entirely on your machine (CPU or CUDA GPU). The default model is `turbo` (large-v3-turbo) for the best speed/accuracy trade-off.
- **Slide Extraction and OCR** -- Frames are sampled from the video at fixed intervals, deduplicated using perceptual hashing (imagehash), and the unique slides are OCR'd with EasyOCR.
- **AI-Generated Study Materials** -- Transcripts and slide text are fed into a local LLM via Ollama to produce:
  - Comprehensive, hierarchical lecture notes
  - Executive summary (400-600 words)
  - 15-20 Q&A flashcards for self-testing
  - Extracted announcements, deadlines, and action items
- **Notion-Style Dashboard** -- A clean React interface for browsing your lecture library, reading generated materials with Markdown rendering, and viewing transcripts alongside extracted slides.
- **Full-Text Search** -- Search across all transcripts and lecture notes to find concepts instantly.
- **Dark Mode** -- Toggle between light and dark themes.
- **ZIP Export** -- Download all artifacts for any lecture as a ZIP archive, ready for Obsidian, Notion, or any other note-taking tool.
- **Background Processing Queue** -- Jobs are queued and processed sequentially so you can submit multiple lectures without waiting.
- **macOS Sleep Prevention** -- Automatically invokes `caffeinate` to prevent idle sleep during long processing runs.

---

## Architecture

```
+------------------+       +-------------------+       +---------------------+
|  Chrome Extension|       |   FastAPI Backend  |       |   React Dashboard   |
|  (Manifest V3)   |------>|   (Python 3.10+)  |<------|   (Vite + React 19) |
+------------------+       +-------------------+       +---------------------+
        |                          |                            |
        |  Captures HLS            |  AI Pipeline               |  Reads artifacts
        |  stream URLs &           |  - Whisper (transcription)  |  via REST API
        |  CloudFront auth         |  - EasyOCR (slide OCR)     |
        |                          |  - Ollama (LLM notes)      |
        |                          |  - FFmpeg (audio/video)    |
        |                          |          |                 |
        +------------------------->+  Output Files  <-----------+
                                   (Markdown, text, images)
```

---

## Prerequisites

| Dependency | Version   | Purpose |
|------------|-----------|---------|
| Python     | >= 3.10   | Backend runtime |
| Node.js    | >= 18     | Dashboard dev server |
| FFmpeg     | Latest    | Audio extraction and video merging |
| Ollama     | Latest    | Local LLM for note generation |
| Chrome     | Latest    | Extension host |

### Installing Dependencies

**FFmpeg:**
```bash
# macOS
brew install ffmpeg

# Ubuntu / Debian
sudo apt install ffmpeg
```

**Ollama:**

Install from [https://ollama.ai](https://ollama.ai), then pull a model:
```bash
ollama pull llama3
# or the default used by the project:
ollama pull gpt-oss:20b
```

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/satish-rathod/Scaler-Companion.git
cd Scaler-Companion
```

### 2. Automated Setup

Run the setup script to create a Python virtual environment, install backend dependencies, and install frontend packages:

```bash
chmod +x setup.sh
./setup.sh
```

This will:
- Create `backend/venv/` and install all Python packages from `backend/requirements.txt`
- Run `npm install` inside `dashboard/`

### 3. Start the Application

Launch both the backend and dashboard with a single command:

```bash
./start.sh
```

| Service   | URL                          |
|-----------|------------------------------|
| Dashboard | http://localhost:5173         |
| Backend API | http://localhost:8000      |
| API Docs (OpenAPI) | http://localhost:8000/api/v1/openapi.json |

### 4. Install the Chrome Extension

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer Mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `extension/` folder from this repository

The extension will automatically detect HLS streams when you visit Scaler Academy lecture pages.

---

## Usage Workflow

1. **Navigate** to a Scaler Academy lecture page in Chrome and play the video briefly so the extension can capture the HLS stream URL and CloudFront authentication tokens.
2. **Click** the Scaler Companion extension icon. The popup will show the detected lecture and stream information.
3. **Download** -- click the download button. The backend downloads `.ts` chunks concurrently via `httpx`, then merges them into a single `.mp4` with FFmpeg.
4. **Process** -- from the dashboard home page, click the process button on a downloaded recording. Choose which pipeline stages to run (transcription, slide extraction, note generation) and select your preferred Whisper and Ollama models.
5. **Review** -- open the recording in the viewer to read through lecture notes, summary, Q&A cards, transcript, and announcements in a tabbed interface with Markdown rendering.
6. **Search** -- use the search page to find concepts across all processed lectures.
7. **Export** -- download a ZIP of all artifacts for offline use or import into other tools.

---

## Project Structure

```
Scaler-Companion/
├── backend/                        # FastAPI backend (Python)
│   ├── app/
│   │   ├── main.py                 # App entry point, lifespan, CORS, static mount
│   │   ├── api/v1/
│   │   │   ├── api.py              # Router aggregation
│   │   │   └── endpoints/
│   │   │       ├── download.py     # POST /download, GET /status/{id}
│   │   │       ├── process.py      # POST /process, GET /process/{id}
│   │   │       ├── content.py      # GET /recordings, DELETE /recordings/{id}
│   │   │       ├── search.py       # GET /search?q=...
│   │   │       ├── export.py       # GET /export/{id}
│   │   │       └── system.py       # GET /models, GET /queue
│   │   ├── core/
│   │   │   ├── config.py           # Pydantic settings (paths, model names)
│   │   │   ├── state.py            # In-memory job queues and status dicts
│   │   │   └── worker.py           # Background worker for sequential processing
│   │   ├── models/
│   │   │   └── schemas.py          # Pydantic models (requests/responses)
│   │   ├── services/
│   │   │   ├── downloader.py       # HLS chunk download + FFmpeg merge
│   │   │   ├── whisper_service.py  # Whisper model loading and transcription
│   │   │   ├── vision_service.py   # Frame extraction, dedup, EasyOCR
│   │   │   ├── ollama_service.py   # Chunked transcript -> LLM notes
│   │   │   ├── pipeline.py         # Orchestrates the full processing pipeline
│   │   │   └── search_service.py   # Full-text search across output files
│   │   └── utils/
│   │       └── security.py         # Path traversal protection
│   ├── requirements.txt
│   └── output/                     # Generated artifacts (gitignored)
│
├── dashboard/                      # React frontend (Vite + Tailwind CSS v4)
│   ├── src/
│   │   ├── App.jsx                 # Route definitions
│   │   ├── pages/
│   │   │   ├── HomePage.jsx        # Library grid of recordings
│   │   │   ├── ViewerPage.jsx      # Tabbed viewer for lecture artifacts
│   │   │   ├── QueuePage.jsx       # Processing queue monitor
│   │   │   ├── SearchPage.jsx      # Full-text search interface
│   │   │   └── SettingsPage.jsx    # Theme, default models, auto-process
│   │   ├── components/
│   │   │   ├── layout/             # Layout shell, sidebar navigation
│   │   │   ├── common/             # Shared components (Tabs)
│   │   │   └── features/           # Recording cards, viewer, queue, modal
│   │   ├── services/
│   │   │   └── api.js              # Axios API client
│   │   └── hooks/
│   │       └── useTheme.js         # Dark mode hook
│   ├── package.json
│   └── vite.config.js              # Dev server proxy to backend
│
├── extension/                      # Chrome Extension (Manifest V3)
│   ├── manifest.json               # Permissions for scaler.com, cloudfront.net
│   ├── background/
│   │   └── service-worker.js       # Job management, backend communication, polling
│   ├── content/
│   │   └── inject.js               # Content script to detect HLS streams
│   └── popup/
│       ├── popup.html              # Extension popup UI
│       └── popup.js                # Popup logic, download/process triggers
│
├── docs/                           # Documentation
│   ├── API_Documentation.md
│   ├── USER_GUIDE.md
│   ├── HLD.md                      # High-level design
│   ├── LLD.md                      # Low-level design
│   ├── PRD.md                      # Product requirements
│   ├── Frontend_Documentation.md
│   ├── Extension_Documentation.md
│   ├── DevOps_Design.md
│   └── User_Flow_Documentation.md
│
├── setup.sh                        # One-command project setup
├── start.sh                        # One-command launch (backend + dashboard)
└── .gitignore
```

---

## API Reference

All endpoints are prefixed with `/api/v1`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/v1/download` | Start a video download |
| `GET` | `/api/v1/status/{downloadId}` | Poll download progress |
| `POST` | `/api/v1/process` | Start AI processing on a downloaded video |
| `GET` | `/api/v1/process/{processId}` | Poll processing progress |
| `GET` | `/api/v1/recordings` | List all recordings with their artifacts |
| `DELETE` | `/api/v1/recordings/{id}` | Delete a recording and its artifacts |
| `GET` | `/api/v1/search?q=...` | Full-text search across transcripts and notes |
| `GET` | `/api/v1/export/{id}` | Download recording artifacts as a ZIP |
| `GET` | `/api/v1/models` | List available Whisper and Ollama models |
| `GET` | `/api/v1/queue` | View the processing queue and job history |

Static artifacts are served at `/content/{recording_id}/...`.

---

## Configuration

The backend reads configuration from environment variables or a `.env` file in the `backend/` directory.

| Variable | Default | Description |
|----------|---------|-------------|
| `WHISPER_MODEL` | `turbo` | Whisper model size (`tiny`, `small`, `medium`, `turbo`, `large-v3`) |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API endpoint |
| `OLLAMA_MODEL` | `gpt-oss:20b` | Default Ollama model for note generation |

---

## Technology Stack

**Backend:**
- FastAPI + Uvicorn
- OpenAI Whisper (local inference)
- Ollama (local LLM)
- EasyOCR (optical character recognition)
- imagehash (perceptual hashing for slide deduplication)
- FFmpeg via ffmpeg-python (audio extraction, video merging)
- httpx + aiofiles (async chunk downloading)

**Frontend:**
- React 19 with Vite 7
- Tailwind CSS v4
- React Router v7
- react-markdown + remark-gfm (Markdown rendering)
- Lucide React (icons)
- Axios (HTTP client)

**Extension:**
- Chrome Manifest V3
- Service worker for background job management
- Content script for HLS stream interception

---

## License

MIT
