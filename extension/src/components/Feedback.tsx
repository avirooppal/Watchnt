import { useEffect, useId, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Icon, type IconName } from "./Icon";
import { Button } from "./Button";
export function Notice({
  children,
  kind = "info",
  action,
}: {
  children: ReactNode;
  kind?: "info" | "error" | "success";
  action?: ReactNode;
}) {
  return (
    <div
      className={`notice notice-${kind}`}
      role={kind === "error" ? "alert" : "status"}
    >
      <Icon
        name={
          kind === "error" ? "alert" : kind === "success" ? "check" : "shield"
        }
        size={18}
      />
      <div>{children}</div>
      {action}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  icon = "library",
  children,
}: {
  title: string;
  description?: string;
  icon?: IconName;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={icon} size={28} />
      </span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {children}
    </div>
  );
}
export function Skeleton({ rows = 3 }: { rows?: number }) {
  const { t } = useTranslation();
  return (
    <div className="skeleton-list" role="status" aria-label={t("loading")}>
      <span className="sr-only">{t("loading")}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div className="skeleton-card" aria-hidden="true" key={i}>
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}
export function Dialog({
  open,
  title,
  onClose,
  children,
  busy = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  const { t } = useTranslation();
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    else if (!open && dialog?.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current && !busy) {
          const box = ref.current.getBoundingClientRect();
          if (
            event.clientX < box.left ||
            event.clientX > box.right ||
            event.clientY < box.top ||
            event.clientY > box.bottom
          )
            onClose();
        }
      }}
    >
      <div className="row between">
        <h2 id={id}>{title}</h2>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={onClose}
          aria-label={t("cancel")}
        >
          <Icon name="close" />
        </Button>
      </div>
      {children}
    </dialog>
  );
}
export function StatusPill({ status }: { status: string }) {
  const { t } = useTranslation();
  const key =
    status === "COMPLETED"
      ? "completed"
      : status === "FAILED"
        ? "failed"
        : status === "RECORDING"
          ? "recording"
          : "processing";
  return (
    <span className={`status-pill ${key}`}>
      <span className="status-dot" />
      {t(key)}
    </span>
  );
}
