import json
import httpx
from services.providers.llm.base import LLMProvider


class OpenRouterProvider(LLMProvider):
    # Free and reasoning models can take longer than two minutes to finish.
    timeout_seconds = 300

    def __init__(self, api_key: str, model: str):
        if not api_key:
            raise ValueError("OpenRouter API key is not configured")
        self.api_key = api_key
        self.model = model or "google/gemini-2.5-pro"
        self.url = "https://openrouter.ai/api/v1/chat/completions"

    async def generate_response(self, prompt: str) -> str:
        payload = {"model": self.model, "messages": [{"role": "user", "content": prompt}],
                   "stream": True, "max_tokens": 8192}
        parts, finished = [], False
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(120, connect=15), trust_env=False) as client:
                async with client.stream("POST", self.url, headers={"Authorization": f"Bearer {self.api_key}"}, json=payload) as response:
                    if not response.is_success:
                        raise RuntimeError(f"OpenRouter API error {response.status_code}. Check model availability, API key, and account quota in Settings.")
                    async for line in response.aiter_lines():
                        if not line.startswith("data:"):
                            continue  # Includes upstream keep-alive comments.
                        event = line[5:].strip()
                        if event == "[DONE]":
                            finished = True
                            break
                        data = json.loads(event)
                        if data.get("error"):
                            code = data["error"].get("code", "unknown")
                            code = code if isinstance(code, int) else "unknown"
                            raise RuntimeError(f"OpenRouter API error {code}. The upstream model could not complete the request; retry or choose another model in Settings.")
                        for choice in data.get("choices", []):
                            reason = choice.get("finish_reason")
                            if reason in {"length", "content_filter", "error"}:
                                raise RuntimeError(f"OpenRouter did not finish the answer ({reason}). Try a shorter transcript or another model.")
                            content = choice.get("delta", {}).get("content")
                            if isinstance(content, str):
                                parts.append(content)
                    if not finished:
                        raise RuntimeError("OpenRouter connection ended before the answer finished. Retry processing.")
        except httpx.TimeoutException:
            raise TimeoutError("OpenRouter stopped responding. Retry processing or choose another model in Settings; your transcript is saved.") from None
        except httpx.TransportError:
            raise ConnectionError("OpenRouter connection failed. Check connectivity and retry processing; your transcript is saved.") from None
        except (ValueError, TypeError, AttributeError):
            raise RuntimeError("OpenRouter returned an invalid response. Retry or choose another model in Settings.") from None
        content = "".join(parts).strip()
        if not content:
            raise RuntimeError("OpenRouter returned no answer. The model may have used its output budget for reasoning; try another model.")
        return content
