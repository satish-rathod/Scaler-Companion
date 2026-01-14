# Scaler Companion - High Level Design (HLD)

## 1. System Overview

```mermaid
graph TB
    subgraph "User Environment"
        Browser["Chrome Browser"]
        Dashboard["Dashboard (React)"]
    end
    
    subgraph "Chrome Extension"
        Popup["Popup UI"]
        Content["Content Script"]
        SW["Service Worker"]
    end
    
    subgraph "Backend Server"
        API["FastAPI Server"]
        Worker["Process Worker"]
        Queue["Job Queue"]
    end
    
    subgraph "AI Pipeline"
        Whisper["Whisper Transcriber"]
        Extractor["Frame Extractor"]
        Analyzer["Slide Analyzer"]
        Generator["Notes Generator"]
    end
    
    subgraph "Storage"
        Videos["output/videos/"]
        Processed["output/YYYY-MM-DD_*/"]
    end
    
    subgraph "External"
        Scaler["Scaler Academy"]
        CDN["CloudFront CDN"]
        Ollama["Ollama Server"]
    end
    
    Browser --> Content
    Content --> SW
    Popup --> SW
    SW --> API
    Dashboard --> API
    
    API --> Queue
    Queue --> Worker
    Worker --> Whisper
    Worker --> Extractor
    Worker --> Analyzer
    Worker --> Generator
    
    Generator --> Ollama
    
    API --> Videos
    Worker --> Processed
    
    Content -.->|Captures| CDN
    CDN -.->|Serves| Scaler
```

---

## 2. Component Architecture

### 2.1 Chrome Extension (MV3)

| Component | File | Responsibility |
|-----------|------|----------------|
| **Popup** | `popup/popup.{html,js,css}` | User interface for downloads |
| **Content Script** | `content/inject.js` | Stream URL capture, page injection |
| **Service Worker** | `background/service-worker.js` | Message passing, persistent state |

**Key Features:**
- Intercepts `fetch()` and `XMLHttpRequest` to capture HLS URLs
- Handles SPA navigation (pushState/replaceState monitoring)
- Validates CloudFront signed URLs
- Detects session type (live vs recorded)

---

### 2.2 Backend Server

```
backend/
├── server.py           # FastAPI app, routes, background tasks
├── downloader.py       # HLS chunk download, FFmpeg merge
├── pipeline.py         # Orchestrates full processing workflow
├── transcriber.py      # Whisper speech-to-text
├── frame_extractor.py  # Scene detection + interval extraction
├── slide_analyzer.py   # OCR + Vision LLM analysis
├── notes_generator.py  # Ollama LLM prompt management
└── m3u8_parser.py      # HLS manifest parsing
```

**Server Architecture:**
- **Async API Layer:** FastAPI with CORS for extension/dashboard access
- **Background Workers:** Async task queue for sequential processing
- **State Management:** In-memory dicts for download/process status
- **Static Serving:** Mounted `/content` for artifact access

---

### 2.3 Dashboard (React SPA)

```
dashboard/src/
├── App.jsx             # Router, layout, navigation
├── pages/
│   ├── HomePage.jsx    # Recording library grid
│   ├── QueuePage.jsx   # Processing queue status
│   └── RecordingPage.jsx # Individual recording viewer
├── components/
│   └── FlashcardViewer.jsx # Interactive Q&A cards
└── index.css           # Tailwind + custom styles
```

**Routes:**
| Path | Component | Purpose |
|------|-----------|---------|
| `/` | HomePage | Browse all recordings |
| `/queue` | QueuePage | View processing queue |
| `/recording/:id` | RecordingPage | View specific recording |

---

### 2.4 AI Pipeline

```mermaid
flowchart LR
    A[Video MP4] --> B[Extract Audio]
    B --> C[Whisper Transcription]
    C --> D[transcript.md]
    
    A --> E[Scene Detection]
    E --> F[Interval Sampling]
    F --> G[Frame Extraction]
    G --> H[Duplicate Removal]
    H --> I[slides/]
    
    I --> J[EasyOCR]
    J --> K[Vision LLM]
    K --> L[Slide Analysis]
    
    D --> M[Notes Generator]
    L --> M
    M --> N[lecture_notes.md]
    M --> O[summary.md]
    M --> P[qa_cards.md]
    
    D --> Q[Enhanced Transcript]
    I --> Q
    L --> Q
    Q --> R[transcript_with_slides.md]
```

---

## 3. Data Flow

### 3.1 Download Flow

```mermaid
sequenceDiagram
    participant E as Extension
    participant B as Backend
    participant C as CloudFront
    participant F as FFmpeg
    
    E->>E: Capture HLS URL + Auth
    E->>B: POST /api/download
    B->>B: Create download task
    
    loop For each chunk
        B->>C: GET data{N}.ts?Key-Pair-Id=...
        C-->>B: Chunk bytes
        B->>B: Save to chunks/
    end
    
    B->>F: Concat chunks to MP4
    F-->>B: full_video.mp4
    B-->>E: Download complete
```

### 3.2 Processing Flow

```mermaid
sequenceDiagram
    participant D as Dashboard
    participant A as API
    participant W as Worker
    participant AI as AI Pipeline
    
    D->>A: POST /api/process
    A->>A: Add to JOB_QUEUE
    A-->>D: processId + position
    
    W->>W: Pop from queue
    W->>AI: process(video)
    
    AI->>AI: Whisper transcription
    AI->>AI: Frame extraction
    AI->>AI: Slide analysis
    AI->>AI: LLM notes generation
    
    AI-->>W: Results
    W-->>A: Update status
    D->>A: GET /api/process/{id}
    A-->>D: {status: complete}
```

---

## 4. Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Extension** | Chrome MV3 | - | Browser integration |
| **Frontend** | React | 18.x | Dashboard UI |
| **Build** | Vite | 5.x | Fast bundling |
| **Styling** | Tailwind CSS | 4.x | Utility-first CSS |
| **Backend** | FastAPI | 0.104+ | Async API server |
| **Runtime** | Python | 3.10+ | Backend runtime |
| **Transcription** | OpenAI Whisper | 20231117 | Speech-to-text |
| **LLM** | Ollama | 0.1+ | Local LLM inference |
| **OCR** | EasyOCR | 1.7+ | Text extraction |
| **Video** | FFmpeg | latest | Video processing |
| **Hashing** | imagehash | 4.3+ | Perceptual hashing |

---

## 5. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User's Machine (macOS)                   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Chrome    │  │  Dashboard  │  │   Ollama Server     │  │
│  │ + Extension │  │  :5173      │  │   :11434            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│         │               │                    │              │
│         └───────────────┼────────────────────┘              │
│                         │                                    │
│                         ▼                                    │
│                ┌─────────────────┐                          │
│                │  FastAPI Server │                          │
│                │     :8000       │                          │
│                └─────────────────┘                          │
│                         │                                    │
│         ┌───────────────┼───────────────┐                   │
│         ▼               ▼               ▼                   │
│  ┌───────────┐  ┌───────────┐  ┌───────────────────┐       │
│  │  Whisper  │  │  FFmpeg   │  │  Caffeinate       │       │
│  │  (GPU/CPU)│  │           │  │  (Sleep prevent)  │       │
│  └───────────┘  └───────────┘  └───────────────────┘       │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    File System                          ││
│  │  output/                                                 ││
│  │  ├── videos/{title}/full_video.mp4                      ││
│  │  └── YYYY-MM-DD_{title}/                                ││
│  │      ├── lecture_notes.md, summary.md, ...              ││
│  │      └── slides/*.png                                   ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Security Considerations

| Concern | Current Handling |
|---------|------------------|
| **Auth Tokens** | Captured from network, never stored persistently |
| **CORS** | Open (`*`) - localhost only deployment |
| **File Access** | Scoped to output directory |
| **API Auth** | None (local-only design) |

**V2 Considerations:**
- Add API key for remote access scenarios
- Encrypt stored credentials if persisting
- Content Security Policy for dashboard

---

## 7. Scalability & Performance

| Constraint | Current | V2 Target |
|------------|---------|-----------|
| Concurrent downloads | 1 | 3-5 |
| Processing queue | Sequential | Parallel (GPU) |
| Memory (Whisper medium) | ~4GB | Optimize |
| Disk per lecture | ~500MB | Compress slides |

---

## 8. Error Handling

```mermaid
flowchart TD
    A[Operation] --> B{Success?}
    B -->|Yes| C[Update Status]
    B -->|No| D[Log Error]
    D --> E[Update Status: error]
    E --> F[Store Error Message]
    F --> G[Return to Client]
```

**Key Error Scenarios:**
- Network timeout during download → Retry logic
- CloudFront signature expired → Prompt user to refresh
- Whisper model load failure → Fall back to smaller model
- Ollama not running → Clear error message

---

*Document Version: 1.0 | Last Updated: 2026-01-14*
