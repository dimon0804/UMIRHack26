import { Link, useLocation, useParams, Navigate } from "react-router-dom";
import type { ScenarioRunSummary } from "@/context/AppContext";
import { isPlayableSimulationId } from "@/lib/courseScenarios";

type ResultsState = {
  correct: number;
  wrong: number;
  hpDelta: number;
  xpGained: number;
  mistakes: ScenarioRunSummary["mistakes"];
  title: string;
};

const statCards = [
  { key: "ok", label: "Верно", accent: "emerald" as const },
  { key: "bad", label: "Ошибки", accent: "red" as const },
  { key: "hp", label: "Δ HP", accent: "hp" as const },
  { key: "xp", label: "Лига XP", accent: "xp" as const },
] as const;

export function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const loc = useLocation();
  const data = loc.state as ResultsState | undefined;

  if (!data || !id) {
    return <Navigate to="/dashboard" replace />;
  }

  const summary = data;

  function cardBody(meta: (typeof statCards)[number], d: ResultsState) {
    if (meta.accent === "emerald") {
      return (
        <>
          <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">{meta.label}</p>
          <p className="mt-1 font-display text-3xl font-semibold text-emerald-700 dark:text-emerald-400">{d.correct}</p>
        </>
      );
    }
    if (meta.accent === "red") {
      return (
        <>
          <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">{meta.label}</p>
          <p className="mt-1 font-display text-3xl font-semibold text-red-700 dark:text-red-400">{d.wrong}</p>
        </>
      );
    }
    if (meta.accent === "hp") {
      return (
        <>
          <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">{meta.label}</p>
          <p
            className={`mt-1 font-display text-3xl font-semibold ${
              d.hpDelta >= 0 ? "text-emerald-800 dark:text-emerald-300" : "text-red-700 dark:text-red-400"
            }`}
          >
            {d.hpDelta > 0 ? `+${d.hpDelta}` : d.hpDelta}
          </p>
        </>
      );
    }
    return (
      <>
        <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-800/70 dark:text-emerald-400/80">
          {meta.label}
        </p>
        <p className="mt-1 bg-gradient-to-br from-emerald-700 to-teal-600 bg-clip-text font-display text-3xl font-semibold text-transparent dark:from-emerald-300 dark:to-teal-300">
          +{d.xpGained}
        </p>
      </>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 motion-safe:animate-fade-in-up md:px-6">
      <p className="kicker">Итог</p>
      <h1 className="font-display text-3xl font-semibold text-ink dark:text-stone-100">{summary.title}</h1>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {statCards.map((meta, idx) => (
          <div
            key={meta.key}
            className={
              meta.accent === "xp"
                ? "card-brutal motion-safe:animate-pop-in-fast border-emerald-200/70 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 p-5 shadow-glow-sm dark:border-emerald-800/50 dark:from-emerald-950/40 dark:to-teal-950/25"
                : "card-brutal motion-safe:animate-pop-in-fast p-5"
            }
            style={{ animationDelay: `${idx * 75}ms` }}
          >
            {cardBody(meta, summary)}
          </div>
        ))}
      </div>

      {summary.mistakes.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-lg font-semibold text-ink dark:text-stone-100">Разбор ошибок</h2>
          <ul className="mt-6 space-y-3">
            {summary.mistakes.map((m, i) => (
              <li
                key={i}
                className="motion-safe:animate-slide-in-right rounded-3xl border border-stone-200/80 bg-white/70 p-5 shadow-soft ring-1 ring-white/50 transition-all duration-300 hover:border-red-200/60 hover:shadow-soft-md dark:border-stone-700/60 dark:bg-stone-900/35 dark:ring-white/5 dark:hover:border-red-900/40"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-red-700 dark:text-red-400">
                  {m.attackType}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink dark:text-stone-200">{m.explanation}</p>
                <p className="mt-3 text-xs text-stone-500">
                  Как надо: <span className="font-medium text-ink dark:text-stone-100">{m.recommended}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-12 flex flex-col gap-3 motion-safe:animate-fade-in-up sm:flex-row sm:flex-wrap [animation-delay:320ms]">
        <Link to="/dashboard" className="btn-primary flex-1 text-center !no-underline">
          На главную
        </Link>
        <Link to="/dashboard" className="btn-ghost flex-1 text-center !no-underline">
          Другой сценарий
        </Link>
        <Link
          to={isPlayableSimulationId(id) ? `/sim/run/${id}` : "/dashboard"}
          className="btn-ghost flex-1 text-center !no-underline"
        >
          Повторить
        </Link>
      </div>
    </div>
  );
}
