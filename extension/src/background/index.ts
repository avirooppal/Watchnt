import "./indicator";
import { nativeRequest, setNativeHandler } from "./native";
let starting = false;
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.tabs.create({
      url: chrome.runtime.getURL("dashboard.html#/onboarding"),
    });
  }
});

// Resume polling if service worker wakes up and pipeline is active
chrome.storage.local.get(
  ["pipelineStatus", "isUploading", "currentMeetingId"],
  (res: any) => {
    if (
      res.isUploading &&
      res.pipelineStatus !== "COMPLETED" &&
      res.pipelineStatus !== "FAILED" &&
      res.currentMeetingId
    ) {
      pollPipelineStatus(res.currentMeetingId);
    }
  },
);

chrome.runtime.onMessage.addListener(
  (message: any, _sender: any, _sendResponse: any) => {
    if (message.type === "CAPTURE_STATE") {
      chrome.storage.local
        .set(message.payload)
        .then(() => _sendResponse({ ok: true }));
      return true;
    } else if (message.type === "CAPTURE_REMOVE") {
      chrome.storage.local
        .remove(message.payload)
        .then(() => _sendResponse({ ok: true }));
      return true;
    } else if (message.type === "START_RECORDING_WITH_STREAM") {
      if (_sender.url !== chrome.runtime.getURL("index.html")) {
        _sendResponse({ ok: false });
        return;
      }
      startRecording().then(() => _sendResponse({ ok: true }));
      return true;
    } else if (message.type === "RECOVER_NATIVE_RECORDING") {
      if (!_sender.url?.startsWith(chrome.runtime.getURL("dashboard.html"))) {
        _sendResponse({ ok: false });
        return;
      }
      chrome.storage.local
        .get("recoveryMeetingId")
        .then((state) =>
          nativeRequest("recover", { meetingId: state.recoveryMeetingId }),
        )
        .then(() => _sendResponse({ ok: true }))
        .catch((error) => _sendResponse({ ok: false, error: String(error) }));
      return true;
    } else if (message.type === "STOP_MEETING_AUDIO") {
      chrome.storage.local.get("recordingTabId").then(async (state) => {
        if (state.recordingTabId)
          await chrome.tabs
            .sendMessage(Number(state.recordingTabId), {
              type: "STOP_MEETING_AUDIO",
            })
            .catch(() => {});
        _sendResponse({ ok: true });
      });
      return true;
    } else if (message.type === "STOP_RECORDING") {
      stopRecording()
        .then(() => _sendResponse({ ok: true }))
        .catch((error) => {
          void chrome.storage.local.set({ captureError: String(error) });
          _sendResponse({ ok: false });
        });
      return true;
    } else if (message.type === "RECORDING_UPLOADED") {
      chrome.storage.local.set({ currentMeetingId: message.payload.meetingId });
      chrome.storage.local.set({
        isUploading: true,
        pipelineStatus: "EXTRACTING_INTELLIGENCE",
      });
      pollPipelineStatus(message.payload.meetingId);
    } else if (message.type === "REFRESH_PIPELINE") {
      chrome.storage.local
        .get(["currentMeetingId", "isRecording", "pipelineStatus"])
        .then(async (state) => {
          if (
            !state.isRecording &&
            state.currentMeetingId === message.payload?.meetingId &&
            ["FAILED", "COMPLETED"].includes(String(state.pipelineStatus))
          )
            await pollPipelineStatus(String(state.currentMeetingId));
          _sendResponse({ ok: true });
        });
      return true;
    } else if (message.type === "RECORDING_UPLOAD_FAILED") {
      chrome.storage.local.set({
        isUploading: false,
        pipelineStatus: "FAILED",
      });
    } else if (message.type === "OPEN_DASHBOARD") {
      chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
    }
  },
);

// Alarms resume processing checks even after Manifest V3 suspends this worker.
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "watchnt-pipeline") return;
  const state = await chrome.storage.local.get("currentMeetingId");
  if (state.currentMeetingId)
    void pollPipelineStatus(String(state.currentMeetingId));
});
async function pollPipelineStatus(meetingId: string) {
  if (!(await canPollPipeline(meetingId))) return;
  await chrome.alarms.create("watchnt-pipeline", { periodInMinutes: 1 });
  try {
    const response = await fetch(
      `http://localhost:8000/meeting/${meetingId}/status`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!response.ok) throw new Error("Meeting status unavailable");
    const data = await response.json();
    if (!(await canPollPipeline(meetingId))) return;
    // A backend meeting is created before capture begins. RECORDING does not
    // mean a transcript was uploaded or that AI processing has started.
    if (data.status === "RECORDING") {
      await chrome.alarms.clear("watchnt-pipeline");
      return;
    }
    const done = data.status === "COMPLETED" || data.status === "FAILED";
    await chrome.storage.local.set({
      pipelineStatus: data.status,
      isUploading: !done,
      captureError:
        data.status === "FAILED"
          ? data.error || "Processing failed. Open the meeting for details."
          : "",
    });
    if (done) await chrome.alarms.clear("watchnt-pipeline");
    else setTimeout(() => void pollPipelineStatus(meetingId), 2000);
  } catch (error) {
    if (await canPollPipeline(meetingId))
      await chrome.storage.local.set({ captureError: String(error) });
  }
}

async function canPollPipeline(meetingId: string) {
  const state = await chrome.storage.local.get([
    "currentMeetingId",
    "isRecording",
    "recoveryMeetingId",
  ]);
  return (
    !starting &&
    !state.isRecording &&
    state.currentMeetingId === meetingId &&
    state.recoveryMeetingId !== meetingId
  );
}

setNativeHandler(async (message) => {
  if (message.type === "state") {
    await chrome.storage.local.set(message.payload);
  } else if (message.type === "uploaded") {
    await chrome.storage.local.remove([
      "recoveryMeetingId",
      "recoveryTranscript",
    ]);
    await chrome.storage.local.set({
      isStarting: false,
      isRecording: false,
      isUploading: true,
      currentMeetingId: message.meetingId,
      pipelineStatus: "EXTRACTING_INTELLIGENCE",
      captureError: "",
    });
    void pollPipelineStatus(message.meetingId);
  } else if (message.type === "disconnected") {
    const state = await chrome.storage.local.get([
      "captureMode",
      "isRecording",
      "isStarting",
      "isUploading",
    ]);
    if (
      state.captureMode === "native" &&
      (state.isRecording || state.isStarting || state.isUploading)
    )
      await chrome.storage.local.set({
        isRecording: false,
        isStarting: false,
        isUploading: false,
        pipelineStatus: "FAILED",
        captureError: message.error,
      });
  }
});
async function startRecording() {
  if (starting) return;
  starting = true;
  try {
    const state = await chrome.storage.local.get([
      "isRecording",
      "isUploading",
      "recoveryMeetingId",
    ]);
    if (state.isRecording || state.isUploading) return;
    if (state.recoveryMeetingId)
      throw new Error(
        "Recover the previous recording in Settings before starting again.",
      );
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (
      !tab?.id ||
      !/^https:\/\/(meet\.google\.com|([\w-]+\.)?zoom\.us|teams\.microsoft\.com|teams\.live\.com)\//.test(
        tab.url || "",
      )
    )
      throw new Error(
        "Open your meeting and start from the extension toolbar.",
      );
    await chrome.alarms.clear("watchnt-pipeline");
    await chrome.storage.local.set({
      captureMode: "browser",
      recordingTabId: tab.id,
      currentMeetingId: "",
      isStarting: true,
      captureError: "",
      captureWarning: "",
      pipelineStatus: "",
      liveTranscript: "",
    });
    const capability = await fetch(
      "http://localhost:8000/recording/capabilities",
      { signal: AbortSignal.timeout(5000) },
    );
    if (!capability.ok || !(await capability.json()).video)
      throw new Error(
        "Update and restart the WatchNT backend before starting a recording.",
      );
    if (!(await chrome.offscreen.hasDocument()))
      await chrome.offscreen.createDocument({
        url: "offscreen.html",
        reasons: [chrome.offscreen.Reason.USER_MEDIA],
        justification: "Record the meeting tab and its permitted audio",
      });
    const audio = await chrome.tabs.sendMessage(tab.id, {
      type: "PREPARE_MEETING_AUDIO",
    });
    if (!audio?.ok)
      throw new Error(
        audio?.error || "Refresh the meeting tab once and retry recording.",
      );
    const connection = await chrome.runtime.sendMessage({
      type: "OFFSCREEN_CONNECT_AUDIO",
      payload: audio.payload,
    });
    if (!connection?.ok)
      throw new Error(connection?.error || "Could not connect meeting audio.");
    const answer = await chrome.tabs.sendMessage(tab.id, {
      type: "ANSWER_MEETING_AUDIO",
      payload: connection.payload,
    });
    if (!answer?.ok)
      throw new Error(answer?.error || "Could not connect meeting audio.");
    // Obtain the short-lived ID only when the consumer is ready. No page navigation.
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tab.id,
    });
    const result = await chrome.runtime.sendMessage({
      type: "OFFSCREEN_START_RECORDING",
      payload: { streamId, meetingAudio: true },
    });
    if (!result?.ok)
      throw new Error(result?.error || "Recording could not start.");
  } catch (error) {
    await chrome.runtime
      .sendMessage({ type: "OFFSCREEN_DISCONNECT_AUDIO" })
      .catch(() => {});
    const state = await chrome.storage.local.get("recordingTabId");
    if (state.recordingTabId)
      await chrome.tabs
        .sendMessage(Number(state.recordingTabId), {
          type: "STOP_MEETING_AUDIO",
        })
        .catch(() => {});
    await chrome.storage.local.set({
      isStarting: false,
      isRecording: false,
      isUploading: false,
      captureError: String(error),
      pipelineStatus: "FAILED",
    });
  } finally {
    starting = false;
  }
}
async function stopRecording() {
  const state = await chrome.storage.local.get([
    "captureMode",
    "recordingTabId",
    "recoveryMeetingId",
    "recoveryTranscript",
  ]);
  if (state.captureMode === "native") {
    await nativeRequest("stop");
    return;
  }
  if (state.captureMode === "captions") {
    try {
      const result = await chrome.tabs.sendMessage(
        Number(state.recordingTabId),
        { type: "CAPTIONS_STOP" },
      );
      await chrome.storage.local.set({
        isRecording: false,
        isUploading: true,
        pipelineStatus: "UPLOADING",
        recoveryTranscript: result.transcript,
      });
      const form = new FormData();
      form.append("meeting_id", String(state.recoveryMeetingId));
      form.append("transcript_json", JSON.stringify(result.transcript));
      const response = await fetch("http://localhost:8000/upload_transcript", {
        method: "POST",
        body: form,
      });
      if (!response.ok)
        throw new Error("Could not save captions. Recover them in Settings.");
      await chrome.storage.local.remove([
        "recoveryMeetingId",
        "recoveryTranscript",
      ]);
      await chrome.storage.local.set({
        currentMeetingId: state.recoveryMeetingId,
      });
      void pollPipelineStatus(String(state.recoveryMeetingId));
    } catch (error) {
      await chrome.storage.local.set({
        isRecording: false,
        isUploading: false,
        pipelineStatus: "FAILED",
        captureError: String(error),
      });
    }
  } else await chrome.runtime.sendMessage({ type: "OFFSCREEN_STOP_RECORDING" });
}

// Clear stale recording flags after an extension/browser restart, retaining recovery text.
async function reconcileCaptureState() {
  const state = await chrome.storage.local.get([
    "isRecording",
    "captureMode",
    "recordingTabId",
    "isUploading",
    "pipelineStatus",
    "captureError",
  ]);
  if (
    !state.isRecording &&
    state.isUploading &&
    state.pipelineStatus === "RECORDING"
  ) {
    await chrome.alarms.clear("watchnt-pipeline");
    await chrome.storage.local.set({
      isUploading: false,
      pipelineStatus: "FAILED",
      captureError:
        state.captureError ||
        "Capture was interrupted before saving. Recover the retained transcript in Settings.",
    });
  }
  if (!state.isRecording) return;
  try {
    if (state.captureMode === "native") {
      const result = await nativeRequest("status");
      if (!result.active) throw new Error("Native recorder interrupted");
    } else if (state.captureMode === "captions")
      await chrome.tabs.get(Number(state.recordingTabId));
    else if (!(await chrome.offscreen.hasDocument()))
      throw new Error("Capture interrupted");
  } catch {
    await chrome.storage.local.set({
      isRecording: false,
      isUploading: false,
      pipelineStatus: "FAILED",
      captureError:
        "Capture was interrupted. Recover the retained transcript in Settings.",
    });
  }
}
void reconcileCaptureState();
