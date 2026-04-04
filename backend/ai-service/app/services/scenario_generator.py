import json
import re
from typing import Any

from fastapi import HTTPException, status

from app.schemas.ai import ChatRequest
from app.schemas.scenario_gen import (
    ChatScenarioGenerated,
    EmailScenarioGenerated,
    ScenarioGenerateRequest,
    ScenarioGenerateResponse,
)
from app.services.mistral_client import MistralClient


def _extract_json_object(raw: str) -> dict[str, Any]:
    s = raw.strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.IGNORECASE)
        s = re.sub(r"\s*```\s*$", "", s)
    try:
        data = json.loads(s)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM returned invalid JSON: {exc}",
        ) from exc
    if not isinstance(data, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="LLM JSON root must be an object",
        )
    return data


_SYSTEM_EMAIL_RU = """Ты генерируешь ОДИН учебный сценарий фишингового письма для корпоративного тренажёра.
Правила:
- Письмо должно выглядеть правдоподобно, но содержать типичные красные флаги (срочность, чужой домен, просьба перейти по ссылке).
- Не используй реальные бренды как «официальные»; можно отдалённые аналоги вымышленных сервисов.
- Язык ответа: русский.
- Верни ТОЛЬКО один JSON-объект без markdown и пояснений.

Структура JSON (все поля обязательны):
{
  "type": "email",
  "title": "краткий заголовок сценария для карточки миссии",
  "sender_display": "отображаемое имя отправителя",
  "sender_email": "адрес@подозрительный-домен",
  "subject": "тема письма",
  "preview": "одна строка превью как во входящих",
  "body_paragraphs": ["абзац1", "абзац2", "абзац3"],
  "cta_label": "текст кнопки/ссылки в письме",
  "cta_href_display": "показать вымышленный URL целиком",
  "choices": [
    {"id": "open_link", "label": "короткая подпись действия"},
    {"id": "delete_only", "label": "…"},
    {"id": "verify_sender", "label": "…"},
    {"id": "report", "label": "…"}
  ]
}

Поле choices: ровно 4 объекта, id СТРОГО как выше (латиница), label — по-русски, осмысленные для этого письма."""

_SYSTEM_EMAIL_EN = """You generate ONE realistic phishing-style training email for a corporate simulator.
Rules:
- Plausible but with typical red flags (urgency, lookalike domain, link verification).
- Do not impersonate real brands as official; use fictional company/service names.
- Output language: English.
- Return ONLY one JSON object, no markdown.

JSON shape (all keys required):
{
  "type": "email",
  "title": "short mission card title",
  "sender_display": "display name",
  "sender_email": "addr@suspicious-domain",
  "subject": "subject line",
  "preview": "one-line inbox preview",
  "body_paragraphs": ["p1", "p2", "p3"],
  "cta_label": "link/button text in the email",
  "cta_href_display": "show a fictional full URL",
  "choices": [
    {"id": "open_link", "label": "…"},
    {"id": "delete_only", "label": "…"},
    {"id": "verify_sender", "label": "…"},
    {"id": "report", "label": "…"}
  ]
}

choices: exactly 4 objects; ids MUST be exactly open_link, delete_only, verify_sender, report."""

_SYSTEM_CHAT_RU = """Ты генерируешь ОДИН учебный сценарий переписки (социальная инженерия в корпоративном мессенджере).
Правила:
- Один или два сообщения от собеседника (peer), без ответа пользователя.
- Типичные атаки: подмена руководителя, срочный перевод, коды/подарочные карты, фейковый IT с паролем.
- Язык: русский.
- Только JSON, без markdown.

Структура:
{
  "type": "chat",
  "title": "краткий заголовок миссии",
  "peer_name": "имя и роль как в UI",
  "peer_handle": "латиница_нижний_регистр_без_пробелов",
  "messages": [
    {"from": "peer", "text": "текст сообщения", "time": "14:02"}
  ],
  "choices": [
    {"id": "send_codes", "label": "…"},
    {"id": "callback", "label": "…"},
    {"id": "official_channel", "label": "…"},
    {"id": "ignore", "label": "…"}
  ]
}

choices: ровно 4 объекта, id СТРОГО: send_codes, callback, official_channel, ignore (латиница)."""

_SYSTEM_CHAT_EN = """You generate ONE corporate messenger social-engineering training thread.
Rules:
- One or two messages from the peer only (no user reply in the thread).
- Patterns: fake exec, urgent wire, gift cards/codes, fake IT asking for password.
- Language: English.
- JSON only, no markdown.

Shape:
{
  "type": "chat",
  "title": "short mission title",
  "peer_name": "name and role for UI",
  "peer_handle": "lowercase_handle_no_spaces",
  "messages": [
    {"from": "peer", "text": "message body", "time": "14:02"}
  ],
  "choices": [
    {"id": "send_codes", "label": "…"},
    {"id": "callback", "label": "…"},
    {"id": "official_channel", "label": "…"},
    {"id": "ignore", "label": "…"}
  ]
}

choices: exactly 4 items; ids MUST be send_codes, callback, official_channel, ignore."""


def _difficulty_email_ru(tier: int, skill: int) -> str:
    if tier <= 0:
        return (
            f"Уровень сложности: базовый (оценка игрока {skill}/100). "
            "Сделай заметные красные флаги: явный чужой домен, грубая срочность, типичный развод."
        )
    if tier == 1:
        return (
            f"Уровень: чуть сложнее ({skill}/100). "
            "Домен похож на корпоративный (опечатка/поддомен), умеренный pretext, без капса во всём письме."
        )
    if tier == 2:
        return (
            f"Уровень: продвинутый ({skill}/100). "
            "Письмо как внутренняя процедура или партнёрский запрос; домен правдоподобный; срочность завуалирована "
            "(дедлайн сегодня, «ответьте в течение часа» без истерики)."
        )
    return (
        f"Уровень: эксперт ({skill}/100). "
        "Максимально тонко: authority bias, ссылка на реальные процессы (без реальных брендов), "
        "lookalike-домен, социальное давление без штампованного фишинга; один флаг можно спрятать в деталях."
    )


def _difficulty_email_en(tier: int, skill: int) -> str:
    if tier <= 0:
        return (
            f"Difficulty: baseline (player skill {skill}/100). "
            "Clear red flags: suspicious domain, blunt urgency, classic scam tone."
        )
    if tier == 1:
        return (
            f"Difficulty: moderate ({skill}/100). "
            "Corporate-lookalike domain typo/subdomain, mild pretext, avoid screaming caps."
        )
    if tier == 2:
        return (
            f"Difficulty: advanced ({skill}/100). "
            "Internal-style or vendor thread; plausible domain; urgency is understated (same-day deadline)."
        )
    return (
        f"Difficulty: expert ({skill}/100). "
        "Subtle authority and process references (fictional orgs only), lookalike domain, pressure without clichés; "
        "one trap can be easy to miss."
    )


def _difficulty_chat_ru(tier: int, skill: int) -> str:
    if tier <= 0:
        return (
            f"Уровень: базовый ({skill}/100). Явный фейковый коллега/IT, грубый запрос кодов или пароля."
        )
    if tier == 1:
        return (
            f"Уровень: средний ({skill}/100). Знакомый тон, но мелкие несостыковки в должности или срочности."
        )
    if tier == 2:
        return (
            f"Уровень: высокий ({skill}/100). Pretext «срочно закрыть тикет», ссылка на «внутренний» канал, "
            "без прямого «отправь пароль»."
        )
    return (
        f"Уровень: эксперт ({skill}/100). "
        "Тон как у реального руководителя/партнёра; просьба косвенная (переключись на личный номер, «напиши в личку»); "
        "минимум триггерных слов."
    )


def _difficulty_chat_en(tier: int, skill: int) -> str:
    if tier <= 0:
        return f"Difficulty: baseline ({skill}/100). Obvious fake peer/IT, blunt ask for codes/password."
    if tier == 1:
        return (
            f"Difficulty: moderate ({skill}/100). Friendly tone, small inconsistencies in role or urgency."
        )
    if tier == 2:
        return (
            f"Difficulty: advanced ({skill}/100). Pretext of closing a ticket; nudge to alternate channel; "
            "no direct 'send your password'."
        )
    return (
        f"Difficulty: expert ({skill}/100). "
        "Executive/partner tone; indirect ask (switch to personal line, DM); avoid obvious trigger words."
    )


async def generate_training_scenario(body: ScenarioGenerateRequest) -> ScenarioGenerateResponse:
    roll = body.diversity_roll
    tier = body.difficulty_tier
    skill = body.skill_score
    if body.scenario_type == "email":
        sys = _SYSTEM_EMAIL_RU if body.locale == "ru" else _SYSTEM_EMAIL_EN
        diff = _difficulty_email_ru(tier, skill) if body.locale == "ru" else _difficulty_email_en(tier, skill)
        user = (
            f"Случайное зерно: {roll}. {diff} Придумай новый нешаблонный сюжет письма."
            if body.locale == "ru"
            else f"Random seed: {roll}. {diff} Invent a fresh, non-templated premise."
        )
    else:
        sys = _SYSTEM_CHAT_RU if body.locale == "ru" else _SYSTEM_CHAT_EN
        diff = _difficulty_chat_ru(tier, skill) if body.locale == "ru" else _difficulty_chat_en(tier, skill)
        user = (
            f"Случайное зерно: {roll}. {diff} Придумай новую ситуацию в чате (другой предлог, чем в типовых примерах)."
            if body.locale == "ru"
            else f"Random seed: {roll}. {diff} Create a new chat premise distinct from common clichés."
        )

    req = ChatRequest(
        system_prompt=sys,
        prompt=user,
        temperature=0.85,
        max_tokens=2200,
        json_mode=True,
    )
    client = MistralClient()
    chat_res = await client.chat(req)
    data = _extract_json_object(chat_res.content)

    try:
        if body.scenario_type == "email":
            parsed = EmailScenarioGenerated.model_validate(data)
        else:
            parsed = ChatScenarioGenerated.model_validate(data)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Scenario JSON failed validation: {exc}",
        ) from exc

    scenario_dict = parsed.model_dump(by_alias=True, mode="json")

    return ScenarioGenerateResponse(
        locale=body.locale,
        scenario_type=body.scenario_type,
        scenario=scenario_dict,
    )
