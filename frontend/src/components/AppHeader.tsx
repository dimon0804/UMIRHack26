import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/i18n/I18nContext";
import { leagueByXp } from "@/lib/leagues";
import type { AppLocale } from "@/i18n/I18nContext";

function IconMenu({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconClose({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const shellCard =
  "rounded-2xl border border-emerald-100/85 bg-white/88 shadow-[0_8px_40px_-12px_rgb(16_185_129_/_0.22),0_1px_0_0_rgb(255_255_255_/_0.95)_inset] backdrop-blur-2xl transition-[background-color,border-color,box-shadow] duration-300 dark:border-white/[0.08] dark:bg-zinc-950/72 dark:shadow-[0_0_0_1px_rgb(34_197_94_/_0.08),inset_0_1px_0_0_rgb(255_255_255_/_0.06),0_32px_64px_-28px_rgb(0_0_0_/_0.85)]";

export function AppHeader() {
  const { userState, logout, theme, toggleTheme } = useApp();
  const { locale, setLocale, t } = useI18n();
  const loc = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [loc.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  if (!userState) return null;

  const hpPct = userState.hp;
  const nav = [
    { to: "/dashboard", label: t("header.pulse") },
    { to: "/live-soc", label: t("header.liveSoc") },
    { to: "/leaderboard", label: t("header.leaderboard") },
    { to: "/profile", label: t("header.profile") },
    { to: "/certificate", label: t("header.cert") },
  ];

  function pickLocale(next: AppLocale) {
    setLocale(next);
  }

  const navActive =
    "bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-[0_0_20px_-4px_rgb(16_185_129_/_0.45)] ring-1 ring-emerald-400/40 ring-offset-2 ring-offset-white dark:shadow-neon dark:ring-emerald-400/35 dark:ring-offset-[#0a0a0a]";
  const navIdle =
    "text-stone-600 hover:bg-white hover:text-stone-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-200";

  const navLinkMobile = (active: boolean) =>
    `block rounded-full px-3 py-2.5 text-center text-sm font-medium transition-all duration-300 ease-soft ${
      active ? navActive : navIdle
    }`;

  const navLinkDesktop = (active: boolean) =>
    `inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full px-2 py-1.5 text-[11px] font-medium transition-all duration-300 ease-soft lg:px-2.5 lg:py-2 lg:text-xs min-[1200px]:px-3 min-[1200px]:text-sm ${
      active ? navActive : navIdle
    }`;

  const hpBar = (compact?: boolean) => (
    <div className={compact ? "min-w-[4.5rem] max-w-[5.5rem]" : "min-w-[100px] max-w-[120px]"}>
      <p
        className={`font-medium uppercase tracking-wider text-stone-500 dark:text-zinc-500 ${
          compact ? "text-[8px] tracking-[0.12em]" : "text-[10px] tracking-[0.2em]"
        }`}
      >
        {t("header.hp")}
      </p>
      <div
        className={`mt-1 overflow-hidden rounded-full bg-stone-200/95 ring-1 ring-inset ring-stone-300/35 dark:bg-zinc-800/90 dark:ring-white/[0.06] ${
          compact ? "h-1.5" : "mt-1.5 h-2"
        }`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400 shadow-[0_0_12px_-2px_rgb(16_185_129_/_0.45)] transition-all duration-500 ease-soft dark:from-emerald-500 dark:via-teal-400 dark:to-emerald-300 dark:shadow-[0_0_14px_-2px_rgb(52_211_153_/_0.55)]"
          style={{ width: `${hpPct}%` }}
        />
      </div>
    </div>
  );

  const localeSwitch = (compact?: boolean) => (
    <div
      className={`flex shrink-0 items-center gap-0.5 rounded-full border border-stone-200/90 bg-stone-100/75 p-0.5 dark:border-white/[0.1] dark:bg-white/[0.04] ${
        compact ? "scale-95" : ""
      }`}
    >
      {!compact ? (
        <span className="hidden pl-2 text-[9px] font-medium uppercase tracking-wider text-stone-400 sm:inline">
          {t("lang.switch")}
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => pickLocale("ru")}
        className={`rounded-full px-2 py-1 text-[11px] font-semibold sm:px-2.5 sm:py-1.5 sm:text-xs ${
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
        className={`rounded-full px-2 py-1 text-[11px] font-semibold sm:px-2.5 sm:py-1.5 sm:text-xs ${
          locale === "en"
            ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-white"
            : "text-stone-600 hover:bg-white dark:text-zinc-400 dark:hover:bg-white/[0.06]"
        }`}
      >
        {t("lang.en")}
      </button>
    </div>
  );

  const userBlock = (fullWidth?: boolean) => (
    <div
      className={`flex min-w-0 items-center gap-2 ${fullWidth ? "w-full flex-col items-stretch sm:flex-row sm:items-center sm:justify-between" : ""}`}
    >
      <div
        className={`min-w-0 text-left ${fullWidth ? "w-full sm:max-w-[12rem] sm:flex-1 sm:text-right" : "max-w-[7rem] text-right min-[1200px]:max-w-[11rem] xl:max-w-[14rem]"}`}
      >
        <p className="truncate text-sm font-medium text-stone-900 dark:text-zinc-100">{userState.login}</p>
        <p className="truncate text-xs text-stone-500 dark:text-zinc-500">
          {leagueByXp(userState.xp, locale).label}
        </p>
      </div>
      <div className="flex shrink-0 flex-nowrap items-center justify-end gap-1.5 min-[1200px]:gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-full border border-stone-200/90 bg-white/80 px-2.5 py-1.5 text-[11px] font-medium text-stone-600 transition-all duration-300 hover:border-emerald-300/70 hover:bg-emerald-50/85 hover:text-emerald-900 min-[1200px]:px-3 min-[1200px]:text-xs dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400 dark:hover:border-emerald-500/30 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-200"
        >
          {theme === "dark" ? t("header.themeLight") : t("header.themeDark")}
        </button>
        <button type="button" onClick={logout} className="btn-primary !px-3 !py-2 !text-[11px] min-[1200px]:!px-4 min-[1200px]:!text-xs">
          {t("header.logout")}
        </button>
      </div>
    </div>
  );

  return (
    <header className="sticky top-0 z-50 print:hidden">
      <div className="border-b border-emerald-100/40 bg-paper/80 backdrop-blur-xl dark:border-white/[0.06] dark:bg-night/80">
        <div className="mx-auto max-w-screen-2xl px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 sm:px-4 sm:pb-2.5 md:px-6 md:pb-3">
          {/* ——— Mobile: один компактный ряд + выезжающая панель ——— */}
          <div className={`relative lg:hidden ${shellCard} px-2.5 py-2`}>
            <div className="flex items-center gap-2">
              <Link
                to="/dashboard"
                className="group inline-flex min-w-0 flex-1 items-center gap-2 font-display text-sm font-semibold tracking-tight text-stone-900 dark:text-zinc-100"
              >
                <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
                  <span className="absolute inset-0 animate-[ping_2.6s_cubic-bezier(0,0,0.2,1)_infinite] rounded-full bg-emerald-400/40" />
                  <span className="relative flex h-2 w-2 rounded-full bg-gradient-to-br from-emerald-300 to-teal-500 shadow-[0_0_14px_-1px_rgb(74_222_128_/_0.9)] ring-2 ring-white dark:ring-zinc-950/90" />
                </span>
                <span className="text-gradient-moss truncate">Cipherline</span>
              </Link>
              {hpBar(true)}
              {localeSwitch(true)}
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-200/90 bg-stone-50/90 text-stone-800 dark:border-white/10 dark:bg-white/[0.06] dark:text-zinc-200"
                aria-expanded={mobileOpen}
                aria-controls="app-header-mobile-panel"
                aria-label={mobileOpen ? t("header.menuClose") : t("header.menuOpen")}
                onClick={() => setMobileOpen((o) => !o)}
              >
                {mobileOpen ? <IconClose /> : <IconMenu />}
              </button>
            </div>
            {mobileOpen ? (
              <div
                id="app-header-mobile-panel"
                className="mt-2 max-h-[min(70vh,calc(100dvh-8rem))] space-y-3 overflow-y-auto overscroll-y-contain border-t border-stone-200/80 pt-3 dark:border-white/[0.08]"
              >
                <nav className="grid grid-cols-2 gap-2" aria-label="Main">
                  {nav.map((n) => (
                    <Link key={n.to} to={n.to} className={navLinkMobile(loc.pathname === n.to)}>
                      {n.label}
                    </Link>
                  ))}
                </nav>
                {userBlock(true)}
              </div>
            ) : null}
          </div>

          {/* ——— Desktop lg+: одна сетка без flex-wrap (772–1200 раньше ломался) ——— */}
          <div
            className={`hidden lg:grid ${shellCard} grid-cols-[minmax(0,auto)_minmax(max-content,1fr)_minmax(0,auto)] items-center gap-x-2 gap-y-2 px-3 py-2.5 min-[1200px]:gap-x-4 min-[1200px]:px-5 min-[1200px]:py-3.5`}
          >
            <div className="flex min-w-0 max-w-full items-center gap-2 min-[1200px]:gap-3">
              <Link
                to="/dashboard"
                className="group inline-flex min-w-0 shrink items-center gap-2 font-display text-sm font-semibold tracking-tight text-stone-900 transition-opacity hover:opacity-90 min-[1200px]:gap-2.5 min-[1200px]:text-base xl:text-lg dark:text-zinc-100"
              >
                <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
                  <span className="absolute inset-0 animate-[ping_2.6s_cubic-bezier(0,0,0.2,1)_infinite] rounded-full bg-emerald-400/40" />
                  <span className="relative flex h-2 w-2 rounded-full bg-gradient-to-br from-emerald-300 to-teal-500 shadow-[0_0_14px_-1px_rgb(74_222_128_/_0.9)] ring-2 ring-white dark:ring-zinc-950/90" />
                </span>
                <span className="text-gradient-moss truncate">Cipherline</span>
              </Link>
              {localeSwitch(false)}
            </div>

            <nav
              className="-mx-0.5 flex w-max max-w-full shrink-0 flex-nowrap items-center justify-center gap-0.5 justify-self-center rounded-2xl border border-stone-200/90 bg-stone-100/75 p-1.5 dark:border-white/[0.1] dark:bg-white/[0.04] min-[1200px]:gap-1"
              aria-label="Main"
            >
              {nav.map((n) => (
                <Link key={n.to} to={n.to} className={navLinkDesktop(loc.pathname === n.to)}>
                  {n.label}
                </Link>
              ))}
            </nav>

            <div className="flex min-w-0 items-center justify-end gap-1.5 min-[1200px]:gap-2">
              <div className="min-[1100px]:hidden">{hpBar(true)}</div>
              <div className="hidden min-[1100px]:block">{hpBar(false)}</div>
              {userBlock(false)}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
