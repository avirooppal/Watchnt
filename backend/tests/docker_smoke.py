"""Run inside the live backend; no meeting records or settings are modified.

docker compose exec backend python tests/docker_smoke.py [optional-speech.wav]
"""
import json
import sys
import urllib.request

import numpy as np
from websockets.sync.client import connect


def main():
    with urllib.request.urlopen("http://127.0.0.1:8000/health", timeout=5) as response:
        assert response.status == 200
    request = urllib.request.Request("http://127.0.0.1:8000/config/test", data=b"", method="POST")
    with urllib.request.urlopen(request, timeout=150) as response:
        diagnostics = json.load(response)
    assert diagnostics and all(check["status"] == "ok" for check in diagnostics.values()), diagnostics
    print("PASS: HTTP health, cached Whisper, selected AI provider", flush=True)

    if len(sys.argv) > 1:
        from faster_whisper.audio import decode_audio
        audio = decode_audio(sys.argv[1], sampling_rate=16000)
    else:
        audio = np.zeros(16000 * 8, dtype="float32")
    segments = []
    with connect("ws://127.0.0.1:8000/ws/transcribe",
                 origin="chrome-extension://" + "a" * 32, open_timeout=10) as socket:
        socket.send(json.dumps({"sampleRate": 16000, "channels": 2}))
        assert json.loads(socket.recv(timeout=10))["ready"]
        for start in range(0, len(audio), 16000 * 8):
            window = audio[start:start + 16000 * 8]
            packet = np.column_stack((window, np.zeros_like(window))).astype("<f4").tobytes()
            socket.send(packet)
            result = json.loads(socket.recv(timeout=120))
            assert "error" not in result, result
            assert abs(result["processed_seconds"] - (start + len(window)) / 16000) < .001
            segments.extend(result["segments"])
    if len(sys.argv) > 1:
        assert any(segment["text"].strip() for segment in segments), "Speech fixture produced no transcript"
    print(f"PASS: stereo PCM WebSocket capture ({len(audio) / 16000:.1f}s, {len(segments)} segments)")


if __name__ == "__main__":
    main()
