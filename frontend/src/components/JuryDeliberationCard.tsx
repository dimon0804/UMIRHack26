import { useI18n } from "@/i18n/I18nContext";
import type { JuryDeliberationPayload } from "@/lib/simulationClient";

type Props = { jury: JuryDeliberationPayload };

export function JuryDeliberationCard({ jury }: Props) {
  const { t } = useI18n();
  const safeLean = jury.verdict_aligns_safe;

  return (
    <div className="rounded-2xl border border-violet-200/80 bg-gradient-to-b from-violet-50/90 to-white/80 p-5 dark:border-violet-900/45 dark:from-violet-950/35 dark:to-stone-900/50">
      <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300/90">
        {t("sim.juryTitle")}
      </p>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{t("sim.jurySubtitle")}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
            {t("sim.juryFor")}
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-stone-800 dark:text-stone-200">
            {jury.for_points.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-rose-200/70 bg-rose-50/40 p-3 dark:border-rose-900/35 dark:bg-rose-950/20">
          <p className="text-[10px] font-bold uppercase tracking-wide text-rose-900 dark:text-rose-300/90">
            {t("sim.juryAgainst")}
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-stone-800 dark:text-stone-200">
            {jury.against_points.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      </div>

      {jury.llm_comment ? (
        <div className="mt-4 rounded-xl border border-stone-200/80 bg-white/70 px-3 py-2.5 dark:border-stone-700/60 dark:bg-stone-900/50">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            {t("sim.juryLlmNote")}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-stone-700 dark:text-stone-300">{jury.llm_comment}</p>
        </div>
      ) : null}

      <div
        className={`mt-4 rounded-xl border p-4 ${
          safeLean
            ? "border-emerald-300/60 bg-emerald-50/60 dark:border-emerald-800/40 dark:bg-emerald-950/25"
            : "border-amber-300/60 bg-amber-50/50 dark:border-amber-900/35 dark:bg-amber-950/20"
        }`}
      >
        <p className="text-[10px] font-bold uppercase tracking-wide text-stone-600 dark:text-stone-400">
          {jury.verdict_title}
        </p>
        <p className="mt-2 text-sm font-medium leading-relaxed text-stone-900 dark:text-stone-100">{jury.verdict_body}</p>
        {jury.bonus_xp > 0 ? (
          <p className="mt-3 font-mono text-xs font-semibold text-violet-800 dark:text-violet-300">
            +{jury.bonus_xp} XP — {t("sim.juryBonusXp")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
