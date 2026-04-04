import type { ScenarioChoice } from "@/types";
import { assertActionChoiceCount } from "@/lib/actionChoice";

const BADGE = ["A", "B", "C", "D", "E", "F"] as const;

type ActionChoiceCardsProps = {
  /** Варианты действий (обычно 3–4 шт.) */
  choices: ScenarioChoice[];
  /** После клика; в родителе вызывайте `validateChoice` из `@/lib/actionChoice` для ветвления верно/неверно */
  onSelect: (choice: ScenarioChoice) => void;
  disabled?: boolean;
  /** Для подсказки в консоли (DEV), если число вариантов не в рекомендуемом диапазоне */
  debugContext?: string;
};

/**
 * Модуль «Выбор действия»: интерактивные карточки с 3–4 вариантами.
 * Валидация выбора выполняется при клике (верный / неверный шаг сценария).
 */
export function ActionChoiceCards({ choices, onSelect, disabled, debugContext }: ActionChoiceCardsProps) {
  if (import.meta.env.DEV) {
    assertActionChoiceCount(choices, debugContext);
  }

  return (
    <section className="space-y-4" aria-label="Выбор действия">
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-stone-400 dark:text-stone-500">Действия</p>
      <ul className="space-y-2" role="listbox" aria-label="Варианты ответа">
        {choices.map((c, idx) => (
          <li
            key={c.id}
            className="motion-safe:animate-fade-in-up"
            style={{ animationDelay: `${80 + idx * 70}ms` }}
            role="presentation"
          >
            <button
              type="button"
              role="option"
              aria-selected={false}
              disabled={disabled}
              onClick={() => onSelect(c)}
              className="group relative flex min-h-[3.25rem] w-full items-stretch overflow-hidden rounded-2xl border border-stone-200/90 bg-white/90 text-left shadow-soft transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:border-emerald-300/80 hover:bg-emerald-50/50 hover:shadow-[0_10px_32px_-12px_rgb(16_185_129_/_0.22)] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 dark:border-stone-700/70 dark:bg-stone-900/40 dark:hover:border-emerald-700/50 dark:hover:bg-emerald-950/25"
            >
              <span className="pointer-events-none absolute inset-y-0 left-0 w-1 rounded-l-2xl bg-gradient-to-b from-emerald-400 to-teal-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100" />
              <span className="flex w-11 shrink-0 items-center justify-center border-r border-stone-200/80 bg-stone-50/80 font-mono text-xs font-semibold text-stone-500 transition-colors group-hover:border-emerald-200/60 group-hover:bg-emerald-50/60 group-hover:text-emerald-800 dark:border-stone-600/80 dark:bg-stone-800/40 dark:text-stone-400 dark:group-hover:border-emerald-800/50 dark:group-hover:text-emerald-300">
                {BADGE[idx] ?? idx + 1}
              </span>
              <span className="flex flex-1 items-center p-4 text-sm font-medium leading-snug text-stone-900 dark:text-stone-100">
                {c.text}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

type ChoiceFeedbackPanelProps = {
  lastChoice: ScenarioChoice;
  correctChoiceText?: string;
  showHint: boolean;
  onToggleHint: () => void;
  onContinue: () => void;
  continueLabel: string;
};

/**
 * Разбор выбора: объяснение, опциональная подсказка при ошибке, кнопка «Дальше».
 */
export function ChoiceFeedbackPanel({
  lastChoice,
  correctChoiceText,
  showHint,
  onToggleHint,
  onContinue,
  continueLabel,
}: ChoiceFeedbackPanelProps) {
  const ok = lastChoice.correct;

  return (
    <div className="card-brutal motion-safe:animate-pop-in space-y-4 p-6">
      <p
        className={`text-[10px] font-medium uppercase tracking-[0.2em] ${
          ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
        }`}
      >
        {ok ? "Верно" : "Ошибка выбора"}
      </p>
      <p className="text-sm leading-relaxed text-stone-800 dark:text-stone-200">
        {ok ? lastChoice.safeExplanation : lastChoice.unsafeExplanation}
      </p>

      {!ok && lastChoice.hint && showHint && (
        <div
          className="rounded-xl border border-emerald-200/90 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950/90 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-50"
          role="note"
        >
          <span className="font-semibold text-emerald-900 dark:text-emerald-200">Подсказка: </span>
          {lastChoice.hint}
        </div>
      )}

      {!ok && lastChoice.hint && !showHint && (
        <button
          type="button"
          onClick={onToggleHint}
          className="text-sm font-medium text-stone-700 underline decoration-stone-300 underline-offset-4 transition-colors hover:text-stone-900 dark:text-stone-300 dark:decoration-stone-600 dark:hover:text-stone-100"
        >
          Показать подсказку
        </button>
      )}

      {!ok && correctChoiceText && (
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Верный вариант: <span className="font-medium text-stone-800 dark:text-stone-100">{correctChoiceText}</span>
        </p>
      )}

      <button type="button" onClick={onContinue} className="btn-primary w-full">
        {continueLabel}
      </button>
    </div>
  );
}
