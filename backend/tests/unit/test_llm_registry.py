import pytest
from app.services.llm.base import LLMProvider
from app.services.llm.registry import get_provider, PROVIDERS


def test_llm_provider_is_abstract():
    """Cannot instantiate LLMProvider directly."""
    with pytest.raises(TypeError):
        LLMProvider()


def test_registry_has_ollama():
    assert "ollama" in PROVIDERS


def test_registry_has_openai():
    assert "openai" in PROVIDERS


def test_get_provider_returns_instance():
    provider = get_provider("ollama")
    assert isinstance(provider, LLMProvider)
    assert provider.provider_name == "ollama"


def test_get_provider_unknown_raises():
    with pytest.raises(KeyError):
        get_provider("unknown_provider")
