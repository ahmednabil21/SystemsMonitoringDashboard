import { useCallback, useEffect, useState } from "react";
import { BUILTIN_SYSTEM_IDS } from "../config/systems";
import { useLanguage } from "../i18n/useLanguage";
import { useTheme } from "../i18n/useTheme";
import {
  emptyAuth,
  getSystemDisplayName,
  loadSystems,
  normalizeSystem,
  saveExtraSystems,
} from "../lib/systemsStorage";

const POLL_INTERVAL_MS = 5000;

async function requestCheck(targetUrl, auth) {
  const hasCredentials =
    Boolean(auth?.phoneNumber?.trim()) &&
    auth?.password !== undefined &&
    auth?.password !== null &&
    String(auth.password).length > 0;

  const body = { url: targetUrl };
  if (hasCredentials || auth?.monitorLogin) {
    body.auth = {
      phoneNumber: String(auth.phoneNumber ?? "").trim(),
      password: String(auth.password ?? ""),
      ...(auth.loginStyle && { loginStyle: auth.loginStyle }),
      ...(auth.monitorLogin && { monitorLogin: true }),
      ...(auth.loginUrl && { loginUrl: auth.loginUrl }),
    };
  }

  const response = await fetch("/api/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json();
}

function getCheckKey(systemId, target) {
  return `${systemId}:${target}`;
}

function getEndpointList(system) {
  const backendUrl = String(system.backendUrl ?? system.url ?? "").trim();
  const frontendUrl = String(system.frontendUrl ?? "").trim();
  return [
    { key: "frontend", labelKey: "frontend", url: frontendUrl, auth: null },
    {
      key: "backend",
      labelKey: "backend",
      url: backendUrl,
      auth: system.requiresAuth || system.auth?.monitorLogin ? system.auth : null,
    },
  ];
}

function EditIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <path d="m2.695 14.363 1.272-1.272 9.525-9.525 1.272 1.272-9.525 9.525-1.272 1.272Zm-.707 2.121 1.272-1.272 1.414 1.414-1.272 1.272-1.414-1.414ZM15.89 4.89l-1.272-1.273a1 1 0 0 0-1.414 0l-1.272 1.273 1.272 1.272 1.272-1.272 1.414-1.414Z" />
    </svg>
  );
}

function LanguageSwitcher({ lang, setLang, t }) {
  return (
    <div className="monitor-lang-switch" role="group" aria-label="Language">
      <button
        type="button"
        onClick={() => setLang("ar")}
        className={`monitor-lang-btn ${
          lang === "ar" ? "monitor-lang-btn--active" : ""
        }`}
      >
        {t("langAr")}
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`monitor-lang-btn ${
          lang === "en" ? "monitor-lang-btn--active" : ""
        }`}
      >
        {t("langEn")}
      </button>
    </div>
  );
}

function ThemeToggle({ isDark, onToggle, t }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="monitor-theme-btn"
      aria-label={t("toggleTheme")}
      title={isDark ? t("themeLight") : t("themeDark")}
    >
      {isDark ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M10 2a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Zm4 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm-.464 4.95.707.707a1 1 0 0 0 1.414-1.414l-.707-.707a1 1 0 0 0-1.414 1.414Zm2.12-10.607a1 1 0 0 1 0 1.414l-.706.707a1 1 0 1 1-1.414-1.414l.707-.707a1 1 0 0 1 1.413 0ZM17 11a1 1 0 1 0 0-2h-1a1 1 0 1 0 0 2h1Zm-7 4a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1ZM5.05 6.464A1 1 0 1 0 3.636 5.05l-.707-.707a1 1 0 0 0-1.414 1.414l.707.707a1 1 0 0 0 1.414-1.414ZM4 11a1 1 0 1 0 0-2H3a1 1 0 0 0 0 2h1Zm9.95 2.536a1 1 0 0 0-1.414 1.414l.707.707a1 1 0 0 0 1.414-1.414l-.707-.707ZM7.05 15.536a1 1 0 0 0 1.414 1.414l-.707.707a1 1 0 1 0-1.414-1.414l.707-.707Z" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M17.293 13.293A8 8 0 0 1 6.707 2.707a8.001 8.001 0 1 0 10.586 10.586Z" />
        </svg>
      )}
    </button>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div
      className="monitor-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="monitor-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="monitor-modal-title"
      >
        <h2 id="monitor-modal-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function AuthFields({ auth, onChange, idPrefix, t }) {
  return (
    <div className="monitor-auth-grid">
      <div>
        <label className="monitor-label" htmlFor={`${idPrefix}-phone`}>
          {t("phoneUser")}
        </label>
        <input
          id={`${idPrefix}-phone`}
          type="text"
          className="monitor-input"
          value={auth.phoneNumber}
          onChange={(e) => onChange("phoneNumber", e.target.value)}
          placeholder="ghafar"
          autoComplete="username"
        />
      </div>
      <div>
        <label className="monitor-label" htmlFor={`${idPrefix}-password`}>
          {t("password")}
        </label>
        <input
          id={`${idPrefix}-password`}
          type="password"
          className="monitor-input"
          value={auth.password}
          onChange={(e) => onChange("password", e.target.value)}
          autoComplete="current-password"
        />
      </div>
    </div>
  );
}

function MonitorCard({
  system,
  displayName,
  checks,
  canDelete,
  onEdit,
  onDelete,
  t,
}) {
  const endpoints = getEndpointList(system);
  const availableChecks = endpoints.filter((endpoint) => endpoint.url);
  const onlineTargets = availableChecks.filter((endpoint) => {
    const check = checks[getCheckKey(system.id, endpoint.key)];
    return check?.status === "online";
  }).length;
  const offlineTargets = availableChecks.filter((endpoint) => {
    const check = checks[getCheckKey(system.id, endpoint.key)];
    return check?.status === "offline";
  }).length;
  const hasAnyTarget = availableChecks.length > 0;
  const hasOffline = offlineTargets > 0;
  const isOnline = hasAnyTarget && onlineTargets === availableChecks.length;

  const cardClass = [
    "monitor-card",
    isOnline && "monitor-card--online",
    hasOffline && "monitor-card--offline",
  ]
    .filter(Boolean)
    .join(" ");

  const cardSummary = !hasAnyTarget
    ? t("enterUrl")
    : hasOffline
      ? t("partialOrOffline")
      : t("online");

  return (
    <article className={cardClass}>
      <div className="monitor-card__row">
        <div className="monitor-card__info">
          <h3 className="monitor-card__name">{displayName}</h3>
          {system.requiresAuth && (
            <p className="monitor-card__meta monitor-card__meta--auth">
              {t("protected")}
            </p>
          )}
          {!hasAnyTarget && (
            <p className="monitor-card__meta">{t("noUrlYet")}</p>
          )}
        </div>
        <div className="monitor-card__tools">
          <button
            type="button"
            onClick={onEdit}
            className="monitor-card__icon-btn"
            aria-label={t("edit")}
            title={t("edit")}
          >
            <EditIcon />
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="monitor-card__icon-btn monitor-card__icon-btn--delete"
              aria-label={t("delete")}
              title={t("delete")}
            >
              ×
            </button>
          )}
        </div>
      </div>
      <div className="monitor-card__targets">
        {endpoints.map((endpoint) => {
          const key = getCheckKey(system.id, endpoint.key);
          const check = checks[key];
          const hasUrl = Boolean(endpoint.url);
          const targetStatus = !hasUrl
            ? "pending"
            : check?.status ?? "pending";
          const dotClass = [
            "monitor-card__dot",
            targetStatus === "pending" && "monitor-card__dot--pending",
            targetStatus === "online" && "monitor-card__dot--online",
            targetStatus === "offline" && "monitor-card__dot--offline",
          ]
            .filter(Boolean)
            .join(" ");
          const badgeClass = [
            "monitor-status-badge",
            "monitor-status-badge--compact",
            targetStatus === "pending" && "monitor-status-badge--pending",
            targetStatus === "online" && "monitor-status-badge--online",
            targetStatus === "offline" && "monitor-status-badge--offline",
          ]
            .filter(Boolean)
            .join(" ");
          const statusLabel = !hasUrl
            ? t("enterUrl")
            : targetStatus === "pending"
              ? t("checking")
              : targetStatus === "online"
                ? t("online")
                : t("offline");

          return (
            <div className="monitor-target" key={key}>
              <div className="monitor-target__head">
                <div className="monitor-target__title">
                  <span className={dotClass} />
                  <span>{t(endpoint.labelKey)}</span>
                </div>
                <span className={badgeClass}>{statusLabel}</span>
              </div>
              <div className="monitor-target__meta">
                <span>
                  {t("responseTime")}: {check?.responseTimeMs ?? "-"} ms
                </span>
                <span>
                  {t("trafficChecks")}: {check?.checks ?? 0}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="monitor-card__summary">{cardSummary}</p>
    </article>
  );
}

export default function ApiStatusDashboard() {
  const { lang, setLang, t } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const [systems, setSystems] = useState(loadSystems);
  const [checks, setChecks] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSystemName, setNewSystemName] = useState("");
  const [newRequiresAuth, setNewRequiresAuth] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

  useEffect(() => {
    saveExtraSystems(systems);
  }, [systems]);

  const checkTarget = useCallback(async (system, target) => {
    const key = getCheckKey(system.id, target.key);
    if (!target.url) return;

    try {
      const result = await requestCheck(target.url, target.auth);
      setChecks((prev) => {
        const before = prev[key] ?? { checks: 0 };
        return {
          ...prev,
          [key]: {
            status: result.status === 200 ? "online" : "offline",
            responseTimeMs: result.responseTimeMs ?? null,
            checks: before.checks + 1,
            httpStatus: result.status ?? null,
          },
        };
      });
    } catch {
      setChecks((prev) => {
        const before = prev[key] ?? { checks: 0 };
        return {
          ...prev,
          [key]: {
            status: "offline",
            responseTimeMs: null,
            checks: before.checks + 1,
            httpStatus: 0,
          },
        };
      });
    }
  }, []);

  const checkAllApis = useCallback(() => {
    systems.forEach((system) => {
      getEndpointList(system).forEach((target) => {
        checkTarget(system, target);
      });
    });
  }, [systems, checkTarget]);

  useEffect(() => {
    checkAllApis();
    const interval = setInterval(checkAllApis, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [checkAllApis]);

  const summary = systems.reduce((acc, system) => {
    const endpoints = getEndpointList(system).filter((target) => target.url);
    if (endpoints.length === 0) return acc;
    endpoints.forEach((target) => {
      const item = checks[getCheckKey(system.id, target.key)];
      if (item?.status === "online") acc.online += 1;
      if (item?.status === "offline") acc.offline += 1;
      acc.totalTargets += 1;
      acc.trafficChecks += item?.checks ?? 0;
    });
    return acc;
  }, {
    online: 0,
    offline: 0,
    totalTargets: 0,
    trafficChecks: 0,
  });

  const startEdit = (system) => {
    setEditingId(system.id);
    setEditDraft({ ...system, auth: { ...system.auth } });
  };

  const updateDraft = (field, value) => {
    setEditDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const updateDraftAuth = (field, value) => {
    setEditDraft((prev) =>
      prev ? { ...prev, auth: { ...prev.auth, [field]: value } } : prev,
    );
  };

  const saveEdit = () => {
    if (!editDraft) return;
    setSystems((prev) =>
      prev.map((s) =>
        s.id === editingId ? normalizeSystem(editDraft) : s,
      ),
    );
    setEditingId(null);
    setEditDraft(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const openAddForm = () => {
    setNewSystemName("");
    setNewRequiresAuth(false);
    setShowAddForm(true);
  };

  const cancelAddForm = () => {
    setShowAddForm(false);
    setNewSystemName("");
    setNewRequiresAuth(false);
  };

  const addSystem = (e) => {
    e.preventDefault();
    const name = newSystemName.trim();
    if (!name) return;

    const newSystem = normalizeSystem({
      id: crypto.randomUUID(),
      name,
      frontendUrl: "",
      backendUrl: "",
      url: "",
      requiresAuth: newRequiresAuth,
      auth: emptyAuth(),
    });

    setSystems((prev) => [...prev, newSystem]);
    cancelAddForm();
    startEdit(newSystem);
  };

  const removeSystem = (id) => {
    if (editingId === id) cancelEdit();
    setSystems((prev) => prev.filter((s) => s.id !== id));
    setChecks((prev) => {
      const next = { ...prev };
      delete next[getCheckKey(id, "frontend")];
      delete next[getCheckKey(id, "backend")];
      return next;
    });
  };

  return (
    <div className="monitor-page">
      <div className="monitor-shell">
        <header className="monitor-header">
          <div className="monitor-header__brand">
            <p className="monitor-header__eyebrow">{t("monitoring")}</p>
            <h1 className="monitor-header__title">{t("title")}</h1>
            <p className="monitor-header__subtitle">{t("subtitle")}</p>
          </div>
          <div className="monitor-header__actions">
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} t={t} />
            <LanguageSwitcher lang={lang} setLang={setLang} t={t} />
            <button
              type="button"
              onClick={openAddForm}
              className="monitor-btn-primary"
            >
              + {t("addSystem")}
            </button>
          </div>
        </header>

        <section className="monitor-stats monitor-stats--four" aria-label={t("monitoring")}>
          <div className="monitor-stat">
            <div className="monitor-stat__value monitor-stat__value--total">
              {summary.totalTargets}
            </div>
            <div className="monitor-stat__label">{t("totalTargets")}</div>
          </div>
          <div className="monitor-stat">
            <div className="monitor-stat__value monitor-stat__value--online">
              {summary.online}
            </div>
            <div className="monitor-stat__label">{t("onlineCount")}</div>
          </div>
          <div className="monitor-stat">
            <div className="monitor-stat__value monitor-stat__value--offline">
              {summary.offline}
            </div>
            <div className="monitor-stat__label">{t("offlineCount")}</div>
          </div>
          <div className="monitor-stat">
            <div className="monitor-stat__value monitor-stat__value--total">
              {summary.trafficChecks}
            </div>
            <div className="monitor-stat__label">{t("trafficChecks")}</div>
          </div>
        </section>

        {systems.length === 0 ? (
          <div className="monitor-empty">
            <p>{t("noSystems")}</p>
            <button
              type="button"
              onClick={openAddForm}
              className="monitor-btn-primary"
            >
              + {t("addSystem")}
            </button>
          </div>
        ) : (
          <section className="monitor-grid">
            {systems.map((system) => (
              <MonitorCard
                key={system.id}
                system={system}
                displayName={getSystemDisplayName(system, lang)}
                checks={checks}
                canDelete={!BUILTIN_SYSTEM_IDS.has(system.id)}
                onEdit={() => startEdit(system)}
                onDelete={() => removeSystem(system.id)}
                t={t}
              />
            ))}
          </section>
        )}
      </div>

      {showAddForm && (
        <Modal title={t("addSystemTitle")} onClose={cancelAddForm}>
          <form onSubmit={addSystem}>
            <div>
              <label className="monitor-label" htmlFor="new-system-name">
                {t("systemName")}
              </label>
              <input
                id="new-system-name"
                type="text"
                className="monitor-input"
                value={newSystemName}
                onChange={(e) => setNewSystemName(e.target.value)}
                placeholder={t("systemNamePlaceholder")}
                required
                autoFocus
              />
            </div>
            <label className="monitor-checkbox">
              <input
                type="checkbox"
                checked={newRequiresAuth}
                onChange={(e) => setNewRequiresAuth(e.target.checked)}
              />
              {t("requiresAuth")}
            </label>
            <p className="monitor-header__subtitle monitor-add-hint">
              {t("addHint")}
            </p>
            <div className="monitor-modal-actions">
              <button
                type="submit"
                disabled={!newSystemName.trim()}
                className="monitor-btn-primary"
              >
                {t("add")}
              </button>
              <button
                type="button"
                onClick={cancelAddForm}
                className="monitor-btn-ghost"
              >
                {t("cancel")}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editingId && editDraft && (
        <Modal title={t("editSystemTitle")} onClose={cancelEdit}>
          <div>
            <label className="monitor-label" htmlFor="edit-name">
              {t("systemName")}
            </label>
            <input
              id="edit-name"
              type="text"
              className="monitor-input"
              value={editDraft.name}
              onChange={(e) => updateDraft("name", e.target.value)}
            />
          </div>
          <div style={{ marginTop: "0.75rem" }}>
            <label className="monitor-label" htmlFor="edit-url">
              {t("frontendUrl")}
            </label>
            <input
              id="edit-url"
              type="url"
              className="monitor-input"
              value={editDraft.frontendUrl ?? ""}
              onChange={(e) => updateDraft("frontendUrl", e.target.value)}
              placeholder={t("frontendUrlPlaceholder")}
            />
          </div>
          <div style={{ marginTop: "0.75rem" }}>
            <label className="monitor-label" htmlFor="edit-backend-url">
              {t("apiUrl")}
            </label>
            <input
              id="edit-backend-url"
              type="url"
              className="monitor-input"
              value={editDraft.backendUrl ?? editDraft.url ?? ""}
              onChange={(e) => {
                updateDraft("backendUrl", e.target.value);
                updateDraft("url", e.target.value);
              }}
              placeholder={t("apiUrlPlaceholder")}
            />
          </div>
          <label className="monitor-checkbox">
            <input
              type="checkbox"
              checked={editDraft.requiresAuth}
              onChange={(e) => updateDraft("requiresAuth", e.target.checked)}
            />
            {t("requiresAuth")}
          </label>
          {editDraft.requiresAuth && (
            <AuthFields
              idPrefix="edit"
              auth={editDraft.auth}
              onChange={updateDraftAuth}
              t={t}
            />
          )}
          <div className="monitor-modal-actions">
            <button
              type="button"
              onClick={saveEdit}
              disabled={!editDraft.name.trim()}
              className="monitor-btn-primary"
            >
              {t("save")}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="monitor-btn-ghost"
            >
              {t("cancel")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
