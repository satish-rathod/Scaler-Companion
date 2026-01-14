# Scaler Companion - API Documentation

## Base URL
```
http://localhost:8000
```

---

## Health & Status

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-14T09:30:00.000000",
  "version": "1.0.0"
}
```

---

## Download Endpoints

### POST /api/download
Start downloading a lecture from Scaler Academy.

**Request Body:**
```json
{
  "title": "DevOps Introduction",
  "url": "https://www.scaler.com/class/490070/session",
  "streamInfo": {
    "baseUrl": "https://media.scaler.com/.../stream_0/",
    "streamUrl": "https://media.scaler.com/.../720p/.m3u8",
    "keyPairId": "K4IMAQNEJMDV1",
    "policy": "base64-encoded-policy",
    "signature": "cloudfront-signature",
    "detectedChunk": 450
  },
  "startTime": 0,
  "endTime": 3600
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Lecture title (used for folder naming) |
| `url` | string | Yes | Original Scaler page URL |
| `streamInfo.baseUrl` | string | Yes | HLS chunk base URL |
| `streamInfo.keyPairId` | string | Yes | CloudFront Key-Pair-Id |
| `streamInfo.policy` | string | Yes | CloudFront Policy |
| `streamInfo.signature` | string | Yes | CloudFront Signature |
| `streamInfo.detectedChunk` | int | No | Last detected chunk number |
| `startTime` | int | No | Start time in seconds |
| `endTime` | int | No | End time in seconds |

**Response:**
```json
{
  "downloadId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Download started"
}
```

---

### GET /api/status/{download_id}
Get download progress and status.

**Response:**
```json
{
  "downloadId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "downloading",
  "progress": 45.5,
  "message": "Downloading: chunk 200/450",
  "path": null,
  "error": null
}
```

| Status Values | Description |
|---------------|-------------|
| `pending` | Download queued |
| `downloading` | Actively downloading chunks |
| `complete` | Download finished successfully |
| `error` | Download failed |

---

## Processing Endpoints

### POST /api/process
Start AI processing on a downloaded video.

**Request Body:**
```json
{
  "title": "DevOps Introduction",
  "videoPath": "/path/to/output/videos/DevOps_Introduction/full_video.mp4",
  "whisperModel": "medium",
  "ollamaModel": "gpt-oss:20b",
  "skipTranscription": false,
  "skipFrames": false,
  "skipNotes": false,
  "skipSlideAnalysis": true
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | Required | Lecture title |
| `videoPath` | string | Required | Absolute path to video file |
| `whisperModel` | string | `"medium"` | Whisper model size |
| `ollamaModel` | string | `"gpt-oss:20b"` | Ollama model for notes |
| `skipTranscription` | bool | `false` | Skip Whisper transcription |
| `skipFrames` | bool | `false` | Skip frame extraction |
| `skipNotes` | bool | `false` | Skip LLM note generation |
| `skipSlideAnalysis` | bool | `false` | Skip OCR/vision analysis |

**Response:**
```json
{
  "processId": "660e8400-e29b-41d4-a716-446655440000",
  "message": "Job queued successfully",
  "position": 1
}
```

---

### GET /api/process/{process_id}
Get processing status.

**Response:**
```json
{
  "processId": "660e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "progress": 67.5,
  "stage": "notes",
  "message": "Generating lecture notes...",
  "outputDir": null,
  "error": null,
  "title": "DevOps Introduction"
}
```

| Stage Values | Progress Range |
|--------------|----------------|
| `transcription` | 0-40% |
| `frames` | 40-70% |
| `notes` | 70-100% |

---

### GET /api/models
List available Ollama models.

**Response:**
```json
{
  "models": [
    "gpt-oss:20b",
    "llama3.2:latest",
    "codellama:13b"
  ]
}
```

---

## Recording Management

### GET /api/recordings
List all recordings (downloaded and/or processed).

**Response:**
```json
{
  "recordings": [
    {
      "id": "2026-01-14_DevOps_Introduction",
      "title": "DevOps Introduction",
      "status": "processed",
      "date": "2026-01-14",
      "path": "/path/to/output/2026-01-14_DevOps_Introduction",
      "videoPath": "/path/to/output/videos/DevOps_Introduction/full_video.mp4",
      "processed": true,
      "artifacts": {
        "notes": "/content/2026-01-14_DevOps_Introduction/lecture_notes.md",
        "summary": "/content/2026-01-14_DevOps_Introduction/summary.md",
        "qa_cards": "/content/2026-01-14_DevOps_Introduction/qa_cards.md",
        "transcript": "/content/2026-01-14_DevOps_Introduction/transcript_with_slides.md",
        "slides": "/content/2026-01-14_DevOps_Introduction/slides/"
      }
    }
  ]
}
```

| Status Values | Description |
|---------------|-------------|
| `downloaded` | Video downloaded, not processed |
| `processing` | Currently being processed |
| `processed` | Fully processed with artifacts |
| `queued` | Waiting in processing queue |

---

### GET /api/recordings/check
Check if a recording exists by title.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `title` | string | Recording title to search |

**Response:**
```json
{
  "exists": true,
  "status": "processed",
  "path": "/path/to/output/2026-01-14_DevOps_Introduction"
}
```

---

### DELETE /api/recordings/{recording_id}
Delete a recording and all its artifacts.

**Response:**
```json
{
  "success": true,
  "deleted": [
    "/path/to/output/videos/DevOps_Introduction",
    "/path/to/output/2026-01-14_DevOps_Introduction"
  ],
  "errors": []
}
```

---

## Static Content

### GET /content/{folder}/{file}
Serve static content from output directory.

**Examples:**
```
GET /content/2026-01-14_DevOps_Introduction/lecture_notes.md
GET /content/2026-01-14_DevOps_Introduction/slides/frame_00_05_30.png
GET /content/2026-01-14_DevOps_Introduction/viewer.html
```

---

## Error Responses

All endpoints may return:

```json
{
  "detail": "Error message describing what went wrong"
}
```

| HTTP Code | Meaning |
|-----------|---------|
| 400 | Bad request (invalid parameters) |
| 404 | Resource not found |
| 500 | Internal server error |

---

## WebSocket (Planned for V2)

Future support for real-time progress streaming:
```
WS /ws/progress/{job_id}
```

---

*API Version: 1.0.0 | Last Updated: 2026-01-14*
