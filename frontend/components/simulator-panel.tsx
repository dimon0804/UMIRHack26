"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useLocale } from "@/components/providers";
import type { MessageKey } from "@/lib/i18n";
import {
  fetchSimulatorScenario,
  fetchSimulatorScenarios,
  submitSimulatorChoice,
  type ChatScenario,
  type EmailScenario,
  type ScenarioListItem,
  type SubmitResult,
} from "@/lib/simulator";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

const choiceGlyph: Record<string, string> = {
  open_link: "🔗",
  delete_only: "🗑️",
  verify_sender: "🔍",
  report: "🛡️",
  send_codes: "💳",
  callback: "📞",
  official_channel: "📋",
  ignore: "⏸️",
};

export function SimulatorPanel() {
  const { locale, t } = useLocale();
  const lang = locale === "en" ? "en" : "ru";

  const [list, setList] = useState<ScenarioListItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [scenario, setScenario] = useState<EmailScenario | ChatScenario | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingScenario, setLoadingScenario] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<SubmitResult | null>(null);
  const [consequenceStep, setConsequenceStep] = useState(0);
  const [showConsequences, setShowConsequences] = useState(false);
  const [shield, setShield] = useState(100);
  const [xp, setXp] = useState(0);
  const [shakeStage, setShakeStage] = useState(false);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setErr(null);
    try {
      const { scenarios } = await fetchSimulatorScenarios(lang);
      setList(scenarios);
      setActiveId((prev) => {
        if (prev && scenarios.some((s) => s.id === prev)) return prev;
        return scenarios[0]?.id ?? null;
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setList([]);
    } finally {
      setLoadingList(false);
    }
  }, [lang]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const loadScenario = useCallback(
    async (id: string) => {
      setLoadingScenario(true);
      setErr(null);
      setLastResult(null);
      setShowConsequences(false);
      setConsequenceStep(0);
      try {
        const { scenario: s } = await fetchSimulatorScenario(id, lang);
        setScenario(s);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
        setScenario(null);
      } finally {
        setLoadingScenario(false);
      }
    },
    [lang],
  );

  useEffect(() => {
    if (activeId) void loadScenario(activeId);
    else setScenario(null);
  }, [activeId, loadScenario]);

  useEffect(() => {
    if (!lastResult?.ok || !lastResult.result) return;
    const r = lastResult.result;
    setShield((s) => clamp(s + r.security_delta, 0, 100));
    setXp((x) => Math.max(0, x + r.xp_delta));
    if (!r.is_safe && r.severity === "critical") {
      setShakeStage(true);
      window.setTimeout(() => setShakeStage(false), 480);
    }
  }, [lastResult]);

  const onChoice = async (choiceId: string) => {
    if (!scenario || submitting) return;
    setSubmitting(true);
    setShowConsequences(false);
    setConsequenceStep(0);
    try {
      const res = await submitSimulatorChoice(scenario.id, choiceId, lang);
      setLastResult(res);
      if (!res.ok) setErr(res.error ?? "submit failed");
      else setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setLastResult(null);
    } finally {
      setSubmitting(false);
    }
  };

  const r = lastResult?.result;
  const steps = r?.consequence_steps ?? [];
  const level = Math.floor(xp / 120) + 1;

  const shieldTone = useMemo(() => {
    if (shield >= 70) return "from-cyan-400 to-emerald-400";
    if (shield >= 40) return "from-amber-400 to-orange-500";
    return "from-red-500 to-rose-600";
  }, [shield]);

  return (
    <div className="sim-gradient-border shadow-neon">
      <div className="sim-gradient-border__inner sim-glass relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-sim-grid bg-[length:24px_24px] opacity-[0.35] dark:opacity-25"
          aria-hidden
        />
        <div
          className="sim-orb -left-20 -top-20 h-56 w-56 bg-cyan-400/30 dark:bg-cyan-400/20"
          aria-hidden
        />
        <div
          className="sim-orb -bottom-24 -right-16 h-64 w-64 bg-violet-500/25 dark:bg-violet-500/20"
          aria-hidden
        />
        <div className="sim-scanlines absolute inset-0 z-[1] opacity-40" aria-hidden />

        <div className="relative z-10 p-5 sm:p-8">
          {/* HUD */}
          <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
                  </span>
                  {t("simLive")}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-ink-muted dark:border-white/10">
                  SOC DRILL
                </span>
              </div>
              <h2 className="bg-gradient-to-r from-ink via-slate-700 to-slate-500 bg-clip-text text-2xl font-bold tracking-tight text-transparent dark:from-white dark:via-slate-200 dark:to-slate-400 sm:text-3xl">
                {t("simSectionTitle")}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">{t("simSectionLead")}</p>
            </div>

            <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:min-w-[220px]">
              <div className="rounded-2xl border border-white/10 bg-black/5 p-4 dark:bg-white/5">
                <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  <span>{t("simShield")}</span>
                  <span className="font-mono tabular-nums text-ink">{shield}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${shieldTone}`}
                    initial={false}
                    animate={{ width: `${shield}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                  />
                </div>
                <div className="mt-3 flex justify-between font-mono text-[11px] text-ink-muted">
                  <span>
                    {t("simXp")}: <span className="text-cyan-600 dark:text-cyan-300">{xp}</span>
                  </span>
                  <span>
                    {t("simLevel")} {level}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void loadList()}
                disabled={loadingList}
                className="rounded-xl border border-slate-200/80 bg-white/60 px-4 py-2 text-xs font-semibold text-ink shadow-sm transition hover:border-cyan-500/40 hover:shadow-neon-sm disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-cyan-500/30"
              >
                {loadingList ? "…" : t("simRefresh")}
              </button>
            </div>
          </div>

          {err ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-800 dark:text-red-200"
              role="alert"
            >
              {err}
            </motion.div>
          ) : null}

          {/* Миссии */}
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-ink-muted">{t("simMissions")}</p>
          {loadingList ? (
            <div className="mb-8 flex gap-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-24 flex-1 animate-pulse rounded-2xl bg-slate-200/80 dark:bg-slate-800/80"
                />
              ))}
            </div>
          ) : (
            <div className="mb-8 grid gap-3 sm:grid-cols-2">
              {list.map((s, i) => {
                const active = activeId === s.id;
                return (
                  <motion.button
                    key={s.id}
                    type="button"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setActiveId(s.id)}
                    className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-cyan-500/50 bg-gradient-to-br from-cyan-500/15 to-violet-600/10 shadow-neon-sm"
                        : "border-slate-200/90 bg-white/40 hover:border-cyan-500/25 dark:border-slate-700 dark:bg-slate-900/40"
                    }`}
                  >
                    <span className="text-2xl">{s.type === "email" ? "✉️" : "💬"}</span>
                    <span className="mt-2 block text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                      {s.type === "email" ? t("simTypeEmail") : t("simTypeChat")}
                    </span>
                    <span className="mt-1 block font-semibold text-ink">{s.title}</span>
                    <span className="mt-1 font-mono text-[10px] text-ink-muted/80">{s.id}</span>
                    {active ? (
                      <motion.span
                        layoutId="missionGlow"
                        className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-cyan-400/40"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    ) : null}
                  </motion.button>
                );
              })}
            </div>
          )}

          {loadingScenario ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
                <p className="text-sm text-ink-muted">{t("simLoading")}</p>
              </div>
            </div>
          ) : null}

          <AnimatePresence mode="wait">
            {scenario && !loadingScenario ? (
              <motion.div
                key={scenario.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
                className={shakeStage ? "animate-shake" : ""}
              >
                {scenario.type === "email" ? (
                  <EmailCinematic s={scenario} t={t} />
                ) : (
                  <ChatCinematic s={scenario} t={t} />
                )}

                <div className="mt-8">
                  <p className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted">
                    <span className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-300 dark:to-slate-600" />
                    {t("simYourMove")}
                    <span className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-300 dark:to-slate-600" />
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {scenario.choices.map((c, idx) => (
                      <motion.button
                        key={c.id}
                        type="button"
                        disabled={submitting}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => void onChoice(c.id)}
                        className="flex items-start gap-3 rounded-2xl border border-slate-200/90 bg-white/70 p-4 text-left shadow-sm transition hover:border-cyan-500/35 hover:shadow-md disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-cyan-500/25"
                      >
                        <span className="text-2xl grayscale-[0.2]">{choiceGlyph[c.id] ?? "▸"}</span>
                        <span className="text-sm font-medium leading-snug text-ink">{c.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {lastResult && r ? (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-10 space-y-4 border-t border-slate-200/80 pt-8 dark:border-slate-800"
              >
                <div
                  className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 ${
                    r.is_safe
                      ? "border-emerald-500/35 bg-gradient-to-br from-emerald-500/10 to-cyan-500/5"
                      : "border-amber-500/40 bg-gradient-to-br from-amber-500/15 to-orange-600/5"
                  }`}
                >
                  <div
                    className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-3xl ${
                      r.is_safe ? "bg-emerald-400/20" : "bg-amber-500/20"
                    }`}
                  />
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted">{t("simFeedback")}</p>
                  <h3 className="mt-2 text-xl font-bold text-ink">{r.teach_title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink-muted">{r.teach_body}</p>
                  <div className="mt-4 flex flex-wrap gap-2 font-mono text-[10px] text-ink-muted">
                    <span className="rounded-md bg-black/5 px-2 py-1 dark:bg-white/10">
                      safe={String(r.is_safe)}
                    </span>
                    <span className="rounded-md bg-black/5 px-2 py-1 dark:bg-white/10">{r.severity}</span>
                    <span className="rounded-md bg-black/5 px-2 py-1 dark:bg-white/10">
                      Δshield {r.security_delta > 0 ? "+" : ""}
                      {r.security_delta}
                    </span>
                    <span className="rounded-md bg-black/5 px-2 py-1 dark:bg-white/10">
                      Δxp {r.xp_delta > 0 ? "+" : ""}
                      {r.xp_delta}
                    </span>
                  </div>
                </div>

                {r.show_consequences && steps.length > 0 ? (
                  <div className="overflow-hidden rounded-2xl border border-red-500/40 bg-gradient-to-b from-red-950/40 to-slate-950/80 p-1 dark:from-red-950/60">
                    {!showConsequences ? (
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => {
                          setShowConsequences(true);
                          setConsequenceStep(0);
                        }}
                        className="w-full rounded-xl bg-gradient-to-r from-red-600 to-rose-700 px-4 py-4 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-red-900/40"
                      >
                        {t("simShowConsequences")}
                      </motion.button>
                    ) : (
                      <div className="p-5 sm:p-6">
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-red-300/90">
                          {t("simBreachProtocol")} · {t("simStepLabel")} {consequenceStep + 1}/{steps.length}
                        </p>
                        <h4 className="mt-3 text-xl font-bold text-white">{steps[consequenceStep]?.title}</h4>
                        <p className="mt-2 text-sm leading-relaxed text-red-100/85">{steps[consequenceStep]?.detail}</p>
                        <div className="mt-5 flex gap-2">
                          {Array.from({ length: steps.length }).map((_, si) => (
                            <div
                              key={si}
                              className={`h-1 flex-1 rounded-full ${si <= consequenceStep ? "bg-red-400" : "bg-white/15"}`}
                            />
                          ))}
                        </div>
                        <div className="mt-5 flex flex-wrap gap-2">
                          {consequenceStep < steps.length - 1 ? (
                            <button
                              type="button"
                              onClick={() => setConsequenceStep((i) => i + 1)}
                              className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-400"
                            >
                              {t("simNextStep")}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowConsequences(false)}
                              className="rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/15"
                            >
                              {t("simCloseConsequences")}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {lastResult && !lastResult.ok ? (
            <pre className="mt-6 max-h-40 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-[10px] dark:border-slate-800 dark:bg-slate-950">
              {JSON.stringify(lastResult, null, 2)}
            </pre>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EmailCinematic({ s, t }: { s: EmailScenario; t: (k: MessageKey) => string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50 shadow-xl dark:border-slate-700 dark:from-slate-900 dark:to-slate-950 dark:shadow-2xl">
      <div className="flex items-center gap-3 border-b border-slate-200/80 bg-slate-100/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="mx-auto flex max-w-md flex-1 items-center rounded-lg bg-white/90 px-3 py-1.5 text-xs text-ink-muted shadow-inner dark:bg-slate-950/80">
          🔒 {s.sender_email.slice(0, 28)}…
        </div>
      </div>
      <div className="flex min-h-[280px] flex-col sm:flex-row">
        <aside className="hidden w-40 shrink-0 border-r border-slate-200/80 bg-slate-50/80 p-3 text-[11px] dark:border-slate-800 dark:bg-slate-900/50 sm:block">
          <p className="mb-2 font-semibold text-ink">{t("simMailInbox")}</p>
          <div className="space-y-1 text-ink-muted">
            <div className="rounded-lg bg-cyan-500/15 px-2 py-1.5 font-medium text-cyan-700 dark:text-cyan-300">
              {t("simMailPrimary")}
            </div>
            <div className="px-2 py-1">{t("simMailPromo")}</div>
            <div className="px-2 py-1">{t("simMailSpam")}</div>
          </div>
        </aside>
        <div className="min-w-0 flex-1 p-5 sm:p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 text-lg font-bold text-white shadow-lg">
              {s.sender_display.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{s.sender_display}</p>
              <p className="truncate font-mono text-[11px] text-ink-muted">&lt;{s.sender_email}&gt;</p>
            </div>
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              {t("simMailBadge")}
            </span>
          </div>
          <h3 className="text-lg font-bold leading-snug text-ink sm:text-xl">{s.subject}</h3>
          <p className="mt-1 text-xs text-ink-muted">{s.preview}</p>
          <div className="mt-5 space-y-3 text-sm leading-relaxed text-ink/90">
            {s.body_paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-dashed border-cyan-500/35 bg-gradient-to-br from-cyan-500/5 to-violet-500/5 p-4">
            <span className="inline-flex rounded-xl bg-gradient-to-r from-cyan-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25">
              {s.cta_label}
            </span>
            <p className="mt-3 break-all font-mono text-[10px] leading-relaxed text-ink-muted">{s.cta_href_display}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatCinematic({ s, t }: { s: ChatScenario; t: (k: MessageKey) => string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 shadow-2xl shadow-black/50">
      <div
        className="relative text-slate-100"
        style={{
          background:
            "linear-gradient(180deg, #0e1621 0%, #0d131c 100%), radial-gradient(ellipse 80% 50% at 50% -20%, rgb(34 211 238 / 0.12), transparent)",
        }}
      >
        <div className="flex items-center gap-3 border-b border-white/10 bg-[#17212b]/95 px-4 py-3 backdrop-blur">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-600 text-sm font-bold text-white shadow-lg">
            {s.peer_name.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{s.peer_name}</p>
            <p className="truncate text-[11px] text-emerald-400/95">
              @{s.peer_handle} · <span className="animate-pulse-live inline-block">●</span> {t("simChatOnline")}
            </p>
          </div>
        </div>
        <div className="space-y-3 p-4">
          {s.messages.map((m, i) => (
            <div key={i} className={m.from === "me" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-lg ${
                  m.from === "me"
                    ? "rounded-br-md bg-gradient-to-br from-sky-500 to-blue-600 text-white"
                    : "rounded-bl-md border border-white/5 bg-[#2b5278]/95"
                }`}
              >
                <p>{m.text}</p>
                <p className={`mt-1.5 text-[9px] ${m.from === "me" ? "text-white/70" : "text-slate-400"}`}>
                  {m.time}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-white/5 bg-[#17212b]/90 px-3 py-2.5">
          <span className="text-slate-500">📎</span>
          <div className="flex-1 rounded-full bg-[#0e1621] px-4 py-2 text-xs text-slate-500">{t("simChatPlaceholder")}</div>
          <span className="text-slate-500">🎤</span>
        </div>
      </div>
    </div>
  );
}
