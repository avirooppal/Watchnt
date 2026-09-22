from abc import ABC, abstractmethod

class AIProvider(ABC):
    @abstractmethod
    async def generate_response(self, prompt: str) -> str:
        """
        Generate a text response from the given prompt.
        """
        pass

# Backward compatible name used by all five provider adapters.
LLMProvider = AIProvider
