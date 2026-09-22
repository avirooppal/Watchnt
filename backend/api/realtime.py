"""Bounded 16 kHz float32 PCM windows, never arbitrary WebM fragments."""
import asyncio
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.transcription_service import TranscriptionService
from services.providers.transcription_factory import TranscriptionProviderFactory

router = APIRouter()

@router.websocket("/ws/transcribe")
async def websocket_endpoint(websocket: WebSocket):
    origin = websocket.headers.get("origin", "")
    if not origin.startswith("chrome-extension://") and origin not in {"http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8000"}:
        await websocket.close(code=1008)
        return
    await websocket.accept()
    offset = 0.0
    try:
        config = await asyncio.wait_for(websocket.receive_json(), 10)
        channels = config.get("channels", 1)
        if channels not in (1, 2) or config.get("sampleRate") != 16000:
            await websocket.close(code=1008, reason="Expected 16 kHz PCM, one or two channels")
            return
        provider = TranscriptionProviderFactory.create(TranscriptionService()._get_settings())
        await websocket.send_json({"ready": True})
        while True:
            packet = await websocket.receive_bytes()
            if not packet or len(packet) % (4 * channels) or len(packet) > 16000 * 12 * channels * 4:
                await websocket.close(code=1009, reason="Invalid or oversized PCM window")
                return
            samples = np.frombuffer(packet, dtype="<f4").reshape(-1, channels)
            if not np.isfinite(samples).all():
                await websocket.close(code=1008)
                return
            def infer():
                results = []
                for channel in range(channels):
                    audio = np.ascontiguousarray(samples[:, channel])
                    # Cheap silence gate ahead of Silero VAD; skip digital silence only.
                    if np.max(np.abs(audio)) < 0.0001:
                        continue
                    for segment in provider.transcribe(audio):
                        segment["start"] += offset
                        segment["end"] += offset
                        segment["speaker"] = ("Others" if channel == 0 else "Me") if channels == 2 else "Unknown"
                        results.append(segment)
                return sorted(results, key=lambda item: item["start"])
            segments = await asyncio.to_thread(infer)
            offset += len(samples) / 16000
            await websocket.send_json({"segments": segments, "processed_seconds": offset})
    except WebSocketDisconnect:
        pass
    except Exception as error:
        try:
            await websocket.send_json({"error": str(error)})
            await websocket.close(code=1011)
        except RuntimeError:
            pass
