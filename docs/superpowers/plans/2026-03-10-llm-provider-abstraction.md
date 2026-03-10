# LLM Provider Abstraction Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to choose between Ollama (local) and OpenAI (cloud) for LLM processing, with an extensible provider abstraction.

**Architecture:** Provider abstraction layer with `LLMProvider` ABC, `OllamaProvider` and `OpenAIProvider` implementations, and an `LLMService` orchestration layer that handles chunking/prompts. Server-side config persistence via `config.json`. Dashboard Settings UI for provider selection, API key entry, and model picking.

**Tech Stack:** Python (FastAPI, openai SDK, ollama SDK, pydantic), React (Vite, Tailwind CSS, Axios)

**Spec:** `docs/superpowers/specs/2026-03-10-llm-provider-abstraction-design.md`

---

## Chunk 1: Backend Foundation

### Task 1: LLM Provider Base Class + Registry

**Files:**
- Create: `backend/app/services/llm/__init__.py`
- Create: `backend/app/services/llm/base.py`
- Create: `backend/app/services/llm/registry.py`
- Create: `backend/tests/unit/test_llm_registry.py`

- [ ] **Step 1: Write failing test for provider registry**

```python
# backend/tests/unit/test_llm_registry.py
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/unit/test_llm_registry.py -v`
Expected: FAIL — modules don't exist yet

- [ ] **Step 3: Create LLMProvider base class**

Note: The spec defines these methods as `async`, but we implement them as **synchronous** because the pipeline runs in a `ThreadPoolExecutor` via `loop.run_in_executor()` (see `worker.py`). Sync is simpler here and avoids needing an async event loop in the worker thread. If a future provider needs async I/O, it can be wrapped with `asyncio.run()` internally.

```python
# backend/app/services/llm/base.py
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
```

- [ ] **Step 4: Create registry (placeholder providers for now)**

```python
# backend/app/services/llm/registry.py
from typing import Dict, Type
from app.services.llm.base import LLMProvider


# Registry populated by provider modules on import
PROVIDERS: Dict[str, Type[LLMProvider]] = {}


def register_provider(name: str, cls: Type[LLMProvider]):
    """Register a provider class by name."""
    PROVIDERS[name] = cls


def get_provider(name: str) -> LLMProvider:
    """Instantiate and return a provider by name. Raises KeyError if unknown."""
    cls = PROVIDERS[name]
    return cls()
```

- [ ] **Step 5: Create `__init__.py` with exports**

```python
# backend/app/services/llm/__init__.py
from app.services.llm.base import LLMProvider
from app.services.llm.registry import get_provider, register_provider, PROVIDERS

__all__ = ["LLMProvider", "get_provider", "register_provider", "PROVIDERS"]
```

- [ ] **Step 6: Run tests — they will still fail (no providers registered yet)**

Run: `cd backend && python -m pytest tests/unit/test_llm_registry.py -v`
Expected: `test_registry_has_ollama` and related tests FAIL (empty registry)

- [ ] **Step 7: Commit foundation**

```bash
git add backend/app/services/llm/__init__.py backend/app/services/llm/base.py backend/app/services/llm/registry.py backend/tests/unit/test_llm_registry.py
git commit -m "feat: add LLM provider base class and registry"
```

---

### Task 2: Ollama Provider

**Files:**
- Create: `backend/app/services/llm/ollama_provider.py`
- Create: `backend/tests/unit/test_ollama_provider.py`

- [ ] **Step 1: Write failing test for OllamaProvider**

```python
# backend/tests/unit/test_ollama_provider.py
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/unit/test_ollama_provider.py -v`
Expected: FAIL — module doesn't exist

- [ ] **Step 3: Implement OllamaProvider**

```python
# backend/app/services/llm/ollama_provider.py
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
```

- [ ] **Step 4: Import ollama_provider in `__init__.py`**

Update `backend/app/services/llm/__init__.py` — add at the top (after base imports):

```python
# Import providers to trigger auto-registration
import app.services.llm.ollama_provider  # noqa: F401
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/unit/test_ollama_provider.py tests/unit/test_llm_registry.py -v`
Expected: All pass (ollama tests pass with mocks, registry tests for `"ollama"` now pass)

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/llm/ollama_provider.py backend/app/services/llm/__init__.py backend/tests/unit/test_ollama_provider.py
git commit -m "feat: add OllamaProvider implementation"
```

---

### Task 3: OpenAI Provider

**Files:**
- Create: `backend/app/services/llm/openai_provider.py`
- Create: `backend/tests/unit/test_openai_provider.py`
- Modify: `backend/requirements.txt` — add `openai>=1.0.0`

- [ ] **Step 1: Add openai to requirements**

Add `openai>=1.0.0` to `backend/requirements.txt` after the `ollama` line.

- [ ] **Step 2: Write failing test for OpenAIProvider**

```python
# backend/tests/unit/test_openai_provider.py
import pytest
from unittest.mock import patch, MagicMock
from app.services.llm.openai_provider import OpenAIProvider
from app.services.llm.base import LLMProvider


def test_openai_provider_is_llm_provider():
    provider = OpenAIProvider(api_key="sk-test")
    assert isinstance(provider, LLMProvider)
    assert provider.provider_name == "openai"


@patch("app.services.llm.openai_provider.OpenAI")
def test_generate_text(MockOpenAI):
    mock_client = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = "Generated text"
    mock_client.chat.completions.create.return_value = MagicMock(choices=[mock_choice])
    MockOpenAI.return_value = mock_client

    provider = OpenAIProvider(api_key="sk-test")
    result = provider.generate_text("Say hello", model="gpt-4o")
    assert result == "Generated text"
    mock_client.chat.completions.create.assert_called_once_with(
        model="gpt-4o",
        messages=[{"role": "user", "content": "Say hello"}],
        temperature=0.3,
    )


@patch("app.services.llm.openai_provider.OpenAI")
def test_generate_text_uses_default_model(MockOpenAI):
    mock_client = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = "Hi"
    mock_client.chat.completions.create.return_value = MagicMock(choices=[mock_choice])
    MockOpenAI.return_value = mock_client

    provider = OpenAIProvider(api_key="sk-test", default_model="gpt-4o-mini")
    provider.generate_text("prompt")
    mock_client.chat.completions.create.assert_called_once()
    call_kwargs = mock_client.chat.completions.create.call_args[1]
    assert call_kwargs["model"] == "gpt-4o-mini"


@patch("app.services.llm.openai_provider.OpenAI")
def test_list_models(MockOpenAI):
    mock_client = MagicMock()
    mock_model_1 = MagicMock()
    mock_model_1.id = "gpt-4o"
    mock_model_2 = MagicMock()
    mock_model_2.id = "gpt-4o-mini"
    mock_model_3 = MagicMock()
    mock_model_3.id = "dall-e-3"  # Should be filtered out (not a gpt model)
    mock_client.models.list.return_value = MagicMock(data=[mock_model_1, mock_model_2, mock_model_3])
    MockOpenAI.return_value = mock_client

    provider = OpenAIProvider(api_key="sk-test")
    models = provider.list_models()
    assert "gpt-4o" in models
    assert "gpt-4o-mini" in models
    assert "dall-e-3" not in models


@patch("app.services.llm.openai_provider.OpenAI")
def test_validate_connection_success(MockOpenAI):
    mock_client = MagicMock()
    mock_client.models.list.return_value = MagicMock(data=[])
    MockOpenAI.return_value = mock_client

    provider = OpenAIProvider(api_key="sk-test")
    assert provider.validate_connection() is True


@patch("app.services.llm.openai_provider.OpenAI")
def test_validate_connection_failure(MockOpenAI):
    mock_client = MagicMock()
    mock_client.models.list.side_effect = Exception("invalid key")
    MockOpenAI.return_value = mock_client

    provider = OpenAIProvider(api_key="sk-test")
    assert provider.validate_connection() is False


def test_no_api_key_raises():
    with pytest.raises(ValueError, match="API key"):
        OpenAIProvider(api_key="")


@patch("app.services.llm.openai_provider.time")
@patch("app.services.llm.openai_provider.OpenAI")
def test_generate_text_retries_on_rate_limit(MockOpenAI, mock_time):
    """Rate-limited calls retry with exponential backoff up to 3 times."""
    from openai import RateLimitError
    mock_client = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = "Success after retry"
    # Fail twice with RateLimitError, succeed on third try
    mock_response = MagicMock()
    mock_response.status_code = 429
    mock_response.headers = {}
    rate_limit_err = RateLimitError(
        message="Rate limited", response=mock_response, body=None
    )
    mock_client.chat.completions.create.side_effect = [
        rate_limit_err,
        rate_limit_err,
        MagicMock(choices=[mock_choice]),
    ]
    MockOpenAI.return_value = mock_client
    mock_time.sleep = MagicMock()  # Don't actually sleep

    provider = OpenAIProvider(api_key="sk-test")
    result = provider.generate_text("prompt", model="gpt-4o")
    assert result == "Success after retry"
    assert mock_client.chat.completions.create.call_count == 3
    assert mock_time.sleep.call_count == 2  # Slept twice before retries


@patch("app.services.llm.openai_provider.time")
@patch("app.services.llm.openai_provider.OpenAI")
def test_generate_text_raises_after_max_retries(MockOpenAI, mock_time):
    """After 3 failed attempts, the RateLimitError is raised."""
    from openai import RateLimitError
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.status_code = 429
    mock_response.headers = {}
    rate_limit_err = RateLimitError(
        message="Rate limited", response=mock_response, body=None
    )
    mock_client.chat.completions.create.side_effect = rate_limit_err
    MockOpenAI.return_value = mock_client
    mock_time.sleep = MagicMock()

    provider = OpenAIProvider(api_key="sk-test")
    with pytest.raises(RateLimitError):
        provider.generate_text("prompt", model="gpt-4o")
    assert mock_client.chat.completions.create.call_count == 3
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/unit/test_openai_provider.py -v`
Expected: FAIL — module doesn't exist

- [ ] **Step 4: Implement OpenAIProvider**

```python
# backend/app/services/llm/openai_provider.py
import time
from openai import OpenAI, RateLimitError
from typing import List, Optional
from app.services.llm.base import LLMProvider
from app.services.llm.registry import register_provider

MAX_RETRIES = 3
RETRY_BASE_DELAY = 2  # seconds, doubles each retry


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
            return sorted([
                m.id for m in response.data
                if m.id.startswith("gpt-")
            ])
        except Exception as e:
            print(f"[OpenAIProvider] Error listing models: {e}")
            return []

    def validate_connection(self) -> bool:
        try:
            self._client.models.list()
            return True
        except Exception:
            return False


# Auto-register when imported
register_provider("openai", OpenAIProvider)
```

- [ ] **Step 5: Import openai_provider in `__init__.py`**

Update `backend/app/services/llm/__init__.py` — add:

```python
import app.services.llm.openai_provider  # noqa: F401
```

- [ ] **Step 6: Run all LLM tests**

Run: `cd backend && python -m pytest tests/unit/test_openai_provider.py tests/unit/test_ollama_provider.py tests/unit/test_llm_registry.py -v`
Expected: All pass

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/llm/openai_provider.py backend/app/services/llm/__init__.py backend/tests/unit/test_openai_provider.py backend/requirements.txt
git commit -m "feat: add OpenAIProvider implementation"
```

---

### Task 4: Config Store

**Files:**
- Create: `backend/app/core/config_store.py`
- Create: `backend/tests/unit/test_config_store.py`

- [ ] **Step 1: Write failing test for ConfigStore**

```python
# backend/tests/unit/test_config_store.py
import pytest
import json
import tempfile
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

    # New instance reads from same file
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
    store.set("LLM_PROVIDER", "ollama")  # file says ollama
    monkeypatch.setenv("LLM_PROVIDER", "openai")  # env says openai
    assert store.get("LLM_PROVIDER") == "openai"  # env wins
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/unit/test_config_store.py -v`
Expected: FAIL — module doesn't exist

- [ ] **Step 3: Implement ConfigStore**

```python
# backend/app/core/config_store.py
import json
import os
from pathlib import Path
from typing import Any, Dict, Optional

# Default path: backend/config.json (alongside output/)
_DEFAULT_CONFIG_PATH = Path(__file__).resolve().parent.parent.parent / "config.json"

DEFAULTS = {
    "LLM_PROVIDER": "ollama",
    "LLM_MODEL": "gpt-oss:20b",
    "OLLAMA_BASE_URL": "http://localhost:11434",
    "OPENAI_API_KEY": "",
}


class ConfigStore:
    """Persistent config store backed by a JSON file.

    Priority: env vars > config.json > DEFAULTS
    """

    def __init__(self, config_path: Path = _DEFAULT_CONFIG_PATH):
        self._path = Path(config_path)
        self._data: Dict[str, Any] = {}
        self._load()

    def _load(self):
        """Load config from disk, falling back to defaults."""
        if self._path.exists():
            try:
                self._data = json.loads(self._path.read_text())
            except (json.JSONDecodeError, OSError):
                self._data = {}
        else:
            self._data = {}

    def _save(self):
        """Persist current config to disk."""
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._path.write_text(json.dumps(self._data, indent=2))

    def get(self, key: str) -> Optional[Any]:
        """Get a config value. Priority: env var > file > default."""
        # 1. Check environment variable
        env_val = os.environ.get(key)
        if env_val is not None:
            return env_val
        # 2. Check persisted file
        if key in self._data:
            return self._data[key]
        # 3. Check defaults
        return DEFAULTS.get(key)

    def get_all(self) -> Dict[str, Any]:
        """Return all config values (merged defaults + file + env)."""
        result = {**DEFAULTS, **self._data}
        # Override with env vars where present
        for key in DEFAULTS:
            env_val = os.environ.get(key)
            if env_val is not None:
                result[key] = env_val
        return result

    def set(self, key: str, value: Any):
        """Set a config value and persist to disk."""
        self._data[key] = value
        self._save()

    def update(self, values: Dict[str, Any]):
        """Update multiple config values and persist."""
        self._data.update(values)
        self._save()


# Global singleton
config_store = ConfigStore()
```

- [ ] **Step 4: Run tests**

Run: `cd backend && python -m pytest tests/unit/test_config_store.py -v`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/config_store.py backend/tests/unit/test_config_store.py
git commit -m "feat: add ConfigStore for server-side config persistence"
```

---

## Chunk 2: Backend Integration

### Task 5: LLM Service (Orchestration Layer)

**Files:**
- Create: `backend/app/services/llm_service.py`
- Create: `backend/tests/unit/test_llm_service.py`

This replaces `ollama_service.py`. It contains all the prompt templates, chunking logic, and knowledge base building, delegating raw LLM calls to the active provider.

- [ ] **Step 1: Write failing test for LLMService**

```python
# backend/tests/unit/test_llm_service.py
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
    with patch("app.services.llm_service.get_provider", return_value=mock_provider):
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
    """Short text returns single chunk."""
    chunks = service._chunk_text("short text")
    assert len(chunks) == 1
    assert chunks[0] == "short text"


def test_chunk_text_long(service):
    """Long text splits into multiple chunks."""
    long_text = "word " * 5000  # ~25000 chars
    chunks = service._chunk_text(long_text)
    assert len(chunks) > 1
    # Each chunk should be <= chunk_size
    for chunk in chunks:
        assert len(chunk) <= service.chunk_size + 500  # Allow overlap tolerance


def test_generate_notes_returns_four_keys(service, mock_provider):
    """generate_notes returns dict with notes, summary, qa, announcements."""
    result = service.generate_notes("This is a test transcript.")
    assert "notes" in result
    assert "summary" in result
    assert "qa" in result
    assert "announcements" in result
    # Provider should have been called 4 times (one per artifact)
    assert mock_provider.generate_text.call_count == 4


def test_generate_notes_with_model_override(service, mock_provider):
    """Model override is passed to provider."""
    service.generate_notes("transcript", model="custom-model")
    for call in mock_provider.generate_text.call_args_list:
        assert call[1].get("model") == "custom-model" or call[0][1] == "custom-model"


def test_generate_notes_with_slides_context(service, mock_provider):
    """Slides context is included in prompts."""
    service.generate_notes("transcript", slides_context="Slide 1: Intro")
    # Check that at least one call includes the slides context in the prompt
    prompts = [call[0][0] for call in mock_provider.generate_text.call_args_list]
    knowledge_build_calls = [call[0][0] for call in mock_provider.generate_text.call_args_list]
    # The knowledge base or the prompts should reference slides
    all_text = " ".join(prompts)
    # For short transcripts, slides context is appended to the knowledge base directly
    # The notes prompt will contain the knowledge base which includes slides context
    assert any("Slide" in p for p in prompts)


def test_list_models_delegates(service, mock_provider):
    mock_provider.list_models.return_value = ["m1", "m2"]
    result = service.list_models()
    assert result == ["m1", "m2"]


def test_validate_connection_delegates(service, mock_provider):
    mock_provider.validate_connection.return_value = True
    assert service.validate_connection() is True
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/unit/test_llm_service.py -v`
Expected: FAIL — module doesn't exist

- [ ] **Step 3: Implement LLMService**

```python
# backend/app/services/llm_service.py
from typing import Dict, List, Optional
from app.services.llm import get_provider, LLMProvider
from app.core.config_store import config_store


class LLMService:
    """Orchestration layer for LLM operations.

    Handles chunking, prompt templates, and knowledge base building.
    Delegates raw text generation to the active LLMProvider.
    """

    def __init__(self, provider_name: Optional[str] = None, model: Optional[str] = None):
        name = provider_name or config_store.get("LLM_PROVIDER")

        # Build provider with config
        if name == "openai":
            from app.services.llm.openai_provider import OpenAIProvider
            api_key = config_store.get("OPENAI_API_KEY")
            default_model = model or config_store.get("LLM_MODEL") or "gpt-4o"
            self.provider = OpenAIProvider(api_key=api_key, default_model=default_model)
        elif name == "ollama":
            from app.services.llm.ollama_provider import OllamaProvider
            base_url = config_store.get("OLLAMA_BASE_URL")
            default_model = model or config_store.get("LLM_MODEL") or "gpt-oss:20b"
            self.provider = OllamaProvider(base_url=base_url, default_model=default_model)
        else:
            # Fallback: try registry
            self.provider = get_provider(name)

        self._model_override = model
        self.chunk_size = 8000
        self.chunk_overlap = 500

    def _chunk_text(self, text: str) -> List[str]:
        """Split text into overlapping chunks for processing."""
        if len(text) <= self.chunk_size:
            return [text]

        chunks = []
        start = 0
        while start < len(text):
            end = start + self.chunk_size

            if end < len(text):
                search_zone = text[end - 500:end]
                for sep in ['. ', '.\n', '? ', '!\n', '! ']:
                    last_sep = search_zone.rfind(sep)
                    if last_sep != -1:
                        end = end - 500 + last_sep + len(sep)
                        break

            chunks.append(text[start:end])
            start = end - self.chunk_overlap

        return chunks

    def _extract_knowledge_from_chunk(self, chunk: str, chunk_num: int, total_chunks: int) -> str:
        """Extract key knowledge points from a single chunk."""
        prompt = f"""You are extracting key knowledge from part {chunk_num} of {total_chunks} of a lecture transcript.

## Instructions:
Extract and summarize the KEY INFORMATION from this section:
1. **Main concepts** explained in this section
2. **Definitions** of any terms introduced
3. **Examples** provided by the instructor
4. **Important points** emphasized
5. **Code/technical details** if any
6. **Announcements** (deadlines, assignments, dates) if any

Be thorough but concise. This will be combined with other sections.
Do NOT add filler text - only extract actual content.

## Transcript Section ({chunk_num}/{total_chunks}):
{chunk}

---
Extract the key knowledge now:"""

        try:
            return self.provider.generate_text(prompt, model=self._model_override)
        except Exception as e:
            print(f"Error extracting from chunk {chunk_num}: {e}")
            return f"[Error processing chunk {chunk_num}]"

    def _build_knowledge_base(self, transcript: str, slides_context: str = "") -> str:
        """Build a condensed knowledge base from full transcript using chunking."""
        chunks = self._chunk_text(transcript)

        if len(chunks) == 1:
            print(f"[LLMService] Short transcript ({len(transcript)} chars), using directly")
            return transcript + ("\n\n## Slide Context:\n" + slides_context if slides_context else "")

        print(f"[LLMService] Long transcript ({len(transcript)} chars), splitting into {len(chunks)} chunks...")

        knowledge_parts = []
        for i, chunk in enumerate(chunks, 1):
            print(f"[LLMService] Processing chunk {i}/{len(chunks)}...")
            knowledge = self._extract_knowledge_from_chunk(chunk, i, len(chunks))
            knowledge_parts.append(f"## Section {i}\n{knowledge}")

        combined_knowledge = "\n\n".join(knowledge_parts)

        if slides_context:
            combined_knowledge += f"\n\n## Slide Text (OCR):\n{slides_context}"

        print(f"[LLMService] Built knowledge base: {len(combined_knowledge)} chars from {len(transcript)} chars transcript")
        return combined_knowledge

    def generate_notes(self, transcript_text: str, slides_context: str = "", model: Optional[str] = None) -> Dict[str, str]:
        """Generate structured notes from transcript and slide context.

        Returns dict with keys: 'notes', 'summary', 'qa', 'announcements'.
        """
        effective_model = model or self._model_override
        knowledge_base = self._build_knowledge_base(transcript_text, slides_context)

        notes_prompt = f"""You are an expert academic note-taker. Create comprehensive, well-structured lecture notes.

## Instructions:
1. **Clear title** derived from the main topic
2. **Logical structure** with hierarchical headings (##, ###)
3. **ALL key concepts** - definitions, theories, frameworks
4. **Examples** exactly as presented
5. **Code/technical content** in proper code blocks
6. **Tables** where appropriate
7. **Bold** important terms

## Required Sections:
- **Overview** (what this lecture covers)
- **Learning Objectives** (what students should understand)
- **Main Content** (organized by topic)
- **Key Takeaways** (bullet list of most important points)
- **Terms & Definitions** (glossary)

## Knowledge Base (extracted from lecture):
{knowledge_base}

---
Generate comprehensive lecture notes:"""

        summary_prompt = f"""You are an expert summarizer. Create a comprehensive executive summary.

## Instructions:
1. **Opening**: Main topic and its importance
2. **Core content** (2-3 paragraphs): Key concepts and methodologies
3. **Applications**: How this knowledge is applied
4. **Conclusion**: Main takeaways

Write 400-600 words in prose form (no bullet points).

## Knowledge Base:
{knowledge_base}

---
Generate executive summary:"""

        qa_prompt = f"""You are creating study flashcards. Generate 15-20 Q&A pairs.

## Instructions:
- Mix of: Conceptual, Application, Comparison, Definition questions
- Format each as:
  ### Q[N]: [Question]
  **A:** [Answer]
- Questions should test understanding, not just recall
- Include specific terminology from the lecture

## Knowledge Base:
{knowledge_base}

---
Generate Q&A flashcards:"""

        announcements_prompt = f"""Extract announcements and action items from this lecture.

## Look for:
1. **Deadlines** - assignments, projects
2. **Exam/quiz dates**
3. **Resources** - books, tools, links mentioned
4. **Action items** - what students need to do
5. **Schedule changes**

## Format:
### Deadlines
| Date | Item | Details |
|------|------|---------|

### Action Items
- [ ] [Task]

### Resources
- [Resource]: [Description]

If no announcements found, state "No specific announcements in this lecture."

## Knowledge Base:
{knowledge_base}

---
Extract announcements:"""

        try:
            print("[LLMService] Generating Lecture Notes...")
            notes = self.provider.generate_text(notes_prompt, model=effective_model)

            print("[LLMService] Generating Summary...")
            summary = self.provider.generate_text(summary_prompt, model=effective_model)

            print("[LLMService] Generating Q&A Cards...")
            qa = self.provider.generate_text(qa_prompt, model=effective_model)

            print("[LLMService] Generating Announcements...")
            announcements = self.provider.generate_text(announcements_prompt, model=effective_model)

            return {
                "notes": notes,
                "summary": summary,
                "qa": qa,
                "announcements": announcements,
            }

        except Exception as e:
            print(f"LLM generation error: {e}")
            raise

    def list_models(self) -> List[str]:
        """List available models from the active provider."""
        return self.provider.list_models()

    def validate_connection(self) -> bool:
        """Check if the active provider is reachable."""
        return self.provider.validate_connection()
```

- [ ] **Step 4: Run tests**

Run: `cd backend && python -m pytest tests/unit/test_llm_service.py -v`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/llm_service.py backend/tests/unit/test_llm_service.py
git commit -m "feat: add LLMService orchestration layer"
```

---

### Task 6: Update Config Settings

**Files:**
- Modify: `backend/app/core/config.py`

- [ ] **Step 1: Add new settings fields to config.py**

Add after the existing `OLLAMA_MODEL` line in the `Settings` class:

```python
    # LLM Provider Settings
    LLM_PROVIDER: str = "ollama"       # "ollama" or "openai"
    LLM_MODEL: str = "gpt-oss:20b"    # Default model for active provider
    OPENAI_API_KEY: str = ""           # OpenAI API key
```

These exist for backward compat with env vars. The `ConfigStore` is the primary source at runtime.

- [ ] **Step 2: Commit**

```bash
git add backend/app/core/config.py
git commit -m "feat: add LLM provider settings to config"
```

---

### Task 7: Settings API Endpoints

**Files:**
- Create: `backend/app/api/v1/endpoints/settings.py`
- Create: `backend/tests/unit/test_settings_api.py`
- Modify: `backend/app/api/v1/api.py` — register settings router

- [ ] **Step 1: Write failing test for settings API**

```python
# backend/tests/unit/test_settings_api.py
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
    # API key should be masked
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
    """PUT /settings validates OpenAI API key on save."""
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/unit/test_settings_api.py -v`
Expected: FAIL — module doesn't exist

- [ ] **Step 3: Implement settings endpoint**

```python
# backend/app/api/v1/endpoints/settings.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.core.config_store import config_store
from app.services.llm_service import LLMService

router = APIRouter()


def _mask_api_key(key: str) -> str:
    """Mask an API key for safe display: sk-...***abc"""
    if not key or len(key) < 8:
        return "***" if key else ""
    return key[:5] + "***" + key[-3:]


class SettingsUpdate(BaseModel):
    llmProvider: Optional[str] = None
    llmModel: Optional[str] = None
    ollamaBaseUrl: Optional[str] = None
    openaiApiKey: Optional[str] = None


@router.get("/settings")
async def get_settings() -> Dict[str, Any]:
    """Return current LLM settings (API key masked)."""
    all_config = config_store.get_all()
    return {
        "llmProvider": all_config.get("LLM_PROVIDER", "ollama"),
        "llmModel": all_config.get("LLM_MODEL", "gpt-oss:20b"),
        "ollamaBaseUrl": all_config.get("OLLAMA_BASE_URL", "http://localhost:11434"),
        "openaiApiKey": _mask_api_key(all_config.get("OPENAI_API_KEY", "")),
    }


@router.put("/settings")
async def update_settings(body: SettingsUpdate) -> Dict[str, str]:
    """Update LLM settings and persist to config.json.

    Validates OpenAI API key on save if provided.
    """
    updates = {}
    if body.llmProvider is not None:
        if body.llmProvider not in ("ollama", "openai"):
            raise HTTPException(status_code=400, detail=f"Unknown provider: {body.llmProvider}")
        updates["LLM_PROVIDER"] = body.llmProvider
    if body.llmModel is not None:
        updates["LLM_MODEL"] = body.llmModel
    if body.ollamaBaseUrl is not None:
        updates["OLLAMA_BASE_URL"] = body.ollamaBaseUrl
    if body.openaiApiKey is not None:
        updates["OPENAI_API_KEY"] = body.openaiApiKey

    # Validate OpenAI API key if one is being set
    new_key = updates.get("OPENAI_API_KEY")
    if new_key:
        try:
            from app.services.llm.openai_provider import OpenAIProvider
            provider = OpenAIProvider(api_key=new_key)
            if not provider.validate_connection():
                raise HTTPException(status_code=400, detail="OpenAI API key validation failed — could not connect")
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"OpenAI API key validation failed: {e}")

    if updates:
        config_store.update(updates)

    return {"message": "Settings updated"}


@router.get("/settings/providers")
async def get_providers() -> Dict[str, Any]:
    """List available providers with their connection status."""
    results = {}

    # Check Ollama
    try:
        svc = LLMService(provider_name="ollama")
        ollama_ok = svc.validate_connection()
    except Exception:
        ollama_ok = False
    results["ollama"] = {"available": True, "connected": ollama_ok}

    # Check OpenAI
    api_key = config_store.get("OPENAI_API_KEY")
    if api_key:
        try:
            svc = LLMService(provider_name="openai")
            openai_ok = svc.validate_connection()
        except Exception:
            openai_ok = False
        results["openai"] = {"available": True, "connected": openai_ok}
    else:
        results["openai"] = {"available": True, "connected": False, "reason": "No API key configured"}

    return results
```

- [ ] **Step 4: Register settings router in api.py**

In `backend/app/api/v1/api.py`, add:

```python
from app.api.v1.endpoints import download, process, content, system, search, export, settings

# Add this line after the other include_router calls:
api_router.include_router(settings.router, tags=["settings"])
```

- [ ] **Step 5: Run tests**

Run: `cd backend && python -m pytest tests/unit/test_settings_api.py -v`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/v1/endpoints/settings.py backend/app/api/v1/api.py backend/tests/unit/test_settings_api.py
git commit -m "feat: add settings API endpoints for LLM provider config"
```

---

### Task 8: Update System Endpoints + Schemas

**Files:**
- Modify: `backend/app/api/v1/endpoints/system.py` — use active provider for /models
- Modify: `backend/app/models/schemas.py` — rename `ollamaModel` field

- [ ] **Step 1: Update /models endpoint**

Replace the contents of the `list_models` function in `backend/app/api/v1/endpoints/system.py`:

```python
from fastapi import APIRouter
from typing import Dict, List, Any
from app.services.llm_service import LLMService
from app.core.config_store import config_store
from app.core.state import JOB_QUEUE, processes

router = APIRouter()

@router.get("/models", response_model=Dict[str, List[str]])
async def list_models():
    """List available AI models for the active LLM provider."""
    # Get LLM models from active provider
    try:
        llm_service = LLMService()
        provider_name = config_store.get("LLM_PROVIDER")
        llm_models = llm_service.list_models()
    except Exception:
        llm_models = ["gpt-oss:20b"]  # Fallback
        provider_name = "ollama"

    return {
        "whisper": ["turbo", "large-v3", "medium", "small"],
        "llm": llm_models,
        "llmProvider": provider_name,
    }
```

Note: The response key changes from `"ollama"` to `"llm"` to be provider-agnostic. The frontend will be updated accordingly.

- [ ] **Step 2: Update ProcessRequest schema**

In `backend/app/models/schemas.py`, rename `ollamaModel` to `llmModel` for clarity, keeping backward compat:

```python
class ProcessRequest(BaseModel):
    title: str
    videoPath: str
    options: Dict = {}
    whisperModel: str = "medium"
    llmModel: str = "gpt-oss:20b"
    skipTranscription: bool = False
    skipFrames: bool = False
    skipNotes: bool = False
    skipSlideAnalysis: bool = False
```

- [ ] **Step 3: Update worker.py to use new field name**

In `backend/app/core/worker.py`, line 47, change:

```python
# Before
ollama_model=request.ollamaModel
# After
ollama_model=request.llmModel
```

- [ ] **Step 4: Run existing tests to check nothing broke**

Run: `cd backend && python -m pytest tests/unit/ -v`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/v1/endpoints/system.py backend/app/models/schemas.py backend/app/core/worker.py
git commit -m "feat: update system endpoints and schemas for provider-agnostic LLM"
```

---

### Task 9: Pipeline Integration + Bug Fix

**Files:**
- Modify: `backend/app/services/pipeline.py` — use LLMService instead of OllamaService
- Modify: `backend/app/core/worker.py` — pass model override properly

- [ ] **Step 1: Update pipeline.py imports and constructor**

In `backend/app/services/pipeline.py`:

Replace line 10:
```python
# Before
from app.services.ollama_service import OllamaService
# After
from app.services.llm_service import LLMService
```

Replace lines 19-25 (the `__init__` method):
```python
    def __init__(self, output_base: str = str(settings.OUTPUT_DIR),
                 whisper_model: str = settings.WHISPER_MODEL,
                 llm_model: str = None):
        self.output_base = Path(output_base)
        self.whisper_service = WhisperService()
        self.vision_service = VisionService()
        self.llm_service = LLMService(model=llm_model)
        self.progress_callback: Optional[Callable[[str, int, int, str], None]] = None
```

Replace line 170:
```python
# Before
                notes_data = self.ollama_service.generate_notes(transcript_text, slides_context)
# After
                notes_data = self.llm_service.generate_notes(transcript_text, slides_context)
```

- [ ] **Step 2: Update worker.py to pass llm_model**

In `backend/app/core/worker.py`, update `_execute_pipeline` function (line 45-47):

```python
# Before
            pipeline = ProcessingPipeline(
                whisper_model=request.whisperModel,
                ollama_model=request.ollamaModel
            )
# After
            pipeline = ProcessingPipeline(
                whisper_model=request.whisperModel,
                llm_model=request.llmModel,
            )
```

- [ ] **Step 3: Delete old ollama_service.py**

```bash
git rm backend/app/services/ollama_service.py
```

- [ ] **Step 4: Update test_pipeline_mock.py**

In `backend/tests/unit/test_pipeline_mock.py`, rename the `ollamaModel` field in the test payload to match the new schema:

```python
# Before (line 14)
    "ollamaModel": "mock-model"
# After
    "llmModel": "mock-model"
```

No import changes needed — this file doesn't import `OllamaService` directly.

- [ ] **Step 5: Check for remaining references to OllamaService**

Run: `grep -r "ollama_service\|OllamaService" backend/ --include="*.py" | grep -v "llm/ollama_provider" | grep -v "__pycache__"`

Any remaining references (other than `llm/ollama_provider.py`) must be updated. Known files that import it:
- `backend/app/api/v1/endpoints/system.py` — already replaced in Task 8
- `backend/app/services/pipeline.py` — already replaced in Task 9 Step 1

- [ ] **Step 6: Run all tests**

Run: `cd backend && python -m pytest tests/unit/ -v`
Expected: All pass

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/pipeline.py backend/app/core/worker.py backend/tests/unit/test_pipeline_mock.py
git commit -m "feat: integrate LLMService into pipeline, fix model override bug"
```

---

## Chunk 3: Frontend

### Task 10: API Service Updates

**Files:**
- Modify: `dashboard/src/services/api.js` — add settings API calls

- [ ] **Step 1: Add settings API functions to api.js**

Append before `export default api;`:

```javascript
export const getSettings = async () => {
  const response = await api.get('/v1/settings');
  return response.data;
};

export const updateSettings = async (data) => {
  const response = await api.put('/v1/settings', data);
  return response.data;
};

export const getProviders = async () => {
  const response = await api.get('/v1/settings/providers');
  return response.data;
};
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/services/api.js
git commit -m "feat: add settings API functions to dashboard"
```

---

### Task 11: Settings Page Revamp

**Files:**
- Modify: `dashboard/src/pages/SettingsPage.jsx`

- [ ] **Step 1: Rewrite SettingsPage with provider config section**

Replace the full content of `dashboard/src/pages/SettingsPage.jsx`:

```jsx
import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { Save, CheckCircle, XCircle, Loader, Eye, EyeOff } from 'lucide-react';
import useTheme from '../hooks/useTheme';
import { getSettings, updateSettings, getProviders, getModels } from '../services/api';

const SettingsPage = () => {
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [providers, setProviders] = useState({});
  const [models, setModels] = useState([]);
  const [message, setMessage] = useState(null);
  const [settings, setSettings] = useState({
    llmProvider: 'ollama',
    llmModel: '',
    ollamaBaseUrl: 'http://localhost:11434',
    openaiApiKey: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [settingsData, providersData, modelsData] = await Promise.all([
          getSettings(),
          getProviders(),
          getModels(),
        ]);
        setSettings(settingsData);
        setProviders(providersData);
        setModels(modelsData.llm || []);
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleProviderChange = async (provider) => {
    setSettings(prev => ({ ...prev, llmProvider: provider }));
    // Fetch models for new provider after save
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const data = await getProviders();
      setProviders(data);
      const active = data[settings.llmProvider];
      if (active?.connected) {
        setMessage({ type: 'success', text: 'Connection successful!' });
      } else {
        setMessage({ type: 'error', text: active?.reason || 'Connection failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Connection test failed: ' + err.message });
    } finally {
      setTesting(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(settings);
      // Refresh models for potentially new provider
      const modelsData = await getModels();
      setModels(modelsData.llm || []);
      setMessage({ type: 'success', text: 'Settings saved!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save: ' + err.message });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-16">
          <Loader className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">Settings</h2>

        {message && (
          <div className={`mb-6 p-3 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* LLM Provider Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-5">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">LLM Provider</h3>

            {/* Provider Toggle */}
            <div className="flex gap-3">
              {['ollama', 'openai'].map(p => (
                <button
                  key={p}
                  onClick={() => handleProviderChange(p)}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                    settings.llmProvider === p
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">{p === 'ollama' ? 'Ollama' : 'OpenAI'}</div>
                  <div className="text-xs mt-1 opacity-70">
                    {p === 'ollama' ? 'Local / Free' : 'Cloud / API Key'}
                  </div>
                </button>
              ))}
            </div>

            {/* Provider-specific config */}
            {settings.llmProvider === 'ollama' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ollama Base URL
                </label>
                <input
                  type="text"
                  value={settings.ollamaBaseUrl}
                  onChange={e => setSettings({ ...settings, ollamaBaseUrl: e.target.value })}
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="http://localhost:11434"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  OpenAI API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={settings.openaiApiKey}
                    onChange={e => setSettings({ ...settings, openaiApiKey: e.target.value })}
                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-10"
                    placeholder="sk-..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Connection status + test button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                {providers[settings.llmProvider]?.connected ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-green-700 dark:text-green-400">Connected</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-red-700 dark:text-red-400">Not connected</span>
                  </>
                )}
              </div>
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 flex items-center gap-1"
              >
                {testing && <Loader className="w-3 h-3 animate-spin" />}
                Test Connection
              </button>
            </div>

            {/* Model selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Default Model
              </label>
              <select
                value={settings.llmModel}
                onChange={e => setSettings({ ...settings, llmModel: e.target.value })}
                className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {models.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
                {models.length === 0 && (
                  <option value="">No models available</option>
                )}
              </select>
            </div>
          </div>

          {/* Appearance Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Appearance</h3>
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Dark Mode</span>
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  theme === 'dark' ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;
```

- [ ] **Step 2: Verify it renders (manual)**

Run: `cd dashboard && npm run dev`
Navigate to Settings page. Verify: provider toggle, API key field, model dropdown, test connection button.

- [ ] **Step 3: Commit**

```bash
git add dashboard/src/pages/SettingsPage.jsx
git commit -m "feat: revamp SettingsPage with LLM provider config UI"
```

---

### Task 12: ProcessModal Updates

**Files:**
- Modify: `dashboard/src/components/features/processing/ProcessModal.jsx`

- [ ] **Step 1: Update ProcessModal to be provider-agnostic**

In `dashboard/src/components/features/processing/ProcessModal.jsx`:

Update the state initialization (line 8):
```jsx
// Before
const [models, setModels] = useState({ whisper: [], ollama: [] });
// After
const [models, setModels] = useState({ whisper: [], llm: [], llmProvider: 'ollama' });
```

Update the config state (line 10-11):
```jsx
// Before
    ollamaModel: '',
// After
    llmModel: '',
```

Update the model fetch effect (lines 22-23):
```jsx
// Before
        if (data.ollama.length > 0) {
          setConfig(prev => ({ ...prev, ollamaModel: data.ollama[0] }));
        }
// After
        if (data.llm && data.llm.length > 0) {
          setConfig(prev => ({ ...prev, llmModel: data.llm[0] }));
        }
```

Update the LLM model dropdown label and select (lines 91-103):
```jsx
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes Model ({models.llmProvider === 'openai' ? 'OpenAI' : 'Ollama'})
              </label>
              <select
                value={config.llmModel}
                onChange={e => setConfig({ ...config, llmModel: e.target.value })}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {(models.llm || []).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
```

- [ ] **Step 2: Verify the ProcessModal works (manual)**

Open the dashboard, click Process on a recording. Verify the model dropdown shows models from the active provider with the correct label.

- [ ] **Step 3: Commit**

```bash
git add dashboard/src/components/features/processing/ProcessModal.jsx
git commit -m "feat: update ProcessModal for provider-agnostic model selection"
```

---

## Final Verification

- [ ] **Step 1: Run all backend tests**

```bash
cd backend && python -m pytest tests/unit/ -v
```

- [ ] **Step 2: Check frontend builds**

```bash
cd dashboard && npm run build
```

- [ ] **Step 3: Manual E2E check**

1. Start backend + dashboard: `./start.sh`
2. Go to Settings → select OpenAI → enter API key → Save → Test Connection
3. Go to Settings → select Ollama → Test Connection
4. Process a recording with each provider
5. Verify notes/summary/qa/announcements are generated

- [ ] **Step 4: Final commit (cleanup)**

Remove any leftover references, run linter:

```bash
cd backend && python -m pytest tests/unit/ -v
cd dashboard && npm run lint
```
