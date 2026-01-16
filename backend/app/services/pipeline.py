import os
import shutil
import ffmpeg
from pathlib import Path
from typing import Dict, Any, Callable, Optional
from app.services.whisper_service import WhisperService
from app.services.vision_service import VisionService
from app.services.ollama_service import OllamaService
from app.core.config import settings

class ProcessingPipeline:
    def __init__(self, output_base: str = str(settings.OUTPUT_DIR),
                 whisper_model: str = settings.WHISPER_MODEL,
                 ollama_model: str = settings.OLLAMA_MODEL):
        self.output_base = Path(output_base)
        self.whisper_service = WhisperService()
        self.vision_service = VisionService()
        self.ollama_service = OllamaService()
        self.progress_callback: Optional[Callable[[str, int, int, str], None]] = None

    def set_progress_callback(self, callback: Callable[[str, int, int, str], None]):
        self.progress_callback = callback

    def _update_progress(self, stage: str, current: int, total: int, message: str):
        if self.progress_callback:
            self.progress_callback(stage, current, total, message)

    def process(self, video_path: str, title: str,
                skip_transcription: bool = False,
                skip_frames: bool = False,
                skip_notes: bool = False,
                skip_slide_analysis: bool = False) -> Dict[str, Any]:

        # 1. Setup Output Directory
        safe_title = "".join(c for c in title if c.isalnum() or c in " -_")[:50].strip()
        # Use timestamp if needed, but for now reuse title based folder if exists or create new
        # V1 logic used YYYY-MM-DD_Title. Let's stick to safe_title for simplicity in V2 MVP
        # unless we want strictly unique folders.
        from datetime import datetime
        date_str = datetime.now().strftime("%Y-%m-%d")
        folder_name = f"{date_str}_{safe_title}"

        output_dir = self.output_base / folder_name
        output_dir.mkdir(parents=True, exist_ok=True)

        print(f"Starting processing for '{title}' in {output_dir}")
        self._update_progress("init", 0, 100, "Initializing...")

        # Copy video to output dir if not already there (optional, but good for self-contained output)
        dest_video = output_dir / "video.mp4"
        if not dest_video.exists() and Path(video_path) != dest_video:
             # shutil.copy(video_path, dest_video) # Copy might be slow, symlink or skip?
             # For now, let's just use the original video path for processing
             pass

        transcript_text = ""
        slides_context = ""

        # 2. Transcription
        if not skip_transcription:
            self._update_progress("transcription", 10, 100, "Extracting audio...")
            audio_path = output_dir / "audio.wav"

            # Extract Audio
            try:
                if not audio_path.exists():
                    (
                        ffmpeg
                        .input(video_path)
                        .output(str(audio_path), acodec='pcm_s16le', ac=1, ar='16k')
                        .overwrite_output()
                        .run(quiet=True)
                    )

                self._update_progress("transcription", 30, 100, "Transcribing audio (Whisper)...")
                transcript_result = self.whisper_service.transcribe(str(audio_path))
                transcript_text = transcript_result['text']

                # Save Transcript
                with open(output_dir / "transcript.txt", "w") as f:
                    f.write(transcript_text)

                # Save enhanced transcript (segments) could be done here

            except Exception as e:
                print(f"Transcription failed: {e}")
                raise e
        else:
            # Try to load existing transcript
            if (output_dir / "transcript.txt").exists():
                transcript_text = (output_dir / "transcript.txt").read_text()

        # 3. Vision / Slides
        if not skip_frames:
            self._update_progress("frames", 50, 100, "Extracting frames...")
            frames_dir = output_dir / "frames"

            frames = self.vision_service.extract_frames(video_path, str(frames_dir))

            if not skip_slide_analysis:
                self._update_progress("frames", 60, 100, "Analyzing slides...")
                unique_slides = self.vision_service.deduplicate_slides(str(frames_dir))

                self._update_progress("frames", 70, 100, "OCRing slides...")
                ocr_results = self.vision_service.ocr_slides(unique_slides)

                # Build context
                slides_context = "\n".join([f"[Slide {k}]: {v}" for k,v in ocr_results.items()])

                # Cleanup raw frames to save space? V1 keeps them in 'frames' vs 'slides'
                # V1 keeps 'slides' (unique) and maybe deletes raw 'frames'.
                # Let's clean up raw frames
                if frames_dir.exists():
                    shutil.rmtree(frames_dir)

        # 4. Notes Generation
        if not skip_notes and transcript_text:
            self._update_progress("notes", 80, 100, "Generating notes (LLM)...")

            notes_data = self.ollama_service.generate_notes(transcript_text, slides_context)

            with open(output_dir / "lecture_notes.md", "w") as f:
                f.write(notes_data['notes'])

            with open(output_dir / "summary.md", "w") as f:
                f.write(notes_data['summary'])

            with open(output_dir / "qa_cards.md", "w") as f:
                f.write(notes_data['qa'])

            # Save announcements if generated
            if 'announcements' in notes_data:
                with open(output_dir / "announcements.md", "w") as f:
                    f.write(notes_data['announcements'])

        self._update_progress("complete", 100, 100, "Processing complete!")

        return {
            "output_dir": str(output_dir),
            "transcript_len": len(transcript_text),
            "slides_count": slides_context.count("Slide") if slides_context else 0
        }
