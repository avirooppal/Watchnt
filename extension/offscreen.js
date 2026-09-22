const saveState = (payload) =>
  chrome.runtime.sendMessage({ type: "CAPTURE_STATE", payload });
const removeState = (payload) =>
  chrome.runtime.sendMessage({ type: "CAPTURE_REMOVE", payload });
let context, socket, processor;

let streams = [],
  queue = [],
  segments = [];

let busy = false,
  stopping = false,
  flushed = false,
  active = false,
  finalized = false;

let meetingId = null;

const API = "http://localhost:8000";

chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message.type === "OFFSCREEN_START_RECORDING") {
    start(message.payload.streamId).then(() => respond({ ok: true }));
    return true;
  }
  if (message.type === "OFFSCREEN_STOP_RECORDING") {
    stop()
      .then(() => respond({ ok: true }))
      .catch(fail);
    return true;
  }
});
async function request(path, options) {
  const response = await fetch(API + path, options);

  if (!response.ok) throw new Error(`${path}: ${response.status}`);

  return response.json();
}

async function start(streamId) {
  if (active) return;

  active = true;
  stopping = false;
  flushed = false;
  finalized = false;

  segments = [];
  queue = [];
  busy = false;
  meetingId = null;

  try {
    const tab = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: streamId },
      },
    });

    streams = [tab];

    let mic;

    try {
      mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streams.push(mic);
    } catch {
      /* Tab capture remains usable, without claiming speaker identity. */
    }

    context = new AudioContext({ sampleRate: 16000 });

    await context.resume();
    if (context.sampleRate !== 16000)
      throw new Error("This device does not support 16 kHz capture");

    const tabSource = context.createMediaStreamSource(tab);

    tabSource.connect(context.destination); // Restore tab playback after tabCapture redirects it.

    const channels = mic ? 2 : 1;

    const merger = context.createChannelMerger(channels);

    tabSource.connect(merger, 0, 0);

    if (mic) context.createMediaStreamSource(mic).connect(merger, 0, 1);

    await context.audioWorklet.addModule(
      chrome.runtime.getURL("pcm-worklet.js"),
    );

    processor = new AudioWorkletNode(context, "pcm-window", {
      processorOptions: { channels },
      channelCount: channels,
      channelCountMode: "explicit",
    });

    merger.connect(processor);

    const mute = context.createGain();
    mute.gain.value = 0;

    processor.connect(mute).connect(context.destination);

    socket = new WebSocket("ws://localhost:8000/ws/transcribe");

    socket.onopen = () =>
      socket.send(JSON.stringify({ channels, sampleRate: 16000 }));

    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Local transcription connection timed out")),
        10000,
      );

      socket.onerror = () => {
        clearTimeout(timer);
        reject(new Error("Local engine unavailable"));
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        clearTimeout(timer);
        if (data.ready) resolve();
        else reject(new Error(data.error || "Engine rejected capture"));
      };
    });

    const meeting = await request("/meeting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Meeting · " + new Date().toLocaleString(),
      }),
    });

    meetingId = meeting.id;

    await saveState({
      recoveryTranscript: [],
      recoveryMeetingId: meetingId,
      currentMeetingId: meetingId,
      liveTranscript: "",
      captureError: "",
      captureWarning: mic
        ? ""
        : "Microphone unavailable: only audio from the meeting tab is captured. Enable microphone access in Settings to capture your voice.",
      isRecording: true,
      recordingStartTime: Date.now(),
      pipelineStatus: "RECORDING",
    });

    socket.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      if (data.error) return void fail(new Error(data.error));

      busy = false;

      segments.push(...data.segments);

      const last = segments.at(-1);

      await saveState({
        recoveryTranscript: segments,
        liveTranscript: segments
          .slice(-3)
          .map((s) => s.speaker + ": " + s.text)
          .join(" "),
        liveConfidence: last?.confidence ?? null,
      });

      pump();
    };

    socket.onerror = () =>
      fail(new Error("Local transcription connection failed"));

    socket.onclose = () => {
      if (active && !finalized)
        fail(
          new Error(
            "Local engine disconnected. Partial transcript is retained.",
          ),
        );
    };

    processor.port.onmessage = ({ data }) => {
      if (data.flushed) flushed = true;

      if (data.pcm) queue.push(data.pcm);

      if (queue.length > 15)
        return void fail(
          new Error(
            "Transcription cannot keep up. Recording stopped; partial transcript retained.",
          ),
        );

      pump();
    };
  } catch (error) {
    await fail(error);
  }
}

function pump() {
  if (busy || !active) return;

  if (queue.length && socket?.readyState === WebSocket.OPEN) {
    busy = true;
    socket.send(queue.shift());
  } else if (stopping && flushed && !queue.length) finish();
}

async function stop() {
  if (!active || stopping) return;
  stopping = true;
  await saveState({
    isRecording: false,
    isUploading: true,
    pipelineStatus: "TRANSCRIBING",
  });
  processor?.port.postMessage("flush");
  streams.forEach((stream) =>
    stream.getTracks().forEach((track) => track.stop()),
  );
}

async function cleanup() {
  active = false;

  streams.forEach((stream) =>
    stream.getTracks().forEach((track) => track.stop()),
  );
  streams = [];

  processor?.disconnect();
  socket?.close();

  if (context && context.state !== "closed") await context.close();
}

async function finish() {
  if (finalized) return;

  finalized = true;

  await cleanup();

  try {
    const form = new FormData();
    form.append("meeting_id", meetingId);
    form.append("transcript_json", JSON.stringify(segments));

    await request("/upload_transcript", { method: "POST", body: form });

    await removeState(["recoveryTranscript", "recoveryMeetingId"]);

    chrome.runtime.sendMessage({
      type: "RECORDING_UPLOADED",
      payload: { meetingId },
    });
  } catch (error) {
    await fail(error);
  }
}

async function fail(error) {
  await cleanup();

  await saveState({
    isRecording: false,
    isUploading: false,
    pipelineStatus: "FAILED",
    captureError: String(error.message || error),
  });
}
