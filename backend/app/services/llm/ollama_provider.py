import ollama
from typing import List, Optional
from app.services.llm.base import LLMProvider
from app.services.llm.registry import register_provider


class OllamaProvider(LLMProvider):
    """LLM provider backed by a local Ollama server."""

    provider_name = "ollama"

    def __init__(self, base_url: str = "http://localhost:11434", default_model: str = "gpt-oss:20b"):
        self.base_url = base_url
        self.default_model = default_model

    def generate_text(self, prompt: str, model: Optional[str] = None) -> str:
        model = model or self.default_model
        resp = ollama.generate(model=model, prompt=prompt)
        return resp["response"]

    def list_models(self) -> List[str]:
        try:
            resp = ollama.list()
            return [m["name"] for m in resp.get("models", [])]
        except Exception as e:
            print(f"[OllamaProvider] Error listing models: {e}")
            return []

    def validate_connection(self) -> bool:
        try:
            ollama.list()
            return True
        except Exception:
            return False


# Auto-register when imported
register_provider("ollama", OllamaProvider)
