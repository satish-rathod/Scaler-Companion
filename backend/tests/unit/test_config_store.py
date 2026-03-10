import pytest
import json
from pathlib import Path
from app.core.config_store import ConfigStore


@pytest.fixture
def store(tmp_path):
    """Create a ConfigStore backed by a temp file."""
    return ConfigStore(config_path=tmp_path / "config.json")


def test_get_returns_default_when_no_file(store):
    assert store.get("LLM_PROVIDER") == "ollama"
    assert store.get("LLM_MODEL") == "gpt-oss:20b"
    assert store.get("OPENAI_API_KEY") == ""
    assert store.get("OLLAMA_BASE_URL") == "http://localhost:11434"


def test_set_and_get(store):
    store.set("LLM_PROVIDER", "openai")
    assert store.get("LLM_PROVIDER") == "openai"


def test_persists_to_disk(tmp_path):
    path = tmp_path / "config.json"
    store1 = ConfigStore(config_path=path)
    store1.set("LLM_PROVIDER", "openai")
    store1.set("OPENAI_API_KEY", "sk-abc123")

    store2 = ConfigStore(config_path=path)
    assert store2.get("LLM_PROVIDER") == "openai"
    assert store2.get("OPENAI_API_KEY") == "sk-abc123"


def test_get_all_returns_dict(store):
    result = store.get_all()
    assert isinstance(result, dict)
    assert "LLM_PROVIDER" in result
    assert "LLM_MODEL" in result


def test_update_multiple(store):
    store.update({"LLM_PROVIDER": "openai", "LLM_MODEL": "gpt-4o"})
    assert store.get("LLM_PROVIDER") == "openai"
    assert store.get("LLM_MODEL") == "gpt-4o"


def test_unknown_key_returns_none(store):
    assert store.get("DOES_NOT_EXIST") is None


def test_env_var_overrides_file(tmp_path, monkeypatch):
    path = tmp_path / "config.json"
    store = ConfigStore(config_path=path)
    store.set("LLM_PROVIDER", "ollama")
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    assert store.get("LLM_PROVIDER") == "openai"
