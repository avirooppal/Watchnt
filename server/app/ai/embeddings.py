import litellm
from typing import List

async def generate_embeddings(texts: List[str], model: str = "text-embedding-3-small") -> List[List[float]]:
    """
    Generates embeddings for a list of text chunks using litellm.
    Supports OpenAI, Cohere, etc. based on the model string.
    """
    try:
        response = await litellm.aembedding(
            model=model,
            input=texts
        )
        
        # litellm returns a similar structure to OpenAI's native API
        # We extract the embedding vectors and return them in the same order
        embeddings = [data["embedding"] for data in response.data]
        return embeddings
        
    except Exception as e:
        raise RuntimeError(f"Embedding generation failed: {str(e)}") from e
