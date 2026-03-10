import time
from openai import OpenAI, RateLimitError
from typing import List, Optional
from app.services.llm.base import LLMProvider
from app.services.llm.registry import register_provider

MAX_RETRIES = 3
RETRY_BASE_DELAY = 2


class OpenAIProvider(LLMProvider):
    """LLM provider backed by the OpenAI API."""

    provider_name = "openai"

    def __init__(self, api_key: str = "", default_model: str = "gpt-4o"):
        if not api_key:
            raise ValueError("API key is required for OpenAI provider")
        self.default_model = default_model
        self._client = OpenAI(api_key=api_key)

    def generate_text(self, prompt: str, model: Optional[str] = None) -> str:
        """Generate text with exponential backoff retry on rate limits."""
        model = model or self.default_model
        for attempt in range(MAX_RETRIES):
            try:
                response = self._client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.3,
                )
                return response.choices[0].message.content
            except RateLimitError:
                if attempt == MAX_RETRIES - 1:
                    raise
                delay = RETRY_BASE_DELAY * (2 ** attempt)
                print(f"[OpenAIProvider] Rate limited, retrying in {delay}s (attempt {attempt + 1}/{MAX_RETRIES})")
                time.sleep(delay)

    def list_models(self) -> List[str]:
        try:
            response = self._client.models.list()
            return sorted([m.id for m in response.data if m.id.startswith("gpt-")])
        except Exception as e:
            print(f"[OpenAIProvider] Error listing models: {e}")
            return []

    def validate_connection(self) -> bool:
        try:
            self._client.models.list()
            return True
        except Exception:
            return False


register_provider("openai", OpenAIProvider)
