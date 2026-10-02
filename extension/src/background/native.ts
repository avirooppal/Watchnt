const HOST = "com.watchnt.recorder";
let port: chrome.runtime.Port | undefined;
let sequence = 0;
let onEvent: (message: any) => Promise<void> = async () => {};
let events = Promise.resolve();
const requests = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();

export function setNativeHandler(handler: typeof onEvent) {
  onEvent = handler;
}

export function nativeRequest(command: "start" | "stop" | "status" | "recover", payload: Record<string, unknown> = {}) {
  if (!port) {
    const connected = chrome.runtime.connectNative(HOST);
    port = connected;
    connected.onMessage.addListener((message) => {
      if (message.type) {
        events = events.then(() => onEvent(message)).catch(console.error);
        return;
      }
      const request = requests.get(message.requestId);
      if (!request) return;
      clearTimeout(request.timer);
      requests.delete(message.requestId);
      if (message.ok) request.resolve(message);
      else request.reject(new Error(message.error || "Native recording failed."));
    });
    connected.onDisconnect.addListener(() => {
      const detail = chrome.runtime.lastError?.message;
      if (port === connected) port = undefined;
      const error = new Error("Windows recorder disconnected or is not installed. Run companion/install.ps1 once, then retry." + (detail ? " " + detail : ""));
      for (const request of requests.values()) {
        clearTimeout(request.timer);
        request.reject(error);
      }
      requests.clear();
      events = events.then(() => onEvent({ type: "disconnected", error: error.message })).catch(console.error);
    });
  }
  const connected = port;
  const requestId = ++sequence;
  return new Promise<any>((resolve, reject) => {
    const timer = setTimeout(() => {
      requests.delete(requestId);
      if (command === "start") connected.postMessage({ command: "stop", requestId: ++sequence });
      reject(new Error("Windows recorder timed out. Any local recording is retained for recovery."));
    }, command === "recover" ? 300000 : 30000);
    requests.set(requestId, { resolve, reject, timer });
    connected.postMessage({ command, requestId, ...payload });
  });
}
