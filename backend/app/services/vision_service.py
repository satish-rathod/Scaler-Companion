import os
import shutil
import ffmpeg
import imagehash
import easyocr
from PIL import Image
from pathlib import Path
from typing import List, Dict
from concurrent.futures import ThreadPoolExecutor

class VisionService:
    def __init__(self):
        self.reader = None # Initialize lazily to save RAM on startup

    def get_reader(self):
        if self.reader is None:
            # Initialize for English
            self.reader = easyocr.Reader(['en'])
        return self.reader

    def extract_frames(self, video_path: str, output_dir: str, interval: int = 10) -> List[str]:
        """
        Extract frames from video at fixed intervals using ffmpeg.
        Returns list of paths to extracted frames.
        """
        out_path = Path(output_dir)
        out_path.mkdir(parents=True, exist_ok=True)

        # Pattern for output files
        output_pattern = str(out_path / "frame_%04d.png")

        try:
            (
                ffmpeg
                .input(video_path)
                .filter('fps', fps=1/interval)
                .output(output_pattern, vsync='vfr')
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
        except ffmpeg.Error as e:
            print(f"Frame extraction error: {e.stderr.decode()}")
            raise e

        # Return sorted list of generated files
        return sorted([str(p) for p in out_path.glob("frame_*.png")])

    def deduplicate_slides(self, frames_dir: str, threshold: int = 5) -> List[str]:
        """
        Remove duplicate slides using perceptual hashing.
        Returns list of paths to unique slides.
        """
        frames_path = Path(frames_dir)
        frames = sorted(list(frames_path.glob("frame_*.png")))

        if not frames:
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

        return unique_frames

    def ocr_slides(self, slides: List[str]) -> Dict[str, str]:
        """
        Extract text from slides using EasyOCR.
        Returns dict mapping 'slide_filename' -> 'extracted_text'
        """
        reader = self.get_reader()
        results = {}

        for slide_path in slides:
            try:
                # detail=0 returns just the list of text strings
                text_list = reader.readtext(slide_path, detail=0)
                full_text = " ".join(text_list)
                results[os.path.basename(slide_path)] = full_text
            except Exception as e:
                print(f"OCR Error on {slide_path}: {e}")
                results[os.path.basename(slide_path)] = ""

        return results
