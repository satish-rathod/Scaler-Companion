import pytest
from unittest.mock import patch, MagicMock
from app.services.llm_service import LLMService


@pytest.fixture
def mock_provider():
    provider = MagicMock()
    provider.provider_name = "mock"
    provider.generate_text.return_value = "Mock LLM response"
    return provider


@pytest.fixture
def service(mock_provider):
    with patch("app.services.llm_service.config_store") as mock_store:
        mock_store.get.side_effect = lambda k: {
            "LLM_PROVIDER": "ollama",
            "LLM_MODEL": "test-model",
            "OLLAMA_BASE_URL": "http://localhost:11434",
            "OPENAI_API_KEY": "",
        }.get(k)
        svc = LLMService()
    svc.provider = mock_provider
    return svc


def test_chunk_text_short(service):
    chunks = service._chunk_text("short text")
    assert len(chunks) == 1
    assert chunks[0] == "short text"


def test_chunk_text_long(service):
    long_text = "word " * 5000
    chunks = service._chunk_text(long_text)
    assert len(chunks) > 1
    for chunk in chunks:
        assert len(chunk) <= service.chunk_size + 500


def test_generate_notes_returns_four_keys(service, mock_provider):
    result = service.generate_notes("This is a test transcript.")
    assert "notes" in result
    assert "summary" in result
    assert "qa" in result
    assert "announcements" in result
    assert mock_provider.generate_text.call_count == 4


def test_generate_notes_with_model_override(service, mock_provider):
    service.generate_notes("transcript", model="custom-model")
    for call in mock_provider.generate_text.call_args_list:
        assert call[1].get("model") == "custom-model"


def test_generate_notes_with_slides_context(service, mock_provider):
    service.generate_notes("transcript", slides_context="Slide 1: Intro")
    prompts = [call[0][0] for call in mock_provider.generate_text.call_args_list]
    assert any("Slide" in p for p in prompts)


def test_list_models_delegates(service, mock_provider):
    mock_provider.list_models.return_value = ["m1", "m2"]
    result = service.list_models()
    assert result == ["m1", "m2"]


def test_validate_connection_delegates(service, mock_provider):
    mock_provider.validate_connection.return_value = True
    assert service.validate_connection() is True
