import os
import shutil
import zipfile
import tempfile
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from app.core.config import settings
from app.utils.security import validate_safe_path

router = APIRouter()

@router.get("/export/{recording_id}")
async def export_recording(recording_id: str):
    """
    Export recording artifacts as a ZIP file.
    """

    # 1. Validate ID safety (ensure it doesn't traverse up)
    # We treat recording_id as a folder name here
    if ".." in recording_id or "/" in recording_id or "\\" in recording_id:
         raise HTTPException(status_code=400, detail="Invalid recording ID")

    target_dir = None

    # 2. Locate folder
    # Flexible match logic remains useful for UX (ID vs Name)
    # We will verify the FINAL resolved path is safe.

    possible_path = settings.OUTPUT_DIR / recording_id
    if possible_path.exists() and possible_path.is_dir():
        target_dir = possible_path
    else:
        for folder in settings.OUTPUT_DIR.iterdir():
            if folder.is_dir() and folder.name != "videos":
                if recording_id == folder.name:
                    target_dir = folder
                    break

    if not target_dir:
        raise HTTPException(status_code=404, detail="Recording not found")

    # Security Check: Ensure target_dir is strictly inside OUTPUT_DIR
    try:
        validate_safe_path(settings.OUTPUT_DIR, target_dir.name)
    except HTTPException:
        raise

    # 3. Create Temp ZIP
    # We use a temporary file instead of memory buffer to handle large videos/assets
    try:
        fd, temp_path = tempfile.mkstemp(suffix=".zip")
        os.close(fd)

        with zipfile.ZipFile(temp_path, "w", zipfile.ZIP_DEFLATED) as zip_file:
            for root, dirs, files in os.walk(target_dir):
                for file in files:
                    file_path = Path(root) / file
                    arcname = file_path.relative_to(target_dir)
                    zip_file.write(file_path, arcname)

        filename = f"{target_dir.name}.zip"

        # Return FileResponse with background cleanup
        return FileResponse(
            temp_path,
            media_type="application/zip",
            filename=filename,
            background=BackgroundTask(lambda: os.unlink(temp_path))
        )

    except Exception as e:
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.unlink(temp_path)
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")
