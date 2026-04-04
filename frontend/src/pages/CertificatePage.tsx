import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { Link } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import {
  accuracyPercent,
  certificateEligible,
  certificateReconcilePatch,
  certificateVerifyUrl,
  completedScenarioTitleKeys,
  requiredModulesCount,
} from "@/lib/certificate";
import { SIMULATION_SCENARIO_ORDER } from "@/lib/courseScenarios";
import { Spinner } from "@/components/Spinner";
import { useI18n } from "@/i18n/I18nContext";
import { leagueByXp } from "@/lib/leagues";

export function CertificatePage() {
  const { userState, updateUserState } = useApp();
  const { locale, t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userState) return;
    const patch = certificateReconcilePatch(userState);
    if (patch) updateUserState(patch);
  }, [userState, updateUserState]);

  if (!userState) return null;

  const session = userState;
  const eligible = certificateEligible(session);
  const verifyUrl = session.certificateId ? certificateVerifyUrl(session.certificateId) : "";
  const canExport = eligible && Boolean(session.certificateId);
  const pct = accuracyPercent(session);
  const titleKeys = completedScenarioTitleKeys(session);
  const scenarioTitles = titleKeys.map((k) => t(k));
  const issuedDate = new Date().toLocaleDateString(locale === "en" ? "en-US" : "ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const modCount = requiredModulesCount();

  const narrativeLines = eligible
    ? [
        t("cert.narrative1", { user: session.login }),
        t("cert.narrative2", { modules: scenarioTitles.join(locale === "en" ? "; " : "; ") }),
        t("cert.narrative3", {
          pct: String(pct ?? 0),
          total: String(session.totalAnswers),
          correct: String(session.totalCorrect),
        }),
        t("cert.narrative4", {
          league: leagueByXp(session.xp, locale).label,
          hp: String(session.hp),
        }),
      ]
    : [];

  async function savePdf() {
    if (!ref.current || !canExport) return;
    setLoading(true);
    try {
      const canvas = await html2canvas(ref.current, { scale: 2, backgroundColor: "#ffffff" });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const w = pdf.internal.pageSize.getWidth();
      const h = pdf.internal.pageSize.getHeight();
      pdf.addImage(img, "PNG", 0, 0, w, h);
      pdf.save(`cipherline-cert-${session.login}.pdf`);
    } finally {
      setLoading(false);
    }
  }

  async function savePng() {
    if (!ref.current || !canExport) return;
    setLoading(true);
    try {
      const canvas = await html2canvas(ref.current, { scale: 2, backgroundColor: "#ffffff" });
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `cipherline-cert-${session.login}.png`;
      a.click();
    } finally {
      setLoading(false);
    }
  }

  const moduleList = SIMULATION_SCENARIO_ORDER.map((id) => ({
    id,
    title: t(`scenario.module.${id}`),
    done: session.scenariosCompleted.includes(id),
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 motion-safe:animate-fade-in-up md:px-6 print:py-6">
      <div className="no-print">
        <p className="kicker">{t("cert.kicker")}</p>
        <h1 className="font-display text-3xl font-semibold text-stone-900 dark:text-stone-100">
          <span className="text-gradient-moss">{t("cert.title")}</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          {t("cert.intro")}
        </p>
        <p className="no-print mt-3 inline-flex items-center gap-2 text-xs font-medium text-emerald-800/90 dark:text-emerald-400/80">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgb(34_197_94_/_0.7)] motion-safe:animate-pulse-soft" />
          {t("cert.heroGlow")}
        </p>
      </div>

      {!eligible ? (
        <div className="relative mt-10 motion-safe:animate-pop-in">
          <div className="absolute -inset-px rounded-[1.75rem] bg-gradient-to-br from-emerald-400/50 via-teal-500/30 to-emerald-600/40 opacity-75 blur-sm dark:from-emerald-500/30 dark:via-teal-600/20 dark:to-emerald-700/30" />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-dashed border-emerald-300/80 bg-gradient-to-b from-emerald-50/50 via-white/60 to-stone-50/40 p-8 dark:border-emerald-700/50 dark:from-emerald-950/30 dark:via-zinc-900/40 dark:to-stone-950/30 md:p-12">
            <div className="pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full bg-emerald-400/15 blur-3xl dark:bg-emerald-500/10" />
            <div className="relative mx-auto flex max-w-md flex-col items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-200/90 bg-white/80 shadow-soft dark:border-emerald-800/60 dark:bg-zinc-900/80">
                <svg className="size-9 text-emerald-700 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <p className="mt-6 text-center font-display text-lg font-semibold text-stone-900 dark:text-stone-100">
                {t("cert.needTitle")}
              </p>
            </div>
          <ul className="relative mx-auto mt-6 max-w-lg space-y-4 text-sm text-stone-600 dark:text-stone-400">
            <li className="flex gap-3">
              <span className="mt-0.5 font-mono text-emerald-600 dark:text-emerald-400">
                {SIMULATION_SCENARIO_ORDER.every((id) => session.scenariosCompleted.includes(id)) ? "✓" : "○"}
              </span>
              <span>
                {t("cert.needAll", {
                  list: moduleList.map((m) => m.title).join(", "),
                })}
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 font-mono text-emerald-600 dark:text-emerald-400">
                {pct !== null && pct >= 70 ? "✓" : "○"}
              </span>
              <span>
                {t("cert.needAccuracy")}
                {pct !== null ? (
                  <>
                    {" "}
                    {t("cert.now")}: <strong className="text-stone-800 dark:text-stone-200">{pct}%</strong>
                  </>
                ) : (
                  ` ${t("cert.noData")}`
                )}
              </span>
            </li>
          </ul>
          <div className="mt-10 space-y-2 rounded-2xl border border-stone-200/80 bg-white/60 p-4 dark:border-stone-700 dark:bg-stone-900/40">
            <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
              {t("dashboard.scenariosTitle")}
            </p>
            <ul className="space-y-2 text-sm">
              {moduleList.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2">
                  <span className={m.done ? "text-stone-800 dark:text-stone-200" : "text-stone-500"}>
                    {m.title}
                  </span>
                  <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400">
                    {m.done ? t("cert.done") : t("cert.pending")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-8 text-center">
            <Link to="/dashboard" className="btn-primary !no-underline">
              {t("cert.toScenarios")}
            </Link>
          </div>
          </div>
        </div>
      ) : (
        <>
          <div className="no-print mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={loading || !canExport}
              onClick={() => void savePdf()}
              className="btn-primary inline-flex items-center gap-2"
            >
              {loading && (
                <Spinner className="size-4 border-white/30 border-t-white dark:border-stone-900/30 dark:border-t-stone-900" />
              )}
              {t("cert.downloadPdf")}
            </button>
            <button type="button" disabled={loading || !canExport} onClick={() => void savePng()} className="btn-ghost">
              {t("cert.downloadPng")}
            </button>
            <button type="button" onClick={() => window.print()} className="btn-ghost">
              {t("cert.print")}
            </button>
            {verifyUrl && (
              <button
                type="button"
                onClick={() => navigator.share?.({ title: "Cipherline", text: verifyUrl, url: verifyUrl })}
                className="btn-ghost"
              >
                {t("cert.share")}
              </button>
            )}
          </div>

          <div className="no-print relative mx-auto mt-6 max-w-[920px] motion-safe:animate-pop-in">
            <div className="absolute -inset-3 rounded-lg bg-gradient-to-br from-emerald-400/30 via-teal-500/20 to-emerald-600/25 opacity-80 blur-2xl dark:from-emerald-500/20 dark:via-teal-600/15 dark:to-emerald-700/20" />
          </div>
          <div className="mt-10 flex justify-center print:mt-4">
            <div
              ref={ref}
              id="certificate-document"
              className="relative w-full max-w-[920px] overflow-hidden rounded-[2px] border-[3px] border-stone-900 bg-white text-stone-900 shadow-[0_28px_90px_-24px_rgba(0,0,0,0.4),inset_0_0_0_1px_rgba(180,150,60,0.22)] print:max-w-none print:border-stone-900 print:shadow-none"
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.06]"
                style={{
                  backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, #0f172a 2px, #0f172a 3px)`,
                }}
              />
              <div className="pointer-events-none absolute inset-[10px] border border-amber-800/15 md:inset-[14px]" aria-hidden />

              <div className="pointer-events-none absolute left-3 top-3 size-10 border-l-2 border-t-2 border-emerald-800/85 md:left-5 md:top-5" />
              <div className="pointer-events-none absolute right-3 top-3 size-10 border-r-2 border-t-2 border-emerald-800/85 md:right-5 md:top-5" />
              <div className="pointer-events-none absolute bottom-3 left-3 size-10 border-b-2 border-l-2 border-emerald-800/85 md:bottom-5 md:left-5" />
              <div className="pointer-events-none absolute bottom-3 right-3 size-10 border-b-2 border-r-2 border-emerald-800/85 md:bottom-5 md:right-5" />

              <div className="absolute left-0 top-0 h-full w-3 bg-gradient-to-b from-emerald-700 via-teal-700 to-emerald-900" />

              <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-sm bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-950 px-8 py-2 text-center text-[9px] font-bold uppercase tracking-[0.32em] text-emerald-50 shadow-[0_8px_30px_-8px_rgba(6,78,59,0.55)] print:relative print:left-auto print:top-0 print:mx-auto print:mb-6 print:block print:w-fit print:translate-x-0 print:translate-y-0">
                {t("cert.docRibbon")}
              </div>

              <div className="absolute right-4 top-9 z-10 flex size-[5.5rem] flex-col items-center justify-center rounded-full border-[3px] border-emerald-950 bg-gradient-to-br from-emerald-50 via-white to-teal-100 text-center shadow-[0_6px_24px_-6px_rgba(6,78,59,0.45)] md:right-6 md:top-11 md:size-[6.75rem] print:right-5 print:top-8">
                <svg className="mb-0.5 size-7 text-emerald-800 md:size-8" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 12l2 2 4-4"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="max-w-[4.25rem] px-1 font-display text-[6px] font-bold uppercase leading-tight tracking-wider text-emerald-950 md:max-w-[5rem] md:text-[7px]">
                  {t("cert.docSeal")}
                </span>
              </div>

              <div className="relative px-10 pb-10 pl-14 pt-14 md:px-14 md:pb-12 md:pl-16 md:pt-16">
                <div className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-stone-200 pb-6">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-800">
                      {t("cert.eligibleSubtitle")}
                    </p>
                    <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
                      {t("cert.eligibleTitle")}
                    </h2>
                    <p className="mt-2 text-sm text-stone-600">{t("cert.narrative")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-500">
                      {t("cert.issued")}
                    </p>
                    <p className="mt-1 font-mono text-sm font-semibold text-stone-900">{issuedDate}</p>
                    <p className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-stone-500">ID</p>
                    <p className="font-mono text-xs text-stone-700">{session.certificateId}</p>
                  </div>
                </div>

                <div className="mt-8 grid gap-6 md:grid-cols-2">
                  <div className="rounded-lg border border-stone-200 bg-stone-50/80 p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
                      {t("cert.holder")}
                    </p>
                    <p className="mt-2 break-all font-display text-xl font-semibold text-stone-900">{session.login}</p>
                  </div>
                  <div className="rounded-lg border border-stone-200 bg-stone-50/80 p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
                      {t("cert.accuracy")}
                    </p>
                    <p className="mt-2 font-display text-3xl font-bold text-emerald-800">{pct ?? 0}%</p>
                    <p className="mt-1 text-sm text-stone-600">
                      {t("cert.correctOf", { correct: String(session.totalCorrect), total: String(session.totalAnswers) })}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-stone-200 p-4">
                    <p className="text-[10px] font-bold uppercase text-stone-500">{t("cert.league")}</p>
                    <p className="mt-1 text-lg font-semibold text-stone-900">
                      {leagueByXp(session.xp, locale).label}
                    </p>
                  </div>
                  <div className="rounded-lg border border-stone-200 p-4">
                    <p className="text-[10px] font-bold uppercase text-stone-500">{t("cert.hp")}</p>
                    <p className="mt-1 text-lg font-semibold text-stone-900">
                      {session.hp} / 100
                    </p>
                  </div>
                  <div className="rounded-lg border border-stone-200 p-4">
                    <p className="text-[10px] font-bold uppercase text-stone-500">{t("cert.modules")}</p>
                    <p className="mt-1 text-lg font-semibold text-stone-900">
                      {
                        session.scenariosCompleted.filter((id) =>
                          (SIMULATION_SCENARIO_ORDER as readonly string[]).includes(id),
                        ).length
                      }{" "}
                      / {modCount}
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50/50 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-900">{t("cert.modules")}</p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm font-medium text-stone-800">
                    {scenarioTitles.map((title, i) => (
                      <li key={i}>{title}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 space-y-3 border-t border-stone-200 pt-6 text-sm leading-relaxed text-stone-700">
                  {narrativeLines.map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>

                {verifyUrl && (
                  <div className="mt-8 flex flex-col items-center gap-3 border-t border-dashed border-stone-300 pt-8 sm:flex-row sm:justify-between sm:gap-8">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
                        {t("cert.verifyQr")}
                      </p>
                      <p className="mt-2 max-w-md break-all font-mono text-[11px] leading-snug text-stone-600">
                        {verifyUrl}
                      </p>
                    </div>
                    <QRCodeSVG value={verifyUrl} size={120} fgColor="#14532d" bgColor="#ffffff" level="M" />
                  </div>
                )}

                <div className="mt-10 flex flex-wrap items-end justify-between gap-4 border-t-2 border-stone-900 pt-6">
                  <div>
                    <p className="text-xs text-stone-500">Cipherline Training Platform</p>
                    <p className="font-mono text-[10px] text-stone-400">UMIR / simulation-service · AI-generated drills</p>
                  </div>
                  <div className="text-right">
                    <div className="h-px w-40 bg-stone-400" />
                    <p className="mt-2 text-[10px] uppercase tracking-widest text-stone-500">
                      {t("cert.issued")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="no-print mt-8 text-center">
            <Link to="/dashboard" className="btn-ghost !no-underline">
              {t("cert.back")}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
