import httpx
from typing import List, Dict
from services.providers.transcription.base import TranscriptionProvider

class OpenAIWhisperProvider(TranscriptionProvider):
    def __init__(self, api_key: str, model: str = "whisper-1"):
        if not api_key:
            raise ValueError("OpenAI API Key is not configured.")
        self.api_key = api_key
        self.model = model
        self.url = "https://api.openai.com/v1/audio/transcriptions"

    def transcribe(self, audio_path: str) -> List[Dict]:
        print(f"Transcribing {audio_path} via OpenAI ({self.model})...")
        
        headers = {
            "Authorization": f"Bearer {self.api_key}"
        }
        
        with open(audio_path, "rb") as f:
            files = {
                "file": (audio_path, f, "audio/webm")
            }
            data = {
                "model": self.model,
                "response_format": "verbose_json"
            }
            
            with httpx.Client(timeout=120.0) as client:
                response = client.post(self.url, headers=headers, files=files, data=data)
                
        if response.status_code != 200:
            raise RuntimeError(f"OpenAI API error: {response.status_code} - {response.text}")
            
        result = response.json()
        segments = result.get("segments", [])
        
        formatted = []
        for seg in segments:
            formatted.append({
                "start": seg.get("start", 0.0),
                "end": seg.get("end", 0.0),
                "text": seg.get("text", "")
            })
            
        return formatted
