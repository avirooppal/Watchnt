// The content script forwards only explicit extension capture requests.
const pending = new Map<
  string,
  {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }
>();
export function stopAudioBridge() {
  window.postMessage(
    {
      channel: "watchnt-audio-request",
      id: crypto.randomUUID(),
      command: "stop",
    },
    location.origin,
  );
  for (const request of pending.values()) {
    clearTimeout(request.timer);
    request.reject(new Error("Meeting audio stopped."));
  }
  pending.clear();
}
window.addEventListener("message", (event) => {
  if (
    event.source !== window ||
    event.data?.channel !== "watchnt-audio-response"
  )
    return;
  const request = pending.get(event.data.id);
  if (!request) return;
  clearTimeout(request.timer);
  pending.delete(event.data.id);
  if (event.data.error) request.reject(new Error(event.data.error));
  else request.resolve(event.data.result);
});
try {
  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    if (
      ![
        "PREPARE_MEETING_AUDIO",
        "ANSWER_MEETING_AUDIO",
        "STOP_MEETING_AUDIO",
      ].includes(message.type)
    )
      return;
    if (message.type === "STOP_MEETING_AUDIO") {
      stopAudioBridge();
      respond({ ok: true });
      return;
    }
    const id = crypto.randomUUID();
    const result = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(
          new Error(
            "Meeting audio did not respond. Refresh the meeting tab once, then retry.",
          ),
        );
      }, 60000);
      pending.set(id, { resolve, reject, timer });
    });
    window.postMessage(
      {
        channel: "watchnt-audio-request",
        id,
        command:
          message.type === "PREPARE_MEETING_AUDIO" ? "prepare" : "answer",
        payload: message.payload,
      },
      location.origin,
    );
    void result
      .then(
        (payload) => respond({ ok: true, payload }),
        (error) => respond({ ok: false, error: String(error) }),
      )
      .catch(() => stopAudioBridge());
    return true;
  });
} catch {
  stopAudioBridge();
}
