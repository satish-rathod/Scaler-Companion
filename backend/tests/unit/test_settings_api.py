import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def mock_config_store():
    with patch("app.api.v1.endpoints.settings.config_store") as mock:
        mock.get_all.return_value = {
            "LLM_PROVIDER": "ollama",
            "LLM_MODEL": "gpt-oss:20b",
            "OLLAMA_BASE_URL": "http://localhost:11434",
            "OPENAI_API_KEY": "",
        }
        mock.get.side_effect = lambda k: {
            "LLM_PROVIDER": "ollama",
            "LLM_MODEL": "gpt-oss:20b",
            "OLLAMA_BASE_URL": "http://localhost:11434",
            "OPENAI_API_KEY": "",
        }.get(k)
        yield mock


def test_get_settings(client, mock_config_store):
    resp = client.get("/api/v1/settings")
    assert resp.status_code == 200
    data = resp.json()
    assert data["llmProvider"] == "ollama"
    assert data["llmModel"] == "gpt-oss:20b"
    assert data["ollamaBaseUrl"] == "http://localhost:11434"
    assert "openaiApiKey" in data


def test_get_settings_masks_api_key(client, mock_config_store):
    mock_config_store.get_all.return_value["OPENAI_API_KEY"] = "sk-proj-abc123xyz789"
    mock_config_store.get.side_effect = lambda k: mock_config_store.get_all.return_value.get(k)
    resp = client.get("/api/v1/settings")
    data = resp.json()
    assert data["openaiApiKey"] != "sk-proj-abc123xyz789"
    assert "***" in data["openaiApiKey"]


def test_put_settings(client, mock_config_store):
    with patch("app.api.v1.endpoints.settings.OpenAIProvider") as MockProvider:
        instance = MagicMock()
        instance.validate_connection.return_value = True
        MockProvider.return_value = instance

        resp = client.put("/api/v1/settings", json={
            "llmProvider": "openai",
            "llmModel": "gpt-4o",
            "openaiApiKey": "sk-test123",
        })
        assert resp.status_code == 200
        mock_config_store.update.assert_called_once()


def test_put_settings_validates_api_key(client, mock_config_store):
    with patch("app.api.v1.endpoints.settings.OpenAIProvider") as MockProvider:
        instance = MagicMock()
        instance.validate_connection.return_value = False
        MockProvider.return_value = instance

        resp = client.put("/api/v1/settings", json={
            "openaiApiKey": "sk-invalid",
        })
        assert resp.status_code == 400
        assert "validation failed" in resp.json()["detail"].lower()
        mock_config_store.update.assert_not_called()


def test_get_providers(client, mock_config_store):
    with patch("app.api.v1.endpoints.settings.LLMService") as MockService:
        instance = MagicMock()
        instance.validate_connection.return_value = True
        MockService.return_value = instance

        resp = client.get("/api/v1/settings/providers")
        assert resp.status_code == 200
        data = resp.json()
        assert "ollama" in data
        assert "openai" in data
