import { useEffect, useState, useDeferredValue } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, json } from "../services/api";
import { Input } from "../components/Input";
import { Icon } from "../components/Icon";
import { Notice, EmptyState, Skeleton } from "../components/Feedback";
type Action = {
  meeting_id: string;
  meeting_title: string;
  index: number;
  task: string;
  owner?: string;
  deadline?: string;
  completed: boolean;
};
export default function Actions() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Action[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [filter, setFilter] = useState("all"),
    [query, setQuery] = useState(""),
    [pending, setPending] = useState<Set<string>>(new Set());
  const search = useDeferredValue(query.toLocaleLowerCase());
  useEffect(() => {
    let active = true;
    api<Action[]>("/action-items")
      .then((data) => {
        if (active) setItems(data);
      })
      .catch((e) => {
        if (active) setError(String(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function toggle(item: Action) {
    const key = item.meeting_id + item.index;
    if (pending.has(key)) return;
    setError("");
    setPending((old) => new Set(old).add(key));
    setItems((old) =>
      old.map((entry) =>
        entry.meeting_id === item.meeting_id && entry.index === item.index
          ? { ...entry, completed: !item.completed }
          : entry,
      ),
    );
    try {
      await api(
        `/meeting/${item.meeting_id}/action/${item.index}`,
        json("PATCH", { completed: !item.completed }),
      );
    } catch (e) {
      setItems((old) =>
        old.map((entry) =>
          entry.meeting_id === item.meeting_id && entry.index === item.index
            ? item
            : entry,
        ),
      );
      setError(String(e));
    } finally {
      setPending((old) => {
        const next = new Set(old);
        next.delete(key);
        return next;
      });
    }
  }
  const done = items.filter((item) => item.completed).length;
  const visible = items.filter(
    (item) =>
      (filter === "all" ||
        (filter === "done" ? item.completed : !item.completed)) &&
      (!search ||
        `${item.task} ${item.owner || ""} ${item.meeting_title}`
          .toLocaleLowerCase()
          .includes(search)),
  );
  return (
    <div className="page actions-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" />
            {t("workspace")}
          </div>
          <h1>{t("actions")}</h1>
          <p className="lede">{t("actionsIntro")}</p>
        </div>
        <span className="heading-icon">
          <Icon name="actions" size={30} />
        </span>
      </div>
      <div className="action-overview">
        <div>
          <span className="stat-number">{items.length - done}</span>
          <span>{t("openTasks")}</span>
        </div>
        <div className="completion-summary">
          <div className="row between">
            <span>{t("finishedTasks")}</span>
            <strong>
              {done} / {items.length}
            </strong>
          </div>
          <progress
            value={done}
            max={Math.max(1, items.length)}
            aria-label={t("finishedTasks")}
          />
        </div>
        <Icon name="check" size={32} />
      </div>
      <div className="action-toolbar">
        <div
          className="segmented-control"
          role="group"
          aria-label={t("status")}
        >
          {[
            ["all", "allTasks"],
            ["open", "openTasks"],
            ["done", "finishedTasks"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {t(label)}
              <span>
                {value === "all"
                  ? items.length
                  : value === "done"
                    ? done
                    : items.length - done}
              </span>
            </button>
          ))}
        </div>
        <Input
          icon="search"
          type="search"
          aria-label={t("searchActions")}
          placeholder={t("searchActions")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      {loading ? (
        <Skeleton />
      ) : !visible.length ? (
        <div className="panel">
          <EmptyState
            title={t(items.length ? "noTaskMatches" : "noItems")}
            description={t("noTaskHelp")}
            icon="check"
          />
        </div>
      ) : (
        <div className="action-list">
          {visible.map((item) => (
            <article
              className={`action-card ${item.completed ? "is-done" : ""}`}
              key={item.meeting_id + item.index}
            >
              <label className="task-check">
                <input
                  type="checkbox"
                  checked={item.completed}
                  disabled={pending.has(item.meeting_id + item.index)}
                  onChange={() => toggle(item)}
                  aria-label={t("markDone")}
                />
                <span className="task-checkbox" aria-hidden="true">
                  <Icon name="check" size={14} />
                </span>
              </label>
              <div className="task-body">
                <strong
                  className={item.completed ? "task-done" : ""}
                  dir="auto"
                >
                  {item.task}
                </strong>
                <div className="task-meta">
                  <span>
                    <span className="person-avatar" aria-hidden="true">
                      {(item.owner || "?").slice(0, 1).toUpperCase()}
                    </span>
                    {item.owner || t("unassigned")}
                  </span>
                  <span>
                    <Icon name="clock" size={14} />
                    {item.deadline || t("noDeadline")}
                  </span>
                </div>
                <Link
                  className="source-link"
                  to={"/meeting/" + item.meeting_id}
                >
                  <Icon name="library" size={14} />
                  {item.meeting_title}
                  <Icon name="arrow" size={14} />
                </Link>
              </div>
              <span
                className={`task-state ${item.completed ? "complete" : ""}`}
              >
                {t(item.completed ? "done" : "openTasks")}
              </span>
            </article>
          ))}
        </div>
      )}
      <p className="review-footnote">
        <Icon name="sparkle" size={16} />
        {t("aiReview")}
      </p>
    </div>
  );
}
