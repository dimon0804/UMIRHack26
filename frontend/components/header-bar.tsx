"use client";

import { useTheme } from "next-themes";

import { useLocale } from "@/components/providers";

export function HeaderBar() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { locale, setLocale, t } = useLocale();
  const active = resolvedTheme ?? theme;

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-surface-muted/60 px-6 py-4 backdrop-blur dark:border-slate-800/80">
      <div className="text-sm font-medium text-ink-muted">{t("apiBase")}</div>
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              locale === "ru"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-ink-muted hover:text-ink"
            }`}
            onClick={() => setLocale("ru")}
          >
            {t("localeRu")}
          </button>
          <button
            type="button"
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              locale === "en"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-ink-muted hover:text-ink"
            }`}
            onClick={() => setLocale("en")}
          >
            {t("localeEn")}
          </button>
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              active === "light"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-ink-muted hover:text-ink"
            }`}
            onClick={() => setTheme("light")}
          >
            {t("themeLight")}
          </button>
          <button
            type="button"
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              active === "dark"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-ink-muted hover:text-ink"
            }`}
            onClick={() => setTheme("dark")}
          >
            {t("themeDark")}
          </button>
        </div>
      </div>
    </header>
  );
}
