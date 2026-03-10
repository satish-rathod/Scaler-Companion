from fastapi import APIRouter
from typing import Dict, List, Any
from app.services.llm_service import LLMService
from app.core.config_store import config_store
from app.core.state import JOB_QUEUE, processes

router = APIRouter()

@router.get("/models", response_model=Dict[str, Any])
async def list_models():
    """List available AI models for the active LLM provider."""
    try:
        llm_service = LLMService()
        provider_name = config_store.get("LLM_PROVIDER")
        llm_models = llm_service.list_models()
    except Exception:
        llm_models = ["gpt-oss:20b"]
        provider_name = "ollama"

    return {
        "whisper": ["turbo", "large-v3", "medium", "small"],
        "llm": llm_models,
        "llmProvider": provider_name,
    }

@router.get("/queue", response_model=Dict[str, Any])
async def get_queue_status():
    """Get current queue status"""
    queued_items = []
    for job in JOB_QUEUE:
        queued_items.append({
            "id": job["id"],
            "title": job["request"].title,
            "status": "queued"
        })

    active_items = []
    for pid, status in processes.items():
        if status.status in ["processing", "queued"]:
             active_items.append(status.model_dump())
        elif status.status in ["error", "complete"]:
             active_items.append(status.model_dump())

    return {
        "queue": queued_items,
        "history": active_items
    }
