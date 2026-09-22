import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Brand, Icon, type IconName } from "../components/Icon";
import { useEngineStatus } from "../hooks/useEngineStatus";
const navigation: { path: string; label: string; icon: IconName }[] = [
  { path: "/", label: "library", icon: "library" },
  { path: "/actions", label: "actions", icon: "actions" },
  { path: "/settings", label: "settings", icon: "settings" },
];
export default function Layout() {
  const { t } = useTranslation(),
    location = useLocation(),
    { online } = useEngineStatus();
  const current = location.pathname.startsWith("/meeting/")
    ? "open"
    : location.pathname === "/actions"
      ? "actions"
      : location.pathname === "/settings" || location.pathname === "/onboarding"
        ? "settings"
        : "library";
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        {t("skip")}
      </a>
      <aside className="sidebar">
        <NavLink to="/" aria-label="WatchNT">
          <Brand />
        </NavLink>
        <div className="sidebar-label">{t("workspace")}</div>
        <nav aria-label={t("workspace")}>
          {navigation.map(({ path, label, icon }) => (
            <NavLink
              end={path === "/"}
              to={path}
              key={path}
              aria-label={t(label)}
            >
              <Icon name={icon} />
              <span className="desktop-nav-label">{t(label)}</span>
              <span className="mobile-nav-label" aria-hidden="true">
                {t(label === "library" ? "libraryShort" : label)}
              </span>
              <Icon name="chevron" size={15} />
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="workspace-shell">
        <header className="app-header">
          <div className="breadcrumb">
            <span>{t("overview")}</span>
            <Icon name="chevron" size={13} />
            <strong>{t(current)}</strong>
          </div>
          <div className="header-end">
            <span
              className={`engine-state ${online === null ? "connecting" : online ? "online" : "offline"}`}
              role="status"
            >
              <span className="status-dot" />
              {t(
                online === null ? "connecting" : online ? "online" : "offline",
              )}
            </span>
            <span
              className="profile-mark"
              role="img"
              aria-label={t("keepLocal")}
            >
              <Icon name="shield" size={17} />
            </span>
          </div>
        </header>
        <main className="workspace" id="main-content" tabIndex={-1}>
          <div key={location.pathname} className="route-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
