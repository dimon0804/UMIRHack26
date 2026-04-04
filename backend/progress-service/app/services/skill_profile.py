"""Профиль навыка / «риска» для адаптивной сложности тренажёра (источник — JSON state)."""

from __future__ import annotations

from typing import Any


def compute_skill_profile(state: dict[str, Any]) -> dict[str, Any]:
    """
    Вычисляет метрики по сохранённому UserState (totalCorrect/totalAnswers/history).
    difficulty_tier: 0 — очевидные флаги, 3 — тонкие приёмы для сильных игроков.
    """
    total_correct = int(state.get("totalCorrect") or 0)
    total_answers = int(state.get("totalAnswers") or 0)
    total_mistakes = int(state.get("totalMistakes") or 0)

    history = state.get("history")
    recent: list[Any] = []
    if isinstance(history, list):
        recent = history[-15:]

    recent_correct = 0
    for h in recent:
        if isinstance(h, dict) and h.get("correct") is True:
            recent_correct += 1
    recent_total = len(recent)
    recent_ratio = recent_correct / recent_total if recent_total else 0.0

    if total_answers > 0:
        global_acc = total_correct / total_answers
    else:
        global_acc = 0.0

    if recent_total >= 5:
        skill = 0.35 * global_acc + 0.65 * recent_ratio
    elif total_answers >= 8:
        skill = 0.7 * global_acc + 0.3 * recent_ratio
    else:
        skill = global_acc if total_answers > 0 else 0.0

    skill = max(0.0, min(1.0, float(skill)))
    skill_score = int(round(skill * 100))

    if total_answers < 3 and recent_total < 3:
        tier = 0
    elif skill_score < 42:
        tier = 0
    elif skill_score < 58:
        tier = 1
    elif skill_score < 75:
        tier = 2
    else:
        tier = 3

    streak_like = max(0, total_correct - total_mistakes)
    return {
        "skill_score": skill_score,
        "difficulty_tier": tier,
        "recent_correct_ratio": round(recent_ratio, 4),
        "recent_sample_size": recent_total,
        "total_answers": total_answers,
        "total_correct": total_correct,
        "streak_balance": streak_like,
    }
