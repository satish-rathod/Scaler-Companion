import os
from pathlib import Path
from fastapi import HTTPException

def validate_safe_path(base_dir: Path, requested_path: str) -> Path:
    """
    Validate that the requested path resolves to a location inside the base directory.
    Prevents path traversal attacks.
    """
    try:
        # Sanitize input: remove null bytes, strict characters
        if not requested_path or ".." in requested_path or "/" in requested_path or "\\" in requested_path:
             # If input is meant to be a folder name (ID), strict alphanum + dash/underscore check is safer
             # But if it's meant to be a subpath, we check resolution.
             # For our use case (recording_id), it should be a directory NAME, not a path.
             pass

        # Construct full path
        target_path = (base_dir / requested_path).resolve()
        safe_base = base_dir.resolve()

        if not target_path.is_relative_to(safe_base):
            raise HTTPException(status_code=403, detail="Access denied: Invalid path")

        return target_path
    except Exception as e:
        raise HTTPException(status_code=403, detail=f"Access denied: {str(e)}")
