from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.whisper_service import WhisperService
import tempfile
import os

router = APIRouter()
whisper_service = WhisperService()

@router.websocket("/ws/transcribe")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("WebSocket connection established")
    
    # We will accumulate audio chunks in a temporary file
    temp_dir = tempfile.gettempdir()
    temp_audio_path = os.path.join(temp_dir, "live_audio.webm")
    
    with open(temp_audio_path, "wb") as f:
        pass # Create/clear file
        
    try:
        while True:
            # Receive audio chunk from frontend
            data = await websocket.receive_bytes()
            print(f"Received chunk of {len(data)} bytes")
            
            # Append chunk to our temporary file
            with open(temp_audio_path, "ab") as f:
                f.write(data)
                
            # Transcribe the accumulated audio
            try:
                # We could transcribe just the chunk, but Whisper expects a valid audio file.
                # Accumulating and transcribing the whole thing is simpler for this MVP.
                # A more advanced approach would use a sliding window or a streaming audio format.
                segments = whisper_service.transcribe(temp_audio_path)
                
                # We just need the text of the latest transcription
                full_text = " ".join([seg["text"] for seg in segments])
                
                # Send the partial/live transcript back
                await websocket.send_json({"transcript": full_text})
                
            except Exception as e:
                print(f"Transcription error: {e}")
                
    except WebSocketDisconnect:
        print("WebSocket disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        if os.path.exists(temp_audio_path):
            try:
                os.remove(temp_audio_path)
            except:
                pass
