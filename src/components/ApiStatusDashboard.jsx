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
    <div
      className="flex rounded-lg border border-slate-200 overflow-hidden bg-white"
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLang("ar")}
        className={`monitor-lang-btn rounded-none border-0 ${
          lang === "ar" ? "monitor-lang-btn--active" : ""
        }`}
      >
        {t("langAr")}
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`monitor-lang-btn rounded-none border-0 border-s border-slate-200 ${
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 mt-3 border-t border-slate-200">
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

  return (
    <article className={cardClass}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-slate-900 truncate">
            {displayName}
          </h3>
          {system.requiresAuth && (
            <p className="text-xs text-amber-600 mt-1 font-medium">
              {t("protected")}
            </p>
          )}
          {!hasUrl && (
            <p className="text-xs text-slate-400 mt-1">{t("noUrlYet")}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              isOnline
                ? "bg-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.25)]"
                : status === "offline"
                  ? "bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.25)]"
                  : "bg-slate-300 animate-pulse"
            }`}
            title={status ? statusLabel : t("checking")}
          />
          <button
            type="button"
            onClick={onEdit}
            className="p-2 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
            aria-label={t("edit")}
            title={t("edit")}
          >
            <EditIcon />
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-lg leading-none"
              aria-label={t("delete")}
              title={t("delete")}
            >
              ×
            </button>
          )}
        </div>
      </div>
      <div className={`${badgeClass} mt-auto w-full text-center`}>
        {statusLabel}
      </div>
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

    if (
      system.requiresAuth &&
      (!system.auth?.phoneNumber?.trim() || !system.auth?.password)
    ) {
      setStatuses((prev) => ({ ...prev, [system.id]: "offline" }));
      return;
    }

    try {
      const result = await requestCheck(
        targetUrl,
        system.requiresAuth ? system.auth : null,
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-600 mb-1">
              {t("monitoring")}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {t("title")}
            </h1>
            <p className="text-sm text-slate-500 mt-2 max-w-xl">{t("subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <LanguageSwitcher lang={lang} setLang={setLang} t={t} />
            <button
              type="button"
              onClick={openAddForm}
              className="px-4 py-2.5 bg-sky-600 text-white text-sm font-semibold rounded-lg hover:bg-sky-700 shadow-sm transition-colors"
            >
              + {t("addSystem")}
            </button>
          </div>
        </header>

        <section
          className="grid grid-cols-3 gap-3 sm:gap-4 mb-8"
          aria-label={t("monitoring")}
        >
          <div className="monitor-stat">
            <div className="monitor-stat__value text-slate-900">
              {systems.length}
            </div>
            <div className="monitor-stat__label">{t("total")}</div>
          </div>
          <div className="monitor-stat">
            <div className="monitor-stat__value text-green-600">
              {onlineCount}
            </div>
            <div className="monitor-stat__label">{t("onlineCount")}</div>
          </div>
          <div className="monitor-stat">
            <div className="monitor-stat__value text-red-600">
              {offlineCount}
            </div>
            <div className="monitor-stat__label">{t("offlineCount")}</div>
          </div>
        </section>

        {systems.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white border border-slate-200 rounded-xl">
            <p className="text-slate-500">{t("noSystems")}</p>
            <button
              type="button"
              onClick={openAddForm}
              className="mt-4 px-4 py-2 bg-sky-600 text-white text-sm font-semibold rounded-lg hover:bg-sky-700"
            >
              + {t("addSystem")}
            </button>
          </div>
        ) : (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <label className="flex items-center gap-2 text-sm text-slate-600 mt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={newRequiresAuth}
                onChange={(e) => setNewRequiresAuth(e.target.checked)}
                className="rounded border-slate-300"
              />
              {t("requiresAuth")}
            </label>
            <p className="text-xs text-slate-400 mt-3">{t("addHint")}</p>
            <div className="flex gap-2 mt-5">
              <button
                type="submit"
                disabled={!newSystemName.trim()}
                className="flex-1 px-4 py-2 bg-sky-600 text-white text-sm font-semibold rounded-lg hover:bg-sky-700 disabled:opacity-50"
              >
                {t("add")}
              </button>
              <button
                type="button"
                onClick={cancelAddForm}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-200"
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
          <div className="mt-3">
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
          <label className="flex items-center gap-2 text-sm text-slate-600 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={editDraft.requiresAuth}
              onChange={(e) => updateDraft("requiresAuth", e.target.checked)}
              className="rounded border-slate-300"
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
          <div className="flex gap-2 mt-5">
            <button
              type="button"
              onClick={saveEdit}
              disabled={!editDraft.name.trim()}
              className="flex-1 px-4 py-2 bg-sky-600 text-white text-sm font-semibold rounded-lg hover:bg-sky-700 disabled:opacity-50"
            >
              {t("save")}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-200"
            >
              {t("cancel")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
