from abc import ABC, abstractmethod
from typing import List, Dict

class TranscriptionProvider(ABC):
    @abstractmethod
    def transcribe(self, audio_path: str) -> List[Dict]:
        """
        Transcribe an audio file and return a list of segments.
        Each segment should be a dict with keys: 'start', 'end', 'text'
        """
        pass
