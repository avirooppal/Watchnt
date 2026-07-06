import json
import time
import asyncio
from typing import Any, Dict, List
from database.db import SessionLocal
from database.models import Settings
from services.providers.llm_factory import LLMProviderFactory
from services.prompt_registry import PromptRegistry

from core.logging import get_logger
logger = get_logger(__name__)

class LLMService:
    def __init__(self):
        pass

    def _get_settings(self) -> Settings:
        db = SessionLocal()
        try:
            settings = db.query(Settings).filter(Settings.id == "default").first()
            if not settings:
                settings = Settings(id="default")
            return settings
        finally:
            db.close()

    async def _generate(self, prompt: str) -> str:
        settings = self._get_settings()
        provider = LLMProviderFactory.create(settings)
        
        max_retries = 4
        base_delay = 3
        
        for attempt in range(max_retries):
            try:
                return await provider.generate_response(prompt)
            except Exception as e:
                error_str = str(e).lower()
                is_rate_limit = any(term in error_str for term in ["429", "502", "resourceexhausted", "rate limit", "unexpected response"])
                
                if attempt == max_retries - 1 or not is_rate_limit:
                    raise
                
                delay = base_delay * (2 ** attempt)
                logger.warning(f"Rate limited or resource exhausted. Retrying in {delay}s (Attempt {attempt+1}/{max_retries})...")
                await asyncio.sleep(delay)

    async def _execute_prompt(self, key: str, transcript_text: str) -> Dict[str, Any]:
        """
        Executes a prompt from the registry, extracts JSON, validates against the schema,
        and returns the result along with processing metadata.
        """
        start_time = time.time()
        
        prompt_def = PromptRegistry.get(key)
        prompt_text = prompt_def.template.format(transcript=transcript_text)
        
        # Inject exact JSON schema instructions if applicable
        if prompt_def.expected_schema:
            schema_instruction = "\n\nCRITICAL: You must return ONLY valid JSON. "
            if hasattr(prompt_def.expected_schema, "__args__"): # List types
                item_type = prompt_def.expected_schema.__args__[0]
                if hasattr(item_type, "model_json_schema"):
                    schema_instruction += f"Return a JSON array where each item matches this schema:\n{json.dumps(item_type.model_json_schema(), indent=2)}"
                else:
                    schema_instruction += "Return a JSON array of strings."
            elif hasattr(prompt_def.expected_schema, "model_json_schema"):
                schema_instruction += f"Return a JSON object matching this exact schema:\n{json.dumps(prompt_def.expected_schema.model_json_schema(), indent=2)}"
            prompt_text += schema_instruction
        
        settings = self._get_settings()
        
        try:
            response_text = await self._generate(prompt_text)
            
            # Clean possible markdown block
            clean_text = response_text.strip()
            if clean_text.startswith("```json"): clean_text = clean_text[7:]
            if clean_text.startswith("```"): clean_text = clean_text[3:]
            if clean_text.endswith("```"): clean_text = clean_text[:-3]
            clean_text = clean_text.strip()
            
            # Parse JSON
            parsed_data = json.loads(clean_text)
            
            # Validate schema
            if prompt_def.expected_schema:
                if isinstance(parsed_data, list):
                    # For List[Schema]
                    # This is a bit of a hack for typing.List validation, assuming it's a Pydantic model inside.
                    item_type = prompt_def.expected_schema.__args__[0]
                    validated_data = [item_type(**item).model_dump() for item in parsed_data]
                else:
                    # For Schema directly
                    validated_data = prompt_def.expected_schema(**parsed_data).model_dump()
            else:
                validated_data = parsed_data
            
            duration_ms = int((time.time() - start_time) * 1000)
            
            return {
                "status": "completed",
                "metadata": {
                    "provider": settings.llm_provider,
                    "model": settings.llm_model,
                    "prompt_version": prompt_def.version,
                    "processing_ms": duration_ms
                },
                "data": validated_data
            }
            
        except Exception as e:
            logger.error(f"Error executing prompt {key}: {e}", exc_info=True)
            duration_ms = int((time.time() - start_time) * 1000)
            return {
                "status": "failed",
                "error": str(e),
                "metadata": {
                    "provider": settings.llm_provider,
                    "model": settings.llm_model,
                    "prompt_version": prompt_def.version,
                    "processing_ms": duration_ms
                },
                "data": None
            }

    async def generate_title(self, transcript_text: str) -> str:
        # Title prompt is special as it returns a string directly, not JSON.
        prompt_def = PromptRegistry.get("title")
        prompt_text = prompt_def.template.format(transcript=transcript_text)
        try:
            return await self._generate(prompt_text)
        except Exception as e:
            logger.error(f"Failed to generate title: {e}")
            return "Untitled Meeting"

    async def generate_summary(self, transcript_text: str) -> Dict[str, Any]:
        return await self._execute_prompt("summary", transcript_text)

    async def generate_executive_brief(self, transcript_text: str) -> Dict[str, Any]:
        return await self._execute_prompt("executive_brief", transcript_text)

    async def extract_actions(self, transcript_text: str) -> Dict[str, Any]:
        return await self._execute_prompt("actions", transcript_text)

    async def extract_decisions(self, transcript_text: str) -> Dict[str, Any]:
        return await self._execute_prompt("decisions", transcript_text)

    async def generate_email(self, transcript_text: str) -> Dict[str, Any]:
        return await self._execute_prompt("email", transcript_text)

    async def generate_timeline(self, transcript_text: str) -> Dict[str, Any]:
        return await self._execute_prompt("timeline", transcript_text)

    async def extract_entities(self, transcript_text: str) -> Dict[str, Any]:
        return await self._execute_prompt("entities", transcript_text)

    async def generate_search_index(self, transcript_text: str) -> Dict[str, Any]:
        return await self._execute_prompt("search_index", transcript_text)

    async def chat_with_meeting(self, transcript_segments: list, messages: list) -> str:
        full_text = "\n".join([f"[{seg.get('speaker', 'All')}]: {seg['text']}" for seg in transcript_segments])
        
        # Build prompt from conversation history
        prompt = f"You are an AI assistant answering questions about the following meeting transcript.\n\nTranscript:\n{full_text}\n\nConversation History:\n"
        for msg in messages:
            role = "User" if msg["role"] == "user" else "Assistant"
            prompt += f"{role}: {msg['content']}\n"
            
        prompt += "Assistant: "
        
        return await self._generate(prompt)
