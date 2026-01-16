# Scaler Companion V1 - Complete Implementation Guide

> **Purpose:** This document provides complete implementation details for AI coding agents to understand how V1 works. It covers every component, file, function, and data flow in the system.

---

## 1. System Overview

Scaler Companion is a local-first lecture processing system with 3 main components:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SCALER COMPANION V1                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐   │
│  │   EXTENSION  │───▶│   BACKEND    │───▶│       DASHBOARD          │   │
│  │  (Chrome)    │    │  (FastAPI)   │    │    (React + Vite)        │   │
│  └──────────────┘    └──────────────┘    └──────────────────────────┘   │
│         │                   │                        │                   │
│         │                   ▼                        │                   │
│         │           ┌──────────────┐                 │                   │
│         │           │  AI PIPELINE │                 │                   │
│         │           │ Whisper+LLM  │                 │                   │
│         │           └──────────────┘                 │                   │
│         │                   │                        │                   │
│         │                   ▼                        │                   │
│         └──────────────▶ OUTPUT FILES ◀──────────────┘                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Core Flow:**
1. **Extension** captures HLS stream URLs from Scaler Academy pages
2. **Backend** downloads video, runs AI pipeline (Whisper + Ollama)
3. **Dashboard** displays processed content (notes, flashcards, etc.)

---

## 2. Project Structure

```
lecture_processor/
├── extension/                    # Chrome Extension (Manifest V3)
│   ├── manifest.json            # Extension configuration
│   ├── popup/
│   │   ├── popup.html           # Popup UI (3.8KB)
│   │   ├── popup.js             # Popup logic (15KB, 459 lines)
│   │   └── popup.css            # Popup styles (8.4KB)
│   ├── content/
│   │   ├── inject.js            # Content script (28KB, 771 lines)
│   │   └── inject.css           # Injected styles (1.5KB)
│   └── background/
│       └── service-worker.js    # Background service (11KB, 360 lines)
│
├── backend/                      # Python Backend (FastAPI)
│   ├── server.py                # API server (26KB, 685 lines)
│   ├── pipeline.py              # Processing orchestrator (35KB, 826 lines)
│   ├── downloader.py            # HLS video download (19KB, 495 lines)
│   ├── transcriber.py           # Whisper transcription (9KB, 264 lines)
│   ├── frame_extractor.py       # Slide extraction (15KB, 408 lines)
│   ├── slide_analyzer.py        # OCR + Vision (13KB, 372 lines)
│   ├── notes_generator.py       # LLM notes (23KB, 706 lines)
│   ├── m3u8_parser.py           # HLS manifest parser (5KB)
│   └── requirements.txt         # Python dependencies
│
├── dashboard/                    # React Dashboard
│   ├── src/
│   │   ├── App.jsx              # Router + layout (2.4KB, 72 lines)
│   │   ├── pages/
│   │   │   ├── HomePage.jsx     # Library view (10KB, 222 lines)
│   │   │   ├── QueuePage.jsx    # Processing queue (9KB)
│   │   │   └── RecordingPage.jsx # Recording viewer (10KB, 224 lines)
│   │   └── components/
│   │       └── FlashcardViewer.jsx  # Q&A cards
│   ├── vite.config.js           # Vite configuration
│   └── tailwind.config.js       # Tailwind CSS config
│
└── output/                       # Generated content
    ├── videos/{title}/          # Downloaded videos
    │   ├── chunks/              # Raw .ts chunks
    │   └── full_video.mp4       # Merged video
    └── YYYY-MM-DD_{title}/      # Processed output
        ├── video.mp4            # Copy of source video
        ├── audio.wav            # Extracted audio
        ├── transcript.{md,json,txt}
        ├── transcript_with_slides.md
        ├── lecture_notes.md
        ├── summary.md
        ├── qa_cards.md
        ├── slides/              # Extracted frames
        ├── metadata.json
        └── viewer.html          # Interactive viewer
```

---

## 3. Chrome Extension (Detailed)

### 3.1 Manifest Configuration (`manifest.json`)

```json
{
  "manifest_version": 3,
  "name": "Scaler Companion",
  "version": "1.0.0",
  "permissions": ["activeTab", "storage", "downloads"],
  "host_permissions": [
    "https://*.scaler.com/*",
    "https://media.scaler.com/*",
    "http://localhost:8000/*"
  ],
  "content_scripts": [{
    "matches": ["https://*.scaler.com/*"],
    "js": ["content/inject.js"],
    "css": ["content/inject.css"]
  }],
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  }
}
```

### 3.2 Content Script (`content/inject.js`)

**Purpose:** Intercepts network requests to capture HLS stream URLs and CloudFront authentication tokens.

**Key State Variables:**
```javascript
let currentLecture = null;        // Current page lecture info
let capturedStreamInfo = null;    // Captured HLS data: {baseUrl, keyPairId, policy, signature, detectedChunk}
let currentUrl = location.href;   // For SPA navigation detection
let capturedUrls = new Set();     // Prevent duplicate captures
```

**Critical Functions:**

1. **`resetStreamState()`** - Clears all stream data when navigating to new lecture
2. **`checkUrlChange()`** - Detects SPA navigation, resets state for new class IDs
3. **`captureStreamUrl(url)`** - Extracts base URL from HLS manifest
4. **`captureSegmentUrl(url)`** - Parses CloudFront auth params from segment URLs:
   - Extracts `Key-Pair-Id`, `Policy`, `Signature` query params
   - Detects chunk number from URL pattern (e.g., `data000025.ts`)
   - Constructs `baseUrl` by stripping chunk filename
5. **`detectLecture()`** - Scrapes page for lecture metadata (title, duration, type)

**Network Interception:**
```javascript
// Intercept fetch()
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const url = args[0]?.url || args[0];
  if (url.includes('.m3u8') || url.includes('_segment')) {
    captureStreamUrl(url);
  }
  return originalFetch.apply(this, args);
};

// Intercept XMLHttpRequest
const originalXHROpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url, ...rest) {
  if (url.includes('.ts') || url.includes('_segment')) {
    captureSegmentUrl(url);
  }
  return originalXHROpen.apply(this, [method, url, ...rest]);
};
```

**SPA Navigation Handling:**
```javascript
// Override history.pushState for SPA
const originalPushState = history.pushState;
history.pushState = function(...args) {
  const result = originalPushState.apply(this, args);
  checkUrlChange();  // Reset state if class ID changed
  return result;
};
window.addEventListener('popstate', checkUrlChange);
```

**Message Handling:**
```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'getLecture':
      sendResponse({ lecture: { ...currentLecture, streamInfo: capturedStreamInfo } });
      break;
    case 'getStreamInfo':
      sendResponse(capturedStreamInfo);
      break;
  }
  return true;
});
```

### 3.3 Service Worker (`background/service-worker.js`)

**Purpose:** Maintains persistent state across popup opens, polls backend for progress.

**State:**
```javascript
const capturedStreams = new Map();  // tabId → streamInfo
const activeJobs = {
  download: null,    // { id, title, progress, status }
  processing: null   // { id, title, progress, stage, status }
};
let pollInterval = null;
```

**Key Message Handlers:**

1. **`handleStartDownload(message, sendResponse)`**:
   - Receives lecture info from popup
   - Calls `POST /api/download` with `{title, url, streamInfo, startTime, endTime}`
   - Stores job in `activeJobs.download`
   - Starts polling for progress

2. **`handleStartProcessing(message, sendResponse)`**:
   - Calls `POST /api/process` with `{title, videoPath, whisperModel, ollamaModel}`
   - Stores job in `activeJobs.processing`

3. **`startPolling()`**:
   - Polls `GET /api/status/{id}` every 1 second
   - Updates `activeJobs` with progress
   - Clears interval when job completes

### 3.4 Popup (`popup/popup.js`)

**Purpose:** User interface for initiating downloads.

**DOM Elements:**
```javascript
const elements = {
  offlineBanner: document.getElementById('offlineBanner'),
  statusDot: document.getElementById('statusDot'),
  emptyState: document.getElementById('emptyState'),
  lectureInfo: document.getElementById('lectureInfo'),
  lectureName: document.getElementById('lectureName'),
  progressSection: document.getElementById('progressSection'),
  progressBar: document.getElementById('progressBar'),
  progressMessage: document.getElementById('progressMessage'),
  downloadBtn: document.getElementById('downloadBtn'),
  dashboardBtn: document.getElementById('dashboardBtn'),
};
```

**Initialization Flow:**
```javascript
async function init() {
  await checkBackendHealth();     // GET /health
  await checkActiveJobs();        // Ask service worker for active jobs
  await detectLecture();          // Get lecture from content script
}
```

**Download Flow:**
```javascript
async function handleDownload() {
  // 1. Validate stream info exists
  if (!currentLecture?.streamInfo?.baseUrl) {
    showError('Play the video first');
    return;
  }
  
  // 2. Parse optional time range
  const startTime = parseTimeToSeconds(startTimeInput.value);
  const endTime = parseTimeToSeconds(endTimeInput.value);
  
  // 3. Send to service worker
  chrome.runtime.sendMessage({
    action: 'startDownload',
    lecture: { ...currentLecture, startTime, endTime }
  }, (response) => {
    if (response.success) startProgressPolling(response.downloadId);
    else showError(response.error);
  });
}
```

---

## 4. Backend Server (Detailed)

### 4.1 Server Structure (`server.py`)

**Framework:** FastAPI with async support

**Startup:**
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Scaler Companion Backend starting...")
    prevent_sleep()  # Runs caffeinate -i -w <pid>
    worker_task = asyncio.create_task(process_worker())  # Start job queue worker
    yield
    worker_task.cancel()
```

**State Management:**
```python
downloads: dict[str, DownloadStatus] = {}  # download_id → status
processes: dict[str, ProcessStatus] = {}    # process_id → status
JOB_QUEUE: list[dict] = []                  # Sequential processing queue
CURRENT_PROCESS_ID: Optional[str] = None    # Currently processing job
```

**Background Worker (Sequential Processing):**
```python
async def process_worker():
    """Processes jobs one at a time from the queue"""
    while True:
        if JOB_QUEUE and CURRENT_PROCESS_ID is None:
            job = JOB_QUEUE.pop(0)
            CURRENT_PROCESS_ID = job["id"]
            await run_processing(job["id"], job["request"])
            CURRENT_PROCESS_ID = None
        await asyncio.sleep(1)
```

### 4.2 API Endpoints

| Method | Endpoint | Handler | Purpose |
|--------|----------|---------|---------|
| GET | `/health` | `health_check()` | Returns `{status, timestamp, version}` |
| POST | `/api/download` | `start_download()` | Initiates video download |
| GET | `/api/status/{id}` | `get_download_status()` | Download progress |
| POST | `/api/process` | `start_processing()` | Queues AI processing |
| GET | `/api/process/{id}` | `get_process_status()` | Processing progress |
| GET | `/api/models` | `list_ollama_models()` | Available Ollama models |
| GET | `/api/recordings` | `list_recordings()` | List all recordings |
| GET | `/api/recordings/check` | `check_recording()` | Check if recording exists |
| DELETE | `/api/recordings/{id}` | `delete_recording()` | Delete recording + artifacts |

### 4.3 Download Handler (`run_download`)

```python
async def run_download(download_id: str, request: DownloadRequest):
    # 1. Sanitize title for folder name
    safe_title = "".join(c for c in request.title if c.isalnum() or c in " -_")[:50]
    output_dir = OUTPUT_DIR / "videos" / safe_title
    
    # 2. Calculate chunk range
    CHUNK_DURATION = 16  # seconds per chunk
    start_chunk = int((request.startTime or 0) / CHUNK_DURATION)
    end_chunk = stream_info.detectedChunk + 100 if stream_info.detectedChunk else 1000
    
    # 3. Download chunks
    downloader = VideoDownloader(output_dir=str(output_dir))
    downloader.set_progress_callback(progress_callback)
    success = await loop.run_in_executor(pool, lambda: downloader.download_chunks(
        base_url=stream_info.baseUrl,
        start_chunk=start_chunk,
        end_chunk=end_chunk,
        key_pair_id=stream_info.keyPairId,
        policy=stream_info.policy,
        signature=stream_info.signature
    ))
    
    # 4. Merge chunks
    full_video_path = await loop.run_in_executor(pool, 
        lambda: downloader.merge_chunks_to_video(start_chunk, end_chunk))
    
    # 5. Update status
    downloads[download_id].status = "complete"
    downloads[download_id].path = full_video_path
```

### 4.4 VideoDownloader (`downloader.py`)

**Chunk URL Patterns Supported:**
```python
PATTERNS = [
    {"prefix": "data", "padding": 6, "suffix": ".ts"},  # data000025.ts
    {"prefix": "", "padding": 6, "suffix": ".ts"},      # 000025.ts
    {"prefix": "data", "padding": 0, "suffix": ".ts"},  # data25.ts
]
```

**Download Logic:**
```python
def download_chunks(self, base_url, start_chunk, end_chunk, key_pair_id, policy, signature):
    session = requests.Session()
    format_info = None  # Detect pattern from first successful download
    
    for chunk_num in range(start_chunk, end_chunk + 1):
        if format_info is None:
            # Try each pattern until one works
            content, format_info = self._try_download_chunk(...)
        else:
            # Use detected pattern
            url = self._build_chunk_url_from_format(base_url, chunk_num, format_info, ...)
            response = session.get(url)
            if response.status_code == 403:
                break  # End of stream reached
            content = response.content
        
        # Save chunk
        with open(chunk_path, 'wb') as f:
            f.write(content)
```

**Merge with FFmpeg:**
```python
def merge_chunks_to_video(self, start_chunk, end_chunk, output_filename="full_video.mp4"):
    # Create concat file
    with open(concat_file, 'w') as f:
        for chunk in sorted_chunks:
            f.write(f"file '{abs_chunk_path}'\n")
    
    # Run FFmpeg
    cmd = ['ffmpeg', '-f', 'concat', '-safe', '0', '-i', concat_file,
           '-c', 'copy', '-bsf:a', 'aac_adtstoasc', '-y', output_path]
    subprocess.run(cmd, check=True)
```

### 4.5 Processing Pipeline (`pipeline.py`)

**ProcessingPipeline Class:**
```python
class ProcessingPipeline:
    def __init__(self, output_base, whisper_model, ollama_model, vision_model):
        self.output_base = Path(output_base)
        self.whisper_model = whisper_model
        self.ollama_model = ollama_model
        self.vision_model = vision_model
        # Lazy-loaded components
        self._transcriber = None
        self._frame_extractor = None
        self._notes_generator = None
        self._slide_analyzer = None
```

**Main Processing Flow:**
```python
def process(self, video_path, title, skip_transcription=False, skip_frames=False, 
            skip_notes=False, skip_slide_analysis=False):
    # 1. Create output folder: YYYY-MM-DD_Title
    recording_dir = self._create_recording_folder(title)
    
    # 2. Copy video to output
    shutil.copy2(video_path, recording_dir / "video.mp4")
    
    # 3. Transcription (Whisper)
    if not skip_transcription:
        transcript_result = self.transcriber.transcribe_video(video_path, str(recording_dir))
        transcript_text = transcript_result['text']
    
    # 4. Frame extraction
    if not skip_frames:
        frames = self.frame_extractor.extract_frames(video_path, str(recording_dir / "slides"))
    
    # 5. Slide analysis (OCR + Vision)
    if not skip_slide_analysis and frames:
        slide_analyses = self.slide_analyzer.analyze_all_slides(frames, str(recording_dir))
    
    # 6. Create enhanced transcript with slides
    self._create_enhanced_transcript(recording_dir, frames, slide_analyses)
    
    # 7. Generate notes with LLM
    if not skip_notes:
        notes_context = self._prepare_notes_context(transcript_text, frames, slide_analyses)
        self.notes_generator.generate_all(notes_context, str(recording_dir), title)
    
    # 8. Create index file and HTML viewer
    self._create_index_file(recording_dir, title, results)
    self._create_lecture_viewer(recording_dir, title, frames, slide_analyses)
    
    return {"output_dir": str(recording_dir), ...}
```

### 4.6 WhisperTranscriber (`transcriber.py`)

```python
class WhisperTranscriber:
    MODELS = ["tiny", "base", "small", "medium", "large"]
    
    def __init__(self, model_name="medium"):
        self.model_name = model_name
        self.model = None  # Lazy loaded
        self.device = "mps" if torch.backends.mps.is_available() else "cpu"
    
    def transcribe_video(self, video_path, output_dir, language="en"):
        # 1. Extract audio with FFmpeg
        audio_path = self.extract_audio(video_path, output_dir)
        
        # 2. Load model if needed
        if self.model is None:
            self.load_model()
        
        # 3. Transcribe
        result = self.model.transcribe(audio_path, language=language, 
                                        word_timestamps=True, verbose=False)
        
        # 4. Save outputs
        self._save_transcript(result, output_dir)  # .json, .txt
        self._save_markdown_transcript(result, output_dir / "transcript.md")
        
        return {"text": result["text"], "chunks": result["segments"]}
```

### 4.7 FrameExtractor (`frame_extractor.py`)

**Hybrid Approach:** Scene detection + fixed intervals

```python
class FrameExtractor:
    def __init__(self, scene_threshold=0.15, min_interval=3.0, fixed_interval=30.0, 
                 hash_threshold=8):
        self.scene_threshold = scene_threshold  # FFmpeg scene detection sensitivity
        self.fixed_interval = fixed_interval    # Fallback every N seconds
        self.hash_threshold = hash_threshold    # Perceptual hash difference for duplicates
    
    def extract_frames(self, video_path, output_dir, use_hybrid=True):
        duration = self.get_video_duration(video_path)
        
        # 1. Detect scene changes
        scene_ts = self.detect_scene_changes(video_path)
        
        # 2. Generate interval timestamps as fallback
        interval_ts = self.generate_interval_timestamps(duration)
        
        # 3. Merge and deduplicate timestamps
        timestamps = self.merge_timestamps(scene_ts, interval_ts, duration)
        
        # 4. Extract frames at each timestamp
        frames = self.extract_frames_at_timestamps(video_path, output_dir, timestamps)
        
        # 5. Remove visually similar frames using perceptual hashing
        frames = self.remove_duplicate_frames(frames)
        
        return frames
```

**Scene Detection Command:**
```python
def detect_scene_changes(self, video_path):
    cmd = ['ffmpeg', '-i', video_path, '-vf', 
           f"select='gt(scene,{self.scene_threshold})',showinfo", '-f', 'null', '-']
    # Parse output for "pts_time:" values
```

### 4.8 SlideAnalyzer (`slide_analyzer.py`)

**Smart Analysis:** Skips expensive Vision LLM for text-heavy slides

```python
class SlideAnalyzer:
    def __init__(self, vision_model="llama3.2-vision:11b", use_ocr=True, 
                 use_vision=True, smart_vision=True, ocr_word_threshold=30):
        self.smart_vision = smart_vision  # Skip vision if OCR gets enough text
        self.ocr_word_threshold = ocr_word_threshold
    
    def analyze_slide(self, image_path):
        # 1. Run OCR
        ocr_text = self.extract_text_ocr(image_path)
        
        # 2. Check if vision is needed
        if self.smart_vision:
            word_count = len(ocr_text.split())
            if word_count > self.ocr_word_threshold:
                return {"ocr_text": ocr_text, "vision_skipped": True}
        
        # 3. Run Vision LLM if needed
        if self.use_vision:
            vision_analysis = self.analyze_with_vision(image_path, ocr_text)
            return {"ocr_text": ocr_text, "vision_analysis": vision_analysis}
```

### 4.9 NotesGenerator (`notes_generator.py`)

**Batch Prompt Strategy:** Single LLM call for all outputs

```python
PROMPTS = {
    "batch_all": """You are an expert technical note-taker. 
    Create FOUR study materials from this lecture.
    
    ## LECTURE_NOTES_START
    [Structured notes with sections, tables, code blocks]
    ## LECTURE_NOTES_END
    
    ## QA_CARDS_START
    [12-15 Q&A flashcards]
    ## QA_CARDS_END
    
    ## SUMMARY_START
    [4-5 paragraph summary]
    ## SUMMARY_END
    
    ## ANNOUNCEMENTS_START
    [Assignments, deadlines, action items]
    ## ANNOUNCEMENTS_END
    """
}

def generate_all(self, transcript, output_dir, title, use_batch=True):
    if use_batch:
        # Single LLM call
        response = ollama.generate(model=self.model, 
                                   prompt=PROMPTS["batch_all"].format(transcript=transcript))
        sections = self._parse_batch_response(response)
        
        # Save each section to file
        for name, content in sections.items():
            with open(output_dir / f"{name}.md", 'w') as f:
                f.write(f"# {title} - {name.replace('_', ' ').title()}\n\n{content}")
```

---

## 5. Dashboard (Detailed)

### 5.1 App Structure (`App.jsx`)

```jsx
function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-background">
        {/* Fixed Sidebar */}
        <aside className="w-60 border-r fixed h-screen">
          <h1>Lecture Companion</h1>
          <nav>
            <NavLink to="/">Library</NavLink>
            <NavLink to="/queue">Processing</NavLink>
          </nav>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 ml-60 p-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/queue" element={<QueuePage />} />
            <Route path="/recording/:id" element={<RecordingPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
```

### 5.2 HomePage (`pages/HomePage.jsx`)

**Fetches recordings and displays grid:**
```jsx
function HomePage() {
  const [recordings, setRecordings] = useState([]);
  const [search, setSearch] = useState('');
  
  useEffect(() => {
    fetch('/api/recordings')
      .then(res => res.json())
      .then(data => setRecordings(data.recordings));
  }, []);
  
  // Filter by search
  const filtered = recordings.filter(r => 
    r.title.toLowerCase().includes(search.toLowerCase())
  );
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filtered.map(recording => (
        <RecordingCard 
          key={recording.id}
          recording={recording}
          onProcess={handleProcess}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
```

### 5.3 RecordingPage (`pages/RecordingPage.jsx`)

**Tabbed content viewer:**
```jsx
function RecordingPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('notes');
  const [content, setContent] = useState('');
  
  // Fetch content when tab changes
  useEffect(() => {
    const artifactMap = {
      notes: 'lecture_notes.md',
      summary: 'summary.md',
      qa_cards: 'qa_cards.md',
      transcript: 'transcript_with_slides.md'
    };
    fetch(`/content/${id}/${artifactMap[activeTab]}`)
      .then(res => res.text())
      .then(setContent);
  }, [id, activeTab]);
  
  return (
    <div>
      <TabBar tabs={['notes', 'summary', 'qa_cards', 'transcript']} 
              active={activeTab} onChange={setActiveTab} />
      
      {activeTab === 'qa_cards' ? (
        <FlashcardViewer content={content} />
      ) : (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      )}
    </div>
  );
}
```

---

## 6. Data Flow & File Formats

### 6.1 Download Data Flow

```
1. User clicks "Download" in extension popup
   ↓
2. popup.js → service-worker.js: {action: "startDownload", lecture: {...}}
   ↓
3. service-worker.js → Backend: POST /api/download
   Request: {
     title: "DevOps Introduction",
     url: "https://scaler.com/class/490070/session",
     streamInfo: {
       baseUrl: "https://media.scaler.com/.../stream_0/",
       keyPairId: "K4IMAQNEJMDV1",
       policy: "base64...",
       signature: "cloudfront-sig...",
       detectedChunk: 450
     },
     startTime: 0,
     endTime: null
   }
   ↓
4. server.py: Creates background task, returns {downloadId: "uuid"}
   ↓
5. run_download(): 
   - Creates output/videos/{title}/
   - Downloads chunks 0 to 550 (detectedChunk + 100)
   - Merges to full_video.mp4
   ↓
6. service-worker.js polls GET /api/status/{downloadId}
   Response: {status: "downloading", progress: 45.5, message: "chunk 200/450"}
```

### 6.2 Processing Data Flow

```
1. Dashboard: User clicks "Process" on recording
   ↓
2. HomePage.jsx → Backend: POST /api/process
   Request: {
     title: "DevOps Introduction",
     videoPath: "/path/to/output/videos/DevOps_Introduction/full_video.mp4",
     whisperModel: "medium",
     ollamaModel: "gpt-oss:20b"
   }
   ↓
3. server.py: Adds to JOB_QUEUE, returns {processId, position}
   ↓
4. process_worker(): Picks job from queue
   ↓
5. pipeline.process():
   a. Create folder: output/2026-01-14_DevOps_Introduction/
   b. FFmpeg: Extract audio.wav
   c. Whisper: Transcribe → transcript.{md,json,txt}
   d. FFmpeg: Extract frames → slides/*.png
   e. EasyOCR: Extract text from slides
   f. Ollama (optional): Vision analysis
   g. Ollama: Generate notes → lecture_notes.md, summary.md, qa_cards.md
   h. Create transcript_with_slides.md (interleaved)
   i. Create viewer.html (interactive)
```

### 6.3 Output File Formats

**transcript.json:**
```json
{
  "text": "Full transcript text...",
  "segments": [
    {"start": 0.0, "end": 5.2, "text": "Hello everyone..."},
    {"start": 5.2, "end": 10.1, "text": "Today we'll discuss..."}
  ]
}
```

**slides_metadata.json:**
```json
{
  "duration": 3600.0,
  "frame_count": 45,
  "frames": [
    {
      "path": "slides/frame_00_05_30.png",
      "timestamp": 330.0,
      "timestamp_display": "00:05:30"
    }
  ]
}
```

**metadata.json:**
```json
{
  "title": "DevOps Introduction",
  "date": "2026-01-14",
  "duration": 3600,
  "whisper_model": "medium",
  "ollama_model": "gpt-oss:20b",
  "artifacts": ["lecture_notes.md", "summary.md", "qa_cards.md", "transcript.md"],
  "slide_count": 45
}
```

---

## 7. Key Implementation Patterns

### 7.1 Progress Callbacks

All long-running operations use a consistent callback pattern:
```python
def set_progress_callback(self, callback: Callable[[int, int, str], None]):
    self.progress_callback = callback

def _update_progress(self, current: int, total: int, message: str = ""):
    if self.progress_callback:
        self.progress_callback(current, total, message)
```

### 7.2 Lazy Loading

Heavy resources (ML models) are loaded only when first needed:
```python
@property
def transcriber(self):
    if self._transcriber is None:
        self._transcriber = WhisperTranscriber(model_name=self.whisper_model)
    return self._transcriber
```

### 7.3 Error Handling

```python
try:
    result = await run_processing(...)
except Exception as e:
    processes[pid].status = "error"
    processes[pid].error = str(e)
    traceback.print_exc()
```

### 7.4 Sleep Prevention (macOS)

```python
def prevent_sleep():
    subprocess.Popen(['caffeinate', '-i', '-w', str(os.getpid())])
```

---

## 8. Running the System

### 8.1 Start Backend
```bash
cd backend
source venv/bin/activate
python -m uvicorn server:app --reload  # Port 8000
```

### 8.2 Start Dashboard
```bash
cd dashboard
npm run dev  # Port 5173
```

### 8.3 Start Ollama
```bash
ollama serve  # Port 11434
```

### 8.4 Load Extension
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → select `extension/` folder

---

*Document Version: 1.0 | Generated: 2026-01-14*
