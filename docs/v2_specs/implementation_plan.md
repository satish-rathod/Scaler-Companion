# Scaler Companion V2 - Implementation Plan

This document outlines the step-by-step implementation strategy to build Version 2, reusing logic from Version 1 where applicable but strictly adhering to the new modular V2 architecture.

## Phase 1: Backend Core & Migration

### 1.1 Core Setup
**Goal:** Initialize the FastAPI app with configuration and lifecycle management.

*   **File:** `backend/app/main.py`
    *   Initialize `FastAPI` app.
    *   **Lifespan Manager:** Implement the `asynccontextmanager` to handle startup/shutdown.
        *   **Crucial:** Port the `prevent_sleep()` function (using `caffeinate` on macOS) from V1's `server.py` to `app/core/lifespan.py` or directly in `main.py`.
    *   **CORS:** Configure `CORSMiddleware` to allow `localhost:5173` (Dashboard) and the Extension ID.
    *   **Static Mount:** Mount `output/` to `/content` for serving generated files.

### 1.2 Downloader Service
**Goal:** Port video downloading logic with V2 improvements (async/parallel).

*   **File:** `backend/app/services/downloader.py`
    *   **Class:** `VideoDownloader`
    *   **Method:** `download_chunks(stream_info, range)`
        *   *V1 Logic:* Uses `requests` in a thread pool.
        *   *V2 Improvement:* Use `httpx` or `aiohttp` for true async concurrent downloads.
        *   Implement `ThreadPoolExecutor` or `asyncio.gather` for parallel chunk fetching.
    *   **Method:** `merge_chunks(start, end)`
        *   Use `ffmpeg-python` or `subprocess` to concat `.ts` files to `.mp4`.
    *   **Progress Tracking:** Implement a callback system similar to V1 to update global state.

### 1.3 API Endpoints (V1 Compatibility)
**Goal:** Reimplement V1 endpoints using V2 routing.

*   **File:** `backend/app/api/v1/endpoints/download.py`
    *   `POST /download`: Accepts `DownloadRequest`. Triggers background task `run_download`.
    *   `GET /status/{id}`: Returns download progress.

*   **File:** `backend/app/api/v1/endpoints/process.py`
    *   `POST /process`: Accepts `ProcessRequest`. Adds job to `JOB_QUEUE` (managed in `app/core/state.py` or similar singleton).
    *   `GET /process/{id}`: Returns processing status.

*   **File:** `backend/app/api/v1/endpoints/content.py` (formerly `/api/recordings`)
    *   `GET /recordings`: Scans `output/` directory.
        *   *Logic:* Port the complex "Scan processed + Scan downloaded + Overlay active jobs" logic from V1's `list_recordings` function. This is critical for UI consistency.

---

## Phase 2: AI Pipeline Implementation

### 2.1 Transcription Service
**Goal:** Convert audio to text.

*   **File:** `backend/app/services/whisper_service.py`
    *   Wrapper around `openai-whisper`.
    *   Load model once (singleton pattern) to save RAM.
    *   Method: `transcribe(audio_path) -> dict` (text + segments).

### 2.2 Vision Service (Slides)
**Goal:** Extract slides and OCR text.

*   **File:** `backend/app/services/vision_service.py`
    *   **Frame Extraction:** Use `ffmpeg` to extract frames at scene changes (scene detect filter) or fixed intervals (every 10s).
    *   **Deduplication:** Use `imagehash` (V1 logic) to remove duplicate slides.
    *   **OCR:** Use `easyocr` to extract text from unique slides.

### 2.3 Notes Generation (LLM)
**Goal:** Generate structured markdown notes.

*   **File:** `backend/app/services/ollama_service.py`
    *   Wrapper for `ollama` library.
    *   **Prompts:** Reuse the effective prompts from V1 (`notes_generator.py`).
        *   System Prompt: "You are an expert teaching assistant..."
        *   User Prompt: "Summarize this transcript section..."
    *   **Streaming:** Implement streaming response handling if V2 UI supports it (optional for Alpha).

### 2.4 Pipeline Orchestrator
**Goal:** Connect the steps.

*   **File:** `backend/app/services/pipeline.py`
    *   Class: `ProcessingPipeline`
    *   Method: `run(video_path)`
        1. Extract Audio (`ffmpeg`)
        2. Transcribe (`Whisper`)
        3. Extract Slides (`Vision`)
        4. Generate Notes (`Ollama` + context from Transcript & Slide OCR)
        5. Save artifacts (`transcript.md`, `lecture_notes.md`, `summary.md`).

---

## Phase 3: Extension Logic

### 3.1 Content Script
**Goal:** Capture HLS stream URLs.

*   **File:** `extension/content/inject.js`
    *   *Strategy:* Inject a script into the page context to intercept `XMLHttpRequest` or `fetch`.
    *   Look for `.m3u8` URLs containing `master` or specific video patterns.
    *   Capture `Key-Pair-Id`, `Policy`, `Signature` (CloudFront params) from the URL query params.
    *   Send message to Background script.

### 3.2 Background Script
**Goal:** Communicate with Backend.

*   **File:** `extension/background/service-worker.js`
    *   Listen for messages from Content script ("STREAM_FOUND").
    *   Store latest stream info in `chrome.storage.local`.
    *   Handle "Download" button click from Popup -> Send `POST /api/download` to `localhost:8000`.

---

## Phase 4: Frontend Recreation (Dashboard)

### 4.1 Components
**Goal:** Rebuild V1 UI features in React.

*   **Recordings List:**
    *   Fetch `GET /api/recordings`.
    *   Cards showing Title, Date, Status (Downloaded/Processed), and Actions (View/Delete).
*   **Processing View:**
    *   Real-time progress bar polling `GET /api/process/{id}`.
*   **Artifact Viewer:**
    *   Tabs: "Notes", "Transcript", "Slides", "Chat".
    *   Render Markdown using `react-markdown`.
    *   Embed Video Player (referencing `http://localhost:8000/content/...`).

### 4.2 State Management
*   Use `TanStack Query` (React Query) for polling status endpoints (`refetchInterval`).

---

## Phase 5: Verification & Testing

1.  **Backend Health:** `curl http://localhost:8000/health`
2.  **Mock Download:** Manually call `/api/download` with a known HLS URL (if available) or mock the downloader service.
3.  **Mock Processing:** Create a dummy video and run `/api/process` to test the pipeline wiring (mocking heavy AI calls if needed for speed).
