from typing import Dict, List, Optional
from app.services.llm import get_provider, LLMProvider
from app.core.config_store import config_store


class LLMService:
    """Orchestration layer for LLM operations.

    Handles chunking, prompt templates, and knowledge base building.
    Delegates raw text generation to the active LLMProvider.
    """

    def __init__(self, provider_name: Optional[str] = None, model: Optional[str] = None):
        name = provider_name or config_store.get("LLM_PROVIDER")

        if name == "openai":
            from app.services.llm.openai_provider import OpenAIProvider
            api_key = config_store.get("OPENAI_API_KEY")
            default_model = model or config_store.get("LLM_MODEL") or "gpt-4o"
            self.provider = OpenAIProvider(api_key=api_key, default_model=default_model)
        elif name == "ollama":
            from app.services.llm.ollama_provider import OllamaProvider
            base_url = config_store.get("OLLAMA_BASE_URL")
            default_model = model or config_store.get("LLM_MODEL") or "gpt-oss:20b"
            self.provider = OllamaProvider(base_url=base_url, default_model=default_model)
        else:
            self.provider = get_provider(name)

        self._model_override = model
        self.chunk_size = 8000
        self.chunk_overlap = 500

    def _chunk_text(self, text: str) -> List[str]:
        if len(text) <= self.chunk_size:
            return [text]

        chunks = []
        start = 0
        while start < len(text):
            end = start + self.chunk_size

            if end < len(text):
                search_zone = text[end - 500:end]
                for sep in ['. ', '.\n', '? ', '!\n', '! ']:
                    last_sep = search_zone.rfind(sep)
                    if last_sep != -1:
                        end = end - 500 + last_sep + len(sep)
                        break

            chunks.append(text[start:end])
            start = end - self.chunk_overlap

        return chunks

    def _extract_knowledge_from_chunk(self, chunk: str, chunk_num: int, total_chunks: int) -> str:
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
            return self.provider.generate_text(prompt, model=self._model_override)
        except Exception as e:
            print(f"Error extracting from chunk {chunk_num}: {e}")
            return f"[Error processing chunk {chunk_num}]"

    def _build_knowledge_base(self, transcript: str, slides_context: str = "") -> str:
        chunks = self._chunk_text(transcript)

        if len(chunks) == 1:
            print(f"[LLMService] Short transcript ({len(transcript)} chars), using directly")
            return transcript + ("\n\n## Slide Context:\n" + slides_context if slides_context else "")

        print(f"[LLMService] Long transcript ({len(transcript)} chars), splitting into {len(chunks)} chunks...")

        knowledge_parts = []
        for i, chunk in enumerate(chunks, 1):
            print(f"[LLMService] Processing chunk {i}/{len(chunks)}...")
            knowledge = self._extract_knowledge_from_chunk(chunk, i, len(chunks))
            knowledge_parts.append(f"## Section {i}\n{knowledge}")

        combined_knowledge = "\n\n".join(knowledge_parts)

        if slides_context:
            combined_knowledge += f"\n\n## Slide Text (OCR):\n{slides_context}"

        print(f"[LLMService] Built knowledge base: {len(combined_knowledge)} chars from {len(transcript)} chars transcript")
        return combined_knowledge

    def generate_notes(self, transcript_text: str, slides_context: str = "", model: Optional[str] = None) -> Dict[str, str]:
        effective_model = model or self._model_override
        knowledge_base = self._build_knowledge_base(transcript_text, slides_context)

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

        announcements_prompt = f"""Extract announcements and action items from this lecture.

## Look for:
1. **Deadlines** - assignments, projects
2. **Exam/quiz dates**
3. **Resources** - books, tools, links mentioned
4. **Action items** - what students need to do
5. **Schedule changes**

## Format:
### Deadlines
| Date | Item | Details |
|------|------|---------|

### Action Items
- [ ] [Task]

### Resources
- [Resource]: [Description]

If no announcements found, state "No specific announcements in this lecture."

## Knowledge Base:
{knowledge_base}

---
Extract announcements:"""

        try:
            print("[LLMService] Generating Lecture Notes...")
            notes = self.provider.generate_text(notes_prompt, model=effective_model)

            print("[LLMService] Generating Summary...")
            summary = self.provider.generate_text(summary_prompt, model=effective_model)

            print("[LLMService] Generating Q&A Cards...")
            qa = self.provider.generate_text(qa_prompt, model=effective_model)

            print("[LLMService] Generating Announcements...")
            announcements = self.provider.generate_text(announcements_prompt, model=effective_model)

            return {
                "notes": notes,
                "summary": summary,
                "qa": qa,
                "announcements": announcements,
            }

        except Exception as e:
            print(f"LLM generation error: {e}")
            raise

    def list_models(self) -> List[str]:
        return self.provider.list_models()

    def validate_connection(self) -> bool:
        return self.provider.validate_connection()
