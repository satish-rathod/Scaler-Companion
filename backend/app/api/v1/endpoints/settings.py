from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.core.config_store import config_store
from app.services.llm_service import LLMService
from app.services.llm.openai_provider import OpenAIProvider

router = APIRouter()


def _mask_api_key(key: str) -> str:
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
    all_config = config_store.get_all()
    return {
        "llmProvider": all_config.get("LLM_PROVIDER", "ollama"),
        "llmModel": all_config.get("LLM_MODEL", "gpt-oss:20b"),
        "ollamaBaseUrl": all_config.get("OLLAMA_BASE_URL", "http://localhost:11434"),
        "openaiApiKey": _mask_api_key(all_config.get("OPENAI_API_KEY", "")),
    }


@router.put("/settings")
async def update_settings(body: SettingsUpdate) -> Dict[str, str]:
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
    results = {}

    try:
        svc = LLMService(provider_name="ollama")
        ollama_ok = svc.validate_connection()
    except Exception:
        ollama_ok = False
    results["ollama"] = {"available": True, "connected": ollama_ok}

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
