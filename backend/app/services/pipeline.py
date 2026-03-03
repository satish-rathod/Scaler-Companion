import os
import shutil
import ffmpeg
import traceback
from pathlib import Path
from typing import Dict, Any, Callable, Optional
from datetime import datetime
from app.services.whisper_service import WhisperService
from app.services.vision_service import VisionService
from app.services.ollama_service import OllamaService
from app.core.config import settings

def log_debug(message: str):
    """Print debug message with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    print(f"[{timestamp}] 🔍 PIPELINE: {message}", flush=True)

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

        log_debug(f"========== STARTING PROCESSING ==========")
        log_debug(f"Title: {title}")
        log_debug(f"Output dir: {output_dir}")
        log_debug(f"Video path: {video_path}")
        log_debug(f"Skip flags - transcription:{skip_transcription}, frames:{skip_frames}, notes:{skip_notes}, slides:{skip_slide_analysis}")
        print(f"Starting processing for '{title}' in {output_dir}", flush=True)
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
            log_debug("=== STAGE: TRANSCRIPTION ===")
            self._update_progress("transcription", 10, 100, "Extracting audio...")
            audio_path = output_dir / "audio.wav"

            # Extract Audio
            try:
                if not audio_path.exists():
                    log_debug(f"Extracting audio from video to {audio_path}")
                    (
                        ffmpeg
                        .input(video_path)
                        .output(str(audio_path), acodec='pcm_s16le', ac=1, ar='16k')
                        .overwrite_output()
                        .run(quiet=True)
                    )
                    log_debug("Audio extraction complete")
                else:
                    log_debug(f"Audio file already exists: {audio_path}")

                log_debug("Starting Whisper transcription...")
                self._update_progress("transcription", 30, 100, "Transcribing audio (Whisper)...")
                transcript_result = self.whisper_service.transcribe(str(audio_path))
                transcript_text = transcript_result['text']
                log_debug(f"Transcription complete, length: {len(transcript_text)} chars")

                # Save Transcript
                with open(output_dir / "transcript.txt", "w") as f:
                    f.write(transcript_text)

                # Save enhanced transcript (segments) could be done here

            except Exception as e:
                log_debug(f"❌ TRANSCRIPTION FAILED: {e}")
                log_debug(f"Traceback: {traceback.format_exc()}")
                print(f"Transcription failed: {e}", flush=True)
                raise e
        else:
            # Try to load existing transcript
            log_debug("Transcription skipped, loading existing transcript if available")
            if (output_dir / "transcript.txt").exists():
                transcript_text = (output_dir / "transcript.txt").read_text()
                log_debug(f"Loaded existing transcript, length: {len(transcript_text)} chars")

        # 3. Vision / Slides
        if not skip_frames:
            log_debug("=== STAGE: FRAMES ===")
            self._update_progress("frames", 50, 100, "Extracting frames...")
            frames_dir = output_dir / "frames"

            log_debug(f"Starting frame extraction to {frames_dir}")
            try:
                frames = self.vision_service.extract_frames(video_path, str(frames_dir))
                log_debug(f"Frame extraction complete, got {len(frames)} frames")
            except Exception as e:
                log_debug(f"❌ FRAME EXTRACTION FAILED: {e}")
                log_debug(f"Traceback: {traceback.format_exc()}")
                raise e

            if not skip_slide_analysis:
                log_debug("Starting slide deduplication")
                self._update_progress("frames", 60, 100, "Analyzing slides...")
                try:
                    unique_slides = self.vision_service.deduplicate_slides(str(frames_dir))
                    log_debug(f"Deduplication complete, {len(unique_slides)} unique slides")
                except Exception as e:
                    log_debug(f"❌ SLIDE DEDUPLICATION FAILED: {e}")
                    log_debug(f"Traceback: {traceback.format_exc()}")
                    raise e

                log_debug("Starting OCR on slides")
                self._update_progress("frames", 70, 100, "OCRing slides...")
                try:
                    ocr_results = self.vision_service.ocr_slides(unique_slides)
                    log_debug(f"OCR complete for {len(ocr_results)} slides")
                except Exception as e:
                    log_debug(f"❌ OCR FAILED: {e}")
                    log_debug(f"Traceback: {traceback.format_exc()}")
                    raise e

                # Build context
                slides_context = "\n".join([f"[Slide {k}]: {v}" for k,v in ocr_results.items()])
                log_debug(f"Slides context built, length: {len(slides_context)} chars")

                # Cleanup raw frames to save space? V1 keeps them in 'frames' vs 'slides'
                # V1 keeps 'slides' (unique) and maybe deletes raw 'frames'.
                # Let's clean up raw frames
                if frames_dir.exists():
                    log_debug(f"Cleaning up raw frames directory: {frames_dir}")
                    shutil.rmtree(frames_dir)

        # 4. Notes Generation
        if not skip_notes and transcript_text:
            log_debug("=== STAGE: NOTES ===")
            self._update_progress("notes", 80, 100, "Generating notes (LLM)...")

            log_debug(f"Starting LLM note generation (transcript: {len(transcript_text)} chars, slides: {len(slides_context)} chars)")
            try:
                notes_data = self.ollama_service.generate_notes(transcript_text, slides_context)
                log_debug(f"LLM generation complete")
            except Exception as e:
                log_debug(f"❌ LLM NOTE GENERATION FAILED: {e}")
                log_debug(f"Traceback: {traceback.format_exc()}")
                raise e

            log_debug("Writing output files...")
            with open(output_dir / "lecture_notes.md", "w") as f:
                f.write(notes_data['notes'])
            log_debug("  -> lecture_notes.md written")

            with open(output_dir / "summary.md", "w") as f:
                f.write(notes_data['summary'])
            log_debug("  -> summary.md written")

            with open(output_dir / "qa_cards.md", "w") as f:
                f.write(notes_data['qa'])
            log_debug("  -> qa_cards.md written")

            # Save announcements if generated
            if 'announcements' in notes_data:
                with open(output_dir / "announcements.md", "w") as f:
                    f.write(notes_data['announcements'])

        log_debug("=== STAGE: COMPLETE ===")
        self._update_progress("complete", 100, 100, "Processing complete!")
        log_debug("========== PROCESSING FINISHED ==========")

        return {
            "output_dir": str(output_dir),
            "transcript_len": len(transcript_text),
            "slides_count": slides_context.count("Slide") if slides_context else 0
        }
