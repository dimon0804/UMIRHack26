import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nContext";
import {
  type BreachPageKind,
  intrusionConsequenceAlertKeys,
  intrusionLinkDemoAlertKeys,
  intrusionLogLineKeys,
  intrusionProgressLabelKeys,
  type IntrusionLogFlavor,
} from "@/lib/breachFromEmail";

type Phase = "boot" | "lines" | "alert" | "done";

type MatrixCol = { id: number; text: string; left: string; duration: string; delay: string };

export type IntrusionTheaterVariant = "consequence" | "link_demo";

/** Разный «сценарий взлома» после небезопасного выбора на фишинговой странице */
export type IntrusionUnsafeFlavor = "credentials" | "permission";

/**
 * Учебная сцена «как в кино»: только CSS/текст в браузере, без сети, без доступа к устройству.
 */
function logFlavor(unsafeFlavor: IntrusionUnsafeFlavor): IntrusionLogFlavor {
  return unsafeFlavor === "permission" ? "permission" : "credentials";
}

export function IntrusionTheater({
  active,
  scenarioLabel,
  onComplete,
  variant = "consequence",
  phishingTargetUrl = null,
  unsafeFlavor = "credentials",
  pageKind = "generic",
}: {
  active: boolean;
  scenarioLabel: string;
  onComplete: () => void;
  variant?: IntrusionTheaterVariant;
  /** Показывается как «цель запроса»; не используется для навигации */
  phishingTargetUrl?: string | null;
  /** Только для link_demo / визуальное различие веток «форма» vs «разрешения» */
  unsafeFlavor?: IntrusionUnsafeFlavor;
  /** Тематика лога и прогресса по смыслу ссылки / сообщения */
  pageKind?: BreachPageKind;
}) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("boot");
  const [lineIdx, setLineIdx] = useState(0);
  const [glitch, setGlitch] = useState(false);
  const finishedRef = useRef(false);

  const fakeIp = useMemo(() => {
    const a = 203 + (Math.floor(Math.random() * 20) % 20);
    const b = Math.floor(Math.random() * 200) + 1;
    const c = Math.floor(Math.random() * 200) + 1;
    return `${a}.${b}.${c}.14`;
  }, []);

  const matrixCols: MatrixCol[] = useMemo(() => {
    const pick = () => (Math.random() > 0.47 ? "1" : "0");
    return Array.from({ length: 12 }, (_, ci) => {
      const lines = Array.from({ length: 48 }, () => Array.from({ length: 3 }, pick).join("")).join("\n");
      return {
        id: ci,
        text: lines,
        left: `${(ci * 100) / 12 + 1}%`,
        duration: `${6.5 + ci * 0.45}s`,
        delay: `${-ci * 0.55}s`,
      };
    });
  }, [active]);

  const hexStream = useMemo(() => {
    const parts: string[] = [];
    for (let i = 0; i < 48; i++) {
      parts.push(Math.floor(Math.random() * 256).toString(16).padStart(2, "0"));
    }
    return `${parts.join("")} ${parts.join("")}`;
  }, [active]);

  const reduced =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  const flavor = logFlavor(unsafeFlavor);
  const lineKeys = useMemo(() => intrusionLogLineKeys(pageKind, flavor), [pageKind, flavor]);
  const demoAlertKeys = useMemo(() => intrusionLinkDemoAlertKeys(pageKind, flavor), [pageKind, flavor]);
  const consAlertKeys = useMemo(() => intrusionConsequenceAlertKeys(pageKind), [pageKind]);
  const progressKeys = useMemo(() => intrusionProgressLabelKeys(pageKind, flavor), [pageKind, flavor]);

  const nLines = lineKeys.length;

  const sessionPct = useMemo(() => {
    if (phase === "boot") return 6;
    if (phase === "lines") return Math.min(100, Math.round(10 + (lineIdx / nLines) * 85));
    return 100;
  }, [phase, lineIdx, nLines]);

  const credPct = useMemo(() => {
    if (phase === "boot") return 0;
    if (phase === "lines") return Math.min(100, Math.max(0, (lineIdx - 1) * 22));
    return 100;
  }, [phase, lineIdx]);

  const exfilPct = useMemo(() => {
    if (phase === "boot") return 0;
    if (phase === "lines") return Math.min(100, Math.max(0, (lineIdx - 3) * 28));
    return 100;
  }, [phase, lineIdx]);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setPhase("done");
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (!active) {
      setPhase("boot");
      setLineIdx(0);
      finishedRef.current = false;
    }
  }, [active]);

  useEffect(() => {
    if (!active) return;
    finishedRef.current = false;
    setPhase("boot");
    setLineIdx(0);
    const bootMs = reduced ? 80 : 500;
    const t0 = window.setTimeout(() => setPhase("lines"), bootMs);
    return () => clearTimeout(t0);
  }, [active, reduced, pageKind, flavor]);

  useEffect(() => {
    if (!active || phase !== "lines" || !reduced) return;
    setLineIdx(lineKeys.length);
    const a = window.setTimeout(() => setPhase("alert"), 150);
    return () => clearTimeout(a);
  }, [active, phase, reduced, lineKeys.length]);

  useEffect(() => {
    if (!active || phase !== "lines" || reduced) return;
    if (lineIdx >= lineKeys.length) {
      const a = window.setTimeout(() => setPhase("alert"), 400);
      return () => clearTimeout(a);
    }
    const t = window.setTimeout(() => setLineIdx((i: number) => i + 1), 420);
    return () => clearTimeout(t);
  }, [active, phase, lineIdx, lineKeys.length, reduced]);

  useEffect(() => {
    if (!active || reduced) return;
    const id = window.setInterval(() => {
      if (Math.random() > 0.62) {
        setGlitch(true);
        window.setTimeout(() => setGlitch(false), 140);
      }
    }, 2800);
    return () => clearInterval(id);
  }, [active, reduced]);

  if (!active) return null;

  const isDemo = variant === "link_demo";
  const alertTitle = (() => {
    if (!isDemo) {
      const tr = t(consAlertKeys.title);
      return tr !== consAlertKeys.title ? tr : t("theater.alertTitle");
    }
    const tr = t(demoAlertKeys.title);
    if (tr !== demoAlertKeys.title) return tr;
    return unsafeFlavor === "permission" ? t("theater.linkDemoTitlePerm") : t("theater.linkDemoTitle");
  })();
  const alertBody = (() => {
    if (!isDemo) {
      const tr = t(consAlertKeys.body);
      return tr !== consAlertKeys.body ? tr : t("theater.alertBody");
    }
    const tr = t(demoAlertKeys.body);
    if (tr !== demoAlertKeys.body) return tr;
    return unsafeFlavor === "permission" ? t("theater.linkDemoBodyPerm") : t("theater.linkDemoBody");
  })();
  const skipLabel = isDemo ? t("theater.closeDemo") : t("theater.skip");

  const sessionLabel = t(progressKeys[0]);
  const credLabel = t(progressKeys[1]);
  const exfilLabel = t(progressKeys[2]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#020405] p-3 motion-safe:animate-fade-in md:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="intrusion-theater-title"
    >
      <div className="pointer-events-none absolute inset-0 theater-grid-bg theater-grid-bg-motion opacity-90" aria-hidden />
      <div className="pointer-events-none absolute inset-0 theater-vignette" aria-hidden />
      <div className="soc-scanlines pointer-events-none absolute inset-0 opacity-[0.11]" aria-hidden />
      {!reduced ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {matrixCols.map((col) => (
            <div
              key={col.id}
              className="theater-matrix-col theater-matrix-rain absolute top-0 w-[2.5ch] text-left opacity-70"
              style={{ left: col.left, animationDuration: col.duration, animationDelay: col.delay }}
            >
              {col.text}
            </div>
          ))}
        </div>
      ) : null}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-24 theater-scan-sweep theater-scan-sweep-motion ${reduced ? "opacity-0" : "opacity-100"}`}
        aria-hidden
      />

      <div
        className={`relative w-full max-w-5xl overflow-hidden rounded-xl border border-red-500/45 bg-[#05080a]/95 shadow-[0_0_100px_-24px_rgb(239_68_68_/_0.5)] backdrop-blur-sm ${glitch && !reduced ? "theater-glitch-shake" : ""}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-red-900/55 bg-gradient-to-r from-red-950/80 via-[#0a1014] to-red-950/40 px-3 py-2.5 md:px-4">
          <div className="flex flex-wrap items-center gap-3">
            <p
              id="intrusion-theater-title"
              className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-red-400"
            >
              {t("theater.badge")}
            </p>
            {isDemo ? (
              <span className="rounded border border-cyan-700/50 bg-cyan-950/40 px-2 py-0.5 font-mono text-[9px] text-cyan-200/90">
                {t("theater.linkDemoRibbon")}
              </span>
            ) : null}
            <span className="hidden items-center gap-1.5 font-mono text-[9px] text-red-300/80 sm:flex" aria-hidden>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              REC
            </span>
          </div>
          <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[9px] text-amber-200">{t("theater.safeNote")}</span>
        </div>

        <div className="relative grid gap-4 p-4 md:grid-cols-2 md:gap-5 md:p-6">
          <div className="min-w-0">
            <p className="font-mono text-[11px] text-red-300/85">{t("theater.context", { label: scenarioLabel })}</p>
            {phishingTargetUrl ? (
              <p className="mt-2 break-all rounded border border-orange-900/40 bg-black/50 px-2 py-1.5 font-mono text-[10px] text-orange-200/90">
                <span className="text-orange-500/80">{t("theater.fakeRequest")}</span> GET {phishingTargetUrl}
              </p>
            ) : null}

            <div className="relative mt-3 overflow-hidden rounded-lg border border-emerald-800/50 bg-black/70 shadow-[inset_0_0_40px_rgb(0_0_0_/_0.65)]">
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" aria-hidden />
              <div className="relative max-h-[min(52vh,420px)] space-y-1.5 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed text-emerald-400/95 scrollbar-subtle md:text-xs">
                {phase === "boot" ? (
                  <p className="text-emerald-600/80">{t("theater.boot")}</p>
                ) : (
                  <ul className="space-y-1.5">
                    {lineKeys.slice(0, lineIdx).map((key: string, i: number) => (
                      <li key={`${key}-${i}`} className="motion-safe:animate-slide-in-right">
                        <span className="text-emerald-700">[{String(i + 1).padStart(2, "0")}]</span>{" "}
                        {t(key, { ip: fakeIp, pid: String(4400 + i) })}
                      </li>
                    ))}
                    {lineIdx > 0 && lineIdx < lineKeys.length ? (
                      <li className="text-emerald-600/60">
                        <span className="inline-block h-3 w-2 animate-pulse bg-emerald-500 align-middle" />
                      </li>
                    ) : null}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <div className="rounded-lg border border-emerald-900/40 bg-black/55 p-3 md:p-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600/90">{t("theater.panelOps")}</p>
              <div className="mt-4 space-y-4">
                <ProgressRow label={sessionLabel} pct={sessionPct} reduced={reduced} accent="emerald" />
                <ProgressRow label={credLabel} pct={credPct} reduced={reduced} accent="amber" />
                <ProgressRow label={exfilLabel} pct={exfilPct} reduced={reduced} accent="red" />
              </div>
            </div>
            <div className="rounded-lg border border-stone-800/80 bg-zinc-950/80 p-2 theater-hex-scroll overflow-hidden">
              <div
                className={`whitespace-nowrap font-mono text-[9px] text-zinc-500 ${!reduced ? "theater-hex-scroll-inner inline-block min-w-[200%]" : ""}`}
              >
                {hexStream} {hexStream}
              </div>
            </div>
          </div>
        </div>

        {phase === "alert" || phase === "done" ? (
          <div className="motion-safe:animate-pop-in-fast mx-4 mb-4 rounded-lg border border-red-500/50 bg-gradient-to-br from-red-950/60 to-black/40 p-4 md:mx-6">
            <p className="font-display text-base font-semibold text-red-100 md:text-lg">{alertTitle}</p>
            <p className="mt-2 text-sm leading-relaxed text-red-200/90">{alertBody}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-red-950/40 bg-black/30 px-4 py-3 md:px-6">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => finish()}
              className="rounded-lg border border-stone-600 bg-stone-900 px-4 py-2 font-mono text-xs text-stone-200 hover:border-emerald-600 hover:text-white"
            >
              {skipLabel}
            </button>
            <p className="font-mono text-[10px] text-stone-500">{t("theater.footer")}</p>
          </div>
          <button
            type="button"
            onClick={() => finish()}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-stone-600 text-stone-400 hover:border-red-500/70 hover:bg-red-950/40 hover:text-red-100"
            aria-label={t("theater.closeX")}
            title={t("theater.closeX")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function ProgressRow({
  label,
  pct,
  reduced,
  accent,
}: {
  label: string;
  pct: number;
  reduced: boolean;
  accent: "emerald" | "amber" | "red";
}) {
  const bar =
    accent === "emerald"
      ? "from-emerald-600 to-teal-500"
      : accent === "amber"
        ? "from-amber-600 to-orange-500"
        : "from-red-600 to-orange-600";
  return (
    <div>
      <div className="flex justify-between font-mono text-[10px] text-emerald-600/85">
        <span>{label}</span>
        <span className="tabular-nums">{Math.round(pct)}%</span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded bg-black/70 ring-1 ring-emerald-900/40">
        <div
          className={`relative h-full bg-gradient-to-r ${bar} ${reduced ? "" : "transition-[width] duration-500 ease-out"}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        >
          {!reduced ? <div className="absolute inset-0 bg-white/15 motion-safe:animate-shine-sweep" aria-hidden /> : null}
        </div>
      </div>
    </div>
  );
}
