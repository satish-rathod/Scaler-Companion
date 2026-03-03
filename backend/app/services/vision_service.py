import os
import shutil
import ffmpeg
import imagehash
import easyocr
from PIL import Image
from pathlib import Path
from typing import List, Dict
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

def log_vision(message: str):
    """Print debug message with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    print(f"[{timestamp}] 👁️ VISION: {message}", flush=True)

class VisionService:
    def __init__(self):
        self.reader = None # Initialize lazily to save RAM on startup

    def get_reader(self):
        if self.reader is None:
            # Initialize for English. Explicitly disable GPU to avoid hangs on Mac/CPU environments
            # when memory is tight.
            log_vision("Initializing EasyOCR Reader (gpu=False)...")
            self.reader = easyocr.Reader(['en'], gpu=False)
            log_vision("EasyOCR Reader initialized")
        return self.reader

    def extract_frames(self, video_path: str, output_dir: str, interval: int = 10) -> List[str]:
        """
        Extract frames from video at fixed intervals using ffmpeg.
        Returns list of paths to extracted frames.
        """
        log_vision(f"extract_frames called: video={video_path}, output={output_dir}, interval={interval}")
        out_path = Path(output_dir)
        out_path.mkdir(parents=True, exist_ok=True)

        # Pattern for output files
        output_pattern = str(out_path / "frame_%04d.png")
        log_vision(f"Output pattern: {output_pattern}")

        try:
            log_vision("Starting ffmpeg frame extraction...")
            (
                ffmpeg
                .input(video_path)
                .filter('fps', fps=1/interval)
                .output(output_pattern, vsync='vfr')
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
            log_vision("ffmpeg frame extraction complete")
        except ffmpeg.Error as e:
            log_vision(f"❌ ffmpeg error: {e.stderr.decode() if e.stderr else 'no stderr'}")
            print(f"Frame extraction error: {e.stderr.decode()}", flush=True)
            raise e

        # Return sorted list of generated files
        frames = sorted([str(p) for p in out_path.glob("frame_*.png")])
        log_vision(f"Found {len(frames)} extracted frames")
        return frames

    def deduplicate_slides(self, frames_dir: str, threshold: int = 5) -> List[str]:
        """
        Remove duplicate slides using perceptual hashing.
        Returns list of paths to unique slides.
        """
        log_vision(f"deduplicate_slides called: dir={frames_dir}, threshold={threshold}")
        frames_path = Path(frames_dir)
        frames = sorted(list(frames_path.glob("frame_*.png")))
        log_vision(f"Found {len(frames)} frames to process")

        if not frames:
            log_vision("No frames found, returning empty list")
            return []

        unique_frames = []
        last_hash = None

        # Create a 'slides' subdirectory for the unique ones
        slides_dir = frames_path.parent / "slides"
        slides_dir.mkdir(exist_ok=True)

        for frame_file in frames:
            try:
                img = Image.open(frame_file)
                curr_hash = imagehash.phash(img)

                is_duplicate = False
                if last_hash is not None:
                    if curr_hash - last_hash < threshold:
                        is_duplicate = True

                if not is_duplicate:
                    # It's a new slide
                    new_path = slides_dir / frame_file.name
                    shutil.copy(frame_file, new_path)
                    unique_frames.append(str(new_path))
                    last_hash = curr_hash

            except Exception as e:
                print(f"Error processing frame {frame_file}: {e}")

        log_vision(f"Deduplication complete: {len(unique_frames)} unique slides from {len(frames)} frames")
        return unique_frames

    def ocr_slides(self, slides: List[str]) -> Dict[str, str]:
        """
        Extract text from slides using EasyOCR.
        Returns dict mapping 'slide_filename' -> 'extracted_text'
        """
        log_vision(f"ocr_slides called with {len(slides)} slides")
        log_vision("Getting/initializing EasyOCR reader...")
        reader = self.get_reader()
        log_vision("EasyOCR reader ready")
        results = {}

        for i, slide_path in enumerate(slides):
            log_vision(f"OCR processing slide {i+1}/{len(slides)}: {os.path.basename(slide_path)}")
            try:
                # detail=0 returns just the list of text strings
                text_list = reader.readtext(slide_path, detail=0)
                full_text = " ".join(text_list)
                results[os.path.basename(slide_path)] = full_text
                log_vision(f"  -> Got {len(full_text)} chars")
            except Exception as e:
                log_vision(f"❌ OCR Error on {slide_path}: {e}")
                print(f"OCR Error on {slide_path}: {e}", flush=True)
                results[os.path.basename(slide_path)] = ""

        log_vision(f"OCR complete for all {len(slides)} slides")
        return results
