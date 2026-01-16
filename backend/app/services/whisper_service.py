import whisper
import torch
import os
from typing import Dict, Any, Optional
from app.core.config import settings

class WhisperService:
    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(WhisperService, cls).__new__(cls)
        return cls._instance

    def load_model(self, model_name: str = settings.WHISPER_MODEL):
        """Load the Whisper model if not already loaded."""
        if self._model is None:
            print(f"Loading Whisper model: {model_name}...")
            # Force CPU - MPS has sparse tensor compatibility issues with Whisper
            device = "cuda" if torch.cuda.is_available() else "cpu"
            
            self._model = whisper.load_model(model_name, device=device)
            print(f"Whisper model loaded on {device}")
        return self._model

    def transcribe(self, audio_path: str, language: str = "en") -> Dict[str, Any]:
        """
        Transcribe audio file using Whisper.
        
        Args:
            audio_path: Path to audio file
            language: Language code (default: 'en' for English)
                      Set to None for auto-detection
        
        Returns dict with 'text' and 'segments'.
        """
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        model = self.load_model()

        print(f"[Whisper] Transcribing with language='{language}'...")
        
        # Transcribe with explicit language to avoid wrong detection
        # word_timestamps=True for better segmentation
        result = model.transcribe(
            audio_path,
            language=language,
            verbose=False,
            task="transcribe",
            # Improve accuracy with these settings
            temperature=0.0,  # More deterministic
            best_of=5,        # Sample multiple times
            beam_size=5,      # Beam search
            condition_on_previous_text=True,  # Use context
        )
        
        print(f"[Whisper] Transcription complete. Detected language: {result.get('language', 'unknown')}")
        return result
