import json
import re
from typing import Any

from fastapi import HTTPException, status

from app.schemas.ai import ChatRequest
from app.schemas.track_gen import (
    TRACK_STEP_COUNT,
    TrackGenerateRequest,
    TrackGenerateResponse,
    TrainingTrackPayload,
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


_N = TRACK_STEP_COUNT
_STEP_LIST_RU = ", ".join(f"{{шаг{i}}}" for i in range(1, _N + 1))
_STEP_LIST_EN = ", ".join(f"step{i}" for i in range(1, _N + 1))

_SYSTEM_RU = f"""Ты генерируешь учебный кибер-тренажёр: ровно {_N} последовательных шагов (уровней внутри трека).
Каждый шаг — отдельная короткая ситуация по заданной теме.
Только JSON, без markdown и комментариев.

Корень JSON:
{{
  "theme": "<одна из тем запроса>",
  "steps": [ {_STEP_LIST_RU} ]
}}

Ровно {_N} элементов в массиве steps.

Каждый элемент steps:
{{
  "situation": "текст 2–5 предложений, обращение на «вы»",
  "choices": [
    {{"id": "c1", "label": "короткая подпись действия"}},
    {{"id": "c2", "label": "…"}},
    {{"id": "c3", "label": "…"}},
    {{"id": "c4", "label": "…"}}
  ],
  "outcomes": {{
    "c1": {{"is_safe": true/false, "recommendation_title": "заголовок разбора", "recommendation_body": "1–3 предложения совета"}},
    "c2": {{ ... }},
    "c3": {{ ... }},
    "c4": {{ ... }}
  }}
}}

Правила:
- id в choices СТРОГО c1, c2, c3, c4 в таком порядке.
- outcomes обязаны содержать все четыре ключа c1–c4.
- Хотя бы один безопасный и хотя бы один опасный выбор на шаг; чередуй сложность по шагам.
- Не используй реальные бренды как официальные отправители; вымышленные сервисы допустимы."""

_SYSTEM_EN = f"""You create a cybersecurity micro-training track: exactly {_N} sequential steps (levels within one track).
Each step is a short standalone situation for the requested theme.
JSON only, no markdown.

Root object:
{{
  "theme": "<one of the requested theme ids>",
  "steps": [ {_STEP_LIST_EN} ]
}}

Exactly {_N} objects in the steps array.

Each step:
{{
  "situation": "2–5 sentences, second person",
  "choices": [
    {{"id": "c1", "label": "short action"}},
    {{"id": "c2", "label": "…"}},
    {{"id": "c3", "label": "…"}},
    {{"id": "c4", "label": "…"}}
  ],
  "outcomes": {{
    "c1": {{"is_safe": bool, "recommendation_title": "debrief headline", "recommendation_body": "1–3 sentences"}},
    "c2": {{ ... }},
    "c3": {{ ... }},
    "c4": {{ ... }}
  }}
}}

Rules:
- choice ids MUST be c1,c2,c3,c4 in that order.
- outcomes MUST include all keys c1–c4.
- Mix safe and unsafe options; vary difficulty across steps.
- Avoid real brand names as official senders; fictional names OK."""

_THEME_USER_RU = {
    "office": "Тема: офис — корпоративный мессенджер, почта, тикеты, «коллеги» и срочные просьбы.",
    "home": "Тема: дом — личные гаджеты, умный дом, родственники, «помоги настроить» и пароли.",
    "public_wifi": "Тема: публичный Wi‑Fi — кафе, вокзал, гостиница, поддельные captive portal и VPN.",
    "social_engineering": "Тема: соцсети и личные сообщения — LinkedIn/Telegram-подделки, фейковые HR, «вакансии» и скам.",
    "mobile_mfa": "Тема: мобильные угрозы — SMS/push, поддельные банковские приложения, «обновите MFA», SIM-сwap намёки.",
    "cloud_remote": "Тема: облако и удалёнка — SSO, OAuth-фишинг, «ссылка на документ», Slack/Teams-подделки.",
    "supply_chain": "Тема: цепочка поставок и финансы — счета от подрядчиков, изменённые реквизиты, «срочная оплата».",
}

_THEME_USER_EN = {
    "office": "Theme: office — corporate chat, email, tickets, fake coworkers and urgent asks.",
    "home": "Theme: home — personal devices, smart home, relatives, “help me set this up” and passwords.",
    "public_wifi": "Theme: public Wi‑Fi — café, transit, hotel, rogue hotspots and VPN habits.",
    "social_engineering": "Theme: social & DMs — fake recruiters, job scams, impersonation on professional/social apps.",
    "mobile_mfa": "Theme: mobile threats — SMS/push lures, fake banking apps, “update MFA”, SIM-swap hints.",
    "cloud_remote": "Theme: cloud & remote work — SSO/OAuth phishing, “document link”, fake Slack/Teams asks.",
    "supply_chain": "Theme: supply chain & finance — vendor invoices, changed wire details, urgent payment pressure.",
}


async def generate_training_track(body: TrackGenerateRequest) -> TrackGenerateResponse:
    sys = _SYSTEM_RU if body.locale == "ru" else _SYSTEM_EN
    theme_line = (
        _THEME_USER_RU.get(body.theme, _THEME_USER_RU["office"])
        if body.locale == "ru"
        else _THEME_USER_EN.get(body.theme, _THEME_USER_EN["office"])
    )
    user = (
        f"{theme_line} Случайное зерно: {body.diversity_roll}. Сделай {_N} разных нешаблонных ситуаций по возрастанию накала."
        if body.locale == "ru"
        else f"{theme_line} Random seed: {body.diversity_roll}. Produce {_N} fresh, escalating situations."
    )

    req = ChatRequest(
        system_prompt=sys,
        prompt=user,
        temperature=0.82,
        max_tokens=7200,
        json_mode=True,
    )
    client = MistralClient()
    chat_res = await client.chat(req)
    data = _extract_json_object(chat_res.content)
    data["theme"] = body.theme

    try:
        parsed = TrainingTrackPayload.model_validate(data)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Track JSON failed validation: {exc}",
        ) from exc

    steps_out = [s.model_dump(mode="json") for s in parsed.steps]
    return TrackGenerateResponse(theme=body.theme, locale=body.locale, steps=steps_out)
