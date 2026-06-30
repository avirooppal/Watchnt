import sys
import os

# Add backend to path so we can import config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from faster_whisper import WhisperModel
from config import settings

class WhisperService:
    def __init__(self):
        self.model_size = settings.whisper_model
        self.model = None

    def _get_model(self):
        if self.model is None:
            print(f"Loading Whisper model '{self.model_size}' on CPU (int8)...")
            self.model = WhisperModel(self.model_size, device="cpu", compute_type="int8")
            print("Whisper model loaded successfully!")
        return self.model

    def transcribe(self, audio_path: str):
        print(f"Transcribing {audio_path}...")
        model = self._get_model()
        segments, info = model.transcribe(audio_path, beam_size=5)
        
        print("Detected language '%s' with probability %f" % (info.language, info.language_probability))
        
        results = []
        for segment in segments:
            print("[%.2fs -> %.2fs] %s" % (segment.start, segment.end, segment.text))
            results.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text
            })
            
        return results

# We can initialize it lazily or eagerly. We'll do it lazily in endpoints, 
# but for the test, we'll initialize it if the script is run directly.
if __name__ == "__main__":
    service = WhisperService()
    # To test transcription, you need a test.wav file
    # service.transcribe("test.wav")
