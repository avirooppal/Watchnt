import { startObserver, stopObserver, currentTranscript } from "./observer";
// No injected controls: capture is managed from the extension toolbar.
document.getElementById("watchnt-bot-root")?.remove();
const callControls = [
  '[data-tooltip="Leave call"]',
  '[aria-label="Leave call"]',
  '[aria-label="Leave meeting"]',
  '[aria-label="Salir de la llamada"]',
  '[data-tid="call-hangup"]',
  "#hangup-button",
  ".footer__leave-btn",
  '[aria-label="End call"]',
  '[aria-label="Quitter l’appel"]',
].join(",");
let reported: boolean | undefined;
const reportMeeting = () => {
  const active = Array.from(document.querySelectorAll(callControls)).some(
    (element) => element.getClientRects().length > 0,
  );
  if (active || active !== reported) {
    void chrome.runtime
      .sendMessage({ type: "MEETING_PRESENCE", active })
      .catch(() => clearInterval(presenceTimer));
    reported = active;
  }
};
const presenceTimer = setInterval(reportMeeting, 1000);
reportMeeting();
window.addEventListener("pagehide", () => {
  clearInterval(presenceTimer);
  void chrome.runtime
    .sendMessage({ type: "MEETING_PRESENCE", active: false })
    .catch(() => {});
});

// Captions are an explicit, low-load alternative to local audio inference.
let captionTimer: ReturnType<typeof setInterval> | undefined;
chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message.type === "CAPTIONS_START") {
    startObserver();
    if (captionTimer) clearInterval(captionTimer);
    captionTimer = setInterval(() => {
      const transcript = currentTranscript();
      void chrome.storage.local.set({
        recoveryTranscript: transcript,
        liveTranscript: transcript
          .slice(-3)
          .map((s) => s.speaker + ": " + s.text)
          .join(" "),
        liveConfidence: null,
      });
    }, 1000);
    respond({ ok: true });
  } else if (message.type === "CAPTIONS_STOP") {
    clearInterval(captionTimer);
    captionTimer = undefined;
    respond({ transcript: stopObserver() });
  }
});
window.addEventListener("pagehide", () => {
  if (captionTimer) {
    clearInterval(captionTimer);
    void chrome.storage.local.set({
      recoveryTranscript: stopObserver(),
      isRecording: false,
      pipelineStatus: "FAILED",
      captureError:
        "Caption capture ended when the meeting page closed. Recover the partial transcript in Settings.",
    });
  }
});
