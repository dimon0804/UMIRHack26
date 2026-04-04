"""Экран «Суд присяжных»: rule-based аргументы + короткий комментарий LLM (ai-service)."""

from __future__ import annotations

import logging
from typing import Any, Literal

import httpx

from app.core.config import settings

log = logging.getLogger(__name__)

Locale = Literal["ru", "en"]

CHOICE_SUMMARY: dict[str, dict[str, str]] = {
    "ru": {
        "open_link": "перейти по ссылке из письма",
        "delete_only": "удалить письмо",
        "verify_sender": "проверить отправителя",
        "report": "сообщить о фишинге",
        "escalate_soc": "передать в SOC / ИБ",
        "send_codes": "отправить коды / пароль / перевести по просьбе",
        "callback": "перезвонить на известный номер",
        "official_channel": "оформить через официальный канал / тикет",
        "ignore": "не реагировать или игнорировать",
        "join_open": "подключиться к открытой Wi‑Fi",
        "install_portal_offer": "установить ПО со страницы входа в сеть",
        "connect_strongest_unverified": "выбрать сеть только по силе сигнала",
        "use_verified_encrypted": "уточнить у персонала и подключиться к официальной сети",
        "report_suspicious_ssid": "сообщить о подозрительном дубликате SSID",
    },
    "en": {
        "open_link": "open the link in the email",
        "delete_only": "delete the email only",
        "verify_sender": "verify sender details",
        "report": "report phishing",
        "escalate_soc": "escalate to SOC / security",
        "send_codes": "send codes / password / wire as asked",
        "callback": "call back on a known number",
        "official_channel": "use official portal / ticket",
        "ignore": "ignore or wait without acting",
        "join_open": "join the open Wi‑Fi",
        "install_portal_offer": "install software from the captive portal",
        "connect_strongest_unverified": "pick the strongest signal without verifying SSID",
        "use_verified_encrypted": "ask staff and use the official encrypted network",
        "report_suspicious_ssid": "report a suspicious duplicate SSID",
    },
}


def _choice_summary(locale: Locale, choice_id: str) -> str:
    return CHOICE_SUMMARY.get(locale, {}).get(choice_id, choice_id.replace("_", " "))


def _rule_points(locale: Locale, scenario_type: str, choice_id: str, is_safe: bool) -> tuple[list[str], list[str]]:
    """Возвращает (аргументы «за» выбор игрока, аргументы «против»)."""
    st = scenario_type.lower()
    if locale == "en":
        if is_safe:
            for_pts = [
                "You avoided the fastest-looking risky shortcut.",
                "The action aligns with slowing down and verifying before damage spreads.",
            ]
            against_pts = [
                "Some colleagues might argue speed matters more than process.",
                "Without logging the incident, others may repeat the same trap.",
            ]
        else:
            for_pts = [
                "Urgency and authority in the scenario felt credible in the moment.",
                "Many real users choose the fastest path when stressed.",
            ]
            against_pts = [
                "Security playbooks treat this pattern as high risk for fraud or account takeover.",
                "Attackers rely on rushed decisions and unverified channels.",
            ]
        if choice_id == "open_link" and not is_safe:
            for_pts[0] = "The link looked like a normal workflow step."
            against_pts[1] = "Credential phishing often hides behind plausible login pages."
        elif choice_id in ("send_codes", "open_link") and not is_safe:
            for_pts[0] = "The request matched a believable operational story."
        elif choice_id == "callback" and is_safe:
            for_pts[1] = "Out-of-band verification breaks many impersonation chains."
        if "wifi" in st or st == "wifi":
            against_pts[0] = (
                "Open or unverified hotspots are a classic MITM and captive-portal malware vector."
                if not is_safe
                else against_pts[0]
            )
        if "terminal" in st or "skim" in st or st == "terminal":
            for_pts[0] = (
                "Physical tampering is easy to underestimate at a glance."
                if not is_safe
                else for_pts[0]
            )
        return for_pts, against_pts

    # ru
    if is_safe:
        for_pts = [
            "Вы не пошли по самому быстрому и рискованному пути.",
            "Действие даёт время проверить факты до возможного ущерба.",
        ]
        against_pts = [
            "Коллеги могут сказать, что в спешке «главное — скорость».",
            "Без фиксации инцидента другие могут снова попасть в ту же ловушку.",
        ]
    else:
        for_pts = [
            "Срочность и «авторитет» в сценарии выглядели правдоподобно.",
            "В стрессе многие выбирают самый быстрый ответ, как в жизни.",
        ]
        against_pts = [
            "По методичкам ИБ такой шаг обычно повышает риск мошенничества или компрометации.",
            "Атакующие специально давят на спонтанность и неофициальные каналы.",
        ]
    if choice_id == "open_link" and not is_safe:
        for_pts[0] = "Ссылка выглядела как обычный рабочий шаг."
        against_pts[1] = "Фишинг часто прячется за правдоподобной страницей входа."
    elif choice_id in ("send_codes", "open_link") and not is_safe:
        for_pts[0] = "Просьба совпала с правдоподобной «операционной» историей."
    elif choice_id == "callback" and is_safe:
        for_pts[1] = "Проверка вторым каналом рвёт цепочку подмены."
    if "wifi" in st or st == "wifi":
        if not is_safe:
            against_pts[0] = (
                "Открытые или непроверенные точки — типичный вектор MITM и подмены страниц входа."
            )
    if "terminal" in st or "skim" in st or st == "terminal":
        if not is_safe:
            for_pts[0] = "Физическую подмену на терминале легко недооценить с первого взгляда."
    return for_pts, against_pts


def _verdict_copy(locale: Locale, is_safe: bool) -> tuple[str, str]:
    if locale == "en":
        if is_safe:
            return (
                "Verdict",
                "The training jury leans toward: your choice matches safer practice in this drill.",
            )
        return (
            "Verdict",
            "The training jury leans toward: your choice increases exposure — review the debrief below.",
        )
    if is_safe:
        return (
            "Вердикт",
            "Склонность учебного жюри: выбор в целом ближе к безопасной практике в этом сценарии.",
        )
    return (
        "Вердикт",
        "Склонность учебного жюри: выбор повышает риск — ниже разбор тренажёра.",
    )


AGG_MAIL = "phishing-mail"
AGG_CHAT = "se-chat"
AGG_WIFI = "wifi"
AGG_SKIM = "skimming"
AGG_ACTION = "action-choice"
MAIL_IDS = frozenset({"phishing-mail-bank", "phishing-mail-parcel", "phishing-mail-payroll"})
CHAT_IDS = frozenset(
    {
        "se-chat-gifts",
        "se-chat-wire",
        "se-chat-it",
        "vishing-bank",
        "vishing-it",
        "vishing-courier",
    }
)
WIFI_IDS = frozenset({"wifi-cafe", "wifi-airport", "wifi-hotel"})


def _scenario_meta(sid: str, locale: Locale) -> tuple[str, str]:
    """(scenario_type, short title for LLM). Дублирует классификацию scenario_api без циклического импорта."""
    if sid in ("vishing-bank", "vishing-it", "vishing-courier"):
        return ("voice_phishing", "Vishing / voice scam" if locale == "en" else "Vishing / звонок мошенника")
    if sid == AGG_MAIL or sid in MAIL_IDS:
        return ("email_phishing", "Email phishing drill" if locale == "en" else "Фишинг в почте")
    if sid == AGG_CHAT or sid in CHAT_IDS:
        return ("messenger_soceng", "Messenger social engineering" if locale == "en" else "Социнженерия в чате")
    if sid == AGG_WIFI or sid in WIFI_IDS:
        return ("wifi", "Public Wi‑Fi" if locale == "en" else "Общественный Wi‑Fi")
    if sid == AGG_SKIM:
        return ("terminal_skimming", "Skimming / terminal" if locale == "en" else "Скимминг / терминал")
    if sid == AGG_ACTION:
        return ("action_choice", "Incident response choice" if locale == "en" else "Выбор при инциденте")
    return ("simulation", "Security awareness" if locale == "en" else "Тренажёр ИБ")


async def fetch_llm_jury_line(
    *,
    locale: Locale,
    scenario_type: str,
    scenario_title: str,
    choice_id: str,
    choice_summary: str,
    is_safe: bool,
    teach_title: str,
) -> str | None:
    base = settings.ai_service_url.strip().rstrip("/")
    if not base:
        return None
    url = f"{base}/jury-take"
    payload: dict[str, Any] = {
        "locale": locale,
        "scenario_type": scenario_type,
        "scenario_title": scenario_title[:240],
        "choice_id": choice_id,
        "choice_summary": choice_summary[:400],
        "is_safe": is_safe,
        "teach_title": teach_title[:200],
    }
    timeout = httpx.Timeout(connect=5.0, read=45.0, write=5.0, pool=5.0)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.post(url, json=payload)
    except httpx.RequestError as exc:
        log.debug("jury-take unreachable: %s", exc)
        return None
    if r.status_code >= 400:
        log.debug("jury-take HTTP %s", r.status_code)
        return None
    try:
        data = r.json()
    except ValueError:
        return None
    c = data.get("commentary")
    return c.strip() if isinstance(c, str) and c.strip() else None


async def build_jury_deliberation(
    *,
    scenario_id: str,
    locale: Locale,
    choice_id: str,
    is_safe: bool,
    teach_title: str,
) -> dict[str, Any]:
    scenario_type, scenario_title = _scenario_meta(scenario_id, locale)
    choice_summary = _choice_summary(locale, choice_id)
    for_pts, against_pts = _rule_points(locale, scenario_type, choice_id, is_safe)
    v_title, v_body = _verdict_copy(locale, is_safe)
    llm = await fetch_llm_jury_line(
        locale=locale,
        scenario_type=scenario_type,
        scenario_title=scenario_title,
        choice_id=choice_id,
        choice_summary=choice_summary,
        is_safe=is_safe,
        teach_title=teach_title,
    )
    bonus_xp = 5
    return {
        "for_points": for_pts,
        "against_points": against_pts,
        "llm_comment": llm,
        "verdict_title": v_title,
        "verdict_body": v_body,
        "verdict_aligns_safe": is_safe,
        "bonus_xp": bonus_xp,
    }
