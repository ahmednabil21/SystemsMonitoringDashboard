import { BUILTIN_SYSTEMS, BUILTIN_SYSTEM_IDS } from "../config/systems";

const STORAGE_KEY = "api-status-systems";

export const emptyAuth = () => ({ phoneNumber: "", password: "" });

export function normalizeSystem(system) {
  const auth = system.auth ?? emptyAuth();
  return {
    ...system,
    nameEn: system.nameEn ?? system.name,
    requiresAuth: Boolean(system.requiresAuth),
    auth: {
      phoneNumber: auth.phoneNumber ?? "",
      password: auth.password ?? "",
      loginStyle: auth.loginStyle,
      monitorLogin: Boolean(auth.monitorLogin),
      loginUrl: auth.loginUrl,
    },
  };
}

export function getBuiltinSystems() {
  return BUILTIN_SYSTEMS.map(normalizeSystem);
}

/** Built-in systems always come from code; user-added systems stay in localStorage. */
export function loadSystems() {
  const builtin = getBuiltinSystems();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return builtin;

    const saved = JSON.parse(raw).map(normalizeSystem);
    const extras = saved.filter((s) => !BUILTIN_SYSTEM_IDS.has(s.id));
    return [...builtin, ...extras];
  } catch {
    return builtin;
  }
}

export function saveExtraSystems(systems) {
  const toStore = systems.filter((s) => !BUILTIN_SYSTEM_IDS.has(s.id));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
}

export function getSystemDisplayName(system, lang) {
  return lang === "en" && system.nameEn ? system.nameEn : system.name;
}
