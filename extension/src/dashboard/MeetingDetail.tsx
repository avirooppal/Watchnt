import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, json } from "../services/api";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import {
  Dialog,
  Notice,
  Skeleton,
  StatusPill,
  EmptyState,
} from "../components/Feedback";
import { Input } from "../components/Input";
import { ExportService } from "../services/ExportService";
const tabs = [
  "brief",
  "summary",
  "actions",
  "decisions",
  "timeline",
  "entities",
  "transcript",
  "email",
  "chat",
];
const artifactKey: Record<string, string> = { brief: "executive_brief" };
function Value({ value }: { value: any }) {
  const { t } = useTranslation();
  if (value === null || value === undefined || value === "")
    return <span>—</span>;
  if (Array.isArray(value) && !value.length)
    return <p className="muted">{t("noItems")}</p>;
  if (Array.isArray(value))
    return (
      <ul className="artifact-list">
        {value.map((item, index) => (
          <li key={index}>
            <Value value={item} />
          </li>
        ))}
      </ul>
    );
  if (typeof value === "object")
    return (
      <dl className="artifact-fields">
        {Object.entries(value)
          .filter(([key]) => key !== "completed")
          .map(([key, item]) => (
            <div key={key}>
              <dt>
                {t("fields." + key, { defaultValue: key.replaceAll("_", " ") })}
              </dt>
              <dd>
                <Value value={item} />
              </dd>
            </div>
          ))}
      </dl>
    );
  return (
    <span className="preserve-text" dir="auto">
      {String(value)}
    </span>
  );
}
export default function MeetingDetail() {
  const { id } = useParams(),
    { t } = useTranslation();
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [tab, setTab] = useState("brief");
  const [query, setQuery] = useState(""),
    [question, setQuestion] = useState(""),
    [messages, setMessages] = useState<{ role: string; content: string }[]>([]),
    [busy, setBusy] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false),
    [title, setTitle] = useState("");
  const mutation = useRef(false);
  const request = useRef(0);
  const load = useCallback(async () => {
    const version = ++request.current;
    try {
      const result = await api("/meeting/" + id);
      if (version === request.current) setData(result);
    } catch (e) {
      if (version === request.current) setError(String(e));
    }
  }, [id]);
  useEffect(() => {
    setData(null);
    void load();
    const timer = setInterval(() => {
      if (!document.hidden && !mutation.current) void load();
    }, 5000);
    return () => {
      clearInterval(timer);
      // Invalidate asynchronous requests, not a React-managed DOM ref.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      request.current++;
    };
  }, [load]);
  async function retry() {
    setBusy(true);
    mutation.current = true;
    request.current++;
    setError("");
    try {
      await api(`/meeting/${id}/retry`, { method: "POST" });
      void chrome.runtime.sendMessage({
        type: "REFRESH_PIPELINE",
        payload: { meetingId: id },
      });
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
      mutation.current = false;
    }
  }
  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    const next = [...messages, { role: "user", content: question }];
    setMessages(next);
    setQuestion("");
    setBusy(true);
    mutation.current = true;
    request.current++;
    setError("");
    try {
      const response = await api(`/meeting/${id}/chat`, {
        ...json("POST", { messages: next }),
        signal: AbortSignal.timeout(130000),
      });
      setMessages([...next, { role: "assistant", content: response.response }]);
    } catch (e) {
      setMessages(messages);
      setQuestion(next[next.length - 1].content);
      setError(String(e));
    } finally {
      setBusy(false);
      mutation.current = false;
    }
  }
  function exportSection() {
    if (tab === "summary") ExportService.exportSummaryAsMarkdown(data);
    if (tab === "brief") ExportService.exportExecutiveBriefAsMarkdown(data);
    if (tab === "actions") ExportService.exportActionsAsCSV(data);
    if (tab === "email") ExportService.exportEmailAsTXT(data);
  }
  async function rename(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    mutation.current = true;
    request.current++;
    setError("");
    try {
      await api("/meeting/" + id, json("PATCH", { title: title.trim() }));
      await load();
      setRenameOpen(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
      mutation.current = false;
    }
  }
  async function toggle(index: number, completed: boolean) {
    if (busy) return;
    const previous = data;
    setBusy(true);
    mutation.current = true;
    request.current++;
    setError("");
    setData((old: any) => ({
      ...old,
      ai: {
        ...old.ai,
        actions: {
          ...old.ai.actions,
          data: old.ai.actions.data.map((item: any, i: number) =>
            i === index ? { ...item, completed } : item,
          ),
        },
      },
    }));
    try {
      await api(`/meeting/${id}/action/${index}`, json("PATCH", { completed }));
      await load();
    } catch (e) {
      setData(previous);
      setError(String(e));
    } finally {
      setBusy(false);
      mutation.current = false;
    }
  }
  const artifact = data?.ai?.[artifactKey[tab] || tab];
  return (
    <div className="page">
      <Link className="back-link" to="/">
        <Icon name="back" size={16} /> {t("back")}
      </Link>
      {error && (
        <Notice kind="error">
          {error}
          <Button
            onClick={() => {
              setError("");
              void load();
            }}
          >
            {t("retry")}
          </Button>
        </Notice>
      )}
      {!data ? (
        <Skeleton />
      ) : (
        <>
          {data.capture_error && (
            <Notice kind="error">{data.capture_error}</Notice>
          )}
          <div className="row between detail-heading">
            <div>
              <div className="detail-meta">
                <StatusPill status={data.meeting?.status} />
                <span>
                  <Icon name="shield" size={14} />
                  {t("capturedLocally")}
                </span>
              </div>
              <h1 dir="auto">{data.meeting?.title}</h1>
            </div>
            <div className="row">
              <Button
                variant="ghost"
                onClick={() => {
                  setTitle(data.meeting.title);
                  setRenameOpen(true);
                }}
              >
                <Icon name="edit" />
                {t("rename")}
              </Button>
              <Button
                variant="secondary"
                onClick={() => ExportService.exportMeetingAsJSON(data)}
              >
                <Icon name="download" />
                {t("export")}
              </Button>
              <Button
                disabled={
                  busy ||
                  !["COMPLETED", "FAILED"].includes(data.meeting?.status)
                }
                onClick={retry}
              >
                {t("retry")}
              </Button>
            </div>
          </div>
          <p className="detail-review">
            <Icon name="sparkle" size={15} />
            {t("aiReview")}
          </p>
          <nav
            className="tab-bar"
            role="tablist"
            aria-label={t("meetingSections")}
          >
            {tabs.map((key) => (
              <button
                role="tab"
                id={"tab-" + key}
                aria-controls="meeting-panel"
                aria-selected={tab === key}
                tabIndex={tab === key ? 0 : -1}
                onKeyDown={(event) => {
                  const index = tabs.indexOf(key);
                  const next =
                    event.key === "ArrowRight"
                      ? (index + 1) % tabs.length
                      : event.key === "ArrowLeft"
                        ? (index + tabs.length - 1) % tabs.length
                        : event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? tabs.length - 1
                            : -1;
                  if (next >= 0) {
                    event.preventDefault();
                    setTab(tabs[next]);
                    document.getElementById("tab-" + tabs[next])?.focus();
                  }
                }}
                className={tab === key ? "active" : ""}
                key={key}
                onClick={() => setTab(key)}
              >
                {t(key)}
              </button>
            ))}
          </nav>
          <section
            className="panel detail-content"
            role="tabpanel"
            id="meeting-panel"
            aria-labelledby={"tab-" + tab}
            tabIndex={0}
          >
            {["summary", "brief", "actions", "email"].includes(tab) &&
              artifact?.status === "completed" && (
                <Button variant="secondary" onClick={exportSection}>
                  {t("exportSection")}
                </Button>
              )}
            {tab === "transcript" ? (
              <>
                <Input
                  icon="search"
                  aria-label={t("searchTranscript")}
                  placeholder={t("searchTranscript")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {!(data.transcript?.segments || []).some((s: any) =>
                  s.text
                    .toLocaleLowerCase()
                    .includes(query.toLocaleLowerCase()),
                ) && (
                  <EmptyState icon="search" title={t("noTranscriptMatches")} />
                )}
                {(data.transcript?.segments || [])
                  .filter((s: any) =>
                    s.text
                      .toLocaleLowerCase()
                      .includes(query.toLocaleLowerCase()),
                  )
                  .map((s: any, i: number) => (
                    <article className="transcript-segment" key={i}>
                      <span className="speaker-avatar">
                        {(s.speaker || "?").slice(0, 1)}
                      </span>
                      <div>
                        <div className="row">
                          <strong>{s.speaker}</strong>
                          <span className="muted">
                            {s.start !== undefined
                              ? Math.floor(s.start / 60) +
                                ":" +
                                String(Math.floor(s.start % 60)).padStart(
                                  2,
                                  "0",
                                )
                              : s.timestamp}{" "}
                            · {s.language}
                            {s.confidence !== undefined
                              ? " · " +
                                t("asrScore") +
                                ": " +
                                Math.round(s.confidence * 100) +
                                "%"
                              : ""}
                          </span>
                        </div>
                        <p dir="auto">{s.text}</p>
                      </div>
                    </article>
                  ))}
              </>
            ) : tab === "chat" ? (
              <>
                {!messages.length && (
                  <EmptyState
                    icon="chat"
                    title={t("chatIntro")}
                    description={t("chatDescription")}
                  />
                )}
                <div className="chat-thread" aria-live="polite">
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={"chat-message " + m.role}
                      dir="auto"
                    >
                      <span>{t(m.role === "user" ? "you" : "assistant")}</span>
                      <p>{m.content}</p>
                    </div>
                  ))}
                </div>
                {busy && <p role="status">{t("working")}</p>}
                <form className="chat-composer" onSubmit={ask}>
                  <Input
                    aria-label={t("ask")}
                    placeholder={t("ask")}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                  />
                  <Button type="submit" disabled={busy || !question.trim()}>
                    {t("send")}
                  </Button>
                </form>
              </>
            ) : artifact?.status === "failed" ? (
              <div role="alert">
                <h2>{t("sectionFailed")}</h2>
                <p>{artifact.error || t("processingFailedHelp")}</p>
              </div>
            ) : artifact?.status !== "completed" ? (
              <p role="status">
                {t(
                  data.meeting?.status === "COMPLETED" ? "noItems" : "pending",
                )}
              </p>
            ) : tab === "actions" ? (
              <div className="stack">
                {!(artifact.data || []).length && <p>{t("noItems")}</p>}
                {(artifact.data || []).map((item: any, index: number) => (
                  <article className="action-card" key={index}>
                    <label className="check-row">
                      <input
                        type="checkbox"
                        disabled={busy}
                        checked={!!item.completed}
                        onChange={(e) => toggle(index, e.target.checked)}
                        aria-label={t("markDone")}
                      />
                      <strong className={item.completed ? "task-done" : ""}>
                        {item.task}
                      </strong>
                    </label>
                    <p>
                      {item.owner || t("unassigned")} ·{" "}
                      {item.deadline || t("noDeadline")}
                    </p>
                    {item.evidence && (
                      <blockquote dir="auto">{item.evidence}</blockquote>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <Value value={artifact.data} />
            )}
          </section>
          <Dialog
            open={renameOpen}
            title={t("rename")}
            busy={busy}
            onClose={() => setRenameOpen(false)}
          >
            <form className="stack" onSubmit={rename}>
              <p>{t("renameHelp")}</p>
              {error && <Notice kind="error">{error}</Notice>}
              <Input
                label={t("title")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
              />
              <div className="row">
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setRenameOpen(false)}
                >
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={!title.trim()} isLoading={busy}>
                  {t("save")}
                </Button>
              </div>
            </form>
          </Dialog>
        </>
      )}
    </div>
  );
}
