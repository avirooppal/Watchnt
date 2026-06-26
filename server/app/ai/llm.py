import litellm
from typing import List, Dict, Any, AsyncIterator, Type, Optional, Union
from pydantic import BaseModel

# Suppress verbose litellm logging in production
litellm.suppress_debug_info = True
litellm.telemetry = False

async def complete(
    *,
    model: str,
    messages: List[Dict[str, str]],
    response_format: Optional[Type[BaseModel]] = None,
    temperature: float = 0.3,
    max_tokens: int = 4096,
    stream: bool = False,
    api_key: Optional[str] = None,
    api_base: Optional[str] = None
) -> Union[str, BaseModel, AsyncIterator[str]]:
    """
    Unified LLM completion via litellm.
    Supports Cloud providers (OpenAI, Anthropic, Gemini, OpenRouter) and 
    Local providers (Ollama, LM Studio via api_base).
    """
    # Litellm automatically handles BYOK if api_key is passed, otherwise it 
    # falls back to os.environ keys.
    kwargs = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": stream,
    }

    if api_key:
        kwargs["api_key"] = api_key
    if api_base:
        kwargs["api_base"] = api_base
        
    # Structured Output support via Instructor or litellm's native JSON mode
    if response_format:
        kwargs["response_format"] = response_format
        
    try:
        response = await litellm.acompletion(**kwargs)
        
        if stream:
            async def stream_generator():
                async for chunk in response:
                    if chunk.choices and chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
            return stream_generator()
            
        if response_format:
            # When response_format is a Pydantic model, litellm attempts to return a parsed object
            # if the underlying provider supports it natively or through litellm's structured outputs.
            # Assuming Litellm parses it. Otherwise, we would use instructor here.
            message = response.choices[0].message
            # For simplicity in this scaffold, we return the parsed content directly or raw string
            # In production, you might need instructor patching for complex Pydantic models.
            return message.content
            
        return response.choices[0].message.content
        
    except Exception as e:
        # In a real implementation, we would map litellm exceptions to our own domain exceptions
        raise RuntimeError(f"LLM Provider error: {str(e)}") from e
