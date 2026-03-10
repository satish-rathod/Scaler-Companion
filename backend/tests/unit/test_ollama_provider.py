import pytest
from unittest.mock import patch, MagicMock
from app.services.llm.ollama_provider import OllamaProvider
from app.services.llm.base import LLMProvider


def test_ollama_provider_is_llm_provider():
    provider = OllamaProvider()
    assert isinstance(provider, LLMProvider)
    assert provider.provider_name == "ollama"


@patch("app.services.llm.ollama_provider.ollama")
def test_generate_text(mock_ollama):
    mock_ollama.generate.return_value = {"response": "Hello world"}
    provider = OllamaProvider()
    result = provider.generate_text("Say hello", model="test-model")
    assert result == "Hello world"
    mock_ollama.generate.assert_called_once_with(model="test-model", prompt="Say hello")


@patch("app.services.llm.ollama_provider.ollama")
def test_generate_text_uses_default_model(mock_ollama):
    mock_ollama.generate.return_value = {"response": "Hi"}
    provider = OllamaProvider()
    provider.default_model = "my-model"
    result = provider.generate_text("prompt")
    mock_ollama.generate.assert_called_once_with(model="my-model", prompt="prompt")


@patch("app.services.llm.ollama_provider.ollama")
def test_list_models(mock_ollama):
    mock_ollama.list.return_value = {"models": [{"name": "m1"}, {"name": "m2"}]}
    provider = OllamaProvider()
    assert provider.list_models() == ["m1", "m2"]


@patch("app.services.llm.ollama_provider.ollama")
def test_list_models_error_returns_empty(mock_ollama):
    mock_ollama.list.side_effect = Exception("connection refused")
    provider = OllamaProvider()
    assert provider.list_models() == []


@patch("app.services.llm.ollama_provider.ollama")
def test_validate_connection_success(mock_ollama):
    mock_ollama.list.return_value = {"models": []}
    provider = OllamaProvider()
    assert provider.validate_connection() is True


@patch("app.services.llm.ollama_provider.ollama")
def test_validate_connection_failure(mock_ollama):
    mock_ollama.list.side_effect = Exception("connection refused")
    provider = OllamaProvider()
    assert provider.validate_connection() is False
