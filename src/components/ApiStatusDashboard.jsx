import { useCallback, useEffect, useState } from "react";
import { BUILTIN_SYSTEM_IDS } from "../config/systems";
import { useLanguage } from "../i18n/useLanguage";
import {
  emptyAuth,
  getSystemDisplayName,
  loadSystems,
  normalizeSystem,
  saveExtraSystems,
} from "../lib/systemsStorage";

const POLL_INTERVAL_MS = 5000;

async function requestCheck(targetUrl, auth) {
  const hasAuth = auth?.phoneNumber?.trim() && auth?.password;
  const body = { url: targetUrl };
  if (hasAuth) {
    body.auth = {
      phoneNumber: auth.phoneNumber.trim(),
      password: auth.password,
    };
  }

  const response = await fetch("/api/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json();
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
  status,
  canDelete,
  onEdit,
  onDelete,
  t,
}) {
  const isOnline = status === "online";
  const hasUrl = Boolean(system.url.trim());

  const cardClass = [
    "monitor-card",
    status === "online" && "monitor-card--online",
    status === "offline" && "monitor-card--offline",
  ]
    .filter(Boolean)
    .join(" ");

  const badgeClass = [
    "monitor-status-badge",
    !status && "monitor-status-badge--pending",
    isOnline && "monitor-status-badge--online",
    status === "offline" && "monitor-status-badge--offline",
  ]
    .filter(Boolean)
    .join(" ");

  const statusLabel = !status && !hasUrl
    ? t("enterUrl")
    : !status
      ? "..."
      : isOnline
        ? t("online")
        : t("offline");

  const dotClass = [
    "monitor-card__dot",
    !status && "monitor-card__dot--pending",
    isOnline && "monitor-card__dot--online",
    status === "offline" && "monitor-card__dot--offline",
  ]
    .filter(Boolean)
    .join(" ");

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
          {!hasUrl && (
            <p className="monitor-card__meta">{t("noUrlYet")}</p>
          )}
        </div>
        <div className="monitor-card__tools">
          <span
            className={dotClass}
            title={status ? statusLabel : t("checking")}
          />
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
      <div className={badgeClass}>{statusLabel}</div>
    </article>
  );
}

export default function ApiStatusDashboard() {
  const { lang, setLang, t } = useLanguage();
  const [systems, setSystems] = useState(loadSystems);
  const [statuses, setStatuses] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSystemName, setNewSystemName] = useState("");
  const [newRequiresAuth, setNewRequiresAuth] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

  useEffect(() => {
    saveExtraSystems(systems);
  }, [systems]);

  const checkApi = useCallback(async (system) => {
    const targetUrl = system.url.trim();
    if (!targetUrl) {
      setStatuses((prev) => ({ ...prev, [system.id]: "offline" }));
      return;
    }

    const needsCreds =
      system.requiresAuth || Boolean(system.auth?.monitorLogin);
    if (
      needsCreds &&
      (!system.auth?.phoneNumber?.trim() || !system.auth?.password)
    ) {
      setStatuses((prev) => ({ ...prev, [system.id]: "offline" }));
      return;
    }

    try {
      const result = await requestCheck(
        targetUrl,
        system.requiresAuth || system.auth?.monitorLogin ? system.auth : null,
      );
      setStatuses((prev) => ({
        ...prev,
        [system.id]: result.status === 200 ? "online" : "offline",
      }));
    } catch {
      setStatuses((prev) => ({ ...prev, [system.id]: "offline" }));
    }
  }, []);

  const checkAllApis = useCallback(() => {
    systems.forEach((system) => checkApi(system));
  }, [systems, checkApi]);

  useEffect(() => {
    checkAllApis();
    const interval = setInterval(checkAllApis, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [checkAllApis]);

  const onlineCount = systems.filter((s) => statuses[s.id] === "online").length;
  const offlineCount = systems.filter(
    (s) => statuses[s.id] === "offline",
  ).length;

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
    setStatuses((prev) => {
      const next = { ...prev };
      delete next[id];
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

        <section className="monitor-stats" aria-label={t("monitoring")}>
          <div className="monitor-stat">
            <div className="monitor-stat__value monitor-stat__value--total">
              {systems.length}
            </div>
            <div className="monitor-stat__label">{t("total")}</div>
          </div>
          <div className="monitor-stat">
            <div className="monitor-stat__value monitor-stat__value--online">
              {onlineCount}
            </div>
            <div className="monitor-stat__label">{t("onlineCount")}</div>
          </div>
          <div className="monitor-stat">
            <div className="monitor-stat__value monitor-stat__value--offline">
              {offlineCount}
            </div>
            <div className="monitor-stat__label">{t("offlineCount")}</div>
          </div>
        </section>

        {systems.length === 0 ? (
          <div className="monitor-empty">
            <p>{t("noSystems")}</p>
            <button
              type="button"
              onClick={openAddForm}
              className="monitor-btn-primary"
              style={{ marginTop: "1rem" }}
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
                status={statuses[system.id]}
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
            <p className="monitor-header__subtitle" style={{ marginTop: "0.75rem" }}>
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
              {t("apiUrl")}
            </label>
            <input
              id="edit-url"
              type="url"
              className="monitor-input"
              value={editDraft.url}
              onChange={(e) => updateDraft("url", e.target.value)}
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
