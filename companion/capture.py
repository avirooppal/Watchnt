"""Windows display + WASAPI loopback + microphone. No browser media streams."""
import ctypes
import json
import os
import queue
import threading
import time
import uuid
from fractions import Fraction
from pathlib import Path

import av
import httpx
import mss
import numpy as np
import pyaudiowpatch as pa
from websockets.sync.client import connect

API = "http://127.0.0.1:8000"
ROOT = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "WatchNT" / "recordings"
RATE = 16000
BLOCK = 1600


class AudioInput:
    def __init__(self, audio, device):
        self.device = device
        self.queue = queue.Queue(maxsize=200)
        self.error = None
        self.pending = np.empty(0, dtype=np.float32)
        self.resampler = av.AudioResampler(format="flt", layout="mono", rate=RATE)
        self.rate = int(device["defaultSampleRate"])
        self.channels = int(device["maxInputChannels"])
        self.samples = 0
        self.last_data = time.monotonic()
        self.stream = audio.open(format=pa.paFloat32, channels=self.channels,
                                 rate=self.rate, input=True,
                                 input_device_index=device["index"], frames_per_buffer=1024,
                                 stream_callback=self.callback)

    def callback(self, data, _frames, _times, status):
        if status & pa.paInputOverflow:
            self.error = "An audio device dropped samples. Recording stopped; partial video is retained."
        try:
            self.queue.put_nowait(data)
        except queue.Full:
            self.error = "Audio capture could not keep up. Partial recording is retained."
        return None, pa.paContinue

    def read(self, count):
        if self.error:
            raise RuntimeError(self.error)
        if not self.stream.is_active():
            raise RuntimeError("An audio device disconnected. Reconnect it before recording again.")
        blocks = [self.pending]
        while True:
            try:
                data = self.queue.get_nowait()
            except queue.Empty:
                break
            self.last_data = time.monotonic()
            mono = np.frombuffer(data, dtype=np.float32).reshape(-1, self.channels).mean(axis=1)
            frame = av.AudioFrame.from_ndarray(mono.reshape(1, -1), format="flt", layout="mono")
            frame.sample_rate = self.rate
            frame.pts = self.samples
            self.samples += len(mono)
            for converted in self.resampler.resample(frame):
                blocks.append(converted.to_ndarray().reshape(-1))
        data = np.concatenate(blocks)
        result = np.zeros(count, dtype=np.float32)
        used = min(count, len(data))
        result[:used] = data[:used]
        self.pending = data[used:]
        if len(self.pending) > RATE * 2:
            raise RuntimeError("Audio capture fell behind. Partial recording is retained.")
        return result

    def close(self):
        self.stream.stop_stream()
        self.stream.close()


def foreground_monitor(monitors):
    """Select the display holding the browser/toolbar at Start, in physical pixels."""
    class Rect(ctypes.Structure):
        _fields_ = [(name, ctypes.c_long) for name in ("left", "top", "right", "bottom")]
    class Info(ctypes.Structure):
        _fields_ = [("size", ctypes.c_ulong), ("monitor", Rect), ("work", Rect), ("flags", ctypes.c_ulong)]
    user = ctypes.windll.user32
    user.GetForegroundWindow.restype = ctypes.c_void_p
    user.MonitorFromWindow.argtypes = [ctypes.c_void_p, ctypes.c_ulong]
    user.MonitorFromWindow.restype = ctypes.c_void_p
    user.GetMonitorInfoW.argtypes = [ctypes.c_void_p, ctypes.POINTER(Info)]
    info = Info()
    info.size = ctypes.sizeof(info)
    handle = user.MonitorFromWindow(user.GetForegroundWindow(), 2)
    if user.GetMonitorInfoW(handle, ctypes.byref(info)):
        for monitor in monitors[1:]:
            if monitor["left"] == info.monitor.left and monitor["top"] == info.monitor.top:
                return monitor
    return monitors[1]


class VideoWriter:
    def __init__(self, path, monitor):
        self.container = av.open(str(path), "w", format="webm", options={"cluster_time_limit": "1000", "flush_packets": "1"})
        self.video = self.container.add_stream("libvpx", rate=10)
        scale = min(1, 1920 / monitor["width"], 1080 / monitor["height"])
        self.video.width = int(monitor["width"] * scale) // 2 * 2
        self.video.height = int(monitor["height"] * scale) // 2 * 2
        self.video.pix_fmt = "yuv420p"
        self.video.bit_rate = 2500000
        self.video.options = {"deadline": "realtime", "cpu-used": "8", "lag-in-frames": "0"}
        self.audio = self.container.add_stream("libopus", rate=48000)
        self.audio.layout = "stereo"
        self.resampler = av.AudioResampler(format="flt", layout="stereo", rate=48000)
        self.frames = 0
        self.samples = 0

    def write(self, image, audio):
        frame = av.VideoFrame.from_ndarray(np.asarray(image), format="bgra")
        frame = frame.reformat(self.video.width, self.video.height, format="yuv420p")
        frame.pts = self.frames
        frame.time_base = Fraction(1, 10)
        self.container.mux(self.video.encode(frame))
        self.frames += 1
        frame = av.AudioFrame.from_ndarray(audio.reshape(1, -1), format="flt", layout="stereo")
        frame.sample_rate = RATE
        frame.pts = self.samples
        frame.time_base = Fraction(1, RATE)
        self.samples += len(audio)
        for converted in self.resampler.resample(frame):
            self.container.mux(self.audio.encode(converted))

    def close(self):
        if self.frames:
            for frame in self.resampler.resample(None):
                self.container.mux(self.audio.encode(frame))
            self.container.mux(self.audio.encode(None))
            self.container.mux(self.video.encode(None))
        self.container.close()


def save_session(directory, session):
    temporary = directory / "session.tmp"
    temporary.write_text(json.dumps(session, ensure_ascii=False), encoding="utf-8")
    temporary.replace(directory / "session.json")


def upload(directory, session, emit):
    meeting_id = str(uuid.UUID(session["meetingId"]))
    emit({"type": "state", "payload": {"isRecording": False, "isUploading": True, "pipelineStatus": "UPLOADING"}})
    with httpx.Client(base_url=API, timeout=60, trust_env=False) as client:
        # Idempotent chunks permit retry after a network or backend interruption.
        existing = client.get(f"/meeting/{meeting_id}").json()
        if not existing.get("recording_available"):
            with (directory / "recording.webm").open("rb") as source:
                sequence = 0
                while block := source.read(8 * 1024 * 1024):
                    client.put(f"/meeting/{meeting_id}/recording/chunks/{sequence}",
                               files={"file": ("chunk.webm", block, "video/webm")}).raise_for_status()
                    sequence += 1
            client.post(f"/meeting/{meeting_id}/recording/complete").raise_for_status()
        status = existing.get("meeting", {}).get("status")
        if status not in {"COMPLETED", "EXTRACTING_INTELLIGENCE", "PERSISTING_MODEL", "UPLOADING", "TRANSCRIBING"}:
            client.post("/upload_transcript", data={"meeting_id": meeting_id,
                        "transcript_json": json.dumps(session["segments"])}).raise_for_status()
    session["uploaded"] = True
    save_session(directory, session)
    emit({"type": "uploaded", "meetingId": meeting_id})
    # Delete only this successful session's redundant local video. Failed sessions stay intact.
    (directory / "recording.webm").unlink(missing_ok=True)


class Recorder:
    def __init__(self, emit, origin):
        self.emit = emit
        self.origin = origin
        self.stop_event = threading.Event()
        self.thread = None
        self.error = None

    def start(self, request_id):
        if self.thread and self.thread.is_alive():
            raise RuntimeError("Recording is already running.")
        self.stop_event.clear()
        self.error = None
        self.thread = threading.Thread(target=self.run, args=(request_id,), daemon=True)
        self.thread.start()

    def run(self, request_id):
        audio = None
        inputs = []
        writer = None
        transcriber = None
        packets = queue.Queue(maxsize=15)
        directory = None
        session = None
        replied = False
        transcript_error = []
        try:
            with mss.mss() as screen:
                monitor = foreground_monitor(screen.monitors)
                audio = pa.PyAudio()
                loopback = audio.get_default_wasapi_loopback()
                api = audio.get_host_api_info_by_type(pa.paWASAPI)
                microphone = audio.get_device_info_by_index(api["defaultInputDevice"])
                inputs.append(AudioInput(audio, loopback))
                inputs.append(AudioInput(audio, microphone))
                with httpx.Client(base_url=API, timeout=15, trust_env=False) as client:
                    capability = client.get("/recording/capabilities")
                    capability.raise_for_status()
                    if not capability.json().get("video"):
                        raise RuntimeError("Restart the WatchNT backend to enable recording.")
                    created = client.post("/meeting", json={"title": "Meeting · " + time.strftime("%Y-%m-%d %H:%M")})
                    created.raise_for_status()
                    meeting_id = str(uuid.UUID(created.json()["id"]))
                directory = ROOT / meeting_id
                directory.mkdir(parents=True, exist_ok=False)
                session = {"meetingId": meeting_id, "segments": [], "uploaded": False}
                save_session(directory, session)
                writer = VideoWriter(directory / "recording.webm", monitor)
                self.emit({"type": "state", "payload": {"currentMeetingId": meeting_id, "recoveryMeetingId": meeting_id, "captureMode": "native"}})

                def transcribe():
                    try:
                        with connect("ws://127.0.0.1:8000/ws/transcribe", origin=self.origin, open_timeout=15, max_size=1024*1024) as socket:
                            socket.send(json.dumps({"channels": 2, "sampleRate": RATE, "audioSource": "system"}))
                            ready = json.loads(socket.recv(timeout=30))
                            if not ready.get("ready"):
                                raise RuntimeError(ready.get("error", "Transcription unavailable"))
                            while True:
                                packet = packets.get()
                                if packet is None:
                                    break
                                socket.send(packet)
                                result = json.loads(socket.recv(timeout=90))
                                if result.get("error"):
                                    raise RuntimeError(result["error"])
                                session["segments"].extend(result.get("segments", []))
                                save_session(directory, session)
                                self.emit({"type": "state", "payload": {"liveTranscript": " ".join(s["speaker"] + ": " + s["text"] for s in session["segments"][-3:]), "liveConfidence": None}})
                    except Exception as error:
                        transcript_error.append(str(error))
                        self.stop_event.set()
                transcriber = threading.Thread(target=transcribe, daemon=True)
                transcriber.start()
                # Align the two device queues before the recording clock begins.
                time.sleep(0.12)
                for source in inputs:
                    source.read(BLOCK)
                    source.pending = np.empty(0, dtype=np.float32)
                started = time.monotonic()
                windows = []
                ticks = 0
                while not self.stop_event.is_set():
                    if time.monotonic() - started - ticks / 10 > 2:
                        raise RuntimeError("Recording cannot keep up with this display. Partial video is retained.")
                    samples = np.column_stack([source.read(BLOCK) for source in inputs]).astype("<f4")
                    writer.write(screen.grab(monitor), samples)
                    windows.append(samples)
                    ticks += 1
                    if not replied:
                        self.emit({"type": "state", "payload": {"isStarting": False, "isRecording": True, "isUploading": False, "pipelineStatus": "RECORDING", "recordingStartTime": int(time.time()*1000), "captureError": "", "captureWarning": ""}})
                        self.emit({"requestId": request_id, "ok": True})
                        replied = True
                    if len(windows) == 80:
                        packets.put_nowait(np.concatenate(windows).tobytes())
                        windows.clear()
                    if ticks % 20 == 0:
                        if audio.get_default_wasapi_loopback()["index"] != loopback["index"]:
                            raise RuntimeError("Audio output changed. Restart recording to use the new device.")
                        if time.monotonic() - inputs[1].last_data > 3:
                            raise RuntimeError("The microphone stopped sending audio. Partial recording is retained.")
                    self.stop_event.wait(max(0, started + ticks / 10 - time.monotonic()))
                if windows and not transcript_error:
                    packets.put(np.concatenate(windows).tobytes(), timeout=30)
                self.emit({"type": "state", "payload": {"isRecording": False, "isUploading": True, "pipelineStatus": "TRANSCRIBING"}})
                writer.close()
                writer = None
                for source in inputs:
                    source.close()
                inputs.clear()
                packets.put(None, timeout=30)
                transcriber.join(timeout=180)
                if transcriber.is_alive():
                    raise RuntimeError("Transcription timed out. The local recording is retained for recovery.")
                if transcript_error:
                    raise RuntimeError(transcript_error[0])
                upload(directory, session, self.emit)
        except Exception as error:
            self.error = str(error)
            if not replied:
                self.emit({"requestId": request_id, "ok": False, "error": str(error)})
            self.emit({"type": "state", "payload": {"isStarting": False, "isRecording": False, "isUploading": False, "pipelineStatus": "FAILED", "captureError": str(error) + (" Local video is retained. Use Recover native recording in Settings." if directory else "")}})
        finally:
            if writer:
                try:
                    writer.close()
                except Exception:
                    pass
            for source in inputs:
                source.close()
            if audio:
                audio.terminate()
            if transcriber and transcriber.is_alive():
                try:
                    packets.put_nowait(None)
                except queue.Full:
                    pass

    def stop(self):
        self.stop_event.set()

    def recover(self, meeting_id):
        if self.thread and self.thread.is_alive():
            raise RuntimeError("Wait for the current recording to finish.")
        meeting_id = str(uuid.UUID(meeting_id))
        directory = ROOT / meeting_id
        session = json.loads((directory / "session.json").read_text(encoding="utf-8"))
        upload(directory, session, self.emit)
