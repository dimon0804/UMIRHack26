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
      </div>

      {!eligible ? (
        <div className="mt-10 motion-safe:animate-pop-in rounded-3xl border border-dashed border-emerald-200/90 bg-gradient-to-b from-emerald-50/40 to-stone-50/30 p-8 dark:border-emerald-800/50 dark:from-emerald-950/20 dark:to-stone-900/20 md:p-12">
          <p className="text-center font-medium text-stone-700 dark:text-stone-300">{t("cert.needTitle")}</p>
          <ul className="mx-auto mt-8 max-w-lg space-y-4 text-sm text-stone-600 dark:text-stone-400">
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

          <div className="mt-10 flex justify-center print:mt-4">
            <div
              ref={ref}
              id="certificate-document"
              className="relative w-full max-w-[920px] overflow-hidden rounded-sm border-[3px] border-stone-800 bg-white text-stone-900 shadow-2xl print:max-w-none print:border-stone-900 print:shadow-none"
              style={{ aspectRatio: "297 / 210" }}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, #0f172a 2px, #0f172a 3px)`,
                }}
              />
              <div className="absolute left-0 top-0 h-full w-3 bg-gradient-to-b from-emerald-700 via-teal-700 to-emerald-900" />
              <div className="absolute right-6 top-6 flex size-24 items-center justify-center rounded-full border-4 border-emerald-800/90 bg-emerald-50 text-center shadow-inner">
                <span className="font-display text-[10px] font-bold uppercase leading-tight tracking-widest text-emerald-900">
                  SOC
                  <br />
                  TRAIN
                </span>
              </div>

              <div className="relative px-10 py-10 pl-14 md:px-14 md:py-12 md:pl-16">
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
