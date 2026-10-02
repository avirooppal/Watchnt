import { stopAudioBridge } from "./audio-bridge";
import { startObserver, stopObserver, currentTranscript } from "./observer";
// Starting capture stays in the toolbar, where Chrome grants tab capture access.
document.getElementById("watchnt-bot-root")?.remove();
document.getElementById("watchnt-reminder")?.remove();
let disposed = false;
let presenceTimer: ReturnType<typeof setInterval> | undefined;
let captionTimer: ReturnType<typeof setInterval> | undefined;
function dispose() {
  if (disposed) return;
  disposed = true;
  stopAudioBridge();
  clearInterval(presenceTimer);
  clearInterval(captionTimer);
  stopObserver();
}
// Extension reloads invalidate APIs in already-open meeting pages.
// Catch both synchronous throws and rejected Chrome API promises.
async function withExtension(action: () => unknown) {
  if (disposed) return;
  try {
    if (!chrome.runtime?.id) {
      dispose();
      return;
    }
    await action();
  } catch {
    dispose();
  }
}
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
const reportMeeting = () =>
  void withExtension(async () => {
    const active = Array.from(document.querySelectorAll(callControls)).some(
      (element) => element.getClientRects().length > 0,
    );
    if (active || active !== reported) {
      await chrome.runtime.sendMessage({ type: "MEETING_PRESENCE", active });
      reported = active;
    }
  });
if (!disposed) presenceTimer = setInterval(reportMeeting, 1000);
reportMeeting();

// Captions are an explicit, low-load alternative to local audio inference.
void withExtension(() =>
  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    void withExtension(() => {
      if (message.type === "CAPTIONS_START") {
        startObserver();
        clearInterval(captionTimer);
        captionTimer = setInterval(
          () =>
            void withExtension(async () => {
              const transcript = currentTranscript();
              await chrome.storage.local.set({
                recoveryTranscript: transcript,
                liveTranscript: transcript
                  .slice(-3)
                  .map((s) => s.speaker + ": " + s.text)
                  .join(" "),
                liveConfidence: null,
              });
            }),
          1000,
        );
        respond({ ok: true });
      } else if (message.type === "CAPTIONS_STOP") {
        clearInterval(captionTimer);
        captionTimer = undefined;
        respond({ transcript: stopObserver() });
      }
    });
  }),
);
window.addEventListener("pagehide", () => {
  void withExtension(() =>
    chrome.runtime.sendMessage({ type: "MEETING_PRESENCE", active: false }),
  );
  if (captionTimer)
    void withExtension(() =>
      chrome.storage.local.set({
        recoveryTranscript: stopObserver(),
        isRecording: false,
        pipelineStatus: "FAILED",
        captureError:
          "Caption capture ended when the meeting page closed. Recover the partial transcript in Settings.",
      }),
    );
  dispose();
});
