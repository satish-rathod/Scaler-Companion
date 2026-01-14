import pytest
import asyncio
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# Mock data
MOCK_STREAM_INFO = {
    "baseUrl": "https://example.com/hls/",
    "streamUrl": "https://example.com/master.m3u8",
    "keyPairId": "mock_key",
    "policy": "mock_policy",
    "signature": "mock_sig",
    "detectedChunk": 10
}

MOCK_DOWNLOAD_REQUEST = {
    "title": "Mock Lecture",
    "url": "https://scaler.com/class/123",
    "streamInfo": MOCK_STREAM_INFO,
    "startTime": 0,
    "endTime": 30
}

@pytest.fixture
def mock_downloader():
    with patch("app.api.v1.endpoints.download.VideoDownloader") as MockDownloader:
        instance = MockDownloader.return_value

        # Mock async download_chunks
        async def async_download_success(*args, **kwargs):
            return True
        instance.download_chunks = MagicMock(side_effect=async_download_success)

        # Mock merge
        async def async_merge_success(*args, **kwargs):
            return "/path/to/mock_video.mp4"
        instance.merge_chunks_to_video = MagicMock(side_effect=async_merge_success)

        yield instance

def test_start_download(mock_downloader):
    response = client.post("/api/v1/download", json=MOCK_DOWNLOAD_REQUEST)
    assert response.status_code == 200
    data = response.json()
    assert "downloadId" in data
    assert data["message"] == "Download started"
    return data["downloadId"]

def test_get_download_status(mock_downloader):
    # Start a download
    download_id = test_start_download(mock_downloader)

    # Check status (it might be pending or downloading depending on async execution speed)
    response = client.get(f"/api/v1/status/{download_id}")
    assert response.status_code == 200
    status_data = response.json()
    assert status_data["downloadId"] == download_id
    assert status_data["status"] in ["pending", "downloading", "complete"]
