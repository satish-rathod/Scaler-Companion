import ollama
from typing import Dict, Any, List
from app.core.config import settings

class OllamaService:
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.model = settings.OLLAMA_MODEL
        self.chunk_size = 8000  # Characters per chunk
        self.chunk_overlap = 500  # Overlap between chunks for context

    def _chunk_text(self, text: str) -> List[str]:
        """Split text into overlapping chunks for processing."""
        if len(text) <= self.chunk_size:
            return [text]
        
        chunks = []
        start = 0
        while start < len(text):
            end = start + self.chunk_size
            
            # Try to break at sentence boundary
            if end < len(text):
                # Look for sentence end in last 500 chars
                search_zone = text[end-500:end]
                for sep in ['. ', '.\n', '? ', '!\n', '! ']:
                    last_sep = search_zone.rfind(sep)
                    if last_sep != -1:
                        end = end - 500 + last_sep + len(sep)
                        break
            
            chunks.append(text[start:end])
            start = end - self.chunk_overlap  # Overlap for context continuity
        
        return chunks

    def _extract_knowledge_from_chunk(self, chunk: str, chunk_num: int, total_chunks: int) -> str:
        """Extract key knowledge points from a single chunk."""
        prompt = f"""You are extracting key knowledge from part {chunk_num} of {total_chunks} of a lecture transcript.

## Instructions:
Extract and summarize the KEY INFORMATION from this section:
1. **Main concepts** explained in this section
2. **Definitions** of any terms introduced
3. **Examples** provided by the instructor
4. **Important points** emphasized
5. **Code/technical details** if any
6. **Announcements** (deadlines, assignments, dates) if any

Be thorough but concise. This will be combined with other sections.
Do NOT add filler text - only extract actual content.

## Transcript Section ({chunk_num}/{total_chunks}):
{chunk}

---
Extract the key knowledge now:"""

        try:
            resp = ollama.generate(model=self.model, prompt=prompt)
            return resp['response']
        except Exception as e:
            print(f"Error extracting from chunk {chunk_num}: {e}")
            return f"[Error processing chunk {chunk_num}]"

    def _build_knowledge_base(self, transcript: str, slides_context: str = "") -> str:
        """Build a condensed knowledge base from full transcript using chunking."""
        chunks = self._chunk_text(transcript)
        
        if len(chunks) == 1:
            # Short transcript, use directly
            print(f"[Ollama] Short transcript ({len(transcript)} chars), using directly")
            return transcript + ("\n\n## Slide Context:\n" + slides_context if slides_context else "")
        
        print(f"[Ollama] Long transcript ({len(transcript)} chars), splitting into {len(chunks)} chunks...")
        
        # Process each chunk
        knowledge_parts = []
        for i, chunk in enumerate(chunks, 1):
            print(f"[Ollama] Processing chunk {i}/{len(chunks)}...")
            knowledge = self._extract_knowledge_from_chunk(chunk, i, len(chunks))
            knowledge_parts.append(f"## Section {i}\n{knowledge}")
        
        # Combine all extracted knowledge
        combined_knowledge = "\n\n".join(knowledge_parts)
        
        # Add slides context
        if slides_context:
            combined_knowledge += f"\n\n## Slide Text (OCR):\n{slides_context}"
        
        print(f"[Ollama] Built knowledge base: {len(combined_knowledge)} chars from {len(transcript)} chars transcript")
        return combined_knowledge

    def generate_notes(self, transcript_text: str, slides_context: str = "") -> Dict[str, str]:
        """
        Generate structured notes from transcript and slide context.
        Uses chunking for long transcripts to build a knowledge base first.
        Returns dict with keys: 'notes', 'summary', 'qa', 'announcements'.
        """

        # Step 1: Build condensed knowledge base from full transcript
        knowledge_base = self._build_knowledge_base(transcript_text, slides_context)

        # ============================================================
        # 1. LECTURE NOTES - Comprehensive, structured, detailed
        # ============================================================
        notes_prompt = f"""You are an expert academic note-taker. Create comprehensive, well-structured lecture notes.

## Instructions:
1. **Clear title** derived from the main topic
2. **Logical structure** with hierarchical headings (##, ###)
3. **ALL key concepts** - definitions, theories, frameworks
4. **Examples** exactly as presented
5. **Code/technical content** in proper code blocks
6. **Tables** where appropriate
7. **Bold** important terms

## Required Sections:
- **Overview** (what this lecture covers)
- **Learning Objectives** (what students should understand)
- **Main Content** (organized by topic)
- **Key Takeaways** (bullet list of most important points)
- **Terms & Definitions** (glossary)

## Knowledge Base (extracted from lecture):
{knowledge_base}

---
Generate comprehensive lecture notes:"""

        # ============================================================
        # 2. SUMMARY - Executive overview
        # ============================================================
        summary_prompt = f"""You are an expert summarizer. Create a comprehensive executive summary.

## Instructions:
1. **Opening**: Main topic and its importance
2. **Core content** (2-3 paragraphs): Key concepts and methodologies
3. **Applications**: How this knowledge is applied
4. **Conclusion**: Main takeaways

Write 400-600 words in prose form (no bullet points).

## Knowledge Base:
{knowledge_base}

---
Generate executive summary:"""

        # ============================================================
        # 3. Q&A FLASHCARDS
        # ============================================================
        qa_prompt = f"""You are creating study flashcards. Generate 15-20 Q&A pairs.

## Instructions:
- Mix of: Conceptual, Application, Comparison, Definition questions
- Format each as:
  ### Q[N]: [Question]
  **A:** [Answer]
- Questions should test understanding, not just recall
- Include specific terminology from the lecture

## Knowledge Base:
{knowledge_base}

---
Generate Q&A flashcards:"""

        # ============================================================
        # 4. ANNOUNCEMENTS
        # ============================================================
        announcements_prompt = f"""Extract announcements and action items from this lecture.

## Look for:
1. **Deadlines** - assignments, projects
2. **Exam/quiz dates**
3. **Resources** - books, tools, links mentioned
4. **Action items** - what students need to do
5. **Schedule changes**

## Format:
### 📅 Deadlines
| Date | Item | Details |
|------|------|---------|

### ⚡ Action Items
- [ ] [Task]

### 📚 Resources
- [Resource]: [Description]

If no announcements found, state "No specific announcements in this lecture."

## Knowledge Base:
{knowledge_base}

---
Extract announcements:"""

        try:
            print("[Ollama] Generating Lecture Notes...")
            notes_resp = ollama.generate(model=self.model, prompt=notes_prompt)

            print("[Ollama] Generating Summary...")
            summary_resp = ollama.generate(model=self.model, prompt=summary_prompt)

            print("[Ollama] Generating Q&A Cards...")
            qa_resp = ollama.generate(model=self.model, prompt=qa_prompt)

            print("[Ollama] Generating Announcements...")
            announcements_resp = ollama.generate(model=self.model, prompt=announcements_prompt)

            return {
                "notes": notes_resp['response'],
                "summary": summary_resp['response'],
                "qa": qa_resp['response'],
                "announcements": announcements_resp['response']
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
