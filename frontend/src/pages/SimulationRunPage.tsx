import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/i18n/I18nContext";
import {
  fetchSimulationScenario,
  submitSimulationChoice,
  type ApiActionCardsScenario,
  type ApiChatScenario,
  type ApiEmailScenario,
  type ApiScenarioUnion,
  type ApiTerminalScenario,
  type ApiWifiScenario,
} from "@/lib/simulationClient";
import { isCustomSimulationId, isPlayableSimulationId, MODULE_TOTAL_STEPS } from "@/lib/courseScenarios";
import type { ScenarioRunSummary } from "@/context/AppContext";

function attackTypeForScenario(data: ApiScenarioUnion): string {
  if (data.attack_family) return data.attack_family;
  if (data.type === "email") return "phishing";
  if (data.type === "wifi") return "wifi_security";
  if (data.type === "terminal") return "skimming";
  return "social_engineering";
}

export function SimulationRunPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { locale, t } = useI18n();
  const { userState, user, scenarioStatus, applyScenarioResult, restartScenario } = useApp();

  const [data, setData] = useState<ApiScenarioUnion | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<NonNullable<Awaited<ReturnType<typeof submitSimulationChoice>>["result"]> | null>(
    null,
  );
  const [runHpDelta, setRunHpDelta] = useState(0);
  const [uiStep, setUiStep] = useState(1);

  const status = id && isPlayableSimulationId(id) ? scenarioStatus(id) : "locked";
  const lang = locale;

  const progStep = id ? userState?.progress[id]?.currentStep : undefined;
  const progDone = id ? userState?.progress[id]?.completed : undefined;

  useEffect(() => {
    if (!id || !userState || result) return;
    const p = userState.progress[id];
    const stepCap = isCustomSimulationId(id) ? 1 : MODULE_TOTAL_STEPS;
    if (p?.completed) {
      setUiStep(stepCap);
      return;
    }
    const next = Math.min(Math.max(1, p?.currentStep ?? 1), stepCap);
    setUiStep(next);
  }, [id, userState, progStep, progDone, result]);

  const load = useCallback(async () => {
    if (!id || !isPlayableSimulationId(id)) return;
    setLoading(true);
    setLoadError(null);
    setResult(null);
    setRunHpDelta(0);
    try {
      const r = await fetchSimulationScenario(id, lang, uiStep, user?.token);
      setData(r.scenario);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id, lang, uiStep, user?.token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!id || !isPlayableSimulationId(id) || status === "locked") {
      nav("/dashboard", { replace: true });
    }
  }, [id, status, nav]);

  const displayHp = useMemo(() => {
    const base = userState?.hp ?? 0;
    return Math.max(0, Math.min(100, base + runHpDelta));
  }, [userState?.hp, runHpDelta]);

  const totalSteps = data?.total_steps ?? MODULE_TOTAL_STEPS;
  const narrativeLine = data?.narrative_arc;

  async function onPick(choiceId: string) {
    if (!id || !data || submitting || result) return;
    setSubmitting(true);
    try {
      const curStep = data.step ?? uiStep;
      const res = await submitSimulationChoice(id, choiceId, lang, curStep, user?.token);
      if (!res.ok || !res.result) {
        setLoadError(res.error ?? "submit failed");
        return;
      }
      const r = res.result;
      setResult(r);
      setRunHpDelta((d) => d + r.security_delta);

      const mistakes: ScenarioRunSummary["mistakes"] = r.is_safe
        ? []
        : [
            {
              attackType: attackTypeForScenario(data),
              explanation: r.teach_body,
              recommended: r.hint ? `${t("sim.hint")}: ${r.hint}` : t("sim.feedback"),
            },
          ];

      const moduleComplete = curStep >= totalSteps;

      applyScenarioResult({
        scenarioId: id,
        scenarioTitle: data.title,
        correct: r.is_safe ? 1 : 0,
        wrong: r.is_safe ? 0 : 1,
        hpDelta: r.security_delta,
        xpGained: r.xp_delta,
        mistakes,
        simulationStep: curStep,
        totalSimulationSteps: totalSteps,
        moduleComplete,
        historyStepLabel: data.narrative_arc ?? undefined,
        primaryAttackType: data.attack_family,
      });
    } finally {
      setSubmitting(false);
    }
  }

  function onAnotherRound() {
    if (!id) return;
    restartScenario(id);
    setResult(null);
    setRunHpDelta(0);
    setUiStep(1);
  }

  function onContinueLevel() {
    setResult(null);
    setRunHpDelta(0);
    if (!id || !userState) return;
    const p = userState.progress[id];
    if (p && !p.completed) {
      setUiStep(Math.min(Math.max(1, p.currentStep ?? 1), MODULE_TOTAL_STEPS));
    }
  }

  if (!id || !isPlayableSimulationId(id) || !userState) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-stone-500">{t("common.loading")}</div>
    );
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-stone-500">{t("common.loading")}</div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="rounded-2xl border border-red-200/80 bg-red-50/90 p-6 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
          <p>{t("sim.loadError")}</p>
          <p className="mt-2 font-mono text-xs opacity-80">{loadError}</p>
          <button type="button" onClick={() => void load()} className="btn-primary mt-4 !text-xs">
            {t("sim.retry")}
          </button>
        </div>
      </div>
    );
  }

  const badges = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;
  const p = userState.progress[id];
  const stepDone = p?.completed ? totalSteps : Math.max(0, (p?.currentStep ?? 1) - 1);
  const answeredStep = result ? (data.step ?? uiStep) : null;
  const showNextLevel =
    !!result && !p?.completed && answeredStep !== null && answeredStep < totalSteps;

  const badgeLabel =
    data.type === "email"
      ? t("sim.badgeEmail")
      : data.type === "wifi"
        ? t("sim.badgeWifi")
        : data.type === "terminal"
          ? t("sim.badgeTerminal")
          : data.type === "action_cards"
            ? t("sim.badgeAction")
            : t("sim.badgeChat");

  return (
    <div className="relative pb-24 motion-safe:animate-fade-in-up">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="kicker">{t("sim.kicker")}</p>
            <h1 className="font-display text-2xl font-semibold text-stone-900 dark:text-stone-100 md:text-3xl">
              {data.title}
            </h1>
            {narrativeLine ? (
              <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-emerald-800 dark:text-emerald-300/90">
                {narrativeLine}
              </p>
            ) : null}
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">
              {t("sim.llmHint")}
            </p>
            <p className="mt-2 font-mono text-xs text-stone-500 dark:text-stone-400">
              {t("sim.levelProgress", { current: String(Math.min(data.step ?? uiStep, totalSteps)), total: String(totalSteps) })}
              {" · "}
              {t("sim.arcDone", { done: String(stepDone), total: String(totalSteps) })}
            </p>
            <span className="mt-3 inline-block rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
              {badgeLabel}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="card-brutal px-5 py-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">{t("sim.hpSession")}</p>
              <div className="progress-track-emerald mt-2 h-2.5 w-44">
                <div className="progress-fill" style={{ width: `${displayHp}%` }} />
              </div>
              <p className="mt-2 font-mono text-xs text-stone-400">
                {displayHp} / 100
              </p>
            </div>
            <button type="button" onClick={() => void load()} disabled={loading} className="btn-ghost !text-xs">
              {t("sim.refresh")}
            </button>
            <Link to="/dashboard" className="btn-ghost inline-flex !no-underline !text-xs">
              {t("sim.exit")}
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          <div className="space-y-4">
            {data.type === "email" ? (
              <article className="card-brutal overflow-hidden p-0">
                <div className="border-b border-stone-200/80 bg-stone-50/80 px-5 py-4 dark:border-stone-700/60 dark:bg-stone-900/40">
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {(data as ApiEmailScenario).sender_display}{" "}
                    <span className="font-mono text-stone-600 dark:text-stone-300">
                      &lt;{(data as ApiEmailScenario).sender_email}&gt;
                    </span>
                  </p>
                  <p className="mt-1 font-display text-lg font-semibold text-stone-900 dark:text-stone-100">
                    {(data as ApiEmailScenario).subject}
                  </p>
                  <p className="mt-1 text-xs text-stone-400">{(data as ApiEmailScenario).preview}</p>
                </div>
                <div className="space-y-3 px-5 py-5 text-sm leading-relaxed text-stone-800 dark:text-stone-200">
                  {(data as ApiEmailScenario).body_paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                  <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/40 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                    <p className="text-xs font-medium text-emerald-900 dark:text-emerald-200">
                      {(data as ApiEmailScenario).cta_label}
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-emerald-800/90 dark:text-emerald-300/90">
                      {(data as ApiEmailScenario).cta_href_display}
                    </p>
                  </div>
                </div>
              </article>
            ) : data.type === "wifi" ? (
              <article className="card-brutal p-5">
                <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                  {(data as ApiWifiScenario).context}
                </p>
                <div className="mt-5 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
                    {t("sim.wifiNetworks")}
                  </p>
                  <ul className="space-y-2">
                    {(data as ApiWifiScenario).networks.map((n, i) => (
                      <li
                        key={i}
                        className="flex items-start justify-between gap-3 rounded-2xl border border-stone-200/80 bg-stone-50/80 px-4 py-3 dark:border-stone-700/60 dark:bg-stone-900/40"
                      >
                        <div>
                          <p className="font-mono text-sm font-semibold text-stone-900 dark:text-stone-100">{n.ssid}</p>
                          {n.note ? (
                            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{n.note}</p>
                          ) : null}
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            n.secured
                              ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                              : "bg-amber-500/15 text-amber-900 dark:text-amber-200"
                          }`}
                        >
                          {n.secured ? t("sim.wifiSecured") : t("sim.wifiOpen")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ) : data.type === "terminal" ? (
              <article className="card-brutal p-5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
                  {(data as ApiTerminalScenario).device_label}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                  {(data as ApiTerminalScenario).context}
                </p>
              </article>
            ) : data.type === "action_cards" ? (
              <article className="card-brutal p-5">
                <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                  {(data as ApiActionCardsScenario).situation}
                </p>
              </article>
            ) : (
              <article className="card-brutal p-5">
                <div className="flex items-center gap-3 border-b border-stone-200/70 pb-4 dark:border-stone-700/50">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 font-display text-sm font-bold text-white shadow-lg">
                    {(data as ApiChatScenario).peer_name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-stone-900 dark:text-stone-100">
                      {(data as ApiChatScenario).peer_name}
                    </p>
                    <p className="font-mono text-xs text-stone-500">@{(data as ApiChatScenario).peer_handle}</p>
                  </div>
                </div>
                <ul className="mt-4 space-y-3">
                  {(data as ApiChatScenario).messages.map((m, i) => (
                    <li
                      key={i}
                      className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[92%] rounded-2xl px-4 py-2.5 text-sm ${
                          m.from === "me"
                            ? "bg-emerald-600 text-white shadow-md"
                            : "bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100"
                        }`}
                      >
                        <p>{m.text}</p>
                        <p className="mt-1 text-[10px] opacity-70">{m.time}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            )}
          </div>

          <div>
            <section className="card-brutal p-6">
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">{t("sim.yourMove")}</h2>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{t("sim.pick")}</p>

              {data.type === "action_cards" ? (
                <ul className="mt-5 grid gap-3 sm:grid-cols-2" role="listbox">
                  {(data as ApiActionCardsScenario).cards.map((card, idx) => (
                    <li key={card.id}>
                      <button
                        type="button"
                        disabled={submitting || !!result}
                        onClick={() => void onPick(card.id)}
                        className="flex min-h-[7rem] w-full flex-col rounded-2xl border border-stone-200/90 bg-white/90 p-4 text-left shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400/80 disabled:pointer-events-none disabled:opacity-45 dark:border-stone-700/70 dark:bg-stone-900/50 dark:hover:border-emerald-600/50"
                      >
                        <span className="font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          {badges[idx] ?? idx + 1}
                        </span>
                        <span className="mt-2 text-sm font-semibold text-stone-900 dark:text-stone-100">{card.title}</span>
                        {card.detail ? (
                          <span className="mt-1 text-xs text-stone-500 dark:text-stone-400">{card.detail}</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="mt-5 space-y-2" role="listbox">
                  {data.choices.map((c, idx) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        disabled={submitting || !!result}
                        onClick={() => void onPick(c.id)}
                        className="group flex min-h-[3.25rem] w-full items-stretch overflow-hidden rounded-2xl border border-stone-200/90 bg-white/90 text-left shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300/80 disabled:pointer-events-none disabled:opacity-45 dark:border-stone-700/70 dark:bg-stone-900/40 dark:hover:border-emerald-700/50"
                      >
                        <span className="flex w-11 shrink-0 items-center justify-center border-r border-stone-200/80 bg-stone-50/80 font-mono text-xs font-semibold text-stone-500 dark:border-stone-600/80 dark:bg-stone-800/40 dark:text-stone-400">
                          {badges[idx] ?? idx + 1}
                        </span>
                        <span className="flex flex-1 items-center p-4 text-sm font-medium leading-snug text-stone-900 dark:text-stone-100">
                          {c.label}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {submitting && (
                <p className="mt-4 text-xs text-stone-500">{t("sim.submitting")}</p>
              )}
            </section>

            {result && (
              <div className="mt-6 space-y-4 motion-safe:animate-pop-in">
                <div
                  className={`rounded-2xl border p-5 ${
                    result.is_safe
                      ? "border-emerald-200/90 bg-emerald-50/80 dark:border-emerald-800/50 dark:bg-emerald-950/30"
                      : "border-amber-200/90 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/25"
                  }`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">{t("sim.feedback")}</p>
                  <p className="mt-2 font-display text-base font-semibold text-stone-900 dark:text-stone-100">
                    {result.teach_title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    {result.teach_body}
                  </p>
                  {!result.is_safe && result.hint ? (
                    <p className="mt-3 rounded-xl border border-amber-200/60 bg-amber-50/50 px-3 py-2 text-xs text-amber-950 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-100">
                      <span className="font-semibold">{t("sim.hint")}:</span> {result.hint}
                    </p>
                  ) : null}
                  <p className="mt-3 font-mono text-xs text-stone-500">
                    HP {result.security_delta >= 0 ? "+" : ""}
                    {result.security_delta} · XP {result.xp_delta >= 0 ? "+" : ""}
                    {result.xp_delta}
                  </p>
                </div>

                {result.show_consequences && result.consequence_steps.length > 0 && (
                  <div className="rounded-2xl border border-stone-200/80 bg-white/60 p-5 dark:border-stone-700/60 dark:bg-stone-900/40">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
                      {t("sim.consequences")}
                    </p>
                    <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-stone-800 dark:text-stone-200">
                      {result.consequence_steps.map((st, i) => (
                        <li key={i}>
                          <span className="font-medium">{st.title}</span> — {st.detail}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {showNextLevel ? (
                    <button type="button" onClick={() => onContinueLevel()} className="btn-primary !text-xs">
                      {t("sim.nextLevel")}
                    </button>
                  ) : (
                    <button type="button" onClick={() => onAnotherRound()} className="btn-primary !text-xs">
                      {t("sim.nextRound")}
                    </button>
                  )}
                  <Link to="/dashboard" className="btn-ghost inline-flex !no-underline !text-xs">
                    {t("sim.continueDash")}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
