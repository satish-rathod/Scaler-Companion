from pathlib import Path
from typing import List, Dict, Any
from app.core.config import settings

class SearchService:
    def __init__(self, output_dir: Path = None):
        self.output_dir = output_dir or settings.OUTPUT_DIR

    def search_files(self, query: str) -> List[Dict[str, Any]]:
        """
        Search for query string in all transcript.txt and lecture_notes.md files.
        Returns a list of matches grouped by lecture.
        """
        results = []
        query = query.lower()

        if not self.output_dir.exists():
            return []

        for folder in self.output_dir.iterdir():
            if folder.is_dir() and folder.name != "videos":
                lecture_title = folder.name.split("_", 1)[1].replace("_", " ") if "_" in folder.name else folder.name
                lecture_id = folder.name

                # Check Transcript
                transcript_path = folder / "transcript.txt"
                if transcript_path.exists():
                    self._search_file(transcript_path, query, lecture_id, lecture_title, "transcript", results)

                # Check Notes
                notes_path = folder / "lecture_notes.md"
                if notes_path.exists():
                    self._search_file(notes_path, query, lecture_id, lecture_title, "notes", results)

        return results

    def _search_file(self, path: Path, query: str, lecture_id: str, title: str, doc_type: str, results: List):
        try:
            content = path.read_text(encoding="utf-8", errors="ignore")
            content_lower = content.lower()

            # Simple substring search
            idx = content_lower.find(query)
            if idx != -1:
                # Extract snippet
                start = max(0, idx - 50)
                end = min(len(content), idx + len(query) + 50)
                snippet = content[start:end].replace("\n", " ").strip()

                results.append({
                    "id": lecture_id,
                    "title": title,
                    "type": doc_type,
                    "match": f"...{snippet}..."
                })
        except Exception as e:
            print(f"Error searching {path}: {e}")
