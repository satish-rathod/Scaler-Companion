from typing import Dict, Optional, List
from app.models.schemas import DownloadStatus, ProcessStatus

# Global state stores
# In a production app, these should be in a database (Redis/Postgres)
# For this local app, in-memory dicts are sufficient as per V1 design

downloads: Dict[str, DownloadStatus] = {}
processes: Dict[str, ProcessStatus] = {}

# Job Queue for sequential processing
JOB_QUEUE: List[Dict] = []
CURRENT_PROCESS_ID: Optional[str] = None
