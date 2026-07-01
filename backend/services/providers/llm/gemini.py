import httpx
from services.providers.llm.base import LLMProvider

class GeminiProvider(LLMProvider):
    def __init__(self, api_key: str, model: str):
        if not api_key:
            raise ValueError("Gemini API Key is not configured.")
        self.api_key = api_key
        self.model = model or "gemini-2.5-pro"
        # Gemini uses a different URL structure
        self.url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"

    async def generate_response(self, prompt: str) -> str:
        headers = {
            "Content-Type": "application/json"
        }
        data = {
            "contents": [{"parts": [{"text": prompt}]}]
        }
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(self.url, headers=headers, json=data)
            if response.status_code == 200:
                result = response.json()
                try:
                    return result["candidates"][0]["content"]["parts"][0]["text"]
                except KeyError:
                    raise RuntimeError(f"Gemini API unexpected response format: {result}")
            else:
                raise RuntimeError(f"Gemini API error: {response.status_code} - {response.text}")
