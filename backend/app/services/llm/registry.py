from typing import Dict, Type
from app.services.llm.base import LLMProvider

PROVIDERS: Dict[str, Type[LLMProvider]] = {}

def register_provider(name: str, cls: Type[LLMProvider]):
    """Register a provider class by name."""
    PROVIDERS[name] = cls

def get_provider(name: str) -> LLMProvider:
    """Instantiate and return a provider by name. Raises KeyError if unknown."""
    cls = PROVIDERS[name]
    return cls()
