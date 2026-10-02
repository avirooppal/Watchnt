"""Chrome/Edge native messaging host. Only the installed extension can launch it."""
import json
import os
import re
import struct
import sys
import threading

from capture import Recorder

LOCK = threading.Lock()


def emit(message):
    data = json.dumps(message, ensure_ascii=False).encode("utf-8")
    if len(data) > 1024 * 1024:
        raise ValueError("Native message is too large")
    with LOCK:
        sys.stdout.buffer.write(struct.pack("<I", len(data)) + data)
        sys.stdout.buffer.flush()


def read_message(stream):
    header = stream.read(4)
    if not header:
        return None
    if len(header) != 4:
        raise ValueError("Incomplete native message header")
    length = struct.unpack("<I", header)[0]
    if not 0 < length <= 65536:
        raise ValueError("Invalid native message size")
    data = stream.read(length)
    if len(data) != length:
        raise ValueError("Incomplete native message")
    message = json.loads(data)
    if not isinstance(message, dict):
        raise ValueError("Expected a command object")
    return message


def main():
    if os.name != "nt" or len(sys.argv) < 2 or not re.fullmatch(r"chrome-extension://[a-p]{32}/?", sys.argv[1]):
        raise SystemExit("Launch WatchNT through its registered browser extension.")
    # Windows text translation must never alter the length-prefixed protocol.
    import msvcrt
    msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)
    msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)
    recorder = Recorder(emit, sys.argv[1].rstrip("/"))
    emit({"type": "ready", "version": 1})
    try:
        while (message := read_message(sys.stdin.buffer)) is not None:
            request_id = message.get("requestId")
            try:
                command = message.get("command")
                if command == "start":
                    recorder.start(request_id)
                    continue
                if command == "stop":
                    recorder.stop()
                elif command == "recover":
                    recorder.recover(message.get("meetingId", ""))
                elif command != "status":
                    raise ValueError("Unknown native recording command")
                emit({"requestId": request_id, "ok": True,
                      "active": bool(recorder.thread and recorder.thread.is_alive())})
            except Exception as error:
                emit({"requestId": request_id, "ok": False, "error": str(error)})
    finally:
        recorder.stop()
        if recorder.thread:
            recorder.thread.join(timeout=10)


if __name__ == "__main__":
    main()
