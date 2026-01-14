import ollama
from typing import Dict, Any
from app.core.config import settings

class OllamaService:
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.model = settings.OLLAMA_MODEL

    def generate_notes(self, transcript_text: str, slides_context: str = "") -> Dict[str, str]:
        """
        Generate structured notes from transcript and slide context.
        Returns dict with keys: 'notes', 'summary', 'qa'.
        """

        system_prompt = """
        You are an expert teaching assistant. Your goal is to create comprehensive, structured lecture notes
        based on the provided transcript and slide text.
        Format the output using Markdown.
        """

        # 1. Main Lecture Notes
        notes_prompt = f"""
        {system_prompt}

        Create detailed lecture notes from the following transcript.
        - Use clear headings and subheadings.
        - Capture all key concepts, definitions, and examples.
        - If code is mentioned, format it as code blocks.
        - Incorporate relevant details from the slides context provided below.

        Slides Context:
        {slides_context[:5000]} # Limit context to avoid token limits if necessary

        Transcript:
        {transcript_text[:25000]} # Limit transcript chunks if necessary
        """

        # 2. Summary
        summary_prompt = f"""
        {system_prompt}
        Create a concise 3-5 paragraph executive summary of the lecture.
        Focus on the "Big Picture" takeaways.

        Transcript:
        {transcript_text[:15000]}
        """

        # 3. QA Cards
        qa_prompt = f"""
        {system_prompt}
        Create 10-15 Q&A flashcards based on the lecture.
        Format as:
        Q: [Question]
        A: [Answer]

        Transcript:
        {transcript_text[:15000]}
        """

        try:
            # We assume Ollama is running.
            # Note: We are using the synchronous client here for simplicity in this worker step,
            # but ideally this happens in the thread pool executor anyway.

            print("Generating Notes...")
            notes_resp = ollama.generate(model=self.model, prompt=notes_prompt)

            print("Generating Summary...")
            summary_resp = ollama.generate(model=self.model, prompt=summary_prompt)

            print("Generating Q&A...")
            qa_resp = ollama.generate(model=self.model, prompt=qa_prompt)

            return {
                "notes": notes_resp['response'],
                "summary": summary_resp['response'],
                "qa": qa_resp['response']
            }

        except Exception as e:
            print(f"Ollama generation error: {e}")
            raise e

    def list_models(self):
        try:
            return ollama.list()
        except Exception as e:
            print(f"Error listing Ollama models: {e}")
            return []
