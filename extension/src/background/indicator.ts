// Blink at 0.5 Hz. The badge text remains visible so color is not the only cue.
const meetingTabs = new Set<number>();
let recording = false;
let uploading = false;
let timer: ReturnType<typeof setInterval> | undefined;
let previous = "";
async function paint() {
  const state = recording
    ? "recording"
    : uploading
      ? "processing"
      : meetingTabs.size
        ? "reminder"
        : "idle";
  const bright = Math.floor(Date.now() / 1000) % 2 === 0;
  const signature =
    state + (state === "recording" || state === "reminder" ? bright : "");
  if (signature === previous) return;
  previous = signature;
  const text =
    state === "recording"
      ? "REC"
      : state === "reminder"
        ? "!"
        : state === "processing"
          ? "…"
          : "";
  const color =
    state === "recording"
      ? bright
        ? "#c83232"
        : "#722323"
      : state === "reminder"
        ? bright
          ? "#a65d00"
          : "#664000"
        : "#236c53";
  await Promise.all([
    chrome.action.setBadgeText({ text }),
    chrome.action.setBadgeBackgroundColor({ color }),
    chrome.action.setBadgeTextColor({ color: "#ffffff" }),
    chrome.action.setTitle({
      title:
        state === "recording"
          ? "WatchNT — Recording"
          : state === "reminder"
            ? "WatchNT — Meeting in progress. Click to record."
            : state === "processing"
              ? "WatchNT — Processing transcript"
              : "WatchNT",
    }),
  ]);
}
function refresh() {
  if ((recording || meetingTabs.size) && !timer)
    timer = setInterval(() => void paint(), 1000);
  if (!recording && !meetingTabs.size && timer) {
    clearInterval(timer);
    timer = undefined;
  }
  void paint();
}
chrome.storage.local.get(["isRecording", "isUploading"]).then((state) => {
  recording = !!state.isRecording;
  uploading = !!state.isUploading;
  refresh();
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.isRecording) recording = !!changes.isRecording.newValue;
  if (changes.isUploading) uploading = !!changes.isUploading.newValue;
  refresh();
});
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type !== "MEETING_PRESENCE" || sender.tab?.id === undefined)
    return;
  if (message.active) meetingTabs.add(sender.tab.id);
  else meetingTabs.delete(sender.tab.id);
  refresh();
});
chrome.tabs.onRemoved.addListener((id) => {
  meetingTabs.delete(id);
  refresh();
});
chrome.tabs.onUpdated.addListener((id, change) => {
  if (change.status === "loading") {
    meetingTabs.delete(id);
    refresh();
  }
});
