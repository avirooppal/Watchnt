import httpx
import json

class LLMService:
    def __init__(self, provider: str = "ollama"):
        self.provider = provider
        self.ollama_url = "http://localhost:11434/api/generate"
        self.model = "llama3" # Default Ollama model to use

    async def generate_response(self, prompt: str) -> str:
        if self.provider == "ollama":
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.ollama_url,
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "stream": False
                    },
                    timeout=60.0
                )
                if response.status_code == 200:
                    return response.json().get("response", "")
                else:
                    try:
                        error_msg = response.json().get("error", response.text)
                    except:
                        error_msg = response.text
                    return f"Error: Ollama returned {response.status_code} - {error_msg}"
        return "Hello"

    async def summarize_meeting(self, transcript_segments: list) -> str:
        # Task 5.3: Summary Prompt
        full_text = " ".join([seg["text"] for seg in transcript_segments])
        prompt = f"Summarize the following meeting transcript. Extract the key points discussed:\n\n{full_text}"
        return await self.generate_response(prompt)

    async def extract_action_items(self, transcript_segments: list) -> str:
        # Task 6.1: Prompt for Action Items
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
        response_text = await self.generate_response(prompt)
        
        # Pydantic validation
        from pydantic import BaseModel
        from typing import List
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
            # Validate each item
            validated_items = [ActionItem(**item).dict() for item in items]
            return json.dumps(validated_items)
        except Exception as e:
            # If validation fails, return the raw response or empty array
            print(f"Action item validation failed: {e}")
            return response_text

if __name__ == "__main__":
    import asyncio
    async def test():
        service = LLMService()
        print("Testing basic generation...")
        print(await service.generate_response("Say hello!"))
    asyncio.run(test())
