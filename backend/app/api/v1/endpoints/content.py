import shutil
import re
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from app.core.config import settings
from app.core.state import downloads, processes
from app.utils.security import validate_safe_path

router = APIRouter()

def normalize_title(title: str) -> str:
    """Normalize title for matching"""
    # Replace underscores and dashes with spaces, collapse multiple spaces, lowercase
    normalized = title.lower().replace("_", " ").replace("-", " ")
    normalized = re.sub(r'\s+', ' ', normalized).strip()
    return normalized

@router.get("/recordings", response_model=Dict[str, List[Dict[str, Any]]])
async def list_recordings():
    """List all recordings (downloaded & processed) - merged into single cards"""
    recordings = {}

    # 1. First, scan for processed outputs (these are the "complete" records)
    if settings.OUTPUT_DIR.exists():
        for output_folder in settings.OUTPUT_DIR.iterdir():
            if output_folder.is_dir() and output_folder.name != "videos":
                # Format: YYYY-MM-DD_Title
                folder_name = output_folder.name
                parts = folder_name.split("_", 1)

                if len(parts) < 2:
                    continue

                date_str, safe_title = parts[0], parts[1]
                display_title = safe_title.replace("_", " ")
                normalized = normalize_title(safe_title)

                is_processed = (output_folder / "lecture_notes.md").exists()
                # If transcript exists but notes don't, it's likely "processing" logic in V1,
                # but we rely on the process state dict for active processing status.
                # Here we just check what artifacts exist.

                # Use 'complete' status for fully processed recordings
                status = "complete" if is_processed else "downloaded"

                # Find matching video in videos folder to link
                video_path = None
                videos_dir = settings.VIDEO_DIR
                if videos_dir.exists():
                    for video_folder in videos_dir.iterdir():
                        if video_folder.is_dir():
                            if normalize_title(video_folder.name) == normalized or \
                               normalized in normalize_title(video_folder.name):
                                video_file = video_folder / "full_video.mp4"
                                if video_file.exists():
                                    video_path = str(video_file)
                                    break

                recordings[normalized] = {
                    "id": folder_name,
                    "title": display_title,
                    "status": status,
                    "date": date_str,
                    "path": str(output_folder),
                    "videoPath": video_path,
                    "processed": is_processed,
                    "artifacts": {
                        "notes": f"/content/{folder_name}/lecture_notes.md" if (output_folder / "lecture_notes.md").exists() else None,
                        "summary": f"/content/{folder_name}/summary.md" if (output_folder / "summary.md").exists() else None,
                        "qa_cards": f"/content/{folder_name}/qa_cards.md" if (output_folder / "qa_cards.md").exists() else None,
                        "slides": f"/content/{folder_name}/slides/" if (output_folder / "slides").exists() else None,
                        "transcript": f"/content/{folder_name}/transcript.txt" if (output_folder / "transcript.txt").exists() else None,
                        "announcements": f"/content/{folder_name}/announcements.md" if (output_folder / "announcements.md").exists() else None,
                    }
                }

    # 2. Add downloaded videos that DON'T have processed output yet
    if settings.VIDEO_DIR.exists():
        for video_folder in settings.VIDEO_DIR.iterdir():
            if video_folder.is_dir():
                title = video_folder.name
                display_title = title.replace("_", " ")
                normalized = normalize_title(title)

                # Skip if we already have this from processed outputs
                if normalized in recordings:
                    continue

                video_file = video_folder / "full_video.mp4"
                if video_file.exists():
                    recordings[normalized] = {
                        "id": title,
                        "title": display_title,
                        "status": "downloaded",
                        "date": datetime.fromtimestamp(video_file.stat().st_mtime).strftime("%Y-%m-%d"),
                        "videoPath": str(video_file),
                        "processed": False,
                        "progress": 0,
                        "artifacts": None
                    }

    # 3. OVERLAY: Check active processes and downloads to update status

    # Helper to update/insert recording
    def update_recording_status(rec_title, status, progress, message, pid=None):
        norm = normalize_title(rec_title)

        if norm not in recordings:
            recordings[norm] = {
                "id": rec_title,
                "title": rec_title,
                "status": status,
                "date": datetime.now().strftime("%Y-%m-%d"),
                "path": None,
                "videoPath": None,
                "processed": False,
                "progress": progress,
                "message": message,
                "artifacts": None
            }
        else:
            recordings[norm]["status"] = status
            recordings[norm]["progress"] = progress
            if message:
                recordings[norm]["message"] = message

    # Check active downloads
    for dl_id, dl in downloads.items():
        # Map download status to UI status
        if dl.status in ["pending", "downloading"] and dl.title:
            update_recording_status(dl.title, "downloading", dl.progress, dl.message)

    # Check active processes
    for proc_id, proc in processes.items():
        if proc.title:
            update_recording_status(
                proc.title,
                proc.status,
                proc.progress,
                proc.message,
                proc_id
            )

    # Sort by date descending
    sorted_recordings = sorted(
        recordings.values(),
        key=lambda x: x.get("date", ""),
        reverse=True
    )

    return {"recordings": sorted_recordings}

@router.delete("/recordings/{recording_id}")
async def delete_recording(recording_id: str):
    """Delete a recording and all its artifacts"""

    # 1. Validate input
    if ".." in recording_id or "/" in recording_id or "\\" in recording_id:
         raise HTTPException(status_code=400, detail="Invalid recording ID")

    deleted = []
    errors = []

    # Try to delete from videos folder
    videos_path = settings.VIDEO_DIR / recording_id
    if videos_path.exists():
        try:
            # Check security
            validate_safe_path(settings.VIDEO_DIR, recording_id)
            shutil.rmtree(videos_path)
            deleted.append(str(videos_path))
        except Exception as e:
            errors.append(f"Failed to delete {videos_path}: {e}")

    # Try to delete processed folder
    processed_path = settings.OUTPUT_DIR / recording_id
    if processed_path.exists() and processed_path.is_dir():
        try:
            shutil.rmtree(processed_path)
            deleted.append(str(processed_path))
        except Exception as e:
            errors.append(f"Failed to delete {processed_path}: {e}")

    # Also try flexible matching if exact ID failed
    if not deleted:
         for folder in settings.OUTPUT_DIR.iterdir():
            if folder.is_dir() and folder.name != "videos":
                if recording_id.lower() in folder.name.lower():
                    try:
                        shutil.rmtree(folder)
                        deleted.append(str(folder))
                    except Exception as e:
                         errors.append(f"Failed to delete {folder}: {e}")

    if not deleted and not errors:
        raise HTTPException(status_code=404, detail="Recording not found")

    return {
        "success": len(errors) == 0,
        "deleted": deleted,
        "errors": errors
    }
