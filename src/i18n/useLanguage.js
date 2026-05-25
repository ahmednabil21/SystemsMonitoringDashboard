import { useCallback, useEffect, useState } from "react";
import { translations } from "./translations";

const LANG_KEY = "api-monitor-lang";

export function useLanguage() {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem(LANG_KEY);
    return saved === "en" || saved === "ar" ? saved : "ar";
  });

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback((next) => {
    setLangState(next);
  }, []);

  const t = useCallback(
    (key) => translations[lang][key] ?? translations.en[key] ?? key,
    [lang],
  );

  return { lang, setLang, t };
}
