from typing import Optional, Dict
from pydantic import BaseModel

# ============================================
# Shared Models
# ============================================

class StreamInfo(BaseModel):
    baseUrl: Optional[str] = None
    streamUrl: Optional[str] = None
    keyPairId: Optional[str] = None
    policy: Optional[str] = None
    signature: Optional[str] = None
    detectedChunk: Optional[int] = None

class DownloadRequest(BaseModel):
    title: str
    url: str
    streamInfo: StreamInfo
    startTime: Optional[int] = None  # Start time in seconds
    endTime: Optional[int] = None    # End time in seconds

class DownloadStatus(BaseModel):
    downloadId: str
    status: str  # 'pending', 'downloading', 'complete', 'error'
    progress: float
    message: Optional[str] = None
    path: Optional[str] = None
    error: Optional[str] = None
    title: Optional[str] = None

class ProcessRequest(BaseModel):
    title: str
    videoPath: str
    options: Dict = {}
    whisperModel: str = "medium"
    ollamaModel: str = "gpt-oss:20b"
    skipTranscription: bool = False
    skipFrames: bool = False
    skipNotes: bool = False
    skipSlideAnalysis: bool = False

class ProcessStatus(BaseModel):
    processId: str
    status: str  # 'pending', 'processing', 'complete', 'error'
    progress: float
    stage: Optional[str] = None
    message: Optional[str] = None
    outputDir: Optional[str] = None
    error: Optional[str] = None
    title: Optional[str] = None
