import httpx
from services.providers.llm.base import LLMProvider

class OpenRouterProvider(LLMProvider):
    def __init__(self, api_key: str, model: str):
        if not api_key:
            raise ValueError("OpenRouter API Key is not configured.")
        self.api_key = api_key
        self.model = model or "google/gemini-2.5-pro"
        self.url = "https://openrouter.ai/api/v1/chat/completions"

    async def generate_response(self, prompt: str) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        data = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3
        }
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(self.url, headers=headers, json=data)
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"]
            else:
                raise RuntimeError(f"OpenRouter API error: {response.status_code} - {response.text}")
