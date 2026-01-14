# Scaler Companion - DevOps Design

## 1. Local Development Environment

### 1.1 Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| macOS | 13+ | Primary OS |
| Python | 3.10+ | Backend runtime |
| Node.js | 18+ | Dashboard build |
| FFmpeg | latest | Video processing |
| Ollama | 0.1+ | Local LLM |
| Chrome | latest | Extension host |

### 1.2 Installation Commands

```bash
# System dependencies (Homebrew)
brew install python@3.10 node ffmpeg

# Ollama
brew install ollama
ollama pull gpt-oss:20b
ollama pull llama3.2-vision:11b  # Optional for slide analysis

# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Dashboard
cd dashboard
npm install
```

### 1.3 Running Services

```bash
# Terminal 1: Backend (port 8000)
cd backend
source venv/bin/activate
python -m uvicorn server:app --reload

# Terminal 2: Dashboard (port 5173)
cd dashboard
npm run dev

# Terminal 3: Ollama (port 11434)
ollama serve
```

### 1.4 Extension Installation

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `/Users/satish/lecture_processor/extension`

---

## 2. Service Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Local Machine                          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐  │
│  │   Chrome    │      │   Vite      │      │   Ollama    │  │
│  │ + Extension │      │   :5173     │      │   :11434    │  │
│  └──────┬──────┘      └──────┬──────┘      └──────┬──────┘  │
│         │                    │                    │          │
│         │  HTTP             │  HTTP              │  HTTP    │
│         └────────────┬──────┴────────────────────┘          │
│                      │                                       │
│              ┌───────▼───────┐                              │
│              │    FastAPI    │                              │
│              │     :8000     │◄──── uvicorn --reload        │
│              └───────┬───────┘                              │
│                      │                                       │
│         ┌────────────┼────────────┐                         │
│         │            │            │                          │
│    ┌────▼────┐ ┌────▼────┐ ┌────▼────┐                     │
│    │ Whisper │ │ FFmpeg  │ │caffeinate│                     │
│    │  (MPS)  │ │         │ │         │                      │
│    └─────────┘ └─────────┘ └─────────┘                      │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Configuration Management

### 3.1 Environment Variables (Planned)

```bash
# .env (not currently implemented)
SCALER_OUTPUT_DIR=/Users/satish/lecture_processor/output
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=gpt-oss:20b
WHISPER_MODEL=medium
WHISPER_DEVICE=mps
LOG_LEVEL=INFO
```

### 3.2 Current Hardcoded Values

| Location | Variable | Value |
|----------|----------|-------|
| `server.py` | OUTPUT_DIR | `../output` |
| `server.py` | CORS origins | `*` |
| `popup.js` | BACKEND_URL | `http://localhost:8000` |
| `service-worker.js` | BACKEND_URL | `http://localhost:8000` |
| `dashboard/vite.config.js` | proxy | `/api → :8000` |

---

## 4. Build & Distribution

### 4.1 Dashboard Build

```bash
cd dashboard
npm run build
# Output: dashboard/dist/
```

### 4.2 Extension Packaging

```bash
# For Chrome Web Store (future)
cd extension
zip -r scaler-companion-v1.0.0.zip . -x "*.DS_Store"
```

### 4.3 Backend Packaging (Future)

```bash
# PyInstaller for standalone executable
pip install pyinstaller
pyinstaller --onefile server.py
```

---

## 5. Resource Management

### 5.1 Disk Usage

| Component | Typical Size | Location |
|-----------|--------------|----------|
| Video (1hr) | 200-400 MB | `output/videos/` |
| Audio WAV | 150-200 MB | `output/YYYY-MM-DD_*/` |
| Slides | 10-50 MB | `output/YYYY-MM-DD_*/slides/` |
| Text artifacts | 1-5 MB | `output/YYYY-MM-DD_*/` |
| Whisper models | 1-3 GB | `~/.cache/whisper/` |
| Ollama models | 10-40 GB | `~/.ollama/` |

### 5.2 Memory Requirements

| Stage | Peak RAM | GPU VRAM |
|-------|----------|----------|
| Download | 500 MB | - |
| FFmpeg merge | 1 GB | - |
| Whisper (medium) | 4 GB | 3 GB (MPS) |
| Ollama (20B) | 16 GB | N/A |

### 5.3 Cleanup Scripts (Planned)

```bash
# Remove chunks after merge
rm -rf output/videos/*/chunks/

# Remove audio after processing
find output -name "audio.wav" -delete

# Archive old recordings
find output -maxdepth 1 -type d -mtime +30 | xargs tar -czf archive.tar.gz
```

---

## 6. Monitoring & Logging

### 6.1 Current Logging

```python
# Backend logging
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
```

Output goes to stdout (terminal running uvicorn).

### 6.2 Log Locations

| Component | Location |
|-----------|----------|
| Backend | stdout/stderr |
| Dashboard | Browser console |
| Extension | Chrome DevTools → Extensions |
| Ollama | `~/.ollama/logs/` |

### 6.3 Monitoring Dashboard (Planned V2)

```
/api/metrics → {
  "active_downloads": 1,
  "queued_processes": 3,
  "disk_usage_gb": 45.2,
  "recordings_count": 24,
  "uptime_hours": 48.5
}
```

---

## 7. Sleep Prevention

### 7.1 Current Implementation

```python
def prevent_sleep():
    """Prevent macOS from sleeping while this process is running"""
    subprocess.Popen(['caffeinate', '-i', '-w', str(os.getpid())])
```

- `-i`: Prevent idle sleep
- `-w <pid>`: Exit when process exits

### 7.2 Alternative (if caffeinate unavailable)

```bash
pmset noidle  # Interactive command
```

---

## 8. Backup & Recovery

### 8.1 Critical Data

| Data | Backup Priority | Recovery |
|------|-----------------|----------|
| Processed outputs | High | Re-process from video |
| Downloaded videos | Medium | Re-download |
| Extension state | Low | Transient |

### 8.2 Backup Script (Manual)

```bash
#!/bin/bash
BACKUP_DIR="/Volumes/Backup/scaler_companion"
rsync -av --exclude="*.wav" --exclude="chunks/" \
  /Users/satish/lecture_processor/output/ \
  $BACKUP_DIR/
```

---

## 9. Future: Cloud Deployment

### 9.1 Architecture (If Needed)

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│    Client     │     │   API Server  │     │   Workers     │
│   (Browser)   │────▶│   (FastAPI)   │────▶│ (Celery/RQ)   │
└───────────────┘     └───────────────┘     └───────────────┘
                             │                     │
                             ▼                     ▼
                      ┌───────────────┐     ┌───────────────┐
                      │    Redis      │     │   Storage     │
                      │   (Queue)     │     │   (S3/GCS)    │
                      └───────────────┘     └───────────────┘
```

### 9.2 Required Changes

| Component | Current | Cloud |
|-----------|---------|-------|
| Storage | Local FS | S3/GCS |
| Queue | In-memory list | Redis/RabbitMQ |
| Auth | None | OAuth/API Keys |
| Processing | Local GPU | Lambda/Cloud Run |
| LLM | Local Ollama | OpenAI API / Vertex |

### 9.3 Cost Estimates (AWS)

| Service | Monthly Cost |
|---------|--------------|
| EC2 (g4dn.xlarge) | $120 |
| S3 (500 GB) | $12 |
| CloudFront | $5 |
| **Total** | ~$140/month |

---

## 10. CI/CD (Future)

### 10.1 GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.10'
      - run: pip install -r backend/requirements.txt
      - run: pytest backend/tests/

  dashboard-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: cd dashboard && npm ci && npm run build
```

---

*Document Version: 1.0 | Last Updated: 2026-01-14*
