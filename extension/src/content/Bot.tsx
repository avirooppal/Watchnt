import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/Button";
import { Brand, Icon } from "../components/Icon";
import { useCaptureState, useRecordingTime } from "../hooks/useCaptureState";
export const Bot = () => {
  const { t } = useTranslation(),
    state = useCaptureState(),
    timer = useRecordingTime(state.isRecording, state.recordingStartTime);
  const [minimized, setMinimized] = useState(false),
    [stopping, setStopping] = useState(false),
    [error, setError] = useState("");
  async function stop() {
    setStopping(true);
    setError("");
    try {
      await chrome.runtime.sendMessage({ type: "STOP_RECORDING" });
    } catch (e) {
      setError(String(e));
    } finally {
      setStopping(false);
    }
  }
  return (
    <aside
      className={`capture-controller ${minimized ? "is-minimized" : ""}`}
      aria-label="WatchNT"
      dir="ltr"
    >
      <header className="controller-header">
        <Brand />
        <span className="controller-status">
          {state.isRecording ? (
            <>
              <span className="record-dot" />
              {timer}
            </>
          ) : state.isUploading ? (
            <>
              <span className="spinner" />
              {t("processing")}
            </>
          ) : (
            <Icon name="shield" size={16} />
          )}
        </span>
        <button
          className="controller-toggle"
          aria-label={t(minimized ? "expand" : "minimize")}
          aria-expanded={!minimized}
          aria-controls="watchnt-capture-body"
          onClick={() => setMinimized(!minimized)}
        >
          <Icon name={minimized ? "plus" : "minus"} size={17} />
        </button>
      </header>
      {!minimized && (
        <div id="watchnt-capture-body" className="controller-body">
          <div className="row between">
            <span className="eyebrow">{t("livePreview")}</span>
            <span className="live-label">
              <span className="status-dot" />
              {t(
                state.isRecording
                  ? "recording"
                  : state.isUploading
                    ? "processing"
                    : "keepLocal",
              )}
            </span>
          </div>
          <p className="capture-preview" dir="auto" aria-live="polite">
            {state.liveTranscript ||
              t(state.isRecording ? "waiting" : "startHint")}
          </p>
          {(error || state.captureError) && (
            <p role="alert" className="capture-error">
              {error || state.captureError}
            </p>
          )}
          {typeof state.liveConfidence === "number" && (
            <div className="confidence-row">
              <span>{t("asrScore")}</span>
              <meter
                value={state.liveConfidence}
                min={0}
                max={1}
                aria-label={t("asrScore")}
              />
              <strong>{Math.round(state.liveConfidence * 100)}%</strong>
            </div>
          )}
          <footer className="controller-footer">
            {state.isRecording ? (
              <Button
                size="sm"
                variant="danger"
                isLoading={stopping}
                onClick={stop}
              >
                <Icon name="stop" size={14} />
                {t("stop")}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD" })
                }
              >
                {t("dashboard")}
                <Icon name="arrow" size={14} />
              </Button>
            )}
          </footer>
        </div>
      )}
    </aside>
  );
};
