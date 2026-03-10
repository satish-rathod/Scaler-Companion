# Scaler Companion

A local-first lecture processing toolkit for Scaler Academy students. Captures HLS video streams from the browser, downloads them locally, and runs an AI pipeline to produce transcripts, structured notes, summaries, Q&A flashcards, and slide OCR.

Three components work together: a **Chrome Extension** that intercepts HLS streams on Scaler Academy pages, a **FastAPI backend** that orchestrates downloading and AI processing, and a **React dashboard** for browsing and exporting study materials.

---

## Features

- **One-Click Stream Capture** -- The Chrome Extension detects HLS streams and CloudFront auth tokens on Scaler Academy pages automatically. Click download and the backend handles the rest.
- **Local Transcription** -- Audio extracted with FFmpeg, transcribed using OpenAI Whisper on your machine (CPU or CUDA GPU). Default model: `turbo` (large-v3-turbo).
- **Slide Extraction & OCR** -- Frames sampled at fixed intervals, deduplicated via perceptual hashing, OCR'd with EasyOCR.
- **AI-Generated Study Materials** -- Transcripts and slide text fed into an LLM (Ollama local or OpenAI cloud) to produce:
  - Comprehensive, hierarchical lecture notes
  - Executive summary (400-600 words)
  - 15-20 Q&A flashcards for self-testing
  - Extracted announcements, deadlines, and action items
- **Provider-Agnostic LLM** -- Choose between Ollama (local/free) or OpenAI (cloud/API key) for note generation. Switch providers and models from the Settings page.
- **Dashboard** -- Clean React interface built with shadcn/ui for browsing your lecture library, reading materials with Markdown rendering, and viewing transcripts alongside slides.
- **Full-Text Search** -- Search across all transcripts and notes to find concepts instantly.
- **Dark Mode** -- Persistent light/dark theme toggle.
- **ZIP Export** -- Download all artifacts as a ZIP archive for Obsidian, Notion, or other tools.
- **Background Queue** -- Jobs queued and processed sequentially. Submit multiple lectures without waiting.
- **macOS Sleep Prevention** -- Automatically invokes `caffeinate` during long processing runs.

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

**Ollama** (optional -- only if using local LLM):

Install from [https://ollama.ai](https://ollama.ai), then pull a model:
```bash
ollama pull llama3
```
> You can also use OpenAI instead of Ollama. Configure your provider in the dashboard Settings page.

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

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer Mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `extension/` folder from this repository
5. Pin the extension to your toolbar for easy access

---

## Usage Workflow

1. **Start the app** -- Run `./start.sh` to launch both the backend and dashboard.
2. **Navigate** to a Scaler Academy lecture page in Chrome and play the video briefly so the extension captures the HLS stream URL and CloudFront auth tokens.
3. **Download** -- Click the Scaler Companion extension icon. The popup shows the detected lecture. Click "Download Lecture". Optionally set start/end times to trim the recording.
4. **Process** -- Once downloaded, open the dashboard at `http://localhost:5173`. Click on a recording and choose which pipeline stages to run (transcription, slide extraction, note generation). Select your preferred models.
5. **Review** -- Open the recording in the viewer to read lecture notes, summary, Q&A cards, transcript, and announcements in a tabbed interface.
6. **Search** -- Use the search page to find concepts across all processed lectures.
7. **Export** -- Download a ZIP of all artifacts for offline use or import into Obsidian, Notion, etc.

### Configure LLM Provider

From the dashboard **Settings** page:
1. Choose between **Ollama** (local/free) or **OpenAI** (cloud/API key)
2. For Ollama: set the base URL (default `http://localhost:11434`)
3. For OpenAI: enter your API key
4. Test the connection, select a model, and save

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
│   │   │       ├── settings.py     # GET/PUT /settings, GET /providers
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
│   │   │   ├── llm_service.py      # Provider-agnostic LLM (Ollama/OpenAI)
│   │   │   ├── llm/                # LLM provider implementations
│   │   │   ├── pipeline.py         # Orchestrates the full processing pipeline
│   │   │   └── search_service.py   # Full-text search across output files
│   │   └── utils/
│   │       └── security.py         # Path traversal protection
│   ├── requirements.txt
│   └── output/                     # Generated artifacts (gitignored)
│
├── dashboard/                      # React frontend (Vite + shadcn/ui)
│   ├── src/
│   │   ├── App.jsx                 # Route definitions, providers
│   │   ├── index.css               # Tailwind v4 config, theme variables
│   │   ├── lib/utils.js            # cn() utility (clsx + tailwind-merge)
│   │   ├── pages/
│   │   │   ├── HomePage.jsx        # Library grid of recordings
│   │   │   ├── ViewerPage.jsx      # Tabbed viewer for lecture artifacts
│   │   │   ├── QueuePage.jsx       # Processing queue monitor
│   │   │   ├── SearchPage.jsx      # Full-text search interface
│   │   │   └── SettingsPage.jsx    # LLM provider config, theme toggle
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui primitives (button, card, dialog, etc.)
│   │   │   ├── layout/             # AppSidebar, SiteHeader, Layout
│   │   │   └── features/           # Recording cards, viewer, queue, modal
│   │   ├── services/
│   │   │   └── api.js              # Axios API client
│   │   └── hooks/
│   │       └── useTheme.js         # Persistent dark mode hook
│   ├── components.json             # shadcn/ui configuration
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
| `GET` | `/api/v1/models` | List available Whisper and LLM models |
| `GET` | `/api/v1/queue` | View the processing queue and job history |
| `GET` | `/api/v1/settings` | Get current settings (provider, model, URLs) |
| `PUT` | `/api/v1/settings` | Update settings |
| `GET` | `/api/v1/providers` | List LLM providers and connection status |

Static artifacts are served at `/content/{recording_id}/...`.

---

## Configuration

LLM provider, model, and connection settings are managed from the **dashboard Settings page** and persisted in `backend/config.json`.

You can also set initial values via environment variables or a `.env` file in `backend/`:

| Variable | Default | Description |
|----------|---------|-------------|
| `WHISPER_MODEL` | `turbo` | Whisper model size (`tiny`, `small`, `medium`, `turbo`, `large-v3`) |
| `LLM_PROVIDER` | `ollama` | LLM provider (`ollama` or `openai`) |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API endpoint |
| `OPENAI_API_KEY` | _(empty)_ | OpenAI API key (required if using OpenAI provider) |

---

## Technology Stack

**Backend:**
- FastAPI + Uvicorn
- OpenAI Whisper (local inference)
- Ollama or OpenAI (provider-agnostic LLM)
- EasyOCR (optical character recognition)
- imagehash (perceptual hashing for slide deduplication)
- FFmpeg via ffmpeg-python (audio extraction, video merging)
- httpx + aiofiles (async chunk downloading)

**Frontend:**
- React 19 with Vite 7
- shadcn/ui (base-nova) + Tailwind CSS v4
- React Router v7
- react-markdown + remark-gfm (Markdown rendering)
- Lucide React (icons)
- Sonner (toast notifications)
- date-fns (date formatting)
- Axios (HTTP client)

**Extension:**
- Chrome Manifest V3
- Service worker for background job management
- Content script for HLS stream interception

---

## License

MIT
