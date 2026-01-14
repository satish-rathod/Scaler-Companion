# Scaler Companion V2 - Product Requirements Document (PRD)

## 1. Executive Summary

**Product Name:** Scaler Companion  
**Version:** 2.0 (Planning)  
**Current Version:** 1.0.0  

Scaler Companion is an AI-powered lecture processing system that downloads Scaler Academy lectures and generates comprehensive study materials using local AI models (Whisper for transcription, Ollama LLMs for notes).

---

## 2. Current System Overview

### 2.1 Components
| Component | Technology | Purpose |
|-----------|------------|---------|
| **Chrome Extension** | Manifest V3, JS | Captures HLS streams from Scaler Academy |
| **Backend API** | FastAPI, Python 3.10+ | Orchestrates downloads and AI processing |
| **Dashboard** | React + Vite + Tailwind | Displays recordings and generated content |
| **AI Pipeline** | Whisper + Ollama | Transcription and notes generation |

### 2.2 Current Feature Set
- ✅ HLS stream capture and download
- ✅ CloudFront signed URL handling
- ✅ Whisper audio transcription (tiny-large models)
- ✅ Frame/slide extraction (scene detection + interval)
- ✅ OCR for slide text extraction (EasyOCR)
- ✅ Vision LLM for slide analysis (optional)
- ✅ LLM-generated: lecture notes, summary, Q&A flashcards, announcements
- ✅ Enhanced transcript with embedded slides
- ✅ Obsidian-compatible output structure
- ✅ Interactive HTML viewer
- ✅ Dashboard for content management
- ✅ Sleep prevention (macOS caffeinate)

---

## 3. User Personas

### 3.1 Primary User: Scaler Academy Student
- **Goals:** Review lectures efficiently, create study materials, prepare for interviews
- **Pain Points:** Long lecture videos, missing class, no good notes
- **Technical Level:** Moderate (can install extensions, run local servers)

### 3.2 Secondary User: Self-Learner
- **Goals:** Repurpose video content into digestible formats
- **Pain Points:** Time constraints, information overload

---

## 4. User Flows

### 4.1 Download Flow
```
[Student on Scaler] → [Play Recording] → [Extension Captures HLS] 
→ [Click Download] → [Select Time Range (optional)] 
→ [Backend Downloads Chunks] → [Merge to MP4] → [Complete]
```

### 4.2 Processing Flow
```
[Dashboard: Select Recording] → [Click Process] → [Configure Options]
→ [Whisper Transcription] → [Frame Extraction] → [Slide Analysis]
→ [LLM Note Generation] → [Artifacts Created] → [View in Dashboard]
```

### 4.3 Content Consumption Flow
```
[Dashboard: Library] → [Select Recording] → [Choose Tab]
→ [Notes | Flashcards | Summary | Transcript] → [Read/Download]
```

---

## 5. Current Technical Architecture

### 5.1 Data Flow
```
Scaler Academy (HLS) 
    ↓ [Extension captures m3u8 + auth tokens]
Backend API (/api/download)
    ↓ [Download .ts chunks, merge with FFmpeg]
MP4 in output/videos/
    ↓ [/api/process triggers pipeline]
Pipeline (Whisper → Frames → OCR → Vision → LLM)
    ↓
output/YYYY-MM-DD_Title/
    ├── video.mp4, audio.wav
    ├── transcript.{md,json,txt}
    ├── transcript_with_slides.md
    ├── lecture_notes.md
    ├── summary.md, qa_cards.md
    ├── slides/, viewer.html
    └── metadata.json
```

### 5.2 Generated Artifacts
| Artifact | Format | Purpose |
|----------|--------|---------|
| `lecture_notes.md` | Markdown | Comprehensive structured notes |
| `summary.md` | Markdown | 4-5 paragraph executive summary |
| `qa_cards.md` | Markdown | 12-15 Q&A flashcards |
| `transcript.md` | Markdown | Timestamped transcript |
| `transcript_with_slides.md` | Markdown | Transcript with embedded slides |
| `slides/` | PNG images | Extracted key frames |
| `viewer.html` | HTML | Interactive lecture viewer |

---

## 6. V2 Improvement Areas

### 6.1 Performance
- [ ] Parallel chunk downloads (currently sequential)
- [ ] GPU acceleration for Whisper (MPS on macOS)
- [ ] Streaming transcription for faster results
- [ ] Background processing queue UI improvements

### 6.2 Quality
- [ ] Better slide deduplication (current perceptual hash sometimes fails)
- [ ] Improved LLM prompts for more accurate notes
- [ ] Code block syntax detection from slides
- [ ] Multi-language transcription support

### 6.3 UX
- [ ] Real-time processing progress in dashboard
- [ ] Dark/light theme toggle
- [ ] Search across all transcripts
- [ ] Export to PDF/Notion/Anki
- [ ] Keyboard shortcuts

### 6.4 Reliability
- [ ] Resume interrupted downloads
- [ ] Automatic retry on network errors
- [ ] Better error messages in extension popup
- [ ] Health monitoring dashboard

### 6.5 New Features (Candidates)
- [ ] Lecture comparison (diff between related lectures)
- [ ] Auto-categorization by topic
- [ ] Spaced repetition integration for flashcards
- [ ] AI chat with transcript context (RAG)
- [ ] Collaborative annotations
- [ ] Mobile-friendly viewer

---

## 7. Success Metrics

| Metric | Current | Target V2 |
|--------|---------|-----------|
| Download success rate | ~90% | 99% |
| Processing time (1hr lecture) | ~25 min | ~15 min |
| Notes accuracy (subjective) | 7/10 | 9/10 |
| User retention | N/A | Track |

---

## 8. Dependencies

### 8.1 System Requirements
- macOS (primary), Linux support planned
- Python 3.10+, Node.js 18+
- FFmpeg for video processing
- 24GB+ RAM (Whisper + LLM)
- Ollama with gpt-oss:20b or similar

### 8.2 External Services
- Scaler Academy (source content)
- CloudFront CDN (video delivery)
- No cloud dependencies (fully local processing)

---

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Scaler changes stream format | High | Monitor, abstract parser |
| Ollama model updates break prompts | Medium | Version-pin prompts |
| Large lectures exhaust disk | Medium | Auto-cleanup old chunks |
| macOS-specific features | Medium | Conditional imports |

---

## 10. Timeline (Suggested)

| Phase | Focus | Duration |
|-------|-------|----------|
| V2.0-alpha | Performance + Reliability | 4 weeks |
| V2.0-beta | UX improvements | 3 weeks |
| V2.0 | Polish + New features | 3 weeks |

---

*Document Version: 1.0 | Last Updated: 2026-01-14*
