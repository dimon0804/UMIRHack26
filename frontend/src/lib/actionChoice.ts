import type { ScenarioChoice } from "@/types";

/** Рекомендуемый размер набора вариантов по ТЗ «Выбор действия». */
export const ACTION_CHOICE_RECOMMENDED_MIN = 3;
export const ACTION_CHOICE_RECOMMENDED_MAX = 4;

export type ChoiceValidation = "correct" | "incorrect";

/** Результат выбора: верный / неверный (валидация после клика). */
export function validateChoice(choice: ScenarioChoice): ChoiceValidation {
  return choice.correct ? "correct" : "incorrect";
}

/** Проверка набора вариантов в режиме разработки. */
export function assertActionChoiceCount(choices: ScenarioChoice[], context?: string): void {
  const n = choices.length;
  if (n < ACTION_CHOICE_RECOMMENDED_MIN || n > ACTION_CHOICE_RECOMMENDED_MAX) {
    console.info(
      `[ActionChoice] Рекомендуется ${ACTION_CHOICE_RECOMMENDED_MIN}–${ACTION_CHOICE_RECOMMENDED_MAX} варианта, сейчас ${n}${context ? ` — ${context}` : ""}.`
    );
  }
  const correct = choices.filter((c) => c.correct).length;
  if (correct !== 1) {
    console.warn(`[ActionChoice] Должен быть ровно один верный вариант, сейчас: ${correct}.`);
  }
}
