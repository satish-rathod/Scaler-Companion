# Scaler Companion - User Flow Documentation

## 1. Overview

This document describes the primary user journeys through the Scaler Companion system.

---

## 2. Primary User Flows

### 2.1 Lecture Download Flow

```mermaid
flowchart TD
    A[User on Scaler Academy] --> B{Recorded Lecture?}
    B -->|No| X[Not supported]
    B -->|Yes| C[Play video to load stream]
    C --> D[Extension captures HLS URL]
    D --> E[Click extension icon]
    E --> F[View lecture details in popup]
    F --> G{Set time range?}
    G -->|Yes| H[Enter start/end time]
    G -->|No| I[Full lecture]
    H --> J[Click Download]
    I --> J
    J --> K[Progress bar updates]
    K --> L{Complete?}
    L -->|Yes| M[Success! Open Dashboard]
    L -->|Error| N[Show error, retry option]
```

**Steps:**
1. Navigate to a recorded lecture on Scaler Academy
2. **Play the video** (required to capture stream URL)
3. Click the Scaler Companion extension icon
4. Verify lecture title and stream captured
5. (Optional) Set start/end time for partial download
6. Click "Download Lecture"
7. Wait for download to complete (progress shown)
8. Click "Open Dashboard" to view/process

---

### 2.2 AI Processing Flow

```mermaid
flowchart TD
    A[Dashboard: Library] --> B[Find downloaded recording]
    B --> C[Click Process button]
    C --> D[Processing Options Modal]
    D --> E{Configure?}
    E -->|Yes| F[Select Whisper model]
    F --> G[Select Ollama model]
    G --> H[Toggle skip options]
    E -->|No| I[Use defaults]
    H --> J[Start Processing]
    I --> J
    J --> K[Job added to queue]
    K --> L[View Queue page for status]
    L --> M{Complete?}
    M -->|Yes| N[Recording shows as Processed]
    M -->|No| O[Wait, check progress]
    O --> L
```

**Processing Options:**
| Option | Default | Description |
|--------|---------|-------------|
| Whisper Model | `medium` | tiny/base/small/medium/large |
| Ollama Model | `gpt-oss:20b` | Any installed model |
| Skip Transcription | Off | Reuse existing transcript |
| Skip Frames | Off | Reuse existing slides |
| Skip Notes | Off | Skip LLM generation |
| Skip Slide Analysis | Off | Skip OCR/Vision |

---

### 2.3 Content Consumption Flow

```mermaid
flowchart TD
    A[Dashboard: Library] --> B[Click recording card]
    B --> C[Recording Page]
    C --> D{Select tab}
    D -->|Notes| E[View lecture_notes.md]
    D -->|Summary| F[View summary.md]
    D -->|Flashcards| G[Interactive Q&A viewer]
    D -->|Transcript| H[Timestamped transcript]
    D -->|Slides| I[Slide gallery]
    
    E --> J{Download?}
    J -->|Yes| K[Download as .md file]
    
    G --> L[Flip cards to test knowledge]
```

**Tab Contents:**
| Tab | Content | Features |
|-----|---------|----------|
| **Notes** | Structured lecture notes | Markdown with tables |
| **Summary** | 4-5 paragraph overview | Key concepts |
| **Flashcards** | Q&A cards | Interactive flip |
| **Transcript** | Timestamped text | With embedded slides |
| **Slides** | Extracted frames | Gallery view |

---

## 3. Secondary Flows

### 3.1 Queue Monitoring Flow

```mermaid
flowchart LR
    A[Queue Page] --> B[View active job]
    B --> C[Progress bar + stage]
    C --> D[Pending jobs list]
    D --> E[Estimated wait time]
```

### 3.2 Recording Deletion Flow

```mermaid
flowchart TD
    A[Library Page] --> B[Click recording]
    B --> C[Click Delete button]
    C --> D[Confirm modal]
    D -->|Yes| E[Delete video + artifacts]
    D -->|No| F[Cancel]
    E --> G[Refresh library]
```

---

## 4. User Interface States

### 4.1 Extension Popup States

| State | Visual | User Action |
|-------|--------|-------------|
| **Backend Offline** | Red banner | Start backend |
| **No Lecture** | "Navigate to a lecture" | Go to Scaler |
| **Play Required** | "Play video first" | Click play |
| **Ready** | Title + Download button | Download |
| **Downloading** | Progress bar | Wait |
| **Complete** | Green checkmark | Open Dashboard |
| **Error** | Red error text | Retry |

### 4.2 Dashboard States

| Page | Loading | Empty | Data |
|------|---------|-------|------|
| **Library** | Spinner | "No recordings yet" | Grid of cards |
| **Queue** | Spinner | "Queue is empty" | Job list |
| **Recording** | Spinner | "Not found" | Tabs + content |

---

## 5. Error Recovery Flows

### 5.1 Download Error Recovery

```mermaid
flowchart TD
    A[Download Error] --> B{Error Type}
    B -->|403 Forbidden| C[Auth expired]
    C --> D[Refresh Scaler page]
    D --> E[Re-play video]
    E --> F[Retry download]
    
    B -->|Network Error| G[Check connection]
    G --> H[Retry download]
    
    B -->|Disk Full| I[Free disk space]
    I --> H
```

### 5.2 Processing Error Recovery

```mermaid
flowchart TD
    A[Processing Error] --> B{Error Type}
    B -->|OOM| C[Try smaller Whisper model]
    B -->|Ollama not running| D[Start Ollama service]
    B -->|Video corrupt| E[Re-download lecture]
    
    C --> F[Retry with skip options]
    D --> F
    E --> G[Download again]
```

---

## 6. Keyboard Shortcuts (Planned V2)

| Shortcut | Action |
|----------|--------|
| `Cmd+D` | Download current lecture |
| `Cmd+O` | Open dashboard |
| `Left/Right` | Navigate flashcards |
| `Space` | Flip flashcard |
| `/` | Search recordings |

---

*Document Version: 1.0 | Last Updated: 2026-01-14*
