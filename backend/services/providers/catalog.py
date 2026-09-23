"""Provider metadata shared by validation, routing, and the Settings UI."""
from dataclasses import dataclass


@dataclass(frozen=True)
class Provider:
    label: str
    docs_url: str
    default_model: str = ""
    endpoint: str = ""
    protocol: str = "openai"


PROVIDERS = {
    "ollama": Provider("Ollama", "https://ollama.com/library", "llama3"),
    "ollama_cloud": Provider("Ollama Cloud", "https://docs.ollama.com/cloud", "gemma4:31b",
                             "https://ollama.com/api/chat", "ollama"),
    "openai": Provider("OpenAI", "https://platform.openai.com/docs/models", "gpt-4o"),
    "anthropic": Provider("Anthropic / Claude", "https://platform.claude.com/docs/en/about-claude/models/overview",
                          endpoint="https://api.anthropic.com/v1/messages", protocol="anthropic"),
    "gemini": Provider("Google Gemini", "https://ai.google.dev/gemini-api/docs/models", "gemini-2.5-pro"),
    "groq": Provider("Groq", "https://console.groq.com/docs/models", "llama-3.3-70b-versatile"),
    "openrouter": Provider("OpenRouter", "https://openrouter.ai/models", "google/gemini-2.5-pro"),
    "deepseek": Provider("DeepSeek", "https://api-docs.deepseek.com/",
                         endpoint="https://api.deepseek.com/chat/completions"),
    "mistral": Provider("Mistral AI", "https://docs.mistral.ai/getting-started/models",
                        endpoint="https://api.mistral.ai/v1/chat/completions"),
    "together": Provider("Together AI", "https://docs.together.ai/docs/serverless-models",
                         endpoint="https://api.together.ai/v1/chat/completions"),
    "fireworks": Provider("Fireworks AI", "https://fireworks.ai/models",
                          endpoint="https://api.fireworks.ai/inference/v1/chat/completions"),
    "cerebras": Provider("Cerebras", "https://inference-docs.cerebras.ai/models/overview",
                         endpoint="https://api.cerebras.ai/v1/chat/completions"),
    "xai": Provider("xAI / Grok", "https://docs.x.ai/developers/models",
                    endpoint="https://api.x.ai/v1/chat/completions"),
}

NEW_CLOUD_PROVIDERS = tuple(name for name, provider in PROVIDERS.items() if provider.endpoint)
API_KEY_FIELDS = tuple(f"{name}_api_key" for name in PROVIDERS if name != "ollama")


def public_catalog():
    return [{"id": name, "label": provider.label, "cloud": name != "ollama",
             "default_model": provider.default_model, "docs_url": provider.docs_url}
            for name, provider in PROVIDERS.items()]
