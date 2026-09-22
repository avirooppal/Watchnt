import { useEffect, useState } from "react";
export interface CaptureState {
  onboardingCompleted?: boolean;
  currentMeetingId?: string;
  captureWarning?: string;
  isRecording?: boolean;
  isUploading?: boolean;
  recordingStartTime?: number;
  liveTranscript?: string;
  liveConfidence?: number | null;
  pipelineStatus?: string;
  captureError?: string;
  captureMode?: string;
}
const keys = [
  "onboardingCompleted",
  "currentMeetingId",
  "captureWarning",
  "isRecording",
  "isUploading",
  "recordingStartTime",
  "liveTranscript",
  "liveConfidence",
  "pipelineStatus",
  "captureError",
  "captureMode",
];
export function useCaptureState() {
  const [state, setState] = useState<CaptureState>({});
  useEffect(() => {
    let mounted = true;
    void chrome.storage.local.get(keys).then((value) => {
      if (mounted) setState(value);
    });
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== "local") return;
      const relevant = Object.entries(changes).filter(([key]) =>
        keys.includes(key),
      );
      if (relevant.length)
        setState((old) => ({
          ...old,
          ...Object.fromEntries(
            relevant.map(([key, value]) => [key, value.newValue]),
          ),
        }));
    };
    chrome.storage.onChanged.addListener(listener);
    return () => {
      mounted = false;
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []);
  return state;
}
export function useRecordingTime(active?: boolean, start?: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  const seconds =
    active && start ? Math.max(0, Math.floor((now - start) / 1000)) : 0;
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
