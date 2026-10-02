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
let recorder, recorderStopped;
let videoUploads = Promise.resolve();
let videoError = null,
  videoSequence = 0,
  pendingVideoBytes = 0,
  failing = false;

const API = "http://localhost:8000";

let audioPeer, meetingMic, presentationAudio;
const audioPlayback = [];
function disconnectMeetingAudio() {
  audioPeer?.close();
  audioPeer = undefined;
  meetingMic = presentationAudio = undefined;
  for (const playback of audioPlayback.splice(0)) {
    playback.pause();
    playback.srcObject = null;
  }
}
async function connectMeetingAudio(offer) {
  if (active) throw new Error("Recording is already active.");
  disconnectMeetingAudio();
  const peer = new RTCPeerConnection({ iceServers: [] });
  audioPeer = peer;
  peer.ontrack = (event) => {
    // Chrome starts remote WebRTC audio decoding through a media element.
    // Keep playback inaudible; the decoded stream goes to the recorder's mix.
    const playback = new Audio();
    playback.srcObject = event.streams[0];
    playback.muted = true;
    void playback.play().catch(() => {});
    audioPlayback.push(playback);
    if (event.streams[0]?.id === offer.microphoneId)
      meetingMic = event.streams[0];
    if (event.streams[0]?.id === offer.presentationId)
      presentationAudio = event.streams[0];
  };
  peer.onconnectionstatechange = () => {
    if (
      active &&
      !stopping &&
      ["failed", "disconnected", "closed"].includes(peer.connectionState)
    )
      void fail(
        new Error(
          "Meeting audio disconnected. Recording stopped to avoid losing speech.",
        ),
      );
  };
  await peer.setRemoteDescription(offer.sdp);
  await peer.setLocalDescription(await peer.createAnswer());
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Meeting audio connection timed out.")),
      5000,
    );
    const ready = () => {
      if (peer.iceGatheringState === "complete") {
        clearTimeout(timer);
        resolve();
      }
    };
    peer.onicegatheringstatechange = ready;
    ready();
  });
  if (!meetingMic || !presentationAudio)
    throw new Error("Meeting audio tracks are missing.");
  return peer.localDescription.toJSON();
}
chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message.type === "OFFSCREEN_CONNECT_AUDIO") {
    connectMeetingAudio(message.payload).then(
      (payload) => respond({ ok: true, payload }),
      (error) => respond({ ok: false, error: String(error) }),
    );
    return true;
  }
  if (message.type === "OFFSCREEN_DISCONNECT_AUDIO") {
    if (!active) disconnectMeetingAudio();
    respond({ ok: true });
    return;
  }
  if (message.type === "OFFSCREEN_START_RECORDING") {
    start(
      message.payload.streamId,
      message.payload.desktopStreamId,
      message.payload.meetingAudio,
    ).then(respond);
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
  const response = await fetch(API + path, {
    signal: AbortSignal.timeout(30000),
    ...options,
  });

  if (!response.ok) throw new Error(`${path}: ${response.status}`);

  return response.json();
}

async function start(streamId, desktopStreamId, useMeetingAudio = false) {
  if (active) return { ok: false, error: "Recording is already active." };

  active = true;
  stopping = false;
  flushed = false;
  finalized = false;

  segments = [];
  queue = [];
  busy = false;
  meetingId = null;
  recorder = null;
  recorderStopped = null;
  videoUploads = Promise.resolve();
  videoError = null;
  videoSequence = 0;
  pendingVideoBytes = 0;
  failing = false;

  try {
    let videoStream, meetingAudio;

    if (streamId) {
      // Tab-specific capture (kept for backward compatibility if tabCapture works)
      videoStream = await navigator.mediaDevices.getUserMedia({
        audio: desktopStreamId
          ? false
          : {
              mandatory: {
                chromeMediaSource: "tab",
                chromeMediaSourceId: streamId,
              },
            },
        video: {
          mandatory: {
            chromeMediaSource: "tab",
            chromeMediaSourceId: streamId,
            maxWidth: 1920,
            maxHeight: 1080,
            maxFrameRate: 15,
          },
        },
      });
      streams = [videoStream];
      meetingAudio = videoStream;
    }

    // Desktop capture: full-res video + system audio when no tabCapture,
    // or just audio when tabCapture provides the video.
    if (desktopStreamId) {
      const useDesktopVideo = !videoStream;
      meetingAudio = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: desktopStreamId,
          },
        },
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: desktopStreamId,
            maxWidth: useDesktopVideo ? 1920 : 320,
            maxHeight: useDesktopVideo ? 1080 : 180,
            maxFrameRate: useDesktopVideo ? 15 : 1,
          },
        },
      });
      streams.push(meetingAudio);
      if (!videoStream) videoStream = meetingAudio;
      if (!meetingAudio.getAudioTracks().length)
        throw new Error(
          "No system audio was shared. Start again and enable Share system audio.",
        );
    }

    if (!videoStream)
      throw new Error("No video source available. Start again.");

    let mic;

    try {
      if (useMeetingAudio) {
        if (!audioPeer || !meetingMic)
          throw new Error("Meeting microphone is not connected.");
        await new Promise((resolve, reject) => {
          const timer = setTimeout(
            () => reject(new Error("Meeting audio connection timed out.")),
            5000,
          );
          const ready = () => {
            if (audioPeer?.connectionState === "connected") {
              clearTimeout(timer);
              audioPeer.removeEventListener("connectionstatechange", ready);
              resolve();
            }
          };
          audioPeer.addEventListener("connectionstatechange", ready);
          ready();
        });
        mic = meetingMic;
      } else
        mic = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
      streams.push(mic);
    } catch (error) {
      throw new Error(
        "Microphone access is required to include your voice. Allow microphone access in the recording setup and retry. " +
          error.message,
      );
    }
    if (!mic.getAudioTracks().some((track) => track.readyState === "live"))
      throw new Error(
        "The microphone is disconnected. Connect it and retry recording.",
      );

    context = new AudioContext({ sampleRate: 16000 });

    await context.resume();
    if (context.sampleRate !== 16000)
      throw new Error("This device does not support 16 kHz capture");

    const tabSource = context.createMediaStreamSource(meetingAudio);

    // Only tabCapture redirects playback. Replaying loopback audio would create feedback.
    if (!desktopStreamId) tabSource.connect(context.destination);

    const channels = mic ? 2 : 1;

    const merger = context.createChannelMerger(channels);

    tabSource.connect(merger, 0, 0);
    if (useMeetingAudio && presentationAudio)
      context.createMediaStreamSource(presentationAudio).connect(merger, 0, 0);

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
      socket.send(
        JSON.stringify({
          channels,
          sampleRate: 16000,
          audioSource: desktopStreamId ? "system" : "tab",
        }),
      );

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

    // Reuse the audio mix for the recording; PCM transcription continues separately.
    const recordingAudio = context.createMediaStreamDestination();
    merger.connect(recordingAudio);
    const recordingStream = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...recordingAudio.stream.getAudioTracks(),
    ]);
    const mimeType = ["video/webm;codecs=vp8,opus", "video/webm"].find((type) =>
      MediaRecorder.isTypeSupported(type),
    );
    if (!mimeType) throw new Error("This browser cannot record meeting video.");
    recorder = new MediaRecorder(recordingStream, {
      mimeType,
      videoBitsPerSecond: 2500000,
    });
    recorderStopped = new Promise((resolve) => {
      recorder.onstop = resolve;
    });
    recorder.ondataavailable = ({ data }) => {
      if (!data.size) return;
      const sequence = videoSequence++;
      pendingVideoBytes += data.size;
      videoUploads = videoUploads.then(async () => {
        if (videoError) return;
        const form = new FormData();
        form.append("file", data, "chunk.webm");
        try {
          await request(`/meeting/${meetingId}/recording/chunks/${sequence}`, {
            method: "PUT",
            body: form,
          });
        } catch (error) {
          videoError = error;
          void fail(
            new Error(
              "Recording could not be saved. Received video chunks and your transcript are retained.",
            ),
          );
        } finally {
          pendingVideoBytes -= data.size;
        }
      });
      if (pendingVideoBytes > 64 * 1024 * 1024)
        void fail(
          new Error(
            "Recording storage cannot keep up. Capture stopped to protect your device.",
          ),
        );
    };
    recorder.onerror = () =>
      void fail(new Error("Meeting video recording failed."));
    try {
      recorder.start(5000);
    } catch (error) {
      recorder = null;
      throw error;
    }
    videoStream.getVideoTracks()[0].onended = () => {
      if (active && !stopping)
        void fail(
          new Error(
            "Meeting capture disconnected before you stopped it. Open the meeting for any saved video and recover the retained transcript in Settings.",
          ),
        );
    };
    if (desktopStreamId && meetingAudio !== videoStream)
      meetingAudio.getAudioTracks()[0].onended = () => {
        if (active && !stopping)
          void fail(
            new Error(
              "System audio sharing ended. Recording stopped to avoid silently losing participants and presentation audio.",
            ),
          );
      };

    mic.getAudioTracks()[0].onended = () => {
      if (active && !stopping)
        void fail(
          new Error(
            "Microphone disconnected. Recording stopped to avoid losing your voice.",
          ),
        );
    };

    await saveState({
      recoveryTranscript: [],
      recoveryMeetingId: meetingId,
      currentMeetingId: meetingId,
      liveTranscript: "",
      captureError: "",
      captureWarning: "",
      isStarting: false,
      isRecording: true,
      isUploading: false,
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

    let silentSeconds = 0,
      lastWarning = "";
    processor.port.onmessage = ({ data }) => {
      if (data.flushed) flushed = true;

      if (data.levels && !stopping) {
        silentSeconds =
          data.levels[0] < 0.0001 ? silentSeconds + data.frames / 16000 : 0;
        const warning =
          silentSeconds >= 24
            ? "No meeting audio detected for 24 seconds. The meeting may be quiet; check audio if someone is speaking."
            : "";
        if (warning !== lastWarning) {
          lastWarning = warning;
          void saveState({ captureWarning: warning });
        }
      }

      if (data.pcm) queue.push(data.pcm);

      if (queue.length > 15)
        return void fail(
          new Error(
            "Transcription cannot keep up. Recording stopped; partial transcript retained.",
          ),
        );

      pump();
    };
    return { ok: true };
  } catch (error) {
    await fail(error);
    return { ok: false, error: String(error) };
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
  disconnectMeetingAudio();
  await chrome.runtime
    .sendMessage({ type: "STOP_MEETING_AUDIO" })
    .catch(() => {});

  streams.forEach((stream) =>
    stream.getTracks().forEach((track) => track.stop()),
  );
  streams = [];

  processor?.disconnect();
  socket?.close();

  if (context && context.state !== "closed") await context.close();
}

async function saveVideo() {
  if (!recorder) return;
  if (recorder.state !== "inactive") recorder.stop();
  await recorderStopped;
  await videoUploads;
  if (videoError) throw videoError;
  await request(`/meeting/${meetingId}/recording/complete`, { method: "POST" });
}

async function finish() {
  if (finalized) return;

  finalized = true;

  try {
    await saveVideo();
    await cleanup();
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
  if (failing) return;
  failing = true;
  finalized = true;
  stopping = true;
  try {
    await saveVideo();
  } catch {
    // Keep received chunks on disk and the transcript in extension recovery storage.
  }
  await cleanup();

  await saveState({
    isStarting: false,
    isRecording: false,
    isUploading: false,
    pipelineStatus: "FAILED",
    captureError: String(error.message || error),
  });
}
