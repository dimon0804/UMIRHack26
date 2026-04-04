import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/I18nContext";
import { IntrusionTheater, type IntrusionUnsafeFlavor } from "@/components/IntrusionTheater";
import { actionKeysForKind } from "@/components/BreachLeadInFlow";
import {
  type BreachDrillOutcome,
  type BreachScenarioContext,
  type BreachPageKind,
  inferBreachPageKind,
  truncateUi,
} from "@/lib/breachFromEmail";

type Step = "messenger" | "theater" | "safeend";

function peerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0];
    const b = parts[1]?.[0];
    if (a && b) return `${a}${b}`.toUpperCase();
  }
  const compact = name.replace(/\s+/g, "");
  return compact.slice(0, 2).toUpperCase() || "?";
}

function linkHost(url: string): string {
  try {
    const u = url.startsWith("http") ? url : `https://${url}`;
    return new URL(u).host;
  } catch {
    return truncateUi(url.replace(/^https?:\/\//i, ""), 48);
  }
}

function ReadTicks({ className }: { className?: string }) {
  return (
    <span className={`select-none text-[12px] leading-none tracking-[-0.15em] opacity-80 ${className ?? ""}`} aria-hidden>
      ✓✓
    </span>
  );
}

/**
 * Учебный «отдельный экран мессенджера»: переписка и снизу три варианта поступка (как на фейковой странице).
 */
export function BreachChatMessengerFlow({
  scenarioLabel,
  targetUrl,
  scenarioContext,
  onExit,
}: {
  scenarioLabel: string;
  targetUrl: string;
  scenarioContext: BreachScenarioContext | null;
  onExit: (outcome: BreachDrillOutcome) => void;
}) {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>("messenger");
  const [theaterFlavor, setTheaterFlavor] = useState<IntrusionUnsafeFlavor | null>(null);

  const pageKind: BreachPageKind = useMemo(
    () => (scenarioContext ? inferBreachPageKind(scenarioContext) : "generic"),
    [scenarioContext],
  );

  const actionKeys = useMemo(() => actionKeysForKind(pageKind), [pageKind]);

  const peerName =
    scenarioContext?.chatPeerName?.trim() || scenarioContext?.subject?.split(" — ")[0]?.trim() || t("breach.chatPeerFallback");
  const peerHandle = scenarioContext?.chatPeerHandle?.trim() || "";
  const initials = useMemo(() => peerInitials(peerName), [peerName]);

  const messages = useMemo(() => {
    const list = scenarioContext?.chatMessages;
    if (list?.length) return list;
    const text = scenarioContext?.preview?.trim() || scenarioContext?.subject?.trim() || "";
    return text ? [{ from: "peer" as const, text }] : [];
  }, [scenarioContext]);

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
      <div className="flex min-h-[100dvh] items-center justify-center bg-paper bg-mesh-light p-4 motion-safe:animate-fade-in dark:bg-[#030508] dark:bg-none">
        <div className="w-full max-w-lg rounded-2xl border border-emerald-200/90 bg-white p-6 shadow-soft-lg md:p-8 dark:border-emerald-700/50 dark:bg-gradient-to-b dark:from-emerald-950/50 dark:to-black/80 dark:shadow-[0_0_60px_-20px_rgb(16_185_129_/_0.35)]">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-500">{t("breach.safeKicker")}</p>
          <h1 className="mt-2 font-display text-xl font-semibold text-ink md:text-2xl dark:text-emerald-100">{t("breach.safeTitle")}</h1>
          <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-emerald-200/85">{t("breach.safeBody")}</p>
          <button type="button" onClick={() => onExit("safe")} className="btn-primary mt-6 !text-xs">
            {t("breach.backToScenario")}
          </button>
        </div>
      </div>
    );
  }

  const displayUrl = targetUrl.replace(/^https?:\/\//i, "");
  const linkHostLabel = targetUrl ? linkHost(targetUrl) : "";

  return (
    <div className="flex min-h-[100dvh] flex-col bg-stone-100/90 bg-mesh-light motion-safe:animate-fade-in dark:bg-none dark:bg-[#0b0f14]">
      <header className="sticky top-0 z-20 shrink-0 border-b border-stone-200/90 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-soft backdrop-blur-md dark:border-white/[0.06] dark:from-[#1a2332] dark:to-[#151b24] dark:shadow-[0_1px_0_rgb(0_0_0_/_0.35)]">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-3 py-2.5 sm:px-4">
          <div className="relative shrink-0">
            <div className="flex size-[2.75rem] items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 font-display text-sm font-bold text-white shadow-md ring-2 ring-white/80 dark:rounded-full dark:from-sky-500 dark:via-indigo-500 dark:to-violet-600 dark:ring-black/20">
              {initials}
            </div>
            <span
              className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-[3px] ring-emerald-50 dark:ring-[#1a2332]"
              title={t("breach.chatStatusOnline")}
              aria-hidden
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold leading-tight text-stone-900 dark:text-zinc-100">{peerName}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {peerHandle ? (
                <p className="font-mono text-[11px] text-stone-500 dark:text-sky-300/80">@{peerHandle.replace(/^@/, "")}</p>
              ) : null}
              <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400/90">{t("breach.chatStatusOnline")}</p>
            </div>
          </div>
          <span className="max-w-[6.5rem] rounded-lg bg-white/80 px-2 py-1 text-right font-mono text-[8px] leading-tight text-stone-500 ring-1 ring-stone-200/80 dark:bg-black/25 dark:text-zinc-500 dark:ring-0">
            {t("breach.chatMessengerDisclaimer")}
          </span>
        </div>
      </header>

      <div className="relative mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col border-x border-stone-200/80 bg-white shadow-soft-md dark:border-transparent dark:bg-transparent dark:shadow-none">
        <div
          className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(circle_at_1px_1px,rgb(255_255_255/0.045)_1px,transparent_0)] bg-[length:20px_20px] opacity-90 dark:block"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 hidden bg-gradient-to-b from-slate-900/40 via-transparent to-slate-950/60 dark:block"
          aria-hidden
        />

        <div className="relative z-[1] flex min-h-0 flex-1 flex-col overflow-hidden dark:bg-[#0b0f14]/80">
          <ul className="flex flex-1 flex-col justify-end gap-2 overflow-y-auto overscroll-contain px-3 py-4 scrollbar-subtle md:py-5">
            <li className="flex justify-center py-1">
              <span className="rounded-full bg-stone-200/80 px-3 py-1 text-[11px] font-medium text-stone-600 ring-1 ring-stone-300/60 dark:bg-black/35 dark:text-zinc-500 dark:ring-white/[0.06]">
                {t("breach.chatToday")}
              </span>
            </li>
            {messages.map((m, i) => {
              const isMe = m.from === "me";
              return (
                <li key={i} className={`flex gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                  {!isMe ? (
                    <div
                      className="mt-auto flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-[10px] font-bold text-white shadow-sm dark:from-sky-600 dark:to-indigo-700"
                      aria-hidden
                    >
                      {initials.slice(0, 1)}
                    </div>
                  ) : (
                    <span className="w-8 shrink-0" aria-hidden />
                  )}
                  <div
                    className={`max-w-[min(100%,18.5rem)] sm:max-w-[20rem] ${
                      isMe
                        ? "rounded-[1.15rem] rounded-br-md bg-gradient-to-b from-emerald-600 to-emerald-700 px-3.5 py-2 text-white shadow-md ring-1 ring-emerald-700/20 dark:ring-black/15"
                        : "rounded-[1.15rem] rounded-bl-md border border-stone-200/90 bg-stone-100 px-3.5 py-2 text-stone-900 shadow-soft dark:border-white/[0.07] dark:bg-[#243447] dark:text-zinc-100 dark:shadow-[0_2px_12px_rgb(0_0_0_/_0.25)]"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">{m.text}</p>
                    <div
                      className={`mt-1.5 flex items-end justify-end gap-1.5 ${isMe ? "text-emerald-100/70" : "text-stone-500 dark:text-zinc-400"}`}
                    >
                      {m.time ? <span className="text-[11px] tabular-nums">{m.time}</span> : null}
                      {isMe ? <ReadTicks className="text-emerald-100" /> : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="relative z-10 shrink-0 border-t border-stone-200/90 bg-stone-50/95 shadow-[0_-8px_32px_rgb(0_0_0_/_0.06)] backdrop-blur-lg dark:border-white/[0.07] dark:bg-[#151b24]/95 dark:shadow-[0_-12px_40px_rgb(0_0_0_/_0.45)]">
          <div className="mx-auto max-w-lg px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-4">
            {targetUrl ? (
              <div className="mb-3 overflow-hidden rounded-2xl border border-cyan-200/90 bg-white shadow-soft dark:border-cyan-500/20 dark:bg-[#1c2836] dark:shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04)]">
                <div className="flex gap-0">
                  <div className="w-1 shrink-0 bg-gradient-to-b from-cyan-500 to-sky-600" aria-hidden />
                  <div className="min-w-0 flex-1 px-3 py-2.5">
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-teal-700 dark:text-cyan-400/90">
                      {linkHostLabel}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] leading-snug text-stone-600 dark:text-zinc-400">
                      <span className="text-stone-500 dark:text-zinc-500">{t("breach.chatLinkInThread")}</span>{" "}
                      <span className="break-all text-teal-800 dark:text-cyan-200/90">{truncateUi(displayUrl, 80)}</span>
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mb-3 flex items-center gap-2 rounded-[1.35rem] border border-stone-200/90 bg-white px-4 py-2.5 shadow-inner dark:border-white/[0.08] dark:bg-black/35 dark:ring-1 dark:ring-black/40">
              <span className="select-none text-sm text-stone-400 dark:text-zinc-500">{t("breach.chatComposerPlaceholder")}</span>
              <span className="ml-auto flex size-8 items-center justify-center rounded-full bg-stone-200/90 text-stone-500 dark:bg-zinc-700/50 dark:text-zinc-500" aria-hidden>
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>

            <p className="mb-2.5 text-center text-[11px] text-stone-500 dark:text-zinc-500">{t("breach.chatChoiceHint")}</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => pickUnsafe("credentials")}
                className="rounded-2xl border border-stone-200/90 bg-white py-3.5 pl-4 pr-3 text-left text-sm font-medium text-stone-800 shadow-soft transition hover:border-emerald-300/80 hover:bg-emerald-50/50 active:scale-[0.99] dark:border-white/[0.08] dark:bg-zinc-800/80 dark:text-zinc-100 dark:shadow-sm dark:hover:border-sky-500/35 dark:hover:bg-zinc-800"
              >
                {t(actionKeys.creds)}
              </button>
              <button
                type="button"
                onClick={() => pickUnsafe("permission")}
                className="rounded-2xl border border-stone-200/90 bg-white py-3.5 pl-4 pr-3 text-left text-sm font-medium text-stone-800 shadow-soft transition hover:border-emerald-300/80 hover:bg-emerald-50/50 active:scale-[0.99] dark:border-white/[0.08] dark:bg-zinc-800/80 dark:text-zinc-100 dark:shadow-sm dark:hover:border-sky-500/35 dark:hover:bg-zinc-800"
              >
                {t(actionKeys.perm)}
              </button>
              <button
                type="button"
                onClick={pickSafe}
                className="rounded-2xl border border-stone-200/90 bg-white py-3.5 pl-4 pr-3 text-left text-sm font-medium text-stone-800 shadow-soft transition hover:border-emerald-300/80 hover:bg-emerald-50/50 active:scale-[0.99] dark:border-white/[0.08] dark:bg-zinc-800/80 dark:text-zinc-100 dark:shadow-sm dark:hover:border-sky-500/35 dark:hover:bg-zinc-800"
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
