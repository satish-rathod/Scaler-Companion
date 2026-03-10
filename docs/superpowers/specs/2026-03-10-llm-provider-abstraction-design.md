# LLM Provider Abstraction — Design Spec

**Date:** 2026-03-10
**Status:** Approved

## Goal

Allow users to choose between Ollama (local) and cloud LLM APIs (starting with OpenAI) for lecture processing. Design for extensibility so adding future providers (Anthropic, Google, etc.) is straightforward.

## Decisions

- **Provider selection:** Global setting (not per-job)
- **API key storage:** Server-side `config.json`, configurable from dashboard Settings page
- **Model selection:** Fetched dynamically from active provider, user picks from list
- **Prompts:** Shared by default, with per-provider override hook if output quality requires tweaks
- **Approach:** Provider abstraction layer — base class + implementations, orchestration layer on top

---

## Architecture

### Layer Separation

```
LLMService (orchestration: chunking, prompts, knowledge base)
  └── uses LLMProvider (raw text-in → text-out)
        ├── OllamaProvider
        └── OpenAIProvider
```

- **LLMProvider** (ABC): Handles raw LLM calls for a specific backend
- **LLMService**: Contains all prompt logic, chunking, and knowledge base assembly — delegates raw generation to the active provider
- **Provider Registry**: Maps provider names to classes, factory function returns active instance

### LLMProvider Interface

```python
class LLMProvider(ABC):
    provider_name: str

    async def generate_text(self, prompt: str, model: str = None) -> str: ...
    async def list_models(self) -> List[str]: ...
    async def validate_connection(self) -> bool: ...
    def format_prompt(self, template: str, **kwargs) -> str:
        """Optional override for provider-specific prompt formatting. Default: passthrough."""
        return template.format(**kwargs)
```

### Implementations

**OllamaProvider:**
- Wraps current `ollama.generate()` logic
- Reads `OLLAMA_BASE_URL` from config
- `list_models()` calls `ollama.list()`
- `validate_connection()` pings the Ollama server

**OpenAIProvider:**
- Uses `openai` Python SDK
- Reads `OPENAI_API_KEY` from config store
- `list_models()` calls OpenAI models API, filters to chat-capable models
- `validate_connection()` does a lightweight API call to verify key
- `format_prompt()` can split into system/user messages if needed

### Provider Registry

```python
PROVIDERS = {
    "ollama": OllamaProvider,
    "openai": OpenAIProvider,
}

def get_provider(name: str = None) -> LLMProvider:
    name = name or config_store.get("LLM_PROVIDER", "ollama")
    return PROVIDERS[name]()
```

Adding a new provider = new class file + one entry in `PROVIDERS`.

---

## Configuration & Storage

### Config Priority

```
env vars > config.json > code defaults
```

### Settings in `config.py`

| Setting | Default | Description |
|---------|---------|-------------|
| `LLM_PROVIDER` | `"ollama"` | Active provider name |
| `LLM_MODEL` | `"gpt-oss:20b"` | Default model for active provider |
| `OLLAMA_BASE_URL` | `"http://localhost:11434"` | Ollama server URL |
| `OPENAI_API_KEY` | `""` | OpenAI API key (empty = not configured) |

### Config Store (`config_store.py`)

- Reads/writes `config.json` in the backend data directory (alongside `output/`)
- On startup, loads `config.json` and merges with env vars (env takes priority)
- Provides `get(key)` and `set(key, value)` with auto-persist

### API Key Handling

- Stored in `config.json` on disk
- GET endpoint returns masked key (`sk-...***abc`) — never the full key
- Key validated on save via `provider.validate_connection()`

---

## API Endpoints

### New Settings Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/settings` | Return current provider, model, masked API key, Ollama URL |
| `PUT` | `/api/v1/settings` | Update provider config, persist to `config.json` |
| `GET` | `/api/v1/settings/providers` | List available providers + connection status for each |

### Modified Endpoints

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/api/v1/models` | Fetches models from active provider instead of only Ollama |

---

## Dashboard Changes

### Settings Page

New "LLM Provider" section:

1. **Provider selector** — radio/toggle: Ollama \| OpenAI
2. **Provider-specific config:**
   - Ollama: Base URL field, connection status indicator
   - OpenAI: API key input (password-masked), connection status indicator
3. **Model selector** — dropdown from `provider.list_models()`
4. **"Test Connection" button** — calls `validate_connection()`, inline success/error
5. **Save button** — PUTs to `/api/v1/settings`, confirmation toast

Current localStorage-based defaults are deprecated; settings now live server-side.

### ProcessModal

- Model dropdown fetches from active provider (not hardcoded to Ollama)
- Provider label shown (e.g., "Model (OpenAI)")
- No per-job provider switching (global setting only)

---

## Pipeline Integration

### Before → After

```python
# Before
self.ollama_service = OllamaService()
notes_data = self.ollama_service.generate_notes(transcript, slides)

# After
self.llm_service = LLMService()
notes_data = self.llm_service.generate_notes(transcript, slides)
```

### Bug Fix

The existing `ollama_model` parameter in `ProcessingPipeline.__init__` is currently ignored. The refactored `LLMService` properly accepts and forwards a `model` override to the provider.

### Prompt Strategy

- Shared prompt templates live in `LLMService`
- Providers can override `format_prompt()` for provider-specific formatting (e.g., OpenAI system messages)
- Start with shared prompts; adjust per-provider only if output quality differs

### Error Handling

- Provider unavailable → clear error in job status
- Invalid API key → error on settings save + job failure message
- Rate limiting (OpenAI) → retry with exponential backoff (3 attempts)
- Model not found → error surfaced to frontend

---

## File Changes

### New Files

```
backend/app/services/llm/__init__.py         # Exports get_provider, LLMProvider
backend/app/services/llm/base.py             # LLMProvider ABC
backend/app/services/llm/ollama_provider.py   # OllamaProvider
backend/app/services/llm/openai_provider.py   # OpenAIProvider
backend/app/services/llm/registry.py          # Provider registry + factory
backend/app/services/llm_service.py           # Orchestration layer
backend/app/core/config_store.py              # config.json read/write
backend/app/api/v1/endpoints/settings.py      # Settings API
```

### Modified Files

```
backend/app/core/config.py                    # New settings fields
backend/app/services/pipeline.py              # Use LLMService instead of OllamaService
backend/app/api/v1/api.py                     # Register settings router
backend/app/api/v1/endpoints/system.py        # /models uses active provider
backend/requirements.txt                       # Add openai package
dashboard/src/pages/SettingsPage.jsx           # Provider config UI
dashboard/src/components/features/processing/ProcessModal.jsx  # Dynamic model dropdown
dashboard/src/services/api.js                  # Settings API calls
```

### Deleted Files

```
backend/app/services/ollama_service.py         # Split into llm_service + ollama_provider
```

### Dependencies Added

- `openai` Python package

### No Changes To

- Chrome extension
- WhisperService
- VisionService
- SearchService
