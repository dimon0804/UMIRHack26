import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useApp } from "@/context/AppContext";
import { certificateIdLooksValid, certificateVerifyUrl } from "@/lib/certificate";
import { useI18n } from "@/i18n/I18nContext";

export function VerifyPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useApp();
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const trimmed = id?.trim() ?? "";
  const valid = certificateIdLooksValid(trimmed);
  const verifyUrl = useMemo(
    () => (typeof window !== "undefined" && trimmed ? certificateVerifyUrl(trimmed) : ""),
    [trimmed],
  );

  async function copyUrl() {
    if (!verifyUrl || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative flex min-h-[min(100dvh,100vh)] flex-col items-center justify-center px-4 py-16">
      <div className="pointer-events-none absolute inset-0 bg-mesh-cyber opacity-60 dark:opacity-80" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgb(16_185_129_/_0.12),transparent_55%)]"
        aria-hidden
      />

      <div
        className={`relative z-10 w-full max-w-lg motion-safe:animate-pop-in ${
          valid
            ? "rounded-[1.75rem] border border-emerald-200/90 bg-gradient-to-b from-white/95 via-emerald-50/40 to-white/90 p-1 shadow-glow-sm dark:border-emerald-800/40 dark:from-zinc-900/95 dark:via-emerald-950/25 dark:to-zinc-950/90 dark:shadow-[0_0_48px_-12px_rgb(34_197_94_/_0.25)]"
            : "rounded-[1.75rem] border border-stone-200/90 bg-gradient-to-b from-white/95 to-stone-50/50 p-1 dark:border-stone-700/60 dark:from-zinc-900/95 dark:to-zinc-950/80"
        }`}
      >
        <div className="relative overflow-hidden rounded-[1.6rem] bg-paper/90 px-8 pb-10 pt-10 dark:bg-night/50">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-500/10" />

          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200/80 bg-emerald-500/10 shadow-inner dark:border-emerald-800/50 dark:bg-emerald-950/40">
              {valid ? (
                <svg className="size-8 text-emerald-700 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 12l2 2 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg className="size-8 text-amber-700 dark:text-amber-500" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 9v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>

            <p className="kicker mt-5 text-[10px] tracking-[0.3em] text-stone-500 dark:text-stone-400">{t("verify.kicker")}</p>

            <span
              className={`mt-3 inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                valid
                  ? "bg-emerald-500/15 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200"
                  : "bg-amber-500/15 text-amber-950 dark:bg-amber-500/15 dark:text-amber-100"
              }`}
            >
              {valid ? t("verify.ok") : t("verify.bad")}
            </span>

            <h1 className="mt-4 font-display text-xl font-semibold text-ink dark:text-stone-100 md:text-2xl">
              {valid ? t("verify.foundTitle") : t("verify.notFoundTitle")}
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
              {valid ? t("verify.foundBody") : t("verify.notFoundBody")}
            </p>
          </div>

          {valid && trimmed ? (
            <div className="mt-8 space-y-5 border-t border-stone-200/80 pt-8 dark:border-stone-700/60">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                  {t("verify.idLabel")}
                </p>
                <p className="mt-2 break-all font-mono text-sm font-semibold text-stone-900 dark:text-stone-100">{trimmed}</p>
              </div>

              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">{t("cert.verifyQr")}</p>
                  <p className="mt-2 break-all font-mono text-[11px] leading-snug text-stone-600 dark:text-stone-400">{verifyUrl}</p>
                  <p className="mt-3 text-xs text-stone-500 dark:text-stone-500">{t("verify.scanHint")}</p>
                  <button type="button" onClick={() => void copyUrl()} className="btn-ghost mt-4 !px-4 !py-2 !text-xs">
                    {copied ? t("verify.copied") : t("verify.copyLink")}
                  </button>
                </div>
                <div className="shrink-0 rounded-2xl border border-stone-200/90 bg-white p-3 dark:border-stone-700 dark:bg-zinc-900">
                  <QRCodeSVG value={verifyUrl} size={112} fgColor="#14532d" bgColor="#ffffff" level="M" />
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-10 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link to={user ? "/dashboard" : "/login"} className="btn-primary inline-flex justify-center !no-underline">
              {user ? t("verify.toHome") : t("verify.toLogin")}
            </Link>
            {!user ? (
              <Link to="/register" className="btn-ghost inline-flex justify-center !no-underline">
                {t("login.registerCta")}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
