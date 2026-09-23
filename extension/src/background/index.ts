import "./indicator";
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
      startRecording(message.payload?.mode).then(() =>
        _sendResponse({ ok: true }),
      );
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
  const current = await chrome.storage.local.get("currentMeetingId");
  if (current.currentMeetingId !== meetingId) return;
  await chrome.alarms.create("watchnt-pipeline", { periodInMinutes: 1 });
  try {
    const response = await fetch(
      `http://localhost:8000/meeting/${meetingId}/status`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!response.ok) throw new Error("Meeting status unavailable");
    const data = await response.json();
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
    await chrome.storage.local.set({ captureError: String(error) });
  }
}

let starting = false;
async function startRecording(mode = "audio") {
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
        "Recover the previous partial transcript in Settings before starting a new recording.",
      );
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (
      !tab.id ||
      !/^https:\/\/(meet\.google\.com|([\w-]+\.)?zoom\.us|teams\.microsoft\.com|teams\.live\.com)\//.test(
        tab.url || "",
      )
    )
      throw new Error(
        "Open a supported meeting tab and start from the extension popup.",
      );
    if (mode === "captions") {
      const response = await fetch("http://localhost:8000/meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Meeting Â· " + new Date().toLocaleString(),
        }),
      });
      if (!response.ok) throw new Error("Local engine unavailable");
      const meeting = await response.json();
      await chrome.tabs.sendMessage(tab.id, { type: "CAPTIONS_START" });
      await chrome.storage.local.set({
        captureMode: "captions",
        captureWarning: "",
        recordingTabId: tab.id,
        recoveryMeetingId: meeting.id,
        currentMeetingId: meeting.id,
        recoveryTranscript: [],
        isRecording: true,
        recordingStartTime: Date.now(),
        pipelineStatus: "RECORDING",
        captureError: "",
        liveTranscript: "",
        liveConfidence: null,
      });
      return;
    }
    await chrome.storage.local.set({ captureMode: "audio" });
    // Chrome requires an extension action gesture for tabCapture.
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tab.id,
    });
    if (!(await chrome.offscreen.hasDocument()))
      await chrome.offscreen.createDocument({
        url: "offscreen.html",
        reasons: [chrome.offscreen.Reason.USER_MEDIA],
        justification: "Capture meeting audio for local transcription",
      });
    await chrome.runtime.sendMessage({
      type: "OFFSCREEN_START_RECORDING",
      payload: { streamId },
    });
  } catch (error) {
    await chrome.storage.local.set({
      isRecording: false,
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
  ]);
  if (!state.isRecording) return;
  try {
    if (state.captureMode === "captions")
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
