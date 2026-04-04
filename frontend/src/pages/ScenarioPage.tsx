import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { ScenarioChoice } from "@/types";
import { useApp } from "@/context/AppContext";
import { getScenarioById } from "@/lib/scenarios";
import { ScenarioStage } from "@/components/ScenarioStage";
import { HackOverlay } from "@/components/HackOverlay";
import { ActionChoiceCards, ChoiceFeedbackPanel } from "@/components/ActionChoiceModule";
import { validateChoice } from "@/lib/actionChoice";
import type { ScenarioRunSummary } from "@/context/AppContext";

const HP_OK = 6;
const HP_BAD = -8;
const XP_OK = 15;
const XP_BAD = 5;

export function ScenarioPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { userState, scenarioStatus, setProgress, applyScenarioResult } = useApp();
  const scenario = id ? getScenarioById(id) : undefined;

  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<"pick" | "feedback" | "hack">("pick");
  const [lastChoice, setLastChoice] = useState<ScenarioChoice | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [hack, setHack] = useState(false);
  const [runHpDelta, setRunHpDelta] = useState(0);
  const [stats, setStats] = useState({ correct: 0, wrong: 0, xp: 0 });
  const [mistakes, setMistakes] = useState<ScenarioRunSummary["mistakes"]>([]);
  const syncedInit = useRef(false);

  const status = id ? scenarioStatus(id) : "locked";
  const step = scenario?.steps[stepIndex];
  const total = scenario?.steps.length ?? 0;

  const displayHp = useMemo(() => {
    const base = userState?.hp ?? 0;
    return Math.max(0, Math.min(100, base + runHpDelta));
  }, [userState?.hp, runHpDelta]);

  useEffect(() => {
    syncedInit.current = false;
    setStepIndex(0);
    setPhase("pick");
    setLastChoice(null);
    setShowHint(false);
    setHack(false);
    setRunHpDelta(0);
    setStats({ correct: 0, wrong: 0, xp: 0 });
    setMistakes([]);
  }, [id]);

  useEffect(() => {
    if (!scenario || !userState || !id || syncedInit.current) return;
    syncedInit.current = true;
    if (userState.scenariosCompleted.includes(id)) {
      return;
    }
    const saved = userState.progress[id]?.currentStep;
    if (saved != null && saved >= 0 && saved < scenario.steps.length) {
      setStepIndex(saved);
    }
  }, [scenario, userState, id]);

  useEffect(() => {
    if (status === "locked" || !scenario) {
      nav("/dashboard", { replace: true });
    }
  }, [status, scenario, nav]);

  const correctChoice = useMemo(() => step?.choices.find((c) => c.correct), [step]);

  const onHackDone = useCallback(() => {
    setHack(false);
    setPhase("feedback");
  }, []);

  function pickChoice(c: ScenarioChoice) {
    if (phase !== "pick" || !step || !scenario) return;
    setLastChoice(c);
    setShowHint(false);
    if (validateChoice(c) === "correct") {
      setRunHpDelta((d) => d + HP_OK);
      setStats((s) => ({ ...s, correct: s.correct + 1, xp: s.xp + XP_OK }));
      setPhase("feedback");
    } else {
      setRunHpDelta((d) => d + HP_BAD);
      setStats((s) => ({ ...s, wrong: s.wrong + 1, xp: s.xp + XP_BAD }));
      const rec = step.choices.find((x) => x.correct)?.text || "Следуйте политике безопасности.";
      setMistakes((m) => [
        ...m,
        {
          attackType: c.attackType || "—",
          explanation: c.unsafeExplanation,
          recommended: rec,
        },
      ]);
      setHack(true);
      setPhase("hack");
    }
  }

  function finishScenario(
    currentStats: { correct: number; wrong: number; xp: number },
    currentMistakes: ScenarioRunSummary["mistakes"]
  ) {
    if (!scenario || !id) return;
    const hpDelta = currentStats.correct * HP_OK + currentStats.wrong * HP_BAD;
    applyScenarioResult({
      scenarioId: id,
      scenarioTitle: scenario.title,
      correct: currentStats.correct,
      wrong: currentStats.wrong,
      hpDelta,
      xpGained: currentStats.xp,
      mistakes: currentMistakes,
    });
    nav(`/results/${id}`, {
      replace: true,
      state: {
        correct: currentStats.correct,
        wrong: currentStats.wrong,
        hpDelta,
        xpGained: currentStats.xp,
        mistakes: currentMistakes,
        title: scenario.title,
      },
    });
  }

  function onContinueClick() {
    if (!scenario || !id) return;
    const isLast = stepIndex + 1 >= total;
    if (isLast) {
      finishScenario(stats, mistakes);
      return;
    }
    const next = stepIndex + 1;
    setProgress(id, { currentStep: next, completed: false });
    setStepIndex(next);
    setPhase("pick");
    setLastChoice(null);
    setShowHint(false);
  }

  if (!scenario || !step || !userState) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center font-medium text-stone-500">Сценарий не найден.</div>
    );
  }

  return (
    <div className="relative pb-24 motion-safe:animate-fade-in-up">
      <HackOverlay active={hack} onDone={onHackDone} />

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="kicker">Симулятор</p>
            <h1 className="font-display text-2xl font-semibold text-stone-900 dark:text-stone-100 md:text-3xl">
              {scenario.title}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">
              Шаг {stepIndex + 1} из {total}. После каждого выбора — разбор.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="card-brutal px-5 py-4 motion-safe:animate-pop-in-fast">
              <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">HP сессии</p>
              <div className="progress-track-emerald mt-2 h-2.5 w-44">
                <div className="progress-fill" style={{ width: `${displayHp}%` }} />
              </div>
              <p className="mt-2 font-mono text-xs text-stone-400">{displayHp} / 100</p>
            </div>
            <Link
              to="/dashboard"
              className="btn-ghost inline-flex items-center justify-center !no-underline visited:text-stone-900 dark:visited:text-stone-200"
              onClick={() => id && setProgress(id, { currentStep: stepIndex, completed: false })}
            >
              Выйти
            </Link>
          </div>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          <div className="space-y-5">
            <ScenarioStage key={step.id} step={step} />
            <article className="rounded-3xl border border-stone-200/70 bg-gradient-to-br from-white/80 to-emerald-50/25 p-6 text-sm leading-relaxed text-stone-800 shadow-soft backdrop-blur-sm transition-all duration-500 hover:border-emerald-200/50 hover:shadow-soft-md dark:border-stone-700/50 dark:from-stone-900/50 dark:to-emerald-950/20 dark:text-stone-200 dark:hover:border-emerald-800/40">
              {step.narrative}
            </article>
          </div>

          <div>
            {phase === "hack" && (
              <div className="motion-safe:animate-slide-in-right rounded-2xl border border-red-200/80 bg-red-50/90 p-6 text-sm font-medium text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
                <p className="text-[10px] font-medium uppercase tracking-wider text-red-800/80 dark:text-red-300">
                  Инцидент
                </p>
                <p className="mt-2">Фиксируем последствия…</p>
              </div>
            )}

            {phase === "pick" && (
              <ActionChoiceCards
                choices={step.choices}
                onSelect={pickChoice}
                debugContext={`${scenario.id}/${step.id}`}
              />
            )}

            {phase === "feedback" && lastChoice && (
              <div key={`${step.id}-${lastChoice.id}`}>
                <ChoiceFeedbackPanel
                  lastChoice={lastChoice}
                  correctChoiceText={correctChoice?.text}
                  showHint={showHint}
                  onToggleHint={() => setShowHint(true)}
                  onContinue={onContinueClick}
                  continueLabel={stepIndex + 1 >= total ? "К результатам" : "Дальше"}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
