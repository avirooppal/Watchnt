from typing import List, Dict
from services.providers.transcription.base import TranscriptionProvider
import os
import sys

# We lazily import faster_whisper to handle failures gracefully
class LocalWhisperProvider(TranscriptionProvider):
    def __init__(self, model_size: str = "base"):
        self.model_size = model_size
        self.model = None

    def _get_model(self):
        if self.model is None:
            try:
                from faster_whisper import WhisperModel
                print(f"Loading Whisper model '{self.model_size}' on CPU (int8)...")
                self.model = WhisperModel(self.model_size, device="cpu", compute_type="int8")
            except Exception as e:
                raise RuntimeError(f"Local transcription is unavailable because the audio could not be decoded. Install FFmpeg or switch to a cloud transcription provider. Details: {str(e)}")
        return self.model

    def transcribe(self, audio_path: str) -> List[Dict]:
        print(f"Transcribing {audio_path} locally...")
        model = self._get_model()
        
        try:
            segments, info = model.transcribe(audio_path, beam_size=5)
        except Exception as e:
            raise RuntimeError(f"Local transcription is unavailable because the audio could not be decoded. Install FFmpeg or switch to a cloud transcription provider. Details: {str(e)}")
            
        results = []
        for segment in segments:
            results.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text
            })
            
        return results
