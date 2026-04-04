import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/I18nContext";
import { IntrusionTheater, type IntrusionUnsafeFlavor } from "@/components/IntrusionTheater";
import {
  type BreachDrillOutcome,
  type BreachScenarioContext,
  type BreachPageKind,
  inferBreachPageKind,
  truncateUi,
} from "@/lib/breachFromEmail";

type Step = "notify" | "browser" | "theater" | "safeend";

type FormFieldRow = { labelKey: string; value: string };

function formFieldsForKind(kind: BreachPageKind, t: (k: string) => string): FormFieldRow[] {
  switch (kind) {
    case "payment":
      return [
        { labelKey: "breach.formPayRef", value: t("breach.phPayRef") },
        { labelKey: "breach.formPayAmt", value: t("breach.phPayAmt") },
      ];
    case "track":
      return [
        { labelKey: "breach.formTrackId", value: t("breach.phTrackId") },
        { labelKey: "breach.formTrackContact", value: t("breach.phTrackContact") },
      ];
    case "wifi":
      return [
        { labelKey: "breach.formWifiSsid", value: t("breach.phWifiSsid") },
        { labelKey: "breach.formWifiKey", value: t("breach.phWifiKey") },
      ];
    case "account":
      return [
        { labelKey: "breach.fakeEmailLabel", value: t("breach.phAccountEmail") },
        { labelKey: "breach.fakePassLabel", value: t("breach.phAccountPass") },
      ];
    default:
      return [
        { labelKey: "breach.formGenericRef", value: t("breach.phGenericRef") },
        { labelKey: "breach.formGenericCode", value: t("breach.phGenericCode") },
      ];
  }
}

export function actionKeysForKind(kind: BreachPageKind): { creds: string; perm: string; safe: string } {
  switch (kind) {
    case "payment":
      return { creds: "breach.actionPayCreds", perm: "breach.actionPayPerm", safe: "breach.actionSafe" };
    case "track":
      return { creds: "breach.actionTrackCreds", perm: "breach.actionTrackPerm", safe: "breach.actionSafe" };
    case "wifi":
      return { creds: "breach.actionWifiCreds", perm: "breach.actionWifiPerm", safe: "breach.actionSafe" };
    case "generic":
      return { creds: "breach.actionGenericCreds", perm: "breach.actionGenericPerm", safe: "breach.actionSafe" };
    default:
      return { creds: "breach.actionCreds", perm: "breach.actionPerm", safe: "breach.actionSafe" };
  }
}

/**
 * Интерактивная подводка: «ссылка пришла» → открыть → фейковая страница → выбор → театр или безопасный исход.
 * Всё только в SPA, без внешних запросов.
 */
export function BreachLeadInFlow({
  scenarioLabel,
  targetUrl,
  scenarioContext,
  onExit,
}: {
  scenarioLabel: string;
  targetUrl: string;
  /** Письмо или чат: тема / превью / CTA — страница подстраивается */
  scenarioContext: BreachScenarioContext | null;
  onExit: (outcome: BreachDrillOutcome) => void;
}) {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>("notify");
  const [theaterFlavor, setTheaterFlavor] = useState<IntrusionUnsafeFlavor | null>(null);

  const pageKind: BreachPageKind = useMemo(
    () => (scenarioContext ? inferBreachPageKind(scenarioContext) : "account"),
    [scenarioContext],
  );

  const tabLabel = scenarioContext ? truncateUi(scenarioContext.subject, 36) : t("breach.fakeTabFallback");
  const pageTitle = scenarioContext?.ctaLabel?.trim() || t("breach.fakePageTitleFallback");
  const pageLead = scenarioContext?.preview?.trim() || t("breach.fakePageLead");
  const fromChat = scenarioContext?.source === "chat";

  const formRows = useMemo(() => formFieldsForKind(pageKind, t), [pageKind, t]);
  const actionKeys = useMemo(() => actionKeysForKind(pageKind), [pageKind]);

  const displayUrl = targetUrl.replace(/^https?:\/\//i, "");
  const shortUrl = displayUrl.length > 56 ? `${displayUrl.slice(0, 54)}…` : displayUrl;

  function pickUnsafe(flavor: IntrusionUnsafeFlavor) {
    setTheaterFlavor(flavor);
    setStep("theater");
  }

  function pickSafe() {
    setStep("safeend");
  }

  if (step === "theater" && theaterFlavor) {
    return (
      <IntrusionTheater
        key={theaterFlavor}
        active
        scenarioLabel={scenarioLabel}
        phishingTargetUrl={targetUrl}
        variant="link_demo"
        unsafeFlavor={theaterFlavor}
        pageKind={pageKind}
        onComplete={() => onExit("unsafe")}
      />
    );
  }

  if (step === "safeend") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#030508] p-4 motion-safe:animate-fade-in">
        <div className="w-full max-w-lg rounded-2xl border border-emerald-700/50 bg-gradient-to-b from-emerald-950/50 to-black/80 p-6 shadow-[0_0_60px_-20px_rgb(16_185_129_/_0.35)] md:p-8">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500">{t("breach.safeKicker")}</p>
          <h1 className="mt-2 font-display text-xl font-semibold text-emerald-100 md:text-2xl">{t("breach.safeTitle")}</h1>
          <p className="mt-3 text-sm leading-relaxed text-emerald-200/85">{t("breach.safeBody")}</p>
          <button type="button" onClick={() => onExit("safe")} className="btn-primary mt-6 !text-xs">
            {t("breach.backToScenario")}
          </button>
        </div>
      </div>
    );
  }

  if (step === "notify") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#030508] p-4 motion-safe:animate-fade-in">
        <div className="w-full max-w-md rounded-2xl border border-cyan-900/50 bg-[#0a1018] p-6 shadow-[0_0_50px_-16px_rgb(6_182_212_/_0.25)] md:p-8">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-50" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
            </span>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-cyan-400/90">
              {fromChat ? t("breach.notifyKickerChat") : t("breach.notifyKicker")}
            </p>
          </div>
          <h1 className="mt-3 font-display text-lg font-semibold text-white md:text-xl">
            {fromChat ? t("breach.notifyTitleChat") : t("breach.notifyTitle")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-400">
            {fromChat ? t("breach.notifyBodyChat") : t("breach.notifyBody")}
          </p>
          {scenarioContext ? (
            <p className="mt-3 rounded-lg border border-stone-700/50 bg-black/30 px-3 py-2 text-sm font-medium leading-snug text-stone-200">
              {truncateUi(scenarioContext.subject, 120)}
            </p>
          ) : null}
          <div className="mt-4 rounded-xl border border-stone-700/60 bg-black/40 px-3 py-2 font-mono text-[11px] text-cyan-200/90">
            <span className="text-cyan-600/80">https://</span>
            {shortUrl}
          </div>
          <p className="mt-2 font-mono text-[9px] text-stone-600">{t("breach.notifyHint")}</p>
          <button
            type="button"
            onClick={() => setStep("browser")}
            className="mt-6 w-full rounded-xl border border-cyan-600/50 bg-cyan-950/40 py-3 font-mono text-sm font-semibold text-cyan-100 transition hover:bg-cyan-900/40"
          >
            {t("breach.openLink")}
          </button>
        </div>
      </div>
    );
  }

  /* browser */
  return (
    <div className="min-h-[100dvh] bg-[#030508] px-3 py-6 motion-safe:animate-fade-in md:px-6 md:py-10">
      <div className="mx-auto max-w-xl">
        <div className="overflow-hidden rounded-2xl border border-zinc-600 bg-zinc-900 shadow-2xl">
          <div className="flex items-center gap-2 border-b border-zinc-700 bg-zinc-800/90 px-2 py-2">
            <div className="flex gap-1.5 pl-1">
              <span className="size-2.5 rounded-full bg-red-500/90" aria-hidden />
              <span className="size-2.5 rounded-full bg-amber-400/90" aria-hidden />
              <span className="size-2.5 rounded-full bg-emerald-500/80" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-1.5 font-mono text-[10px] text-zinc-300">
              <span className="text-emerald-500">https://</span>
              <span className="break-all">{displayUrl}</span>
            </div>
          </div>
          <div className="border-b border-zinc-800 bg-zinc-900 px-3 py-2">
            <span className="inline-block max-w-full truncate rounded-t-md bg-zinc-800 px-3 py-1 font-mono text-[10px] text-zinc-300" title={tabLabel}>
              {tabLabel}
            </span>
          </div>
          <div className="relative bg-gradient-to-b from-zinc-950 to-black px-5 pb-8 pt-6">
            <p className="absolute right-3 top-3 rounded bg-zinc-800/90 px-2 py-0.5 font-mono text-[9px] text-zinc-400">{t("sim.fakeBrowser")}</p>
            <h2 className="mt-1 font-display text-lg font-semibold text-white">{pageTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{pageLead}</p>
            <div className="mt-5 space-y-3 rounded-xl border border-zinc-800 bg-black/40 p-4">
              {formRows.map((row, i) => (
                <div key={`${row.labelKey}-${i}`}>
                  <label className="block font-mono text-[10px] text-zinc-500">{t(row.labelKey)}</label>
                  <div className="mt-1 rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 font-mono text-xs text-zinc-500">{row.value}</div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-center font-mono text-[10px] text-zinc-600">{t("breach.choiceHint")}</p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => pickUnsafe("credentials")}
                className="rounded-xl border border-zinc-600 bg-zinc-800/40 py-3 text-left text-sm font-medium text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800/70"
              >
                {t(actionKeys.creds)}
              </button>
              <button
                type="button"
                onClick={() => pickUnsafe("permission")}
                className="rounded-xl border border-zinc-600 bg-zinc-800/40 py-3 text-left text-sm font-medium text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800/70"
              >
                {t(actionKeys.perm)}
              </button>
              <button
                type="button"
                onClick={pickSafe}
                className="rounded-xl border border-zinc-600 bg-zinc-800/40 py-3 text-left text-sm font-medium text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800/70"
              >
                {t(actionKeys.safe)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { BreachScenarioContext, BreachEmailContext } from "@/lib/breachFromEmail";
