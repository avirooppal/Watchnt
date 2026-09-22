import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useDeferredValue,
} from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, json } from "../services/api";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Icon } from "../components/Icon";
import {
  Dialog,
  Notice,
  Skeleton,
  EmptyState,
  StatusPill,
} from "../components/Feedback";
type Meeting = {
  id: string;
  title: string;
  created_at: string;
  status: string;
  folder_id: string | null;
  duration_minutes?: string;
  language?: string;
  provider?: string;
};
type Folder = { id: string; name: string };
export default function MeetingList() {
  const { t, i18n } = useTranslation();
  const [meetings, setMeetings] = useState<Meeting[]>([]),
    [folders, setFolders] = useState<Folder[]>([]),
    [query, setQuery] = useState(""),
    [folder, setFolder] = useState(""),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [name, setName] = useState(""),
    [pending, setPending] = useState(""),
    [deleting, setDeleting] = useState<Meeting | null>(null);
  const version = useRef(0),
    search = useDeferredValue(query);
  const load = useCallback(async () => {
    const request = ++version.current;
    try {
      const [m, f] = await Promise.all([
        api<Meeting[]>("/meetings"),
        api<Folder[]>("/folders"),
      ]);
      if (request !== version.current) return;
      setMeetings(m);
      setFolders(f);
      setError("");
    } catch (e) {
      if (request === version.current) setError(String(e));
    } finally {
      if (request === version.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 15000);
    return () => {
      // Invalidate asynchronous requests, not a React-managed DOM ref.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      version.current++;
      clearInterval(timer);
    };
  }, [load]);
  async function createFolder() {
    if (!name.trim() || pending) return;
    setPending("folder");
    try {
      await api("/folder", json("POST", { name: name.trim() }));
      setName("");
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setPending("");
    }
  }
  async function remove() {
    if (!deleting) return;
    setPending(deleting.id);
    try {
      await api("/meeting/" + deleting.id, { method: "DELETE" });
      version.current++;
      setMeetings((old) => old.filter((m) => m.id !== deleting.id));
      setDeleting(null);
    } catch (e) {
      setError(String(e));
      setDeleting(null);
    } finally {
      setPending("");
    }
  }
  async function move(id: string, folder_id: string) {
    setPending(id);
    try {
      await api(
        "/meeting/" + id,
        json("PATCH", { folder_id: folder_id || null }),
      );
      setMeetings((old) =>
        old.map((m) =>
          m.id === id ? { ...m, folder_id: folder_id || null } : m,
        ),
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setPending("");
    }
  }
  const visible = meetings
    .filter(
      (m) =>
        (!folder || m.folder_id === folder) &&
        (!search ||
          m.title.toLocaleLowerCase().includes(search.toLocaleLowerCase())) &&
        (!status ||
          (status === "PROCESSING"
            ? !["COMPLETED", "FAILED"].includes(m.status)
            : m.status === status)),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <div className="page library-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" />
            {t("library")}
          </div>
          <h1>{t("tagline")}</h1>
          <p className="lede">{t("libraryIntro")}</p>
        </div>
        <div className="heading-seal" aria-hidden="true">
          <Icon name="library" size={36} />
          <span />
          <span />
        </div>
      </div>
      <div className="stats-row">
        {(
          [
            { icon: "library", label: "totalMeetings", value: meetings.length },
            {
              icon: "check",
              label: "readyNotes",
              value: meetings.filter((m) => m.status === "COMPLETED").length,
            },
            {
              icon: "clock",
              label: "needsReview",
              value: meetings.filter((m) => m.status === "FAILED").length,
            },
          ] as const
        ).map((item) => (
          <div className="stat-card" key={item.label}>
            <span className={"stat-icon " + item.icon}>
              <Icon name={item.icon} size={20} />
            </span>
            <div>
              <span>{t(item.label)}</span>
              <strong>
                {loading ? "—" : item.value.toLocaleString(i18n.language)}
              </strong>
            </div>
          </div>
        ))}
      </div>
      <div className="library-grid">
        <aside className="folder-panel">
          <div className="section-heading">
            <h2>{t("folders")}</h2>
            <Icon name="folder" size={17} />
          </div>
          <button
            className={`folder ${!folder ? "active" : ""}`}
            aria-pressed={!folder}
            onClick={() => setFolder("")}
          >
            <Icon name="library" size={18} />
            <span>{t("all")}</span>
            <small>{meetings.length}</small>
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              className={`folder ${folder === f.id ? "active" : ""}`}
              aria-pressed={folder === f.id}
              onClick={() => setFolder(f.id)}
            >
              <Icon name="folder" size={18} />
              <span>{f.name}</span>
              <small>
                {meetings.filter((m) => m.folder_id === f.id).length}
              </small>
            </button>
          ))}
          <form
            className="folder-create"
            onSubmit={(e) => {
              e.preventDefault();
              void createFolder();
            }}
          >
            <Input
              aria-label={t("newFolder")}
              placeholder={t("newFolder")}
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
            />
            <Button
              variant="secondary"
              type="submit"
              isLoading={pending === "folder"}
              disabled={!name.trim()}
            >
              <Icon name="plus" size={16} />
              {t("create")}
            </Button>
          </form>
        </aside>
        <section className="meeting-results" aria-label={t("recentMeetings")}>
          <div className="section-heading">
            <h2>{t("recentMeetings")}</h2>
            <span className="count-label" role="status">
              {t("resultsCount", { count: visible.length })}
            </span>
          </div>
          <div className="toolbar library-toolbar">
            <Input
              icon="search"
              type="search"
              aria-label={t("search")}
              placeholder={t("search")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              aria-label={t("status")}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {[
                ["", "allStatuses"],
                ["COMPLETED", "completed"],
                ["PROCESSING", "processing"],
                ["FAILED", "failed"],
              ].map(([value, key]) => (
                <option key={value} value={value}>
                  {t(key)}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <Notice
              kind="error"
              action={
                <Button size="sm" variant="secondary" onClick={load}>
                  {t("retry")}
                </Button>
              }
            >
              {error}
            </Notice>
          )}
          {loading ? (
            <Skeleton />
          ) : !visible.length ? (
            <div className="panel">
              <EmptyState
                title={t(meetings.length ? "noMatches" : "empty")}
                description={t(meetings.length ? "allCaughtUp" : "emptyIntro")}
                icon={meetings.length ? "search" : "library"}
              >
                {(query || folder || status) && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery("");
                      setFolder("");
                      setStatus("");
                    }}
                  >
                    {t("clearFilters")}
                  </Button>
                )}
              </EmptyState>
            </div>
          ) : (
            <div className="meeting-list">
              {visible.map((m) => (
                <article key={m.id} className="meeting-card">
                  <div className="meeting-topline">
                    <span className="meeting-date">
                      {new Date(m.created_at).toLocaleDateString(
                        i18n.language,
                        { month: "short", day: "numeric", year: "numeric" },
                      )}
                    </span>
                    <StatusPill status={m.status} />
                  </div>
                  <Link className="meeting-link" to={"/meeting/" + m.id}>
                    <span className="document-mark">
                      <Icon name="transcript" size={22} />
                    </span>
                    <h2 dir="auto">{m.title}</h2>
                    <span className="meeting-open">
                      <Icon name="arrow" size={20} />
                    </span>
                  </Link>
                  <div className="meeting-bottomline">
                    <div className="meeting-meta">
                      <span>
                        <Icon name="clock" size={15} />
                        {m.duration_minutes || "—"} {t("minutes")}
                      </span>
                      {m.language && (
                        <span>
                          <Icon name="globe" size={15} />
                          {m.language}
                        </span>
                      )}
                      <span className="local-meta">
                        <Icon name="shield" size={14} />
                        {t("capturedLocally")}
                      </span>
                    </div>
                    <div className="meeting-controls">
                      <select
                        disabled={pending === m.id}
                        aria-label={t("move")}
                        value={m.folder_id || ""}
                        onChange={(e) => move(m.id, e.target.value)}
                      >
                        <option value="">{t("unfiled")}</option>
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!!pending}
                        onClick={() => setDeleting(m)}
                        aria-label={`${t("delete")}: ${m.title}`}
                        className="delete-button"
                      >
                        <Icon name="trash" size={16} />
                        <span>{t("delete")}</span>
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
      <Dialog
        open={!!deleting}
        title={t("deleteConfirm")}
        onClose={() => setDeleting(null)}
        busy={!!pending}
      >
        <p className="modal-description">{t("deleteHelp")}</p>
        <div className="modal-subject">{deleting?.title}</div>
        <div className="modal-actions">
          <Button
            variant="secondary"
            disabled={!!pending}
            onClick={() => setDeleting(null)}
          >
            {t("cancel")}
          </Button>
          <Button variant="danger" isLoading={!!pending} onClick={remove}>
            <Icon name="trash" size={17} />
            {t("delete")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
