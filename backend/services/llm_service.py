import json
from database.db import SessionLocal
from database.models import Settings
from services.providers.llm_factory import LLMProviderFactory

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
        full_text = " ".join([seg["text"] for seg in transcript_segments])
        prompt = f"Summarize the following meeting transcript. Extract the key points discussed:\n\n{full_text}"
        return await self._generate(prompt)

    async def extract_action_items(self, transcript_segments: list) -> str:
        full_text = " ".join([seg["text"] for seg in transcript_segments])
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
            print(f"Action item validation failed: {e}")
            raise ValueError(f"Failed to extract valid Action Items JSON: {e}")
            
    async def generate_email(self, summary: str, actions_json_str: str) -> str:
        prompt = f"""Draft a professional follow-up email for the meeting based on the summary and action items below.
Format the output as valid HTML that can be directly embedded in an email body. Do not wrap it in markdown code blocks.

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
