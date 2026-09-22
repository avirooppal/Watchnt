import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "../i18n";
import { Button } from "../components/Button";
import { Brand, Icon } from "../components/Icon";
import { Notice } from "../components/Feedback";
import { useCaptureState, useRecordingTime } from "../hooks/useCaptureState";
import { useEngineStatus } from "../hooks/useEngineStatus";
export default function Popup() {
  const { t } = useTranslation(),
    state = useCaptureState(),
    { online, check } = useEngineStatus();
  const [supported, setSupported] = useState(false),
    [pending, setPending] = useState(false),
    [mode, setMode] = useState("audio"),
    [error, setError] = useState("");
  const timer = useRecordingTime(state.isRecording, state.recordingStartTime);
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) =>
      setSupported(
        /^https:\/\/(meet\.google\.com|([\w-]+\.)?zoom\.us|teams\.microsoft\.com|teams\.live\.com)\//.test(
          tabs[0]?.url || "",
        ),
      ),
    );
  }, []);
  async function capture(stop = false) {
    setPending(true);
    setError("");
    try {
      await chrome.runtime.sendMessage(
        stop
          ? { type: "STOP_RECORDING" }
          : { type: "START_RECORDING_WITH_STREAM", payload: { mode } },
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setPending(false);
    }
  }
  const terminal =
    !state.isRecording &&
    !state.isUploading &&
    !!state.currentMeetingId &&
    ["COMPLETED", "FAILED"].includes(state.pipelineStatus || "");
  const active = state.isRecording || state.isUploading;
  return (
    <div className="popup-shell">
      <header className="popup-header">
        <Brand />
        <Button
          variant="ghost"
          className="icon-button"
          aria-label={t("settings")}
          onClick={() =>
            chrome.tabs.create({
              url: chrome.runtime.getURL("dashboard.html#/settings"),
            })
          }
        >
          <Icon name="settings" size={19} />
        </Button>
      </header>
      <main className="popup-main">
        <div className={`capture-hero ${active ? "is-active" : ""}`}>
          <div className="capture-emblem">
            <Icon name={state.isUploading ? "sparkle" : "mic"} size={30} />
            {state.isRecording && <span className="live-beacon" />}
          </div>

          <h1>
            {t(
              state.isRecording
                ? "recording"
                : state.isUploading
                  ? "savingCapture"
                  : terminal
                    ? state.pipelineStatus === "FAILED"
                      ? "captureFailed"
                      : "captureSaved"
                    : "ready",
            )}
          </h1>
          {state.isUploading && <p>{t("stopHint")}</p>}
          {state.isRecording && (
            <div className="recording-timer">
              {timer}
              <span className="record-dot" />
            </div>
          )}
        </div>
        <div className="connection-row">
          <span>
            <Icon name="monitor" size={17} />
            {t("engine")}
          </span>
          <span
            className={`engine-state ${online === null ? "connecting" : online ? "online" : "offline"}`}
            role="status"
          >
            <span className="status-dot" />
            {t(online === null ? "connecting" : online ? "online" : "offline")}
          </span>
        </div>
        {(error || state.captureError) && (
          <Notice kind="error">{error || state.captureError}</Notice>
        )}
        {state.isRecording && state.captureWarning && (
          <Notice>{state.captureWarning}</Notice>
        )}
        {!state.isRecording && state.currentMeetingId && (
          <section className="popup-preview">
            <p>
              {t(
                state.isUploading
                  ? state.pipelineStatus === "TRANSCRIBING"
                    ? "stopHint"
                    : "processingSaved"
                  : state.pipelineStatus === "FAILED"
                    ? "captureFailedHelp"
                    : "captureSavedHelp",
              )}
            </p>
            <Button
              onClick={() =>
                chrome.tabs.create({
                  url: chrome.runtime.getURL(
                    "dashboard.html#/meeting/" + state.currentMeetingId,
                  ),
                })
              }
            >
              {t("open")}
            </Button>
          </section>
        )}
        {!active && (
          <fieldset className="capture-modes">
            <legend>{t("captureMode")}</legend>
            <div className="mode-grid">
              {(["audio", "captions"] as const).map((value) => (
                <label
                  key={value}
                  className={`mode-option ${mode === value ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="capture-mode"
                    value={value}
                    checked={mode === value}
                    onChange={() => setMode(value)}
                  />
                  <Icon
                    name={value === "audio" ? "mic" : "transcript"}
                    size={19}
                  />
                  <span>{t(value)}</span>
                  <Icon name="check" size={14} />
                </label>
              ))}
            </div>
            <p className="field-hint">
              {t(mode === "audio" ? "recordingSource" : "captionHelp")}
            </p>
          </fieldset>
        )}
        {active && (
          <section className="popup-preview">
            <div className="row between">
              <span className="eyebrow">{t("livePreview")}</span>
              <span className="live-label">
                {state.isRecording ? (
                  <>
                    <span className="status-dot" />
                    {t("recording")}
                  </>
                ) : (
                  t("processing")
                )}
              </span>
            </div>
            <p dir="auto">{state.liveTranscript || t("noPreview")}</p>
          </section>
        )}
        {!active && !supported && (
          <p className="capture-hint">
            <Icon name="library" size={17} />
            {t("openMeetingHint")}
          </p>
        )}
        {online === false && !active && (
          <Notice
            kind="error"
            action={
              <Button size="sm" variant="secondary" onClick={check}>
                {t("retry")}
              </Button>
            }
          >
            {t("engineOfflineHint")}
          </Notice>
        )}
        {state.isUploading ? (
          <div className="processing-indicator" role="status">
            <span className="spinner" />
            {t("processing")}
          </div>
        ) : (
          <Button
            className="capture-primary"
            variant={state.isRecording ? "danger" : "primary"}
            size="lg"
            isLoading={pending}
            disabled={!state.isRecording && (!online || !supported)}
            onClick={() => capture(!!state.isRecording)}
          >
            <Icon name={state.isRecording ? "stop" : "mic"} size={19} />
            {t(
              pending && !state.isRecording
                ? "starting"
                : state.isRecording
                  ? "stop"
                  : "record",
            )}
          </Button>
        )}
      </main>
      <footer className="popup-footer">
        {!state.onboardingCompleted && (
          <Button
            variant="secondary"
            onClick={() =>
              chrome.tabs.create({
                url: chrome.runtime.getURL("dashboard.html#/onboarding"),
              })
            }
          >
            {t("resumeSetup")}
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() => chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD" })}
        >
          <Icon name="library" size={18} />
          {t("dashboard")}
          <Icon name="arrow" size={17} />
        </Button>
      </footer>
    </div>
  );
}
