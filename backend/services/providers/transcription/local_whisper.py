from typing import List, Dict
from functools import lru_cache
from threading import RLock
import math
from services.providers.transcription.base import TranscriptionProvider

# Serialize CPU inference across live sessions and uploads to bound laptop load.
INFERENCE_LOCK = RLock()

@lru_cache(maxsize=1)
def load_model(model_size):
    from faster_whisper import WhisperModel
    from faster_whisper.utils import download_model
    from pathlib import Path
    # Keep existing multilingual base weights: no larger mandatory model download.
    # CPU int8 + Silero VAD is preferable here to large distilled English checkpoints.
    model_path = download_model(model_size, local_files_only=True)
    # Older faster-whisper versions fetch a fallback tokenizer if this file is absent.
    # Reject an incomplete cache instead of silently reaching the network.
    if not (Path(model_path) / "tokenizer.json").is_file():
        raise RuntimeError("Cached Whisper tokenizer is missing; explicitly reinstall the model")
    return WhisperModel(model_path, device="cpu", compute_type="int8", cpu_threads=4,
                        local_files_only=True)

class LocalWhisperProvider(TranscriptionProvider):
    def __init__(self, model_size="base", language=None):
        self.model_size = model_size
        self.language = language

    def transcribe(self, audio_path) -> List[Dict]:
        with INFERENCE_LOCK:
            try:
                model = load_model(self.model_size)
            except Exception as exc:
                raise RuntimeError("Local Whisper weights are unavailable. Download the selected model explicitly using the setup instructions; audio is never sent to cloud STT.") from exc
            segments, info = model.transcribe(
                audio_path, language=self.language, task="transcribe", beam_size=3,
                vad_filter=True, vad_parameters=dict(min_silence_duration_ms=500),
                condition_on_previous_text=False)
            return [{"start": s.start, "end": s.end, "text": s.text.strip(),
                     "language": info.language,
                     "language_probability": info.language_probability,
                     # This is an ASR score, not calibrated word accuracy.
                     "confidence": round(min(1.0, math.exp(s.avg_logprob)), 3)}
                    for s in segments if s.text.strip() and s.no_speech_prob < 0.85]
