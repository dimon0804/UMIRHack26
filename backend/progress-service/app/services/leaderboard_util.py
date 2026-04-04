from __future__ import annotations


def mask_email(email: str) -> str:
    email = (email or "").strip().lower()
    if "@" not in email:
        return "—"
    local, domain = email.split("@", 1)
    if not local:
        return f"*@{domain}"
    if len(local) == 1:
        return f"{local}*@{domain}"
    return f"{local[0]}***@{domain}"


def league_key_from_xp(xp: int) -> str:
    if xp >= 220:
        return "expert"
    if xp >= 120:
        return "analyst"
    if xp >= 40:
        return "trainee"
    return "novice"


def accuracy_percent(total_correct: int, total_answers: int) -> int:
    if total_answers <= 0:
        return 0
    return min(100, max(0, round(100.0 * total_correct / total_answers)))
