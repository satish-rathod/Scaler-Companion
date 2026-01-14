from fastapi import APIRouter, Query
from typing import Dict, List, Any
from app.services.search_service import SearchService

router = APIRouter()

@router.get("/search", response_model=Dict[str, List[Dict[str, Any]]])
async def search_content(q: str = Query(..., min_length=2)):
    """Search across all transcripts and notes"""
    service = SearchService()
    results = service.search_files(q)
    return {"results": results}
