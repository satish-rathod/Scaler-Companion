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
        if self._path.exists():
            try:
                self._data = json.loads(self._path.read_text())
            except (json.JSONDecodeError, OSError):
                self._data = {}
        else:
            self._data = {}

    def _save(self):
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._path.write_text(json.dumps(self._data, indent=2))

    def get(self, key: str) -> Optional[Any]:
        env_val = os.environ.get(key)
        if env_val is not None:
            return env_val
        if key in self._data:
            return self._data[key]
        return DEFAULTS.get(key)

    def get_all(self) -> Dict[str, Any]:
        result = {**DEFAULTS, **self._data}
        for key in DEFAULTS:
            env_val = os.environ.get(key)
            if env_val is not None:
                result[key] = env_val
        return result

    def set(self, key: str, value: Any):
        self._data[key] = value
        self._save()

    def update(self, values: Dict[str, Any]):
        self._data.update(values)
        self._save()


# Global singleton
config_store = ConfigStore()
