from fastapi import APIRouter
from typing import Dict, List, Any
from app.services.ollama_service import OllamaService
from app.core.state import JOB_QUEUE, processes

router = APIRouter()

@router.get("/models", response_model=Dict[str, List[str]])
async def list_models():
    """List available AI models"""
    ollama_service = OllamaService()
    try:
        ollama_models_resp = ollama_service.list_models()
        # Ollama list returns object with 'models' key which is a list of objects
        # We need to extract names
        ollama_models = [m['name'] for m in ollama_models_resp.get('models', [])]
    except:
        ollama_models = ["gpt-oss:20b"] # Fallback

    return {
        # Simplified to 4 logical choices - turbo is recommended (fastest + best quality)
        "whisper": ["turbo", "large-v3", "medium", "small"],
        "ollama": ollama_models
    }

@router.get("/queue", response_model=Dict[str, Any])
async def get_queue_status():
    """Get current queue status"""

    # Format queued items
    queued_items = []
    for job in JOB_QUEUE:
        queued_items.append({
            "id": job["id"],
            "title": job["request"].title,
            "status": "queued"
        })

    # Format active/completed processes
    # We filter for active ones mostly
    active_items = []
    for pid, status in processes.items():
        if status.status in ["processing", "queued"]: # Queued here means in-progress-map but waiting
             active_items.append(status.model_dump())
        elif status.status in ["error", "complete"]:
             # Limit history? For now return all in memory
             active_items.append(status.model_dump())

    return {
        "queue": queued_items,
        "history": active_items
    }
