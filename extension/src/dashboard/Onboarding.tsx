import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../services/api";
import { Button } from "../components/Button";
import { Notice, Skeleton } from "../components/Feedback";
import { Icon } from "../components/Icon";
import Settings from "./Settings";
const steps = ["setupBackend", "setupCapture", "setupAI", "setupReady"];
export default function Onboarding() {
  const { t } = useTranslation(),
    navigate = useNavigate();
  const [step, setStep] = useState<number | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    void chrome.storage.local
      .get(["onboardingStep", "onboardingCompleted"])
      .then((saved) =>
        setStep(
          saved.onboardingCompleted
            ? 0
            : Math.max(0, Math.min(3, Number(saved.onboardingStep) || 0)),
        ),
      );
  }, []);
  async function advance() {
    if (step === null) return;
    const next = Math.min(3, step + 1);
    await chrome.storage.local.set({ onboardingStep: next });
    setError("");
    setStep(next);
    window.scrollTo({ top: 0 });
  }
  async function connect() {
    setBusy(true);
    setError("");
    try {
      await api("/health", { signal: AbortSignal.timeout(5000) });
      await advance();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function finish() {
    setBusy(true);
    try {
      await chrome.storage.local.set({
        onboardingCompleted: true,
        onboardingStep: 3,
      });
      navigate("/");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page onboarding-page">
      <div className="eyebrow">WatchNT</div>
      <h1>{t("setup")}</h1>
      <p className="lede">{t("setupDescription")}</p>
      {step === null ? (
        <Skeleton />
      ) : (
        <>
          <ol className="setup-steps" aria-label={t("setupProgress")}>
            {steps.map((label, index) => (
              <li
                key={label}
                aria-current={step === index ? "step" : undefined}
                className={index < step ? "complete" : ""}
              >
                <span>
                  {index < step ? <Icon name="check" size={16} /> : index + 1}
                </span>
                {t(label)}
              </li>
            ))}
          </ol>
          {error && <Notice kind="error">{error}</Notice>}
          <div key={step}>
            {step === 0 && (
              <section className="panel setup-panel stack">
                <h2>{t("setupBackend")}</h2>
                <p>{t("setupBackendHelp")}</p>
                <pre><code>{"docker compose up"}</code></pre>
                <details>
                  <summary>{t("setupInstall")}</summary>
                  <p>{t("setupInstallHelp")}</p>
                  <pre>
                    <code>
                      {"python -m pip install -r backend/requirements.txt"}
                    </code>
                  </pre>
                </details>
                <details>
                  <summary>{t("setupOtherOS")}</summary>
                  <pre>
                    <code>
                      {
                        "cd backend\npython -m uvicorn main:app --host 127.0.0.1 --port 8000"
                      }
                    </code>
                  </pre>
                </details>
                <Button isLoading={busy} onClick={connect}>
                  {t("setupConnect")}
                </Button>
              </section>
            )}
            {step === 1 && (
              <>
                <Notice>{t("setupMicrophoneHelp")}</Notice>
                <Settings
                  onBusyChange={setBusy}
                  setup="speech"
                  onValidated={() => void advance()}
                />
              </>
            )}
            {step === 2 && (
              <>
                <Notice>{t("setupProviderHelp")}</Notice>
                <details className="setup-model-help">
                  <summary>{t("setupModels")}</summary>
                  <p>{t("setupModelsHelp")}</p>
                  <pre>
                    <code>
                      {
                        "docker compose restart backend"
                      }
                    </code>
                  </pre>
                  <p>{t("setupOllamaHelp")}</p>
                  <pre>
                    <code>{"docker compose logs -f backend"}</code>
                  </pre>
                </details>
                <Settings
                  onBusyChange={setBusy}
                  setup="provider"
                  onValidated={() => void advance()}
                />
              </>
            )}
            {step === 3 && (
              <section className="panel setup-panel stack">
                <span className="empty-icon">
                  <Icon name="check" size={28} />
                </span>
                <h2>{t("setupReady")}</h2>
                <p>{t("setupReadyHelp")}</p>
                <ol className="setup-instructions">
                  <li>{t("setupPin")}</li>
                  <li>{t("setupCall")}</li>
                  <li>{t("setupPreview")}</li>
                  <li>{t("setupStop")}</li>
                </ol>
                <Button isLoading={busy} onClick={finish}>
                  {t("setupFinish")}
                </Button>
              </section>
            )}
          </div>
          <div className="row between setup-navigation">
            {step > 0 ? (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  void chrome.storage.local.set({ onboardingStep: step - 1 });
                  setStep(step - 1);
                  setError("");
                }}
              >
                {t("setupBack")}
              </Button>
            ) : (
              <span />
            )}
            <Link to="/">{t("setupLater")}</Link>
          </div>
        </>
      )}
    </div>
  );
}
