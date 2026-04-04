import { Link, useLocation } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/i18n/I18nContext";
import { leagueByXp } from "@/lib/leagues";
import type { AppLocale } from "@/i18n/I18nContext";

export function AppHeader() {
  const { userState, logout, theme, toggleTheme } = useApp();
  const { locale, setLocale, t } = useI18n();
  const loc = useLocation();
  if (!userState) return null;

  const hpPct = userState.hp;
  const nav = [
    { to: "/dashboard", label: t("header.pulse") },
    { to: "/leaderboard", label: t("header.leaderboard") },
    { to: "/profile", label: t("header.profile") },
    { to: "/certificate", label: t("header.cert") },
  ];

  function pickLocale(next: AppLocale) {
    setLocale(next);
  }

  return (
    <header className="fixed inset-x-0 top-3 z-50 px-3 print:hidden sm:top-4 sm:px-4 md:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 rounded-2xl border border-emerald-100/85 bg-white/88 px-3 py-3 shadow-[0_8px_40px_-12px_rgb(16_185_129_/_0.22),0_1px_0_0_rgb(255_255_255_/_0.95)_inset] backdrop-blur-2xl transition-[background-color,border-color,box-shadow] duration-300 dark:border-white/[0.08] dark:bg-zinc-950/72 dark:shadow-[0_0_0_1px_rgb(34_197_94_/_0.08),inset_0_1px_0_0_rgb(255_255_255_/_0.06),0_32px_64px_-28px_rgb(0_0_0_/_0.85)] md:flex-row md:flex-nowrap md:items-center md:justify-between md:gap-3 md:px-4 md:py-3.5 lg:gap-4 lg:px-5">
        <div className="flex w-full min-w-0 shrink-0 items-center justify-between gap-2 md:w-auto md:max-w-[min(100%,11rem)] md:justify-start">
          <Link
            to="/dashboard"
            className="group inline-flex min-w-0 shrink items-center gap-2.5 font-display text-base font-semibold tracking-tight text-stone-900 transition-opacity hover:opacity-90 sm:text-lg dark:text-zinc-100"
          >
            <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
              <span className="absolute inset-0 animate-[ping_2.6s_cubic-bezier(0,0,0.2,1)_infinite] rounded-full bg-emerald-400/40" />
              <span className="relative flex h-2 w-2 rounded-full bg-gradient-to-br from-emerald-300 to-teal-500 shadow-[0_0_14px_-1px_rgb(74_222_128_/_0.9)] ring-2 ring-white dark:ring-zinc-950/90" />
            </span>
            <span className="text-gradient-moss truncate">Cipherline</span>
          </Link>
          <div className="flex items-center gap-2 md:hidden">
            <div className="min-w-[72px]">
              <p className="text-[9px] font-medium uppercase tracking-[0.15em] text-stone-500 dark:text-zinc-500">
                {t("header.hp")}
              </p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-200/95 ring-1 ring-inset ring-stone-300/35 dark:bg-zinc-800/90 dark:ring-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400 shadow-[0_0_10px_-2px_rgb(16_185_129_/_0.45)] transition-all duration-500 ease-soft dark:from-emerald-500 dark:via-teal-400 dark:to-emerald-300 dark:shadow-[0_0_14px_-2px_rgb(52_211_153_/_0.55)]"
                  style={{ width: `${hpPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-stone-200/90 bg-stone-100/75 p-1 dark:border-white/[0.1] dark:bg-white/[0.04]">
          <span className="hidden pl-2 text-[9px] font-medium uppercase tracking-wider text-stone-400 sm:inline">
            {t("lang.switch")}
          </span>
          <button
            type="button"
            onClick={() => pickLocale("ru")}
            className={`rounded-full px-2.5 py-1.5 text-xs font-semibold ${
              locale === "ru"
                ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-white"
                : "text-stone-600 hover:bg-white dark:text-zinc-400 dark:hover:bg-white/[0.06]"
            }`}
          >
            {t("lang.ru")}
          </button>
          <button
            type="button"
            onClick={() => pickLocale("en")}
            className={`rounded-full px-2.5 py-1.5 text-xs font-semibold ${
              locale === "en"
                ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-white"
                : "text-stone-600 hover:bg-white dark:text-zinc-400 dark:hover:bg-white/[0.06]"
            }`}
          >
            {t("lang.en")}
          </button>
        </div>

        <nav className="-mx-1 flex w-full min-w-0 flex-1 items-center justify-start gap-0.5 overflow-x-auto overscroll-x-contain rounded-full border border-stone-200/90 bg-stone-100/75 p-1 scrollbar-subtle dark:border-white/[0.1] dark:bg-white/[0.04] md:mx-0 md:max-w-none md:justify-center md:px-0.5">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-2 text-xs font-medium transition-all duration-300 ease-soft sm:px-3 sm:text-sm md:px-3 ${
                loc.pathname === n.to
                  ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-[0_0_20px_-4px_rgb(16_185_129_/_0.45)] ring-1 ring-emerald-400/40 ring-offset-2 ring-offset-white dark:shadow-neon dark:ring-emerald-400/35 dark:ring-offset-[#0a0a0a]"
                  : "text-stone-600 hover:bg-white hover:text-stone-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-200"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex w-full flex-wrap items-center justify-between gap-2 border-t border-stone-200/85 pt-3 dark:border-white/[0.06] sm:justify-end md:w-auto md:flex-nowrap md:gap-3 md:border-0 md:pt-0">
          <div className="hidden min-w-[100px] max-w-[120px] shrink-0 sm:block">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-stone-500 dark:text-zinc-500">
              {t("header.hp")}
            </p>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-stone-200/95 ring-1 ring-inset ring-stone-300/35 dark:bg-zinc-800/90 dark:ring-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400 shadow-[0_0_12px_-2px_rgb(16_185_129_/_0.45)] transition-all duration-500 ease-soft dark:from-emerald-500 dark:via-teal-400 dark:to-emerald-300 dark:shadow-[0_0_14px_-2px_rgb(52_211_153_/_0.55)]"
                style={{ width: `${hpPct}%` }}
              />
            </div>
          </div>
          <div className="min-w-0 max-w-[min(100%,14rem)] flex-1 text-left sm:max-w-[12rem] sm:flex-none sm:text-right md:max-w-[11rem] lg:max-w-[14rem]">
            <p className="truncate text-sm font-medium text-stone-900 dark:text-zinc-100">{userState.login}</p>
            <p className="truncate text-xs text-stone-500 dark:text-zinc-500">
              {leagueByXp(userState.xp, locale).label}
            </p>
          </div>
          <div className="flex shrink-0 flex-nowrap items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-full border border-stone-200/90 bg-white/80 px-3 py-1.5 text-xs font-medium text-stone-600 transition-all duration-300 hover:border-emerald-300/70 hover:bg-emerald-50/85 hover:text-emerald-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400 dark:hover:border-emerald-500/30 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-200"
              title={t("lang.switch")}
            >
              {theme === "dark" ? t("header.themeLight") : t("header.themeDark")}
            </button>
            <button type="button" onClick={logout} className="btn-primary !px-4 !py-2 !text-xs">
              {t("header.logout")}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
