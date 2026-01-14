import uuid
from typing import Dict, Any
from fastapi import APIRouter, HTTPException
from app.models.schemas import ProcessRequest, ProcessStatus
from app.core.state import JOB_QUEUE, processes
from pathlib import Path

router = APIRouter()

@router.post("/process", response_model=Dict[str, Any])
async def start_processing(request: ProcessRequest):
    """Enqueue a lecture for AI processing"""
    process_id = str(uuid.uuid4())

    # Validate video path exists
    video_path = Path(request.videoPath)
    if not video_path.exists():
        raise HTTPException(status_code=400, detail=f"Video file not found: {request.videoPath}")

    # Initialize status
    processes[process_id] = ProcessStatus(
        processId=process_id,
        status="queued",
        progress=0.0,
        message="Waiting in queue...",
        title=request.title
    )

    # Add to queue
    JOB_QUEUE.append({
        "id": process_id,
        "request": request
    })

    print(f"📥 Enqueued job {process_id} for '{request.title}'. Queue length: {len(JOB_QUEUE)}")

    return {
        "processId": process_id,
        "message": "Job queued successfully",
        "position": len(JOB_QUEUE)
    }

@router.get("/process/{process_id}", response_model=ProcessStatus)
async def get_process_status(process_id: str):
    """Get processing status by ID"""
    if process_id not in processes:
        raise HTTPException(status_code=404, detail="Process not found")

    return processes[process_id]
