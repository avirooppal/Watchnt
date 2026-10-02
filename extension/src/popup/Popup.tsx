import { useEffect, useRef, useState } from "react";
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
    [error, setError] = useState("");
  const content = useRef<HTMLElement>(null);
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
          : { type: "START_RECORDING_WITH_STREAM" },
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setPending(false);
    }
  }
  const terminal =
    !state.isStarting &&
    !state.isRecording &&
    !state.isUploading &&
    !!state.currentMeetingId &&
    ["COMPLETED", "FAILED"].includes(state.pipelineStatus || "");
  const dismissed =
    terminal &&
    state.pipelineStatus === "COMPLETED" &&
    state.dismissedCaptureId === state.currentMeetingId;
  useEffect(() => {
    if (state.currentMeetingId && !state.isRecording)
      void chrome.runtime.sendMessage({
        type: "REFRESH_PIPELINE",
        payload: { meetingId: state.currentMeetingId },
      });
  }, [state.currentMeetingId, state.isRecording]);
  const active = state.isStarting || state.isRecording || state.isUploading;
  useEffect(() => {
    if (terminal && content.current) content.current.scrollTop = 0;
  }, [terminal]);
  return (
    <div className={`popup-shell ${terminal ? "has-result" : ""}`}>
      <header className="popup-header">
        <Brand />
        <Button
          variant="ghost"
          className="popup-settings"
          aria-label={t("settings")}
          title={t("settings")}
          onClick={() =>
            chrome.tabs.create({
              url: chrome.runtime.getURL("dashboard.html#/settings"),
            })
          }
        >
          <Icon name="gear" size={18} />
          {t("settings")}
        </Button>
      </header>
      <main className="popup-main" ref={content}>
        <div className={`capture-hero ${active ? "is-active" : ""}`}>
          <h1 aria-live="polite">
            {t(
              state.isStarting
                ? "starting"
                : state.isRecording
                  ? "recording"
                  : state.isUploading
                    ? state.pipelineStatus === "TRANSCRIBING" ||
                      state.pipelineStatus === "UPLOADING"
                      ? "savingCapture"
                      : "preparingNotes"
                    : terminal && !dismissed
                      ? state.pipelineStatus === "FAILED"
                        ? "captureFailed"
                        : "captureSaved"
                      : supported
                        ? "ready"
                        : "meetingRequired",
            )}
          </h1>
          {!active && (!terminal || dismissed) && (
            <p id="capture-description">
              {t(supported ? "captureEverything" : "openMeetingHint")}
            </p>
          )}
          {state.isRecording && (
            <div className="recording-timer">
              {timer}
              <span className="record-dot" />
            </div>
          )}
        </div>
        {(error || state.captureError) && !terminal && (
          <Notice kind="error">{error || state.captureError}</Notice>
        )}
        {(state.isRecording || (terminal && !dismissed)) &&
          state.captureWarning && <Notice>{state.captureWarning}</Notice>}
        {!state.isRecording && state.currentMeetingId && !dismissed && (
          <section className="popup-preview popup-result">
            {state.pipelineStatus === "COMPLETED" && !state.isUploading && (
              <Button
                variant="ghost"
                className="icon-button popup-dismiss"
                aria-label={t("dismissNotification")}
                title={t("dismissNotification")}
                onClick={() =>
                  void chrome.storage.local.set({
                    dismissedCaptureId: state.currentMeetingId,
                  })
                }
              >
                <Icon name="close" size={17} />
              </Button>
            )}
            {state.pipelineStatus === "FAILED" && (
              <p className="popup-error" role="alert">
                {error || state.captureError || t("processingFailedHelp")}
              </p>
            )}
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
            {state.pipelineStatus === "FAILED" && (
              <Button
                variant="secondary"
                onClick={() =>
                  chrome.tabs.create({
                    url: chrome.runtime.getURL("dashboard.html#/settings"),
                  })
                }
              >
                {t("checkModelSettings")}
              </Button>
            )}
          </section>
        )}
        {state.isRecording && (
          <details className="popup-preview popup-live-preview">
            <summary>
              {t("livePreview")} <Icon name="chevron" size={15} />
            </summary>
            <p dir="auto">{state.liveTranscript || t("noPreview")}</p>
          </details>
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
            {t("captureUnavailable")}
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
            aria-describedby={
              !active && (!terminal || dismissed)
                ? "capture-description"
                : undefined
            }
            variant={state.isRecording ? "danger" : "primary"}
            size="lg"
            isLoading={pending || state.isStarting}
            disabled={
              !!state.isStarting ||
              (!state.isRecording && (!online || !supported))
            }
            onClick={() => capture(!!state.isRecording)}
          >
            <Icon name={state.isRecording ? "stop" : "mic"} size={19} />
            {t(
              (pending || state.isStarting) && !state.isRecording
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
