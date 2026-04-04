import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/i18n/I18nContext";
import { FakeBrowserFrame } from "@/components/FakeBrowserFrame";
import { FakeMessengerFrame } from "@/components/FakeMessengerFrame";
import { VishingVoiceCall } from "@/components/VishingVoiceCall";
import { IntrusionTheater } from "@/components/IntrusionTheater";
import { JuryDeliberationCard } from "@/components/JuryDeliberationCard";
import {
  fetchSimulationScenario,
  submitSimulationChoice,
  type ApiActionCardsScenario,
  type ApiChatScenario,
  type ApiEmailScenario,
  type ApiScenarioUnion,
  type ApiTerminalScenario,
  type ApiWifiScenario,
  type JuryDeliberationPayload,
} from "@/lib/simulationClient";
import {
  type BreachDrillOutcome,
  extractUrlFromTexts,
  inferIntrusionPageKindFromScenario,
  truncateUi,
} from "@/lib/breachFromEmail";
import { isCustomSimulationId, isPlayableSimulationId, MODULE_TOTAL_STEPS } from "@/lib/courseScenarios";
import type { ScenarioRunSummary } from "@/context/AppContext";

type SimChoiceResult = NonNullable<Awaited<ReturnType<typeof submitSimulationChoice>>["result"]>;

/** После /breach страница монтируется заново: без этого снова приходит «старый» ответ API (без refresh). */
const SCENARIO_SS_PREFIX = "cipherline_sim_scenario_v1:";
const SCENARIO_SS_TTL_MS = 1000 * 60 * 60 * 12;

type ScenarioSessionBlob = { at: number; scenario: ApiScenarioUnion };

function scenarioSessionKey(scenarioId: string, step: number, lang: string): string {
  return `${SCENARIO_SS_PREFIX}${scenarioId}|${step}|${lang}`;
}

function readScenarioSession(scenarioId: string, step: number, lang: string): ApiScenarioUnion | null {
  try {
    const raw = sessionStorage.getItem(scenarioSessionKey(scenarioId, step, lang));
    if (!raw) return null;
    const blob = JSON.parse(raw) as ScenarioSessionBlob;
    if (!blob?.scenario || typeof blob.scenario !== "object" || !("type" in blob.scenario)) return null;
    if (Date.now() - blob.at > SCENARIO_SS_TTL_MS) {
      sessionStorage.removeItem(scenarioSessionKey(scenarioId, step, lang));
      return null;
    }
    return blob.scenario;
  } catch {
    return null;
  }
}

function writeScenarioSession(scenarioId: string, step: number, lang: string, scenario: ApiScenarioUnion): void {
  try {
    const blob: ScenarioSessionBlob = { at: Date.now(), scenario };
    sessionStorage.setItem(scenarioSessionKey(scenarioId, step, lang), JSON.stringify(blob));
  } catch {
    /* quota */
  }
}

function clearScenarioSessionStorageFor(scenarioId: string): void {
  try {
    for (let step = 1; step <= MODULE_TOTAL_STEPS; step++) {
      for (const lng of ["ru", "en"] as const) {
        sessionStorage.removeItem(scenarioSessionKey(scenarioId, step, lng));
      }
    }
  } catch {
    /* ignore */
  }
}

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
  const location = useLocation();
  const { locale, t } = useI18n();
  const { userState, user, scenarioStatus, applyScenarioResult, restartScenario } = useApp();

  const [data, setData] = useState<ApiScenarioUnion | null>(null);
  const [vishingHighlight, setVishingHighlight] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<NonNullable<Awaited<ReturnType<typeof submitSimulationChoice>>["result"]> | null>(
    null,
  );
  const [runHpDelta, setRunHpDelta] = useState(0);
  const [uiStep, setUiStep] = useState(1);
  const [theaterActive, setTheaterActive] = useState(false);
  const [jury, setJury] = useState<JuryDeliberationPayload | null>(null);
  const pendingUnsafeRef = useRef<{
    r: SimChoiceResult;
    curStep: number;
    totalSteps: number;
    jury: JuryDeliberationPayload | null;
  } | null>(null);
  const linkBreachUnsafeRef = useRef(false);
  const [linkBreachReminder, setLinkBreachReminder] = useState(false);
  const [emailPane, setEmailPane] = useState<"inbox" | "link">("inbox");
  /** Не класть token в deps load(): при silent refresh токена сценарий перезапрашивался бы снова (LLM шаг 1 = новое письмо). */
  const authTokenRef = useRef<string | undefined>(undefined);
  authTokenRef.current = user?.token;

  const status = id && isPlayableSimulationId(id) ? scenarioStatus(id) : "locked";
  const lang = locale;

  const progStep = id ? userState?.progress[id]?.currentStep : undefined;
  const progDone = id ? userState?.progress[id]?.completed === true : false;
  const stepCap = useMemo(() => (id && isCustomSimulationId(id) ? 1 : MODULE_TOTAL_STEPS), [id]);

  /** Только прогресс по модулю — не вешаться на весь userState (HP/XP/history иначе дают лишние проходы эффектов). */
  useEffect(() => {
    if (!id || result) return;
    if (progDone) {
      setUiStep(stepCap);
      return;
    }
    const next = Math.min(Math.max(1, progStep ?? 1), stepCap);
    setUiStep(next);
  }, [id, progStep, progDone, result, stepCap]);

  const scenarioCacheKeyRef = useRef<string | null>(null);
  const scenarioLoadGenRef = useRef(0);

  const load = useCallback(
    async (force = false, stepOverride?: number) => {
      if (!id || !isPlayableSimulationId(id)) return;
      const stepToFetch = stepOverride ?? uiStep;
      const cacheKey = `${id}|${stepToFetch}|${lang}`;
      if (!force && scenarioCacheKeyRef.current === cacheKey) {
        return;
      }

      if (!force) {
        const fromSs = readScenarioSession(id, stepToFetch, lang);
        if (fromSs) {
          ++scenarioLoadGenRef.current;
          setData(fromSs);
          scenarioCacheKeyRef.current = cacheKey;
          setLoadError(null);
          setLoading(false);
          return;
        }
      }

      const gen = ++scenarioLoadGenRef.current;
      setLoading(true);
      setLoadError(null);
      setResult(null);
      setJury(null);
      setRunHpDelta(0);
      setTheaterActive(false);
      pendingUnsafeRef.current = null;
      try {
        const r = await fetchSimulationScenario(id, lang, stepToFetch, authTokenRef.current, force);
        if (gen !== scenarioLoadGenRef.current) return;
        setData(r.scenario);
        scenarioCacheKeyRef.current = cacheKey;
        writeScenarioSession(id, stepToFetch, lang, r.scenario);
      } catch (e) {
        if (gen !== scenarioLoadGenRef.current) return;
        setLoadError(e instanceof Error ? e.message : "error");
        setData(null);
        scenarioCacheKeyRef.current = null;
      } finally {
        if (gen === scenarioLoadGenRef.current) {
          setLoading(false);
        }
      }
    },
    [id, lang, uiStep],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setEmailPane("inbox");
  }, [id, uiStep, data?.title, data?.type]);

  useEffect(() => {
    setVishingHighlight(null);
  }, [id, data]);

  useEffect(() => {
    if (!id || !isPlayableSimulationId(id) || status === "locked") {
      nav("/dashboard", { replace: true });
    }
  }, [id, status, nav]);

  useEffect(() => {
    const st = location.state as { breachDrillOutcome?: BreachDrillOutcome } | null;
    const o = st?.breachDrillOutcome;
    if (o === "unsafe") {
      linkBreachUnsafeRef.current = true;
      setLinkBreachReminder(true);
    }
    if (o !== undefined && o !== null) {
      nav(`${location.pathname}${location.search}`, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, location.search, nav]);

  const commitChoiceResult = useCallback(
    (
      r: SimChoiceResult,
      curStep: number,
      totalStepsArg: number,
      scenarioData: ApiScenarioUnion,
      juryPayload: JuryDeliberationPayload | null,
    ) => {
      if (!id) return;
      setResult(r);
      setJury(juryPayload);
      setRunHpDelta((d) => d + r.security_delta);

      const mistakes: ScenarioRunSummary["mistakes"] = r.is_safe
        ? []
        : [
            {
              attackType: attackTypeForScenario(scenarioData),
              explanation: r.teach_body,
              recommended: r.hint ? `${t("sim.hint")}: ${r.hint}` : t("sim.feedback"),
            },
          ];

      const moduleComplete = curStep >= totalStepsArg;
      const bonus = juryPayload?.bonus_xp && juryPayload.bonus_xp > 0 ? juryPayload.bonus_xp : 0;

      applyScenarioResult({
        scenarioId: id,
        scenarioTitle: scenarioData.title,
        correct: r.is_safe ? 1 : 0,
        wrong: r.is_safe ? 0 : 1,
        hpDelta: r.security_delta,
        xpGained: r.xp_delta + bonus,
        mistakes,
        simulationStep: curStep,
        totalSimulationSteps: totalStepsArg,
        moduleComplete,
        historyStepLabel: scenarioData.narrative_arc ?? undefined,
        primaryAttackType: scenarioData.attack_family,
      });
    },
    [id, t, applyScenarioResult],
  );

  const onTheaterComplete = useCallback(() => {
    setTheaterActive(false);
    const p = pendingUnsafeRef.current;
    pendingUnsafeRef.current = null;
    if (p && data) {
      commitChoiceResult(p.r, p.curStep, p.totalSteps, data, p.jury);
    }
  }, [data, commitChoiceResult]);

  const displayHp = useMemo(() => {
    const base = userState?.hp ?? 0;
    return Math.max(0, Math.min(100, base + runHpDelta));
  }, [userState?.hp, runHpDelta]);

  const intrusionPageKind = useMemo(
    () => (data ? inferIntrusionPageKindFromScenario(data) : "generic"),
    [data],
  );

  const totalSteps = data?.total_steps ?? MODULE_TOTAL_STEPS;
  const narrativeLine = data?.narrative_arc;

  async function onPick(choiceId: string) {
    if (!id || !data || submitting || result || theaterActive) return;
    setSubmitting(true);
    try {
      const curStep = data.step ?? uiStep;
      const res = await submitSimulationChoice(id, choiceId, lang, curStep, user?.token);
      if (!res.ok || !res.result) {
        setLoadError(res.error ?? "submit failed");
        return;
      }
      let r = res.result;
      const juryPayload = res.jury ?? null;
      const ts = totalSteps;
      const hadLinkBreachMistake = linkBreachUnsafeRef.current;

      if (hadLinkBreachMistake) {
        linkBreachUnsafeRef.current = false;
        setLinkBreachReminder(false);
        const keepApiFeedback = !r.is_safe;
        r = {
          ...r,
          is_safe: false,
          security_delta: Math.min(r.security_delta, -12),
          xp_delta: Math.min(r.xp_delta, 0),
          teach_title: keepApiFeedback ? r.teach_title : t("sim.breachLinkedFailTitle"),
          teach_body: keepApiFeedback ? r.teach_body : t("sim.breachLinkedFailBody"),
          hint: keepApiFeedback ? r.hint : null,
        };
        commitChoiceResult(r, curStep, ts, data, juryPayload);
      } else if (!r.is_safe) {
        pendingUnsafeRef.current = { r, curStep, totalSteps: ts, jury: juryPayload };
        setTheaterActive(true);
      } else {
        commitChoiceResult(r, curStep, ts, data, juryPayload);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function onAnotherRound() {
    if (!id) return;
    restartScenario(id);
    clearScenarioSessionStorageFor(id);
    setResult(null);
    setJury(null);
    setRunHpDelta(0);
    setUiStep(1);
    setTheaterActive(false);
    pendingUnsafeRef.current = null;
    linkBreachUnsafeRef.current = false;
    setLinkBreachReminder(false);
    scenarioCacheKeyRef.current = null;
    void load(true, 1);
  }

  function onContinueLevel() {
    setResult(null);
    setJury(null);
    setRunHpDelta(0);
    setTheaterActive(false);
    pendingUnsafeRef.current = null;
    linkBreachUnsafeRef.current = false;
    setLinkBreachReminder(false);
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
          <button type="button" onClick={() => void load(true)} className="btn-primary mt-4 !text-xs">
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

  const chatForBadge = data.type === "chat" ? (data as ApiChatScenario) : null;
  const badgeLabel =
    data.type === "email"
      ? t("sim.badgeEmail")
      : data.type === "wifi"
        ? t("sim.badgeWifi")
        : data.type === "terminal"
          ? t("sim.badgeTerminal")
          : data.type === "action_cards"
            ? t("sim.badgeAction")
            : chatForBadge?.voice_call
              ? t("sim.badgeVoice")
              : t("sim.badgeChat");

  const emailData = data.type === "email" ? (data as ApiEmailScenario) : null;
  const emailInboxUrl = "mail.cipherline.training/inbox";
  const emailLinkUrl = emailData
    ? (emailData.cta_href_display || "suspicious.example/verify").replace(/^https?:\/\//i, "")
    : "";
  const emailBrowserUrl = emailData ? (emailPane === "inbox" ? emailInboxUrl : emailLinkUrl) : "";
  const emailTabLabel = emailData ? (emailPane === "inbox" ? emailData.subject : t("sim.emailTabLink")) : "";

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
            {data.dynamic_difficulty != null ? (
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-violet-700/90 dark:text-violet-300/85">
                {t(
                  (
                    [
                      "sim.adaptiveNotice0",
                      "sim.adaptiveNotice1",
                      "sim.adaptiveNotice2",
                      "sim.adaptiveNotice3",
                    ] as const
                  )[Math.min(3, Math.max(0, Math.floor(Number(data.dynamic_difficulty.tier) || 0)))],
                )}
              </p>
            ) : null}
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
            <button type="button" onClick={() => void load(true)} disabled={loading} className="btn-ghost !text-xs">
              {t("sim.refresh")}
            </button>
            <Link to="/dashboard" className="btn-ghost inline-flex !no-underline !text-xs">
              {t("sim.exit")}
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          <div className="space-y-4">
            {emailData ? (
              <FakeBrowserFrame url={emailBrowserUrl} tabLabel={emailTabLabel}>
                <div className="flex flex-wrap gap-2 border-b border-stone-200/80 bg-stone-50/90 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900/80">
                  <button
                    type="button"
                    disabled={submitting || !!result || theaterActive}
                    onClick={() => setEmailPane("inbox")}
                    className={`rounded-lg px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                      emailPane === "inbox"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-stone-200/80 text-stone-600 hover:bg-stone-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {t("sim.emailTabInbox")}
                  </button>
                  <button
                    type="button"
                    disabled={submitting || !!result || theaterActive}
                    onClick={() => setEmailPane("link")}
                    className={`rounded-lg px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                      emailPane === "link"
                        ? "bg-amber-600 text-white shadow-sm"
                        : "bg-stone-200/80 text-stone-600 hover:bg-stone-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {t("sim.emailTabLink")}
                  </button>
                </div>
                <p className="border-b border-stone-200/60 px-3 py-2 text-[10px] leading-snug text-stone-500 dark:border-zinc-800 dark:text-zinc-500">
                  {t("sim.emailExploreHint")}
                </p>
                <article className="px-5 pb-6 pt-4">
                  <div className="border-b border-stone-200/80 pb-4 dark:border-stone-700/60">
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {emailData.sender_display}{" "}
                      <span className="font-mono text-stone-600 dark:text-stone-300">&lt;{emailData.sender_email}&gt;</span>
                    </p>
                    <p className="mt-1 font-display text-lg font-semibold text-stone-900 dark:text-stone-100">{emailData.subject}</p>
                    <p className="mt-1 text-xs text-stone-400">{emailData.preview}</p>
                  </div>
                  <div className="space-y-3 pt-4 text-sm leading-relaxed text-stone-800 dark:text-stone-200">
                    {emailData.body_paragraphs.map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                    <div
                      className={`rounded-xl border p-0 transition-colors ${
                        emailPane === "link"
                          ? "border-amber-400/70 bg-amber-50/50 dark:border-amber-700/50 dark:bg-amber-950/25"
                          : "border-emerald-200/60 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                      }`}
                    >
                      <button
                        type="button"
                        disabled={submitting || theaterActive}
                        onClick={() =>
                          nav(`/sim/run/${id}/breach`, {
                            state: {
                              targetUrl: emailData.cta_href_display,
                              scenarioTitle: data.title,
                              breachContext: {
                                source: "email" as const,
                                subject: emailData.subject,
                                preview: [emailData.preview, ...emailData.body_paragraphs].join("\n").slice(0, 1200),
                                ctaLabel: emailData.cta_label,
                              },
                            },
                          })
                        }
                        className="w-full rounded-xl p-4 text-left transition hover:bg-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:pointer-events-none disabled:opacity-45 dark:hover:bg-white/5"
                      >
                        <p className="text-xs font-medium text-emerald-900 dark:text-emerald-200">{emailData.cta_label}</p>
                        <p className="mt-1 break-all font-mono text-xs text-emerald-800 underline decoration-emerald-600/50 underline-offset-2 dark:text-emerald-300/90">
                          {emailData.cta_href_display}
                        </p>
                        <p className="mt-2 font-mono text-[10px] leading-snug text-emerald-800/80 dark:text-emerald-400/80">
                          {t("sim.ctaLaunchDemo")}
                        </p>
                      </button>
                    </div>
                  </div>
                </article>
              </FakeBrowserFrame>
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
              <FakeMessengerFrame peerName={(data as ApiChatScenario).peer_name} peerHandle={(data as ApiChatScenario).peer_handle}>
                {(data as ApiChatScenario).voice_call ? (
                  <VishingVoiceCall
                    voiceCall={(data as ApiChatScenario).voice_call!}
                    messages={(data as ApiChatScenario).messages}
                    disabled={submitting || !!result || theaterActive}
                    onHighlightIndex={setVishingHighlight}
                  />
                ) : null}
                <ul className="space-y-3">
                  {(data as ApiChatScenario).messages.map((m, i) => (
                    <li key={i} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[92%] rounded-2xl px-4 py-2.5 text-sm transition-shadow duration-300 ${
                          m.from === "me"
                            ? "bg-emerald-600 text-white shadow-md"
                            : "bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100"
                        } ${
                          (data as ApiChatScenario).voice_call && vishingHighlight === i
                            ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-stone-50 dark:ring-offset-zinc-900"
                            : ""
                        }`}
                      >
                        <p>{m.text}</p>
                        <p className="mt-1 text-[10px] opacity-70">{m.time}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-stone-200/80 bg-stone-50/60 px-4 py-3 dark:border-zinc-700/60 dark:bg-zinc-900/40">
                  <button
                    type="button"
                    disabled={submitting || theaterActive}
                    onClick={() => {
                      const chat = data as ApiChatScenario;
                      const peerLines = chat.messages.filter((m) => m.from === "peer").map((m) => m.text);
                      const extracted = extractUrlFromTexts(peerLines);
                      const targetUrl = extracted ?? "https://training.cipherline.local/chat-verify";
                      const lastPeer = peerLines[peerLines.length - 1] ?? "";
                      const preview = peerLines.join("\n").slice(0, 600);
                      const subject = `${chat.peer_name} — ${truncateUi(lastPeer || data.title, 56)}`;
                      const withoutScheme = targetUrl.replace(/^https?:\/\//i, "");
                      const ctaLabel = extracted ? truncateUi(withoutScheme, 44) : t("breach.chatCtaDefault");
                      nav(`/sim/run/${id}/breach`, {
                        state: {
                          targetUrl,
                          scenarioTitle: data.title,
                          breachContext: {
                            source: "chat" as const,
                            subject,
                            preview,
                            ctaLabel,
                            chatPeerName: chat.peer_name,
                            chatPeerHandle: chat.peer_handle,
                            chatMessages: chat.messages.map((m) => ({
                              from: m.from,
                              text: m.text,
                              time: m.time,
                            })),
                          },
                        },
                      });
                    }}
                    className="w-full rounded-xl border border-stone-300/90 bg-white/90 px-4 py-3 text-left text-sm font-medium text-stone-800 shadow-soft transition hover:border-stone-400 disabled:pointer-events-none disabled:opacity-45 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-stone-100 dark:hover:border-zinc-500"
                  >
                    <span className="font-mono text-[10px] text-stone-500 dark:text-zinc-400">{t("sim.chatBreachKicker")}</span>
                    <span className="mt-1 block">{t("sim.chatBreachCta")}</span>
                  </button>
                  <p className="mt-2 font-mono text-[9px] leading-snug text-stone-500 dark:text-zinc-500">{t("sim.chatBreachHint")}</p>
                </div>
              </FakeMessengerFrame>
            )}
          </div>

          <div>
            <section className="card-brutal p-6">
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">{t("sim.yourMove")}</h2>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{t("sim.pick")}</p>

              {linkBreachReminder && !result ? (
                <p className="mt-3 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-xs leading-relaxed text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/25 dark:text-amber-100/95">
                  {t("sim.breachLinkedBanner")}
                </p>
              ) : null}

              {data.type === "action_cards" ? (
                <ul className="mt-5 grid gap-3 sm:grid-cols-2" role="listbox">
                  {(data as ApiActionCardsScenario).cards.map((card, idx) => (
                    <li key={card.id}>
                      <button
                        type="button"
                        disabled={submitting || !!result || theaterActive}
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
                        disabled={submitting || !!result || theaterActive}
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
                  {(result.cwe_ids?.length || result.owasp_refs?.length) ? (
                    <div className="mt-4 rounded-xl border border-stone-200/80 bg-stone-50/80 px-3 py-2.5 dark:border-stone-700/60 dark:bg-stone-900/50">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                        {t("sim.pedagogyTitle")}
                      </p>
                      {result.cwe_ids && result.cwe_ids.length > 0 ? (
                        <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-stone-700 dark:text-stone-300">
                          <span className="font-semibold text-emerald-800 dark:text-emerald-400">CWE:</span>{" "}
                          {result.cwe_ids.join(" · ")}
                        </p>
                      ) : null}
                      {result.owasp_refs && result.owasp_refs.length > 0 ? (
                        <p className="mt-1.5 text-[11px] leading-relaxed text-stone-700 dark:text-stone-300">
                          <span className="font-semibold text-teal-800 dark:text-teal-400">OWASP / APWG:</span>{" "}
                          {result.owasp_refs.join(" · ")}
                        </p>
                      ) : null}
                      <p className="mt-2 text-[10px] text-stone-500 dark:text-stone-500">{t("sim.pedagogyFootnote")}</p>
                    </div>
                  ) : null}
                  {!result.is_safe && result.hint ? (
                    <p className="mt-3 rounded-xl border border-amber-200/60 bg-amber-50/50 px-3 py-2 text-xs text-amber-950 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-100">
                      <span className="font-semibold">{t("sim.hint")}:</span> {result.hint}
                    </p>
                  ) : null}
                  <p className="mt-3 font-mono text-xs text-stone-500">
                    HP {result.security_delta >= 0 ? "+" : ""}
                    {result.security_delta} · XP {result.xp_delta >= 0 ? "+" : ""}
                    {result.xp_delta}
                    {jury && jury.bonus_xp > 0 ? (
                      <span className="text-violet-700 dark:text-violet-300">
                        {" "}
                        (+{jury.bonus_xp} {t("sim.juryBonusXp")})
                      </span>
                    ) : null}
                  </p>
                </div>

                {jury ? <JuryDeliberationCard jury={jury} /> : null}

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

      <IntrusionTheater
        active={theaterActive}
        scenarioLabel={data.title}
        phishingTargetUrl={data.type === "email" ? (data as ApiEmailScenario).cta_href_display : null}
        pageKind={intrusionPageKind}
        onComplete={onTheaterComplete}
      />
    </div>
  );
}
