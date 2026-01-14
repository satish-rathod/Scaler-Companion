# Scaler Companion V2

**Scaler Companion** is a comprehensive local toolkit for students to download, transcribe, summarize, and manage lecture videos from Scaler Academy (or compatible HLS sources). It uses local AI models to generate high-quality study materials without relying on cloud services.

## 🚀 Features

- **📥 One-Click Download**: Capture HLS streams directly from the browser using the Chrome Extension.
- **🤖 Local AI Processing**:
  - **Transcription**: Uses OpenAI Whisper (runs locally on CPU/GPU).
  - **Smart Notes**: Generates structured notes, summaries, and Q&A flashcards using Ollama (LLM).
  - **Slide Extraction**: Extracts and OCRs key slides from the video.
- **🖥️ Dashboard**: A clean, Notion-style interface to manage your library.
- **🔍 Full-Text Search**: Instantly find concepts across all your transcripts and notes.
- **🌗 Dark Mode**: Easy on the eyes for late-night study sessions.
- **📦 Export**: Download your study materials as a ZIP archive for Obsidian or Notion.

## 🛠️ Prerequisites

- **OS**: macOS (recommended for `caffeinate` support), Linux, or Windows (WSL2).
- **Python**: 3.10 or higher.
- **Node.js**: 18 or higher.
- **FFmpeg**: Required for video processing (`brew install ffmpeg` or `sudo apt install ffmpeg`).
- **Ollama**: Required for note generation. [Install Ollama](https://ollama.ai) and pull a model (e.g., `ollama pull gpt-oss:20b` or `llama3`).

## ⚡ Quick Start

### 1. Automated Setup
The easiest way to get started is using the setup script:

```bash
./setup.sh
```

This will create a Python virtual environment, install backend dependencies, and install frontend packages.

### 2. Running the Application
Start both the Backend and Dashboard with a single command:

```bash
./start.sh
```

- **Dashboard**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:8000](http://localhost:8000)

### 3. Installing the Extension
1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer Mode** (top right).
3. Click **Load unpacked**.
4. Select the `extension/` folder in this repository.

## 📂 Project Structure

```
.
├── backend/                # FastAPI Backend
│   ├── app/
│   │   ├── api/            # API Endpoints
│   │   ├── core/           # Config & Worker Logic
│   │   ├── services/       # AI Services (Whisper, Ollama, Vision)
│   │   └── utils/
│   └── output/             # Generated Data (Videos & Markdown)
├── dashboard/              # React Frontend (Vite + Tailwind)
│   ├── src/
│   │   ├── components/     # UI Components
│   │   ├── pages/          # Route Pages
│   │   └── services/       # API Client
├── extension/              # Chrome Extension (Manifest V3)
└── docs/                   # Documentation
```

## 📖 Documentation

- [User Guide](docs/USER_GUIDE.md) - Detailed usage instructions.
- [API Documentation](docs/API_Documentation.md) - Endpoints reference.
- [Architecture Design](docs/HLD.md) - System design and data flow.

## 🤝 Contributing

This project is a local tool. Feel free to fork and modify for your own needs.

## 📄 License

MIT
