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
            # Use GPU if available
            device = "cuda" if torch.cuda.is_available() else "cpu"
            if device == "cpu" and torch.backends.mps.is_available():
                device = "mps"

            self._model = whisper.load_model(model_name, device=device)
            print(f"Whisper model loaded on {device}")
        return self._model

    def transcribe(self, audio_path: str) -> Dict[str, Any]:
        """
        Transcribe audio file using Whisper.
        Returns dict with 'text' and 'segments'.
        """
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        model = self.load_model()

        # Transcribe
        result = model.transcribe(audio_path, verbose=False)
        return result
