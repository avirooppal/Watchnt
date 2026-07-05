from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.transcription_service import TranscriptionService
from services.llm_service import LLMService
import tempfile
import os

from core.logging import get_logger
logger = get_logger(__name__)

router = APIRouter()
transcription_service = TranscriptionService()

@router.websocket("/ws/transcribe")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connection established")
    
    temp_dir = tempfile.gettempdir()
    session_id = id(websocket)
    temp_audio_path = os.path.join(temp_dir, f"chunk_{session_id}.webm")
    
    full_transcript = []
    
    try:
        while True:
            # Receive audio chunk from frontend
            data = await websocket.receive_bytes()
            logger.info(f"Received chunk of {len(data)} bytes")
            
            # Save JUST this chunk to a temporary file
            with open(temp_audio_path, "wb") as f:
                f.write(data)
                
            # Transcribe the individual chunk
            try:
                segments = transcription_service.transcribe(temp_audio_path)
                if segments:
                    chunk_text = " ".join([seg["text"] for seg in segments])
                    
                    if chunk_text.strip():
                        full_transcript.append(chunk_text.strip())
                    
                    # Send the combined transcript back
                    combined_text = " ".join(full_transcript)
                    await websocket.send_json({"transcript": combined_text})
                
            except Exception as e:
                logger.error(f"Transcription error: {e}", exc_info=True)
                
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
    finally:
        if os.path.exists(temp_audio_path):
            try:
                os.remove(temp_audio_path)
            except:
                pass
