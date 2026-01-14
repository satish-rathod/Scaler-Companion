import pytest
import asyncio
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

MOCK_PROCESS_REQUEST = {
    "title": "Mock Lecture",
    "videoPath": "/tmp/mock_video.mp4",
    "options": {},
    "whisperModel": "tiny",
    "ollamaModel": "mock-model"
}

@pytest.fixture
def mock_pipeline_components():
    with patch("app.api.v1.endpoints.process.Path") as MockPath:
        # Mock file existence validation
        MockPath.return_value.exists.return_value = True

        # We also need to patch the pipeline running inside the worker
        # But for the API test, we just check if it gets queued
        yield MockPath

def test_start_process(mock_pipeline_components):
    response = client.post("/api/v1/process", json=MOCK_PROCESS_REQUEST)
    assert response.status_code == 200
    data = response.json()
    assert "processId" in data
    assert data["message"] == "Job queued successfully"
    return data["processId"]

def test_get_process_status(mock_pipeline_components):
    process_id = test_start_process(mock_pipeline_components)

    response = client.get(f"/api/v1/process/{process_id}")
    assert response.status_code == 200
    status_data = response.json()
    assert status_data["processId"] == process_id
    assert status_data["status"] == "queued"
