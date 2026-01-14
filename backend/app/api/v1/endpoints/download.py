import uuid
import asyncio
from typing import Dict
from fastapi import APIRouter, BackgroundTasks, HTTPException
from app.models.schemas import DownloadRequest, DownloadStatus
from app.core.state import downloads
from app.core.config import settings
from app.services.downloader import VideoDownloader

router = APIRouter()

async def run_download_task(download_id: str, request: DownloadRequest):
    """Background task to handle the download process"""
    try:
        downloads[download_id].status = "downloading"
        downloads[download_id].message = "Preparing download..."

        # Sanitize title for folder name
        safe_title = "".join(c for c in request.title if c.isalnum() or c in " -_")[:50].strip()
        if not safe_title:
            safe_title = f"lecture_{download_id[:8]}"

        output_dir = settings.VIDEO_DIR / safe_title

        stream_info = request.streamInfo
        if not stream_info.baseUrl:
             downloads[download_id].status = "error"
             downloads[download_id].message = "No base URL provided"
             return

        downloader = VideoDownloader(output_dir=str(output_dir))

        def progress_callback(current: int, total: int, message: str):
            progress = (current / total) * 90 if total > 0 else 0
            # Update state
            if download_id in downloads:
                downloads[download_id].progress = progress
                downloads[download_id].message = message

        downloader.set_progress_callback(progress_callback)

        # Determine chunks
        CHUNK_DURATION = 16 # Approximation from V1 observations
        start_chunk = 0
        end_chunk = 100 # Default if detection fails

        if stream_info.detectedChunk:
            end_chunk = stream_info.detectedChunk + 10 # Buffer

        if request.startTime is not None:
            start_chunk = int(request.startTime / CHUNK_DURATION)

        if request.endTime is not None:
            end_chunk = int(request.endTime / CHUNK_DURATION)

        # Download
        downloads[download_id].message = f"Downloading chunks {start_chunk}-{end_chunk}..."
        success = await downloader.download_chunks(
            base_url=stream_info.baseUrl,
            start_chunk=start_chunk,
            end_chunk=end_chunk,
            key_pair_id=stream_info.keyPairId or "",
            policy=stream_info.policy or "",
            signature=stream_info.signature or ""
        )

        if not success:
            downloads[download_id].status = "error"
            downloads[download_id].message = "Failed to download chunks"
            return

        # Merge
        downloads[download_id].message = "Merging video..."
        video_path = await downloader.merge_chunks_to_video(start_chunk, end_chunk)

        if video_path:
            downloads[download_id].status = "complete"
            downloads[download_id].progress = 100.0
            downloads[download_id].message = "Download complete"
            downloads[download_id].path = video_path
        else:
            downloads[download_id].status = "error"
            downloads[download_id].message = "Failed to merge video"

    except Exception as e:
        print(f"Download Error: {e}")
        downloads[download_id].status = "error"
        downloads[download_id].message = f"Internal error: {str(e)}"
        downloads[download_id].error = str(e)


@router.post("/download", response_model=Dict[str, str])
async def start_download(request: DownloadRequest, background_tasks: BackgroundTasks):
    """Start a new video download"""
    download_id = str(uuid.uuid4())

    # Initialize status
    downloads[download_id] = DownloadStatus(
        downloadId=download_id,
        status="pending",
        progress=0.0,
        message="Initializing..."
    )

    background_tasks.add_task(run_download_task, download_id, request)

    return {
        "downloadId": download_id,
        "message": "Download started"
    }

@router.get("/status/{download_id}", response_model=DownloadStatus)
async def get_download_status(download_id: str):
    """Get the status of a specific download"""
    if download_id not in downloads:
        raise HTTPException(status_code=404, detail="Download not found")
    return downloads[download_id]
