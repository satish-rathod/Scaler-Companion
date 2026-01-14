import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.core.state import downloads, processes
from app.models.schemas import DownloadStatus, ProcessStatus

client = TestClient(app)

@pytest.fixture
def mock_filesystem(tmp_path):
    # Setup mock directory structure in tmp_path

    # 1. Processed Recording
    rec1 = tmp_path / "output" / "2024-01-01_Processed_Lecture"
    rec1.mkdir(parents=True)
    (rec1 / "lecture_notes.md").touch()
    (rec1 / "summary.md").touch()

    # 2. Processed Recording (no notes yet?)
    rec2 = tmp_path / "output" / "2024-01-02_Processing_Lecture"
    rec2.mkdir(parents=True)
    (rec2 / "transcript.txt").touch()

    # 3. Downloaded Video
    vid1 = tmp_path / "output" / "videos" / "Downloaded_Lecture"
    vid1.mkdir(parents=True)
    (vid1 / "full_video.mp4").touch()

    return tmp_path

def test_list_recordings(mock_filesystem):
    # Mock settings to point to tmp_path
    with patch("app.api.v1.endpoints.content.settings") as mock_settings:
        mock_settings.OUTPUT_DIR = mock_filesystem / "output"
        mock_settings.VIDEO_DIR = mock_filesystem / "output" / "videos"

        # Inject active state
        downloads["dl-123"] = DownloadStatus(
            downloadId="dl-123", status="downloading", progress=50.0, message=" downloading...",
        )
        # Note: In real app we rely on downloadID or some link to title.
        # The list_recordings logic currently skips downloads if schema mismatch or ID mismatch.
        # But let's check basic file scanning first.

        response = client.get("/api/v1/recordings")
        assert response.status_code == 200
        data = response.json()

        assert "recordings" in data
        recs = data["recordings"]

        # Check Processed Lecture
        processed = next((r for r in recs if "Processed Lecture" in r["title"]), None)
        assert processed
        assert processed["status"] == "processed"
        assert processed["processed"] is True

        # Check Downloaded Lecture
        downloaded = next((r for r in recs if "Downloaded Lecture" in r["title"]), None)
        assert downloaded
        assert downloaded["status"] == "downloaded"
