import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture
def mock_search_filesystem(tmp_path):
    # Create search output directory
    output_dir = tmp_path / "output"
    output_dir.mkdir()

    # 1. Lecture with match in transcript
    lec1 = output_dir / "2024-01-01_Python_Intro"
    lec1.mkdir()
    (lec1 / "transcript.txt").write_text("In this lecture we learn about Python functions and classes.", encoding="utf-8")

    # 2. Lecture with match in notes
    lec2 = output_dir / "2024-01-02_Advanced_Python"
    lec2.mkdir()
    (lec2 / "lecture_notes.md").write_text("# Advanced Python\nToday we cover decorators and generators.", encoding="utf-8")

    return output_dir

def test_search_endpoint(mock_search_filesystem):
    with patch("app.services.search_service.settings") as mock_settings:
        mock_settings.OUTPUT_DIR = mock_search_filesystem

        # Test Query: "Python"
        response = client.get("/api/v1/search?q=Python")
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 2

        # Check snippets
        titles = [r["title"] for r in data["results"]]
        assert "Python Intro" in titles
        assert "Advanced Python" in titles

        # Test Query: "decorators" (only in notes of lec2)
        response = client.get("/api/v1/search?q=decorators")
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 1
        assert data["results"][0]["title"] == "Advanced Python"
        assert "decorators" in data["results"][0]["match"]
