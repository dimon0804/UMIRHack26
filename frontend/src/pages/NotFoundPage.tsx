import { Link, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/i18n/I18nContext";

export function NotFoundPage() {
  const { user } = useApp();
  const { t } = useI18n();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const pathDisplay = pathname || "/";

  return (
    <div className="relative flex min-h-[min(100dvh,100vh)] flex-col items-center justify-center overflow-hidden px-4 py-16">
      <div
        className="pointer-events-none absolute inset-0 bg-mesh-cyber opacity-90 dark:opacity-100"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-1/4 top-1/4 h-[min(80vw,520px)] w-[min(80vw,520px)] rounded-full bg-emerald-500/15 blur-[100px] motion-safe:animate-not-found-pulse dark:bg-emerald-500/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-1/4 bottom-1/4 h-[min(70vw,420px)] w-[min(70vw,420px)] rounded-full bg-teal-500/10 blur-[90px] motion-safe:animate-pulse-soft dark:bg-teal-600/10"
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-lg motion-safe:animate-pop-in">
        <div className="relative overflow-hidden rounded-[1.75rem] border border-stone-200/80 bg-gradient-to-b from-white/95 via-white/88 to-emerald-50/30 p-1 shadow-glow-emerald dark:border-white/[0.1] dark:from-zinc-900/95 dark:via-zinc-950/90 dark:to-emerald-950/20 dark:shadow-[0_0_60px_-20px_rgb(34_197_94_/_0.35)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
          <div className="soc-scanlines pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-25" />

          <div className="relative rounded-[1.6rem] bg-paper/80 px-8 pb-10 pt-12 dark:bg-night/40">
            <p className="kicker text-center text-[10px] font-bold tracking-[0.35em] text-emerald-700 dark:text-emerald-400/90">
              {t("notFound.kicker")}
            </p>

            <div className="relative mt-6 flex justify-center">
              <span
                className="font-display text-[clamp(5rem,22vw,8.5rem)] font-black leading-none tracking-tighter text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #047857 0%, #14b8a6 45%, #059669 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  textShadow: "0 0 80px rgb(16 185 129 / 0.25)",
                }}
                aria-hidden
              >
                {t("notFound.code")}
              </span>
              <span
                className="pointer-events-none absolute inset-0 flex justify-center font-display text-[clamp(5rem,22vw,8.5rem)] font-black leading-none tracking-tighter text-emerald-600/20 blur-sm dark:text-emerald-400/15"
                aria-hidden
              >
                {t("notFound.code")}
              </span>
            </div>

            <h1 className="mt-2 text-center font-display text-xl font-semibold text-ink dark:text-stone-100 md:text-2xl">
              {t("notFound.title")}
            </h1>
            <p className="mx-auto mt-4 max-w-md text-center text-sm leading-relaxed text-stone-600 dark:text-stone-400">
              {t("notFound.body")}
            </p>

            <div className="mt-8 rounded-xl border border-stone-200/90 bg-stone-900/[0.03] px-4 py-3 font-mono text-[11px] leading-relaxed text-stone-600 dark:border-stone-700/80 dark:bg-black/30 dark:text-emerald-400/85">
              <span className="text-emerald-600 dark:text-emerald-500">$</span>{" "}
              {t("notFound.terminal", { path: pathDisplay })}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button type="button" onClick={() => nav(-1)} className="btn-ghost order-2 sm:order-1">
                {t("notFound.back")}
              </button>
              <Link
                to={user ? "/dashboard" : "/login"}
                className="btn-primary order-1 inline-flex justify-center !no-underline sm:order-2"
              >
                {user ? t("notFound.home") : t("notFound.login")}
              </Link>
            </div>
            {!user ? (
              <p className="mt-6 text-center text-xs text-stone-500 dark:text-stone-500">
                <Link to="/register" className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400">
                  {t("login.registerCta")}
                </Link>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
