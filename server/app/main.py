from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .api.v1.router import api_router

app = FastAPI(
    title="Watchn't AI Copilot API",
    version="2.0.0",
    description="API for Watchn't Meeting Copilot"
)

# Set up CORS for the extension and web dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to extension ID and web domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_prefix)

@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "ok", "version": "2.0.0"}
