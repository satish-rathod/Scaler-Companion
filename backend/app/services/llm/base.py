from abc import ABC, abstractmethod
from typing import List, Optional


class LLMProvider(ABC):
    """Abstract base class for LLM providers.

    Methods are synchronous — the pipeline runs in a ThreadPoolExecutor,
    so async is unnecessary and would complicate the worker thread.
    """

    provider_name: str = ""

    @abstractmethod
    def generate_text(self, prompt: str, model: Optional[str] = None) -> str:
        """Generate text from a prompt. Returns the response string."""
        ...

    @abstractmethod
    def list_models(self) -> List[str]:
        """Return a list of available model names."""
        ...

    @abstractmethod
    def validate_connection(self) -> bool:
        """Check if the provider is reachable and configured. Returns True/False."""
        ...

    def format_prompt(self, template: str, **kwargs) -> str:
        """Optional provider-specific prompt formatting. Default: str.format()."""
        return template.format(**kwargs)
