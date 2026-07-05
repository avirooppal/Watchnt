import json
from database.db import SessionLocal
from database.models import Settings
from services.providers.llm_factory import LLMProviderFactory

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
        return await provider.generate_response(prompt)

    async def summarize_meeting(self, transcript_segments: list) -> str:
        full_text = "\n".join([f"[{seg.get('speaker', 'All')}]: {seg['text']}" for seg in transcript_segments])
        settings = self._get_settings()
        
        if settings.summary_prompt_template:
            prompt = settings.summary_prompt_template.format(transcript=full_text)
        else:
            prompt = f"Summarize the following meeting transcript. Extract the key points discussed:\n\n{full_text}"
            
        return await self._generate(prompt)

    async def extract_action_items(self, transcript_segments: list) -> str:
        full_text = "\n".join([f"[{seg.get('speaker', 'All')}]: {seg['text']}" for seg in transcript_segments])
        prompt = f"""Extract a list of action items from the following meeting transcript.
Return ONLY a valid JSON array of objects, with no markdown formatting, no backticks, and no explanation.
Each object must exactly match this schema:
{{
  "owner": "Name of the person responsible",
  "task": "Description of the task",
  "deadline": "When it is due, or 'None'",
  "priority": "High, Medium, or Low"
}}

Transcript:
{full_text}
"""
        response_text = await self._generate(prompt)
        
        # Pydantic validation
        from pydantic import BaseModel
        class ActionItem(BaseModel):
            owner: str
            task: str
            deadline: str
            priority: str
            
        try:
            # Clean possible markdown
            clean_text = response_text.strip()
            if clean_text.startswith("```json"): clean_text = clean_text[7:]
            if clean_text.startswith("```"): clean_text = clean_text[3:]
            if clean_text.endswith("```"): clean_text = clean_text[:-3]
            clean_text = clean_text.strip()
            
            items = json.loads(clean_text)
            validated_items = [ActionItem(**item).model_dump() for item in items]
            return json.dumps(validated_items)
        except Exception as e:
            logger.error(f"Action item validation failed: {e}", exc_info=True)
            raise ValueError(f"Failed to extract valid Action Items JSON: {e}")
            
    async def generate_email(self, summary: str, actions_json_str: str) -> str:
        settings = self._get_settings()
        
        if settings.email_prompt_template:
            prompt = settings.email_prompt_template.format(summary=summary, actions=actions_json_str)
        else:
            prompt = f"""Draft a professional follow-up email for the meeting based on the summary and action items below.
Format the output as plain text. Do not use HTML tags or markdown code blocks.

Summary:
{summary}

Action Items:
{actions_json_str}
"""
        response_text = await self._generate(prompt)
        
        # Clean possible markdown
        clean_text = response_text.strip()
        if clean_text.startswith("```html"): clean_text = clean_text[7:]
        if clean_text.startswith("```"): clean_text = clean_text[3:]
        if clean_text.endswith("```"): clean_text = clean_text[:-3]
        return clean_text.strip()
        
    async def chat_with_meeting(self, transcript_segments: list, messages: list) -> str:
        full_text = "\n".join([f"[{seg.get('speaker', 'All')}]: {seg['text']}" for seg in transcript_segments])
        
        # Build prompt from conversation history
        prompt = f"You are an AI assistant answering questions about the following meeting transcript.\n\nTranscript:\n{full_text}\n\nConversation History:\n"
        for msg in messages:
            role = "User" if msg["role"] == "user" else "Assistant"
            prompt += f"{role}: {msg['content']}\n"
            
        prompt += "Assistant: "
        
        return await self._generate(prompt)
