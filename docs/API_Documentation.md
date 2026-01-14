# Scaler Companion V2 API Reference

## Base URL
`http://localhost:8000/api/v1`

## Endpoints

### Content Management

#### `GET /recordings`
List all recordings in the library. Merges downloaded videos with processed artifacts.

**Response:**
```json
{
  "recordings": [
    {
      "id": "2024-01-01_Lecture_Title",
      "title": "Lecture Title",
      "status": "processed",
      "date": "2024-01-01",
      "progress": 100,
      "artifacts": { ... }
    }
  ]
}
```

#### `DELETE /recordings/{id}`
Delete a recording and all associated files (video, notes, slides).

### Downloads

#### `POST /download`
Start downloading a new lecture.

**Body:**
```json
{
  "title": "Lecture Name",
  "url": "https://...",
  "streamInfo": {
    "baseUrl": "...",
    "streamUrl": "...",
    "keyPairId": "...",
    "policy": "...",
    "signature": "..."
  }
}
```

#### `GET /status/{download_id}`
Check the progress of a specific download.

### AI Processing

#### `POST /process`
Enqueue a downloaded video for AI processing.

**Body:**
```json
{
  "title": "Lecture Name",
  "videoPath": "/absolute/path/to/video.mp4",
  "whisperModel": "medium",
  "ollamaModel": "gpt-oss:20b",
  "skipTranscription": false
}
```

#### `GET /process/{process_id}`
Check the status of a processing job.

#### `GET /queue`
Get the global status of the processing queue.

**Response:**
```json
{
  "queue": [ { "id": "...", "title": "..." } ],
  "history": [ { "id": "...", "status": "processing", "progress": 45 } ]
}
```

#### `GET /models`
List available Whisper and Ollama models.

### Search & Export

#### `GET /search?q={query}`
Search across all processed transcripts and notes.

**Response:**
```json
{
  "results": [
    {
      "id": "lecture_id",
      "title": "Lecture Title",
      "type": "transcript",
      "match": "...snippet of text matching query..."
    }
  ]
}
```

#### `GET /export/{recording_id}`
Download a ZIP archive of the recording's artifacts.
