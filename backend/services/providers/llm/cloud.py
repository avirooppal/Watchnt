"""Hosted text providers, with fixed endpoints and no browser-side credentials."""
import httpx

from services.providers.catalog import PROVIDERS, NEW_CLOUD_PROVIDERS
from services.providers.llm.base import LLMProvider


class CloudProvider(LLMProvider):
    def __init__(self, provider: str, api_key: str, model: str):
        if provider not in NEW_CLOUD_PROVIDERS:
            raise ValueError("Unsupported cloud provider")
        self.provider = PROVIDERS[provider]
        self.api_key = (api_key or "").strip()
        self.model = (model or "").strip() or self.provider.default_model
        if not self.api_key or "****" in self.api_key:
            raise ValueError(f"{self.provider.label} API key is not configured")
        if not self.model:
            raise ValueError(f"Enter a model ID from your {self.provider.label} account in Settings")

    async def generate_response(self, prompt: str) -> str:
        protocol = self.provider.protocol
        headers = {"Authorization": f"Bearer {self.api_key}"}
        payload = {"model": self.model, "messages": [{"role": "user", "content": prompt}], "stream": False}
        if protocol == "anthropic":
            headers = {"x-api-key": self.api_key, "anthropic-version": "2023-06-01"}
            payload["max_tokens"] = 4096
        try:
            async with httpx.AsyncClient(timeout=120, trust_env=False, follow_redirects=False) as client:
                response = await client.post(self.provider.endpoint, headers=headers, json=payload)
        except httpx.TimeoutException:
            raise RuntimeError(f"{self.provider.label} request timed out; try again") from None
        except httpx.HTTPError:
            raise RuntimeError(f"Could not connect to {self.provider.label}") from None
        # Never echo vendor response bodies: they can contain credentials or meeting text.
        if not response.is_success:
            hint = {
                401: "Check your API key", 403: "Check API key permissions and model access",
                404: "Check the model ID and account access", 429: "Rate limit or quota exceeded; try later",
            }.get(response.status_code, "Check the model ID, account quota, and provider status")
            raise RuntimeError(f"{self.provider.label} API error {response.status_code}: {hint}")
        try:
            data = response.json()
            if protocol == "anthropic":
                content, finish = data["content"], data.get("stop_reason")
            elif protocol == "ollama":
                content, finish = data["message"]["content"], data.get("done_reason")
            else:
                choice = data["choices"][0]
                content, finish = choice["message"]["content"], choice.get("finish_reason")
            if finish in {"length", "max_tokens"}:
                raise RuntimeError(f"{self.provider.label} output was truncated; use a shorter transcript or another model")
            if isinstance(content, list):
                content = "\n".join(part["text"] for part in content if part.get("type") == "text")
            if not isinstance(content, str) or not content.strip():
                raise ValueError("Missing text")
            return content.strip()
        except (ValueError, KeyError, IndexError, TypeError, AttributeError):
            raise RuntimeError(f"{self.provider.label} returned no usable text; check model compatibility or content restrictions") from None
