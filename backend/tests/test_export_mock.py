import pytest
import io
import zipfile
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture
def mock_export_filesystem(tmp_path):
    output_dir = tmp_path / "output"
    output_dir.mkdir()

    # Recording Folder
    rec_dir = output_dir / "2024-01-01_Test_Export"
    rec_dir.mkdir()

    # Artifacts
    (rec_dir / "lecture_notes.md").write_text("# Notes", encoding="utf-8")
    (rec_dir / "transcript.txt").write_text("Transcript...", encoding="utf-8")

    # Slides
    slides_dir = rec_dir / "slides"
    slides_dir.mkdir()
    (slides_dir / "slide_001.png").touch()

    return output_dir

def test_export_endpoint(mock_export_filesystem):
    with patch("app.api.v1.endpoints.export.settings") as mock_settings:
        mock_settings.OUTPUT_DIR = mock_export_filesystem

        # Call Export
        # Use directory name as ID
        recording_id = "2024-01-01_Test_Export"
        response = client.get(f"/api/v1/export/{recording_id}")

        assert response.status_code == 200
        assert response.headers["content-type"] == "application/zip"
        # FileResponse adds quotes to filename
        assert f'filename="{recording_id}.zip"' in response.headers["content-disposition"]

        # Verify ZIP content
        zip_buffer = io.BytesIO(response.content)
        with zipfile.ZipFile(zip_buffer) as z:
            files = z.namelist()
            assert "lecture_notes.md" in files
            assert "transcript.txt" in files
            assert "slides/slide_001.png" in files
