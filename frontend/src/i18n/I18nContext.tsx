import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { en } from "@/locales/en";
import { ru } from "@/locales/ru";

export type AppLocale = "ru" | "en";

const STORAGE_LOCALE = "cipherline_locale_v1";

const catalogs: Record<AppLocale, Record<string, string>> = { ru, en };

type I18nContextValue = {
  locale: AppLocale;
  setLocale: (l: AppLocale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function readStoredLocale(): AppLocale {
  if (typeof window === "undefined") return "ru";
  try {
    const v = localStorage.getItem(STORAGE_LOCALE);
    if (v === "en" || v === "ru") return v;
  } catch {
    /* ignore */
  }
  return "ru";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  /** Сразу из storage — иначе первый кадр «ru», потом смена локали перезапрашивает сценарии (LLM шаг 1). */
  const [locale, setLocaleState] = useState<AppLocale>(() => readStoredLocale());

  const setLocale = useCallback((l: AppLocale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_LOCALE, l);
    } catch {
      /* ignore */
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = l;
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const table = catalogs[locale];
      let s = table[key] ?? catalogs.ru[key] ?? catalogs.en[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          s = s.replaceAll(`{${k}}`, String(v));
        }
      }
      return s;
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n outside I18nProvider");
  return ctx;
}
