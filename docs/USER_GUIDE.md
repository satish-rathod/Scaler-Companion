# User Guide

This guide will help you use Scaler Companion V2 to download and process lecture videos effectively.

## 1. Installation

Before you begin, make sure you have followed the setup steps in the [README](../README.md).
You should have the Backend and Dashboard running (`./start.sh`) and the Chrome Extension installed.

## 2. Downloading a Lecture

1.  **Navigate to the Lecture**: Open Scaler Academy in Chrome and go to the lecture recording you want to download.
2.  **Play the Video**: Start playing the video. The extension automatically detects the HLS stream.
3.  **Check the Extension**: You should see a green badge count "1" on the Scaler Companion extension icon.
4.  **Click Download**:
    - Open the extension popup.
    - Verify it says "Stream detected".
    - Click **"Download to Library"**.
5.  **Monitor Progress**: Open the **Dashboard** ([http://localhost:5173](http://localhost:5173)). You will see a new card in the Library with a "Downloading" status and progress bar.

## 3. Processing with AI

Once a lecture is downloaded, you can process it to generate notes.

1.  **Select the Lecture**: In the Dashboard Library, find the card with the **⬇️ Downloaded** status.
2.  **Click to Process**: Click on the card (or the "Process" button if available).
3.  **Configure Options**:
    - **Transcription Model**: Choose `medium` for a good balance of speed and accuracy. Use `large` if you have a powerful GPU.
    - **Notes Model**: Select your installed Ollama model (e.g., `gpt-oss:20b`).
    - **Options**: You can skip steps if you re-run processing (e.g., "Skip Slide Extraction").
4.  **Start**: Click "Start Processing".
5.  **Queue**: You will be redirected to the **Queue** page (or you can navigate there manually) to watch the pipeline progress through stages: *Transcription → Frame Extraction → OCR → Notes Generation*.

## 4. Using the Viewer

When processing is complete, the card status changes to **📄 Processed**.

1.  **Open Viewer**: Click the card to open the detail view.
2.  **Video Player**: Watch the lecture on the left.
3.  **Smart Content**: Use the tabs on the right:
    - **Lecture Notes**: Read the structured summary and key points.
    - **Summary**: A quick executive summary.
    - **Q&A Cards**: Flashcards for review.
    - **Transcript**: Full text search.

## 5. Exporting

To take your notes elsewhere:

1.  Open the **Viewer** for a lecture.
2.  Click the **Export** button in the top right corner.
3.  A ZIP file will be downloaded containing all markdown files and images.
4.  **Import**: Extract this folder into your Obsidian vault or drag the markdown files into Notion.

## 6. Search

1.  Click **Search** in the sidebar.
2.  Type any keyword (e.g., "polymorphism").
3.  Click on a result to jump to that lecture.
