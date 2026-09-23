import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, json } from "../services/api";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { Notice, Skeleton } from "../components/Feedback";
import { Input } from "../components/Input";
type ProviderOption = {
  id: string;
  label: string;
  cloud: boolean;
  default_model: string;
  docs_url: string;
};
export default function Settings({
  setup,
  onValidated,
  onBusyChange,
}: {
  setup?: "speech" | "provider";
  onValidated?: () => void;
  onBusyChange?: (busy: boolean) => void;
} = {}) {
  const { t, i18n } = useTranslation();
  const [config, setConfig] = useState<Record<string, string> | null>(null);
  const [snapshot, setSnapshot] = useState("");
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    onBusyChange?.(busy);
    return () => onBusyChange?.(false);
  }, [busy, onBusyChange]);
  const [results, setResults] = useState<
    Record<string, { status: string; message: string }>
  >({});
  const load = () =>
    Promise.all([
      api<Record<string, string>>("/config"),
      api<ProviderOption[]>("/providers"),
    ])
      .then(([value, catalog]) => {
        setProviders(catalog);
        setConfig(value);
        setSnapshot(JSON.stringify(value));
        setFailed(false);
        setMessage("");
      })
      .catch((error) => {
        setFailed(true);
        setMessage(error.message);
      })
      .finally(() => setLoading(false));
  useEffect(() => {
    void load();
  }, []);
  const update = (key: string, value: string) =>
    setConfig((old) => ({ ...old, [key]: value }));
  async function save(test = false) {
    if (!config) return;
    if (
      setup !== "speech" &&
      !config.llm_model.trim() &&
      !providers.find((p) => p.id === config.llm_provider)?.default_model
    ) {
      setFailed(true);
      setMessage(t("modelRequired"));
      return;
    }
    if (
      setup !== "speech" &&
      config.llm_provider !== "ollama" &&
      config.cloud_text_consent !== "yes"
    ) {
      setFailed(true);
      setMessage(t("consentNeeded"));
      return;
    }
    setBusy(true);
    setMessage("");
    setFailed(false);
    try {
      const payload = Object.fromEntries(
        Object.entries(config).filter(
          ([key, value]) =>
            !(key.endsWith("_api_key") && value.includes("****")),
        ),
      );
      const saved = await api("/config", json("POST", payload));
      setConfig(saved);
      setSnapshot(JSON.stringify(saved));
      if (test) {
        const checks = await api<
          Record<string, { status: string; message: string }>
        >("/config/test", {
          method: "POST",
          signal: AbortSignal.timeout(90000),
        });
        setResults(checks);
        if (
          checks.whisper?.status === "ok" &&
          checks[saved.llm_provider]?.status === "ok"
        )
          onValidated?.();
      } else if (setup === "speech") onValidated?.();
      setMessage(t("saved"));
    } catch (error) {
      setFailed(true);
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }
  async function recover() {
    setBusy(true);
    try {
      const saved = await chrome.storage.local.get([
        "recoveryTranscript",
        "recoveryMeetingId",
        "isRecording",
        "isUploading",
      ]);
      if (saved.isRecording || saved.isUploading) {
        setMessage(t("processing"));
        return;
      }
      if (!saved.recoveryMeetingId) {
        setMessage(t("noRecovery"));
        return;
      }
      const form = new FormData();
      form.append("meeting_id", String(saved.recoveryMeetingId));
      form.append(
        "transcript_json",
        JSON.stringify(saved.recoveryTranscript || []),
      );
      await api("/upload_transcript", { method: "POST", body: form });
      await chrome.storage.local.remove([
        "recoveryTranscript",
        "recoveryMeetingId",
        "isRecording",
        "isUploading",
      ]);
      await chrome.storage.local.set({
        isRecording: false,
        isUploading: false,
        captureError: "",
      });
      setMessage(t("recovered"));
    } catch (error) {
      setFailed(true);
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={setup ? "setup-settings" : "page settings-page"}>
      {!setup && (
        <>
          <div className="eyebrow">{t("preferences")}</div>
          <h1>{t("settings")}</h1>
          <p className="lede">{t("settingsIntro")}</p>
          <Link className="back-link" to="/onboarding">
            {t("setupAgain")}
          </Link>
        </>
      )}
      {message && (
        <Notice kind={failed ? "error" : "success"}>{message}</Notice>
      )}
      {loading ? (
        <Skeleton />
      ) : !config ? (
        <section className="panel stack engine-help">
          <h2>{t("startBackend")}</h2>
          <p>{t("backendInstructions")}</p>
          <pre>
            <code>{"docker compose up"}</code>
          </pre>
          <Button
            onClick={() => {
              setLoading(true);
              void load();
            }}
          >
            {t("retry")}
          </Button>
        </section>
      ) : (
        <div className="settings-layout">
          <fieldset disabled={busy} className="settings-main">
            {setup !== "provider" && (
              <section className="panel settings-panel stack">
                <div className="settings-panel-header">
                  <span className="section-icon">
                    <Icon name="mic" />
                  </span>
                  <div>
                    <h2>{t("speech")}</h2>
                    <p>{t("speechDescription")}</p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      const stream = await navigator.mediaDevices.getUserMedia({
                        audio: true,
                      });
                      stream.getTracks().forEach((track) => track.stop());
                      setFailed(false);
                      setMessage(t("savedMic"));
                    } catch (e) {
                      setFailed(true);
                      setMessage(String(e));
                    }
                  }}
                >
                  {t("microphone")}
                </Button>

                <label>
                  {t("speechLanguage")}
                  <select
                    value={config.transcription_language}
                    onChange={(e) =>
                      update("transcription_language", e.target.value)
                    }
                  >
                    <option value="auto">{t("auto")}</option>
                    {[
                      ["en", "English"],
                      ["es", "Español"],
                      ["hi", "हिन्दी"],
                      ["bn", "বাংলা"],
                      ["fr", "Français"],
                      ["de", "Deutsch"],
                      ["ja", "日本語"],
                      ["zh", "中文"],
                      ["ar", "العربية"],
                      ["pt", "Português"],
                    ].map(([code, name]) => (
                      <option value={code} key={code}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("language")}
                  <select
                    value={i18n.language}
                    onChange={(e) => {
                      setMessage("");
                      void i18n.changeLanguage(e.target.value);
                      void chrome.storage.local.set({
                        uiLanguage: e.target.value,
                      });
                    }}
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </label>
              </section>
            )}
            {setup !== "speech" && (
              <section className="panel settings-panel stack">
                <div className="settings-panel-header">
                  <span className="section-icon">
                    <Icon name="sparkle" />
                  </span>
                  <div>
                    <h2>{t("provider")}</h2>
                    <p>{t("providerDescription")}</p>
                  </div>
                </div>
                <Notice>{t("privacy")}</Notice>
                <label>
                  {t("provider")}
                  <select
                    aria-label={t("provider")}
                    value={config.llm_provider}
                    onChange={(e) => {
                      update("llm_provider", e.target.value);
                      update("cloud_text_consent", "no");
                      update(
                        "llm_model",
                        providers.find((p) => p.id === e.target.value)
                          ?.default_model || "",
                      );
                      setResults({});
                      setShowKey(false);
                    }}
                  >
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label + " · " + t(p.cloud ? "cloud" : "keepLocal")}
                      </option>
                    ))}
                  </select>
                </label>
                <Input
                  label={t("model")}
                  hint={t("modelHint")}
                  value={config.llm_model}
                  onChange={(e) => update("llm_model", e.target.value)}
                />
                <a
                  href={
                    providers.find((p) => p.id === config.llm_provider)
                      ?.docs_url
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("providerDocs")}
                </a>
                {config.llm_provider === "ollama_cloud" && (
                  <Notice>{t("ollamaCloudHelp")}</Notice>
                )}
                {config.llm_provider === "ollama" ? (
                  <Input
                    label={t("ollama")}
                    value={config.ollama_base_url}
                    onChange={(e) => update("ollama_base_url", e.target.value)}
                  />
                ) : (
                  <>
                    <Input
                      label={t("key")}
                      type={showKey ? "text" : "password"}
                      hint={t("keyHint")}
                      autoComplete="off"
                      value={config[config.llm_provider + "_api_key"] || ""}
                      onChange={(e) =>
                        update(config.llm_provider + "_api_key", e.target.value)
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-pressed={showKey}
                      onClick={() => setShowKey(!showKey)}
                    >
                      {t(showKey ? "hideKey" : "showKey")}
                    </Button>
                    <label className="check-row consent-row">
                      <input
                        type="checkbox"
                        checked={config.cloud_text_consent === "yes"}
                        onChange={(e) =>
                          update(
                            "cloud_text_consent",
                            e.target.checked ? "yes" : "no",
                          )
                        }
                      />
                      <span>{t("consent")}</span>
                    </label>
                  </>
                )}
                {Object.entries(results).map(([name, result]) => (
                  <div className="result-row" key={name}>
                    <strong>{name}</strong>
                    <span>
                      {result.status} · {result.message}
                    </span>
                  </div>
                ))}
              </section>
            )}
            {!setup && (
              <section className="panel settings-panel stack">
                <div className="settings-panel-header">
                  <span className="section-icon">
                    <Icon name="refresh" />
                  </span>
                  <div>
                    <h2>{t("recover")}</h2>
                    <p>{t("recoveryDescription")}</p>
                  </div>
                </div>
                <p>{t("recoverHelp")}</p>
                <Button disabled={busy} variant="secondary" onClick={recover}>
                  {t("recover")}
                </Button>
              </section>
            )}
          </fieldset>

          <div className="save-bar">
            <span>
              <Icon
                name={snapshot === JSON.stringify(config) ? "check" : "edit"}
              />
              {t(snapshot === JSON.stringify(config) ? "upToDate" : "unsaved")}
            </span>{" "}
            <div className="row">
              <Button
                isLoading={busy}
                onClick={() => save(setup === "provider")}
              >
                {t(
                  setup
                    ? setup === "provider"
                      ? "setupTest"
                      : "saveContinue"
                    : "save",
                )}
              </Button>
              {!setup && (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => save(true)}
                >
                  {t("diagnostics")}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
