"""Сценарии: 5 модулей × 5 уровней, почта/чат (Mistral на 1-м шаге), Wi‑Fi, скимминг, выбор действия."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field

from app.scenario_narrative import (
    AGG_ACTION,
    AGG_SKIM,
    NARRATIVE_TOTAL_STEPS,
    outcome_action,
    outcome_skimming,
    scenario_action_cards,
    scenario_skimming,
)
from app.services.player_skill import fetch_player_skill_profile
from app.services.progress_payload import fetch_custom_scenario_payload, is_custom_scenario_id
from app.services.scenario_llm_client import fetch_llm_scenario

router = APIRouter(prefix="/scenarios", tags=["simulator"])


def _soc_region(scenario_id: str, choice_id: str) -> str:
    x = (hash(scenario_id) ^ hash(choice_id)) % 4
    return ("NA", "EU", "APAC", "MEA")[x]


def _emit_sim_soc(scenario_id: str, step: int, choice_id: str, result: dict) -> None:
    from app.integrations.soc_redis import emit_soc_event

    is_safe = bool(result.get("is_safe", True))
    severity = str(result.get("severity", "none"))
    tags: list[str] = []
    if choice_id == "report":
        tags.append("user_report")
    if choice_id in ("open_link", "send_codes", "install_portal_offer", "connect_strongest_unverified") and not is_safe:
        tags.append("risk_click")
    emit_soc_event(
        "sim_submit",
        {
            "scenario_id": scenario_id,
            "step": step,
            "choice_id": choice_id,
            "is_safe": is_safe,
            "severity": severity,
            "tags": tags,
            "region": _soc_region(scenario_id, choice_id),
        },
    )

Locale = Literal["ru", "en"]

# Агрегаты в UI; submit идёт на эти id
AGGREGATE_MAIL_ID = "phishing-mail"
AGGREGATE_CHAT_ID = "se-chat"
AGGREGATE_WIFI_ID = "wifi"
AGGREGATE_SKIMMING_ID = AGG_SKIM
AGGREGATE_ACTION_ID = AGG_ACTION

_HOME_STEP_TEMPLATE: tuple[str, ...] = (
    "phishing-mail-bank",
    "phishing-mail-parcel",
    "phishing-mail-payroll",
    "phishing-mail-parcel",
    "phishing-mail-bank",
)
_OFFICE_STEP_TEMPLATE: tuple[str, ...] = (
    "se-chat-gifts",
    "se-chat-wire",
    "se-chat-it",
    "se-chat-wire",
    "se-chat-gifts",
)
_WIFI_STEP_TEMPLATE: tuple[str, ...] = (
    "wifi-cafe",
    "wifi-airport",
    "wifi-hotel",
    "wifi-airport",
    "wifi-cafe",
)

# Старый алиас мессенджера → общая вкладка «чат»
SCENARIO_ALIASES: dict[str, str] = {
    "se-telegram": AGGREGATE_CHAT_ID,
}

MAIL_SCENARIO_IDS: tuple[str, ...] = (
    "phishing-mail-bank",
    "phishing-mail-parcel",
    "phishing-mail-payroll",
)

VISHING_SCENARIO_IDS: tuple[str, ...] = (
    "vishing-bank",
    "vishing-it",
    "vishing-courier",
)

CHAT_SCENARIO_IDS: tuple[str, ...] = (
    "se-chat-gifts",
    "se-chat-wire",
    "se-chat-it",
) + VISHING_SCENARIO_IDS


def _vishing_voice_hybrid(
    *,
    track_base: str,
    cues_sec: list[float],
    pause_between_ms: int,
    locale: Locale,
) -> dict[str, object]:
    """MP3 из scripts/generate_vishing_tts.py (Edge TTS) в public/vishing; метки из cues.generated.json."""
    return {
        "mode": "hybrid",
        "audio_src": f"/vishing/{track_base}-{locale}.mp3",
        "cues_sec": cues_sec,
        "pause_between_ms": pause_between_ms,
        "label": "Incoming call" if locale == "en" else "Входящий звонок",
    }


WIFI_SCENARIO_IDS: tuple[str, ...] = (
    "wifi-cafe",
    "wifi-airport",
    "wifi-hotel",
)


def _canonical_id(scenario_id: str) -> str:
    return SCENARIO_ALIASES.get(scenario_id, scenario_id)


def _clamp_step(step: int) -> int:
    return max(1, min(NARRATIVE_TOTAL_STEPS, step))


def _home_arc(locale: Locale, step: int) -> str:
    if locale == "en":
        return [
            "Home 1/5: phishing posing as your bank",
            "Home 2/5: parcel scam and fake fees",
            "Home 3/5: payroll / HR data-harvest link",
            "Home 4/5: password reuse after a leak (credential stuffing risk)",
            "Home 5/5: smishing-style urgency tied to your accounts",
        ][step - 1]
    return [
        "Дом 1/5: фишинг под банк",
        "Дом 2/5: мошенничество с «посылкой» и сбором",
        "Дом 3/5: фишинг HR / зарплатные реквизиты",
        "Дом 4/5: риск подбора пароля после утечки",
        "Дом 5/5: срочность в духе смсинга про счета",
    ][step - 1]


def _office_arc(locale: Locale, step: int) -> str:
    if locale == "en":
        return [
            "Office 1/5: BEC — gift cards under pressure",
            "Office 2/5: fake urgent wire from “exec”",
            "Office 3/5: impersonated IT asking for passwords",
            "Office 4/5: finance pretext and out-of-band payment",
            "Office 5/5: social engineering pivot after earlier red flags",
        ][step - 1]
    return [
        "Офис 1/5: BEC — подарочные карты под давлением",
        "Офис 2/5: фальшивый срочный перевод от «руководства»",
        "Офис 3/5: поддельный IT с запросом пароля",
        "Офис 4/5: претекстинг финансов и обход каналов",
        "Офис 5/5: развитие сюжета социнженерии",
    ][step - 1]


def _wifi_arc(locale: Locale, step: int) -> str:
    if locale == "en":
        return [
            "Public Wi‑Fi 1/5: café networks",
            "Public Wi‑Fi 2/5: airport lounge hotspots",
            "Public Wi‑Fi 3/5: hotel lobby evil-twin risk",
            "Public Wi‑Fi 4/5: rogue AP in transit hubs",
            "Public Wi‑Fi 5/5: tying the arc — verify before you connect",
        ][step - 1]
    return [
        "Wi‑Fi 1/5: кофейня и выбор сети",
        "Wi‑Fi 2/5: аэропорт",
        "Wi‑Fi 3/5: отель и дубликаты SSID",
        "Wi‑Fi 4/5: поддельные точки в транспортных узлах",
        "Wi‑Fi 5/5: финал — проверка перед подключением",
    ][step - 1]


def _home_attack(step: int) -> str:
    return ("phishing", "phishing", "phishing", "password_attack", "smishing")[step - 1]


def _office_attack(step: int) -> str:
    return ("social_engineering", "social_engineering", "social_engineering", "pretexting", "social_engineering")[
        step - 1
    ]


def _wifi_attack(step: int) -> str:
    return ("evil_twin", "rogue_ap", "evil_twin", "mitm", "wifi_security")[step - 1]


async def _scenario_for_get(
    scenario_id: str,
    locale: Locale,
    step: int = 1,
    authorization: str | None = None,
    *,
    refresh_llm: bool = False,
) -> dict | None:
    """GET сценария для шага step (1..5); почта/чат — LLM по умолчанию на шаге 1, при refresh_llm — на любом шаге."""
    sid = _canonical_id(scenario_id)
    step = _clamp_step(step)

    if is_custom_scenario_id(sid):
        if step != 1:
            return None
        payload = await fetch_custom_scenario_payload(sid, authorization)
        if not payload:
            return None
        scen_type = payload.get("type")
        if scen_type == "email":
            narrative = (
                f"AI-generated: {payload.get('title', '')}"
                if locale == "en"
                else f"Сгенерированный кейс: {payload.get('title', '')}"
            )
            attack = "phishing"
        elif scen_type == "chat":
            narrative = (
                f"AI-generated chat: {payload.get('title', '')}"
                if locale == "en"
                else f"Сгенерированный чат: {payload.get('title', '')}"
            )
            attack = "social_engineering"
        else:
            return None
        return {
            **payload,
            "id": sid,
            "step": 1,
            "total_steps": 1,
            "narrative_arc": narrative,
            "attack_family": attack,
        }

    if sid == AGGREGATE_MAIL_ID:
        if step == 1 or refresh_llm:
            skill = await fetch_player_skill_profile(authorization)
            llm = await fetch_llm_scenario(
                aggregate_id=AGGREGATE_MAIL_ID,
                scenario_type="email",
                locale=locale,
                difficulty_tier=int(skill.get("difficulty_tier") or 0),
                skill_score=int(skill.get("skill_score") or 0),
            )
            if llm:
                out = dict(llm)
                out["id"] = AGGREGATE_MAIL_ID
                out["step"] = step
                out["total_steps"] = NARRATIVE_TOTAL_STEPS
                out["narrative_arc"] = _home_arc(locale, step)
                out["attack_family"] = _home_attack(step)
                out["dynamic_difficulty"] = {
                    "tier": int(skill.get("difficulty_tier") or 0),
                    "skill_score": int(skill.get("skill_score") or 0),
                }
                # Тренажёр нескольких ссылок (link-lab): у LLM в JSON поля нет — подмешиваем как у банковского шаблона
                if out.get("type") == "email":
                    out["training_links"] = _training_links_mail_bank(locale)
                return out
        tid = _HOME_STEP_TEMPLATE[step - 1]
        base = _scenario_by_id(tid, locale)
        if not base:
            return None
        out = dict(base)
        out["id"] = AGGREGATE_MAIL_ID
        out["step"] = step
        out["total_steps"] = NARRATIVE_TOTAL_STEPS
        out["narrative_arc"] = _home_arc(locale, step)
        out["attack_family"] = _home_attack(step)
        return out

    if sid == AGGREGATE_CHAT_ID:
        if step == 1 or refresh_llm:
            skill = await fetch_player_skill_profile(authorization)
            llm = await fetch_llm_scenario(
                aggregate_id=AGGREGATE_CHAT_ID,
                scenario_type="chat",
                locale=locale,
                difficulty_tier=int(skill.get("difficulty_tier") or 0),
                skill_score=int(skill.get("skill_score") or 0),
            )
            if llm:
                out = dict(llm)
                out["id"] = AGGREGATE_CHAT_ID
                out["step"] = step
                out["total_steps"] = NARRATIVE_TOTAL_STEPS
                out["narrative_arc"] = _office_arc(locale, step)
                out["attack_family"] = _office_attack(step)
                out["dynamic_difficulty"] = {
                    "tier": int(skill.get("difficulty_tier") or 0),
                    "skill_score": int(skill.get("skill_score") or 0),
                }
                if out.get("type") == "chat":
                    out["training_links"] = _training_links_chat_it(locale)
                return out
        tid = _OFFICE_STEP_TEMPLATE[step - 1]
        base = _scenario_by_id(tid, locale)
        if not base:
            return None
        out = dict(base)
        out["id"] = AGGREGATE_CHAT_ID
        out["step"] = step
        out["total_steps"] = NARRATIVE_TOTAL_STEPS
        out["narrative_arc"] = _office_arc(locale, step)
        out["attack_family"] = _office_attack(step)
        return out

    if sid == AGGREGATE_WIFI_ID:
        tid = _WIFI_STEP_TEMPLATE[step - 1]
        base = _scenario_by_id(tid, locale)
        if not base:
            return None
        out = dict(base)
        out["id"] = AGGREGATE_WIFI_ID
        out["step"] = step
        out["total_steps"] = NARRATIVE_TOTAL_STEPS
        out["narrative_arc"] = _wifi_arc(locale, step)
        out["attack_family"] = _wifi_attack(step)
        return out

    if sid == AGGREGATE_SKIMMING_ID:
        out = scenario_skimming(locale, step)
        out["id"] = AGGREGATE_SKIMMING_ID
        return out

    if sid == AGGREGATE_ACTION_ID:
        out = scenario_action_cards(locale, step)
        out["id"] = AGGREGATE_ACTION_ID
        return out

    return _scenario_by_id(sid, locale)


class ChoiceOutcome(BaseModel):
    choice_id: str
    is_safe: bool
    severity: Literal["none", "low", "medium", "critical"]
    security_delta: int = Field(description="Change to security score (-40..+25)")
    xp_delta: int = Field(description="XP change")
    teach_title: str
    teach_body: str
    show_consequences: bool
    consequence_steps: list[dict[str, str]] = Field(default_factory=list)
    hint: str | None = None


def _outcomes_mail(locale: Locale) -> dict[str, ChoiceOutcome]:
    if locale == "en":
        return {
            "open_link": ChoiceOutcome(
                choice_id="open_link",
                is_safe=False,
                severity="critical",
                security_delta=-35,
                xp_delta=-20,
                teach_title="Phishing link",
                teach_body=(
                    "Legitimate services rarely demand urgent verification via an odd external link. "
                    "Domains may use typosquatting. Open the official app or type the URL yourself."
                ),
                show_consequences=True,
                consequence_steps=[
                    {"title": "Session captured", "detail": "Fake page stole your credentials."},
                    {"title": "Money transferred", "detail": "Attackers initiated outbound payments."},
                    {"title": "Data exfiltration", "detail": "Contacts and statements were scraped."},
                ],
            ),
            "delete_only": ChoiceOutcome(
                choice_id="delete_only",
                is_safe=True,
                severity="low",
                security_delta=8,
                xp_delta=6,
                teach_title="Better than clicking",
                teach_body=(
                    "Deleting reduces risk for you, but reporting helps protect colleagues. "
                    "If your org has a 'report phishing' button or SOC mailbox, use it."
                ),
                show_consequences=False,
                consequence_steps=[],
            ),
            "verify_sender": ChoiceOutcome(
                choice_id="verify_sender",
                is_safe=True,
                severity="none",
                security_delta=20,
                xp_delta=15,
                teach_title="Check the real sender",
                teach_body=(
                    "Inspect the full address, reply-to, and tone. When in doubt, call the organization "
                    "via a number you already trust — not from the message."
                ),
                show_consequences=False,
                consequence_steps=[],
            ),
            "report": ChoiceOutcome(
                choice_id="report",
                is_safe=True,
                severity="none",
                security_delta=25,
                xp_delta=20,
                teach_title="Best practice",
                teach_body=(
                    "Reporting trains filters and incident response. Combine with sender verification for maximum effect."
                ),
                show_consequences=False,
                consequence_steps=[],
            ),
            "escalate_soc": ChoiceOutcome(
                choice_id="escalate_soc",
                is_safe=True,
                severity="none",
                security_delta=23,
                xp_delta=17,
                teach_title="Escalate early",
                teach_body=(
                    "Forwarding or escalating suspicious mail to SOC/IT helps correlate campaigns and update filters "
                    "before others click."
                ),
                show_consequences=False,
                consequence_steps=[],
            ),
        }
    return {
        "open_link": ChoiceOutcome(
            choice_id="open_link",
            is_safe=False,
            severity="critical",
            security_delta=-35,
            xp_delta=-20,
            teach_title="Фишинговая ссылка",
            teach_body=(
                "Службы редко требуют «срочно» перейти по подозрительной ссылке. Домен может отличаться "
                "на одну букву. Открывайте официальное приложение или вводите адрес сайта вручную."
            ),
            show_consequences=True,
            consequence_steps=[
                {"title": "Сессия перехвачена", "detail": "Поддельная страница украла логин и пароль."},
                {"title": "Списание средств", "detail": "Мошенники инициировали переводы."},
                {"title": "Утечка данных", "detail": "Контакты и документы могли быть скачаны."},
            ],
        ),
        "delete_only": ChoiceOutcome(
            choice_id="delete_only",
            is_safe=True,
            severity="low",
            security_delta=8,
            xp_delta=6,
            teach_title="Лучше, чем кликнуть",
            teach_body=(
                "Удаление снижает риск для вас, но репорт помогает коллегам. "
                "Используйте кнопку «Сообщить о фишинге» или SOC, если есть."
            ),
            show_consequences=False,
            consequence_steps=[],
        ),
        "verify_sender": ChoiceOutcome(
            choice_id="verify_sender",
            is_safe=True,
            severity="none",
            security_delta=20,
            xp_delta=15,
            teach_title="Проверьте отправителя",
            teach_body=(
                "Адрес, Reply-To, тон письма. При сомнении звоните в организацию по номеру из контактов, "
                "которым вы уже доверяете — не из письма."
            ),
            show_consequences=False,
            consequence_steps=[],
        ),
        "report": ChoiceOutcome(
            choice_id="report",
            is_safe=True,
            severity="none",
            security_delta=25,
            xp_delta=20,
            teach_title="Лучшая практика",
            teach_body=(
                "Репорт обучает фильтры и SOC. Вместе с проверкой отправителя это сильнее всего снижает риск."
            ),
            show_consequences=False,
            consequence_steps=[],
        ),
        "escalate_soc": ChoiceOutcome(
            choice_id="escalate_soc",
            is_safe=True,
            severity="none",
            security_delta=23,
            xp_delta=17,
            teach_title="Ранняя эскалация",
            teach_body=(
                "Пересылка или эскалация подозрительного письма в SOC/ИБ помогает связать кампании и обновить фильтры, "
                "пока коллеги не кликнули."
            ),
            show_consequences=False,
            consequence_steps=[],
        ),
    }


def _outcomes_chat(locale: Locale) -> dict[str, ChoiceOutcome]:
    if locale == "en":
        return {
            "send_codes": ChoiceOutcome(
                choice_id="send_codes",
                is_safe=False,
                severity="critical",
                security_delta=-40,
                xp_delta=-25,
                teach_title="Urgent request in chat",
                teach_body=(
                    "Urgent money, codes, passwords or 'do it now' from a manager in DM is a classic BEC / "
                    "impersonation pattern. Verify through a second channel you trust (known phone number)."
                ),
                show_consequences=True,
                consequence_steps=[
                    {"title": "Account takeover", "detail": "Weak or reused credentials gave access to the account."},
                    {"title": "Funds lost", "detail": "Transfers or cards were cashed out; recovery is hard."},
                    {"title": "Data leak", "detail": "Attackers used trust to extract files and messages."},
                ],
            ),
            "callback": ChoiceOutcome(
                choice_id="callback",
                is_safe=True,
                severity="none",
                security_delta=22,
                xp_delta=18,
                teach_title="Out-of-band verification",
                teach_body=(
                    "Calling the person on a known number breaks the attack chain. If they confirm, proceed via official process."
                ),
                show_consequences=False,
                consequence_steps=[],
            ),
            "official_channel": ChoiceOutcome(
                choice_id="official_channel",
                is_safe=True,
                severity="none",
                security_delta=18,
                xp_delta=14,
                teach_title="Use official workflows",
                teach_body=(
                    "Finance, IT and HR requests should go through tickets or approved tools — not random DMs."
                ),
                show_consequences=False,
                consequence_steps=[],
            ),
            "ignore": ChoiceOutcome(
                choice_id="ignore",
                is_safe=True,
                severity="low",
                security_delta=10,
                xp_delta=8,
                teach_title="Do nothing harmful",
                teach_body=(
                    "Ignoring avoids immediate damage, but a quick heads-up to IT/Security helps others."
                ),
                show_consequences=False,
                consequence_steps=[],
            ),
            "escalate_soc": ChoiceOutcome(
                choice_id="escalate_soc",
                is_safe=True,
                severity="none",
                security_delta=24,
                xp_delta=19,
                teach_title="Report the thread",
                teach_body=(
                    "SOC can block senders, revoke sessions, and warn peers. Reporting suspicious DMs is as important "
                    "as reporting phishing mail."
                ),
                show_consequences=False,
                consequence_steps=[],
            ),
        }
    return {
        "send_codes": ChoiceOutcome(
            choice_id="send_codes",
            is_safe=False,
            severity="critical",
            security_delta=-40,
            xp_delta=-25,
            teach_title="Срочная просьба в чате",
            teach_body=(
                "Деньги, коды, пароли или «сделай сейчас» от «руководителя» в личке — типичный BEC/подмена. "
                "Проверьте вторым каналом (звонок на известный номер)."
            ),
            show_consequences=True,
            consequence_steps=[
                {"title": "Взлом или подмена", "detail": "Слабый пароль или сессия дали доступ к аккаунту."},
                {"title": "Потеря денег", "detail": "Перевод или карты обналичены, возврат сложен."},
                {"title": "Утечка", "detail": "Под доверие вытянули файлы и переписку."},
            ],
        ),
        "callback": ChoiceOutcome(
            choice_id="callback",
            is_safe=True,
            severity="none",
            security_delta=22,
            xp_delta=18,
            teach_title="Проверка вне чата",
            teach_body=(
                "Звонок человеку на известный номер разрывает цепочку. Если подтвердят — действуйте по официальному процессу."
            ),
            show_consequences=False,
            consequence_steps=[],
        ),
        "official_channel": ChoiceOutcome(
            choice_id="official_channel",
            is_safe=True,
            severity="none",
            security_delta=18,
            xp_delta=14,
            teach_title="Официальные каналы",
            teach_body=(
                "Финансы, IT и HR — через тикеты и утверждённые системы, не через случайные DM."
            ),
            show_consequences=False,
            consequence_steps=[],
        ),
        "ignore": ChoiceOutcome(
            choice_id="ignore",
            is_safe=True,
            severity="low",
            security_delta=10,
            xp_delta=8,
            teach_title="Без вреда",
            teach_body=(
                "Игнор не даёт немедленного ущерба, но короткое сообщение в IT/Security защищает коллег."
            ),
            show_consequences=False,
            consequence_steps=[],
        ),
        "escalate_soc": ChoiceOutcome(
            choice_id="escalate_soc",
            is_safe=True,
            severity="none",
            security_delta=24,
            xp_delta=19,
            teach_title="Сообщить в SOC",
            teach_body=(
                "SOC может заблокировать отправителя, отозвать сессии и предупредить коллег. Подозрительный DM важно "
                "репортить так же, как фишинговое письмо."
            ),
            show_consequences=False,
            consequence_steps=[],
        ),
    }


def _outcomes_wifi(locale: Locale) -> dict[str, ChoiceOutcome]:
    if locale == "en":
        return {
            "join_open": ChoiceOutcome(
                choice_id="join_open",
                is_safe=False,
                severity="critical",
                security_delta=-32,
                xp_delta=-18,
                teach_title="Open Wi‑Fi risk",
                teach_body=(
                    "Unencrypted traffic can be sniffed or tampered with (captive portals, DNS, MITM). "
                    "Prefer a network where you verified encryption and credentials with staff."
                ),
                show_consequences=True,
                consequence_steps=[
                    {"title": "Session hijack", "detail": "Cookies and tokens were read from plain HTTP."},
                    {"title": "Credential theft", "detail": "A fake login page harvested passwords."},
                    {"title": "Malware injection", "detail": "Downloads or updates could be swapped in transit."},
                ],
            ),
            "install_portal_offer": ChoiceOutcome(
                choice_id="install_portal_offer",
                is_safe=False,
                severity="critical",
                security_delta=-38,
                xp_delta=-22,
                teach_title="Do not install from captive pages",
                teach_body=(
                    "“Speed boosters”, VPNs and unknown profiles pushed on hotspot pages are a common malware vector. "
                    "Use official app stores and corporate VPN if required."
                ),
                show_consequences=True,
                consequence_steps=[
                    {"title": "Device compromised", "detail": "The app gained broad permissions or a profile."},
                    {"title": "Data exfiltration", "detail": "Contacts, SMS, or work mail were accessed."},
                ],
            ),
            "connect_strongest_unverified": ChoiceOutcome(
                choice_id="connect_strongest_unverified",
                is_safe=False,
                severity="medium",
                security_delta=-18,
                xp_delta=-10,
                teach_title="Evil twin SSID",
                teach_body=(
                    "Attackers clone popular names with a strong signal. Always match the SSID and password source "
                    "with venue staff or official signage — not only signal bars."
                ),
                show_consequences=False,
                consequence_steps=[],
            ),
            "use_verified_encrypted": ChoiceOutcome(
                choice_id="use_verified_encrypted",
                is_safe=True,
                severity="none",
                security_delta=24,
                xp_delta=18,
                teach_title="Verified encrypted network",
                teach_body=(
                    "Asking staff for the guest SSID and passphrase (or using a known WPA2/WPA3 network) cuts MITM risk. "
                    "Still avoid sensitive logins without VPN where policy requires it."
                ),
                show_consequences=False,
                consequence_steps=[],
            ),
            "report_suspicious_ssid": ChoiceOutcome(
                choice_id="report_suspicious_ssid",
                is_safe=True,
                severity="none",
                security_delta=22,
                xp_delta=16,
                teach_title="Report duplicates",
                teach_body=(
                    "Telling staff or security about a suspicious duplicate network helps protect other visitors "
                    "and may trigger an incident response."
                ),
                show_consequences=False,
                consequence_steps=[],
            ),
        }
    return {
        "join_open": ChoiceOutcome(
            choice_id="join_open",
            is_safe=False,
            severity="critical",
            security_delta=-32,
            xp_delta=-18,
            teach_title="Риск открытой сети",
            teach_body=(
                "В незашифрованной сети трафик могут прослушивать и подменять (captive portal, DNS, MITM). "
                "Предпочитайте сеть, где вы подтвердили шифрование и пароль у персонала."
            ),
            show_consequences=True,
            consequence_steps=[
                {"title": "Перехват сессии", "detail": "По HTTP прочитали cookie и токены."},
                {"title": "Кража паролей", "detail": "Поддельная страница входа собрала учётные данные."},
                {"title": "Вредонос", "detail": "Подменили загрузки или обновления по пути."},
            ],
        ),
        "install_portal_offer": ChoiceOutcome(
            choice_id="install_portal_offer",
            is_safe=False,
            severity="critical",
            security_delta=-38,
            xp_delta=-22,
            teach_title="Не ставьте ПО со страницы входа",
            teach_body=(
                "«Ускорители», VPN и неизвестные профили на странице хот-спота — частый вектор вредоносов. "
                "Используйте официальные магазины приложений и корпоративный VPN по политике."
            ),
            show_consequences=True,
            consequence_steps=[
                {"title": "Компрометация устройства", "detail": "Приложение или профиль получили широкие права."},
                {"title": "Утечка данных", "detail": "Доступ к контактам, SMS или рабочей почте."},
            ],
        ),
        "connect_strongest_unverified": ChoiceOutcome(
            choice_id="connect_strongest_unverified",
            is_safe=False,
            severity="medium",
            security_delta=-18,
            xp_delta=-10,
            teach_title="Evil twin по имени SSID",
            teach_body=(
                "Злоумышленники клонируют популярные имена с сильным сигналом. Сверяйте SSID и источник пароля "
                "с персоналом или официальными указателями — не только по уровню сигнала."
            ),
            show_consequences=False,
            consequence_steps=[],
        ),
        "use_verified_encrypted": ChoiceOutcome(
            choice_id="use_verified_encrypted",
            is_safe=True,
            severity="none",
            security_delta=24,
            xp_delta=18,
            teach_title="Проверенная зашифрованная сеть",
            teach_body=(
                "Уточнить у персонала гостевой SSID и пароль (или известную WPA2/WPA3 сеть) снижает риск MITM. "
                "Чувствительные входы — только с VPN, если так требует политика."
            ),
            show_consequences=False,
            consequence_steps=[],
        ),
        "report_suspicious_ssid": ChoiceOutcome(
            choice_id="report_suspicious_ssid",
            is_safe=True,
            severity="none",
            security_delta=22,
            xp_delta=16,
            teach_title="Сообщить о дубликате",
            teach_body=(
                "Сообщить персоналу или охране о подозрительной «копии» сети защищает других посетителей "
                "и может запустить реагирование."
            ),
            show_consequences=False,
            consequence_steps=[],
        ),
    }


def _choices_wifi(locale: Locale) -> list[dict[str, str]]:
    if locale == "en":
        return [
            {"id": "join_open", "label": "Connect to the open network — fastest"},
            {"id": "install_portal_offer", "label": "Install the “Wi‑Fi booster” from the login page"},
            {"id": "connect_strongest_unverified", "label": "Pick the strongest signal without checking the name"},
            {"id": "use_verified_encrypted", "label": "Ask staff and use the official guest / encrypted network"},
            {"id": "report_suspicious_ssid", "label": "Tell staff security about a suspicious duplicate SSID"},
        ]
    return [
        {"id": "join_open", "label": "Подключиться к открытой сети — быстрее всего"},
        {"id": "install_portal_offer", "label": "Установить «ускоритель Wi‑Fi» со страницы входа"},
        {"id": "connect_strongest_unverified", "label": "Взять самый сильный сигнал без проверки имени"},
        {"id": "use_verified_encrypted", "label": "Спросить персонал и подключиться к официальной гостевой / с шифрованием"},
        {"id": "report_suspicious_ssid", "label": "Сообщить охране/администратору о подозрительном дубликате SSID"},
    ]


def _choices_mail(locale: Locale) -> list[dict[str, str]]:
    if locale == "en":
        return [
            {"id": "open_link", "label": "Open the link"},
            {"id": "delete_only", "label": "Delete email"},
            {"id": "verify_sender", "label": "Check sender details"},
            {"id": "report", "label": "Report phishing"},
            {"id": "escalate_soc", "label": "Escalate to SOC / IT security"},
        ]
    return [
        {"id": "open_link", "label": "Открыть ссылку"},
        {"id": "delete_only", "label": "Удалить письмо"},
        {"id": "verify_sender", "label": "Проверить отправителя"},
        {"id": "report", "label": "Сообщить о фишинге"},
        {"id": "escalate_soc", "label": "Передать в SOC / ИБ"},
    ]


def _choices_chat_gifts(locale: Locale) -> list[dict[str, str]]:
    if locale == "en":
        return [
            {"id": "send_codes", "label": "Send the codes now"},
            {"id": "callback", "label": "Call back on a known number"},
            {"id": "official_channel", "label": "Ask to use official procurement"},
            {"id": "ignore", "label": "Ignore for now"},
            {"id": "escalate_soc", "label": "Report thread to security / SOC"},
        ]
    return [
        {"id": "send_codes", "label": "Отправить коды сейчас"},
        {"id": "callback", "label": "Перезвонить на известный номер"},
        {"id": "official_channel", "label": "Попросить оформить через закупки"},
        {"id": "ignore", "label": "Пока не отвечать"},
        {"id": "escalate_soc", "label": "Сообщить в ИБ / SOC"},
    ]


def _choices_chat_wire(locale: Locale) -> list[dict[str, str]]:
    if locale == "en":
        return [
            {"id": "send_codes", "label": "Wire the money now"},
            {"id": "callback", "label": "Call finance / manager on a known line"},
            {"id": "official_channel", "label": "Open a ticket in the banking portal"},
            {"id": "ignore", "label": "Ignore until verified"},
            {"id": "escalate_soc", "label": "Report thread to security / SOC"},
        ]
    return [
        {"id": "send_codes", "label": "Срочно перевести по реквизитам"},
        {"id": "callback", "label": "Позвонить в финансы / руководителю"},
        {"id": "official_channel", "label": "Оформить через корпоративный портал / тикет"},
        {"id": "ignore", "label": "Не реагировать до проверки"},
        {"id": "escalate_soc", "label": "Сообщить в ИБ / SOC"},
    ]


def _choices_chat_it(locale: Locale) -> list[dict[str, str]]:
    if locale == "en":
        return [
            {"id": "send_codes", "label": "Send my password here"},
            {"id": "callback", "label": "Call IT on the internal directory number"},
            {"id": "official_channel", "label": "Open a ticket in the service desk"},
            {"id": "ignore", "label": "Ignore — IT never asks for passwords"},
            {"id": "escalate_soc", "label": "Report thread to security / SOC"},
        ]
    return [
        {"id": "send_codes", "label": "Написать пароль в чат"},
        {"id": "callback", "label": "Позвонить в IT по внутреннему номеру"},
        {"id": "official_channel", "label": "Создать тикет в service desk"},
        {"id": "ignore", "label": "Игнор — IT не просит пароли в чате"},
        {"id": "escalate_soc", "label": "Сообщить в ИБ / SOC"},
    ]


def _training_links_mail_bank(locale: Locale) -> list[dict[str, object]]:
    """Четыре разные «пришедшие» ссылки: 2 условно легитимных, 2 фишинга с разным типом ловушки."""
    if locale == "en":
        return [
            {
                "id": "tl-mail-safe-docs",
                "href": "https://sharepoint.corp.example.com/sites/q4-review/shared",
                "label": "Shared folder — Q4 review (internal example)",
                "is_phishing": False,
            },
            {
                "id": "tl-mail-safe-lms",
                "href": "https://learn.corp.example.com/security/phishing-basics",
                "label": "Enroll: phishing awareness micro-course (LMS example)",
                "is_phishing": False,
            },
            {
                "id": "tl-mail-phish-parcel",
                "href": "https://logifast-parcel-reschedule.net/track?id=US-88421",
                "label": "Delivery failed — reschedule window (carrier message)",
                "is_phishing": True,
                "breach_subject": "Shipment US-88421: pay $1.99 processing to unlock tracking",
                "breach_preview": (
                    "We could not complete delivery. Pay a small customs/processing fee by card to confirm your "
                    "address and unlock tracking. After payment you can pick a new time slot."
                ),
            },
            {
                "id": "tl-mail-phish-wifi",
                "href": "https://office-guest-wifi-portal.xyz/connect",
                "label": "Office guest Wi‑Fi — portal login (building lobby poster)",
                "is_phishing": True,
                "breach_subject": "Connect to OFFICE-GUEST secure network",
                "breach_preview": (
                    "Enter the visitor code from reception, then your phone number and the Wi‑Fi password printed on "
                    "the router label so we can bind your device to the guest SSID."
                ),
            },
        ]
    return [
        {
            "id": "tl-mail-safe-docs",
            "href": "https://sharepoint.corp.example.com/sites/q4-review/shared",
            "label": "Файлы для согласования — общая папка SharePoint (пример)",
            "is_phishing": False,
        },
        {
            "id": "tl-mail-safe-lms",
            "href": "https://learn.corp.example.com/security/phishing-basics",
            "label": "Запись на курс «Распознавание фишинга» — корпоративный LMS",
            "is_phishing": False,
        },
        {
            "id": "tl-mail-phish-parcel",
            "href": "https://logifast-parcel-reschedule.ru/track?id=RU-88421",
            "label": "Курьер не доставил посылку — переназначьте интервал",
            "is_phishing": True,
            "breach_subject": "Отправление RU-88421: оплатите оформление 99 ₽ для выбора даты",
            "breach_preview": (
                "Отслеживание посылки приостановлено. Оплатите услугу повторной доставки картой, чтобы подтвердить "
                "адрес и открыть календарь интервалов. Таможенное оформление уже включено в сумму."
            ),
        },
        {
            "id": "tl-mail-phish-wifi",
            "href": "https://office-guest-wifi-portal.xyz/connect",
            "label": "Гостевой Wi‑Fi в офисе — вход через портал (как на стикере)",
            "is_phishing": True,
            "breach_subject": "Подключение к сети OFFICE-GUEST",
            "breach_preview": (
                "Введите код с ресепшена, номер телефона и пароль с наклейки роутера — так система привяжет ваше "
                "устройство к гостевому SSID. Без этого доступ к интернету не откроется."
            ),
        },
    ]


def _training_links_chat_it(locale: Locale) -> list[dict[str, object]]:
    """Чат: четыре ссылки разного сценария — документация, встреча, фишинг «файл», фишинг «подпись/счёт»."""
    if locale == "en":
        return [
            {
                "id": "tl-chat-safe-wiki",
                "href": "https://confluence.corp.example.com/display/IT/password-policy",
                "label": "IT wiki — password policy (bookmark)",
                "is_phishing": False,
            },
            {
                "id": "tl-chat-safe-meet",
                "href": "https://meet.corp.example.com/b/standup-930",
                "label": "Daily standup — internal video room",
                "is_phishing": False,
            },
            {
                "id": "tl-chat-phish-file",
                "href": "https://shared-file-secure.io/download?f=q3_bonus.xlsx",
                "label": "“HR sent a spreadsheet” — open in browser",
                "is_phishing": True,
                "breach_subject": "Q3 bonus breakdown — unlock protected workbook",
                "breach_preview": (
                    "The file is encrypted for your email. Enter your corporate password and approve the sign-in prompt "
                    "so we can verify you before showing payroll figures."
                ),
            },
            {
                "id": "tl-chat-phish-sign",
                "href": "https://docusign-docs-verify.net/sign/contract-7721",
                "label": "Contract awaiting signature (external)",
                "is_phishing": True,
                "breach_subject": "Invoice INV-7721 — sign & pay verification hold",
                "breach_preview": (
                    "A vendor invoice is attached. Pay a €1 verification charge by card to release the DocuSign "
                    "envelope — this matches our anti-fraud policy for first-time contractors."
                ),
            },
        ]
    return [
        {
            "id": "tl-chat-safe-wiki",
            "href": "https://confluence.corp.example.com/display/IT/password-policy",
            "label": "Внутренняя wiki — политика паролей (закладка коллеги)",
            "is_phishing": False,
        },
        {
            "id": "tl-chat-safe-meet",
            "href": "https://meet.corp.example.com/b/standup-930",
            "label": "Ежедневный стендап — корпоративная видеокомната",
            "is_phishing": False,
        },
        {
            "id": "tl-chat-phish-file",
            "href": "https://shared-file-secure.io/download?f=q3_bonus.xlsx",
            "label": "«HR прислала таблицу» — открыть в браузере",
            "is_phishing": True,
            "breach_subject": "Файл с премией Q3 — снимите защиту книги Excel",
            "breach_preview": (
                "Книга зашифрована под вашу почту. Введите корпоративный пароль и подтвердите вход, чтобы мы "
                "убедились, что это вы, прежде чем показать суммы по премиям."
            ),
        },
        {
            "id": "tl-chat-phish-sign",
            "href": "https://docusign-docs-verify.net/sign/dogovor-7721",
            "label": "Договор на подпись (внешняя ссылка)",
            "is_phishing": True,
            "breach_subject": "Счёт № INV-7721 — оплатите проверочный платёж для подписания",
            "breach_preview": (
                "К договору приложен счёт подрядчика. Укажите данные карты для верификационного платежа 1 € — так "
                "мы отпускаем конверт DocuSign по правилам антифрода для новых контрагентов."
            ),
        },
    ]


def _scenario_by_id(scenario_id: str, locale: Locale) -> dict | None:
    sid = _canonical_id(scenario_id)

    if sid == "phishing-mail-bank":
        if locale == "en":
            return {
                "id": sid,
                "type": "email",
                "title": "Urgent: security verification",
                "sender_display": "SecureBank Alerts",
                "sender_email": "alerts@securebank-updates.net",
                "subject": "Action required: confirm your device within 24 hours",
                "preview": "Dear customer, we detected unusual login activity...",
                "body_paragraphs": [
                    "We detected a login to your online banking from an unrecognized device in Tallinn, Estonia.",
                    "If this was not you, you must verify your identity immediately to prevent a hold on outgoing transfers.",
                    "Use the secure link below — it expires in 24 hours.",
                ],
                "cta_label": "Verify my device",
                "cta_href_display": "https://securebank-updates.net/verify?session=7f3a…",
                "training_links": _training_links_mail_bank(locale),
                "choices": _choices_mail(locale),
            }
        return {
            "id": sid,
            "type": "email",
            "title": "Срочно: проверка безопасности",
            "sender_display": "SecureBank Уведомления",
            "sender_email": "alerts@securebank-updates.net",
            "subject": "Требуется действие: подтвердите устройство в течение 24 часов",
            "preview": "Уважаемый клиент, зафиксирован необычный вход...",
            "body_paragraphs": [
                "Мы зафиксировали вход в интернет-банк с незнакомого устройства (Таллин, Эстония).",
                "Если это были не вы, необходимо срочно подтвердить личность, иначе будут ограничены исходящие переводы.",
                "Используйте защищённую ссылку ниже — она действует 24 часа.",
            ],
            "cta_label": "Подтвердить устройство",
            "cta_href_display": "https://securebank-updates.net/verify?session=7f3a…",
            "training_links": _training_links_mail_bank(locale),
            "choices": _choices_mail(locale),
        }

    if sid == "phishing-mail-parcel":
        if locale == "en":
            return {
                "id": sid,
                "type": "email",
                "title": "Your parcel is on hold — customs fee",
                "sender_display": "GlobalPost Tracking",
                "sender_email": "noreply@globalpost-track.support",
                "subject": "Shipment #GP-88421: pay €2.40 to release",
                "preview": "We could not deliver your package. Pay online to reschedule...",
                "body_paragraphs": [
                    "Your parcel is waiting at the sorting center. A customs processing fee of €2.40 must be paid within 48 hours.",
                    "After payment you can choose a new delivery window. Unpaid parcels are returned to sender.",
                    "Use the link below — you will need your phone number and card for verification only.",
                ],
                "cta_label": "Pay fee & track parcel",
                "cta_href_display": "https://globalpost-track.support/pay?id=GP88421…",
                "training_links": _training_links_mail_bank(locale),
                "choices": _choices_mail(locale),
            }
        return {
            "id": sid,
            "type": "email",
            "title": "Посылка задержана — таможенный сбор",
            "sender_display": "Служба доставки GlobalPost",
            "sender_email": "noreply@globalpost-track.support",
            "subject": "Отправление №GP-88421: оплатите 199 ₽ для выдачи",
            "preview": "Не удалось вручить посылку. Оплатите онлайн для повторной доставки...",
            "body_paragraphs": [
                "Ваша посылка ожидает на сортировочном центре. Необходимо оплатить оформление таможенного платежа 199 ₽ в течение 48 часов.",
                "После оплаты вы сможете выбрать удобное окно доставки. Неоплаченные отправления возвращаются отправителю.",
                "Перейдите по ссылке — потребуется только номер телефона и карта для «проверки».",
            ],
            "cta_label": "Оплатить и отследить",
            "cta_href_display": "https://globalpost-track.support/pay?id=GP88421…",
            "training_links": _training_links_mail_bank(locale),
            "choices": _choices_mail(locale),
        }

    if sid == "phishing-mail-payroll":
        if locale == "en":
            return {
                "id": sid,
                "type": "email",
                "title": "Payroll update — confirm by Friday",
                "sender_display": "HR Portal",
                "sender_email": "hr-notifications@company-hrportal.io",
                "subject": "Action: verify bank details for March payroll",
                "preview": "Dear employee, our payroll partner requires confirmation...",
                "body_paragraphs": [
                    "To comply with new banking rules, please confirm the account we use for salary transfers.",
                    "If you do not confirm by Friday 18:00, your March payment may be delayed.",
                    "This is a one-time secure form — it takes under two minutes.",
                ],
                "cta_label": "Confirm payroll details",
                "cta_href_display": "https://company-hrportal.io/payroll/verify?token=…",
                "training_links": _training_links_mail_bank(locale),
                "choices": _choices_mail(locale),
            }
        return {
            "id": sid,
            "type": "email",
            "title": "Обновление зарплатных реквизитов",
            "sender_display": "Кадры — корпоративный портал",
            "sender_email": "hr-notifications@company-hrportal.io",
            "subject": "Требуется подтвердить реквизиты для выплаты за март",
            "preview": "Уважаемый сотрудник, партнёр по выплатам просит подтверждение...",
            "body_paragraphs": [
                "В связи с обновлением требований банка просим подтвердить счёт, на который начисляется зарплата.",
                "Если не подтвердить до пятницы 18:00, выплата за март может быть задержана.",
                "Это разовая защищённая форма — займёт меньше двух минут.",
            ],
            "cta_label": "Подтвердить реквизиты",
            "cta_href_display": "https://company-hrportal.io/payroll/verify?token=…",
            "training_links": _training_links_mail_bank(locale),
            "choices": _choices_mail(locale),
        }

    if sid == "se-chat-gifts":
        if locale == "en":
            return {
                "id": sid,
                "type": "chat",
                "title": "Work chat — gift cards",
                "peer_name": "Alex — Director",
                "peer_handle": "alex_director_office",
                "messages": [
                    {
                        "from": "peer",
                        "text": (
                            "Hey, I'm in back-to-back meetings. Need a quick favor — buy 4x $500 Apple gift cards "
                            "for a client incentive. Send codes here, I'll reimburse today. URGENT, don't tell finance yet."
                        ),
                        "time": "14:02",
                    }
                ],
                "training_links": _training_links_chat_it(locale),
                "choices": _choices_chat_gifts(locale),
            }
        return {
            "id": sid,
            "type": "chat",
            "title": "Рабочий чат — подарочные карты",
            "peer_name": "Алексей — директор",
            "peer_handle": "alex_director_office",
            "messages": [
                {
                    "from": "peer",
                    "text": (
                        "Привет, сижу на беспрерывных созвонах. Нужна срочная помощь — купи 4 подарочные карты Apple "
                        "по $500 для клиентского поощрения. Коды пришли сюда, сегодня компенсирую. СРОЧНО, финотделу пока не говори."
                    ),
                    "time": "14:02",
                }
            ],
            "training_links": _training_links_chat_it(locale),
            "choices": _choices_chat_gifts(locale),
        }

    if sid == "se-chat-wire":
        if locale == "en":
            return {
                "id": sid,
                "type": "chat",
                "title": "Work chat — urgent transfer",
                "peer_name": "Maria — CFO",
                "peer_handle": "maria_cfo_exec",
                "messages": [
                    {
                        "from": "peer",
                        "text": (
                            "Hi — I'm on a plane with bad VPN. We must pay vendor invoice #V-9921 today or we lose "
                            "the discount. Wire to the account in the PDF I emailed; send me the confirmation screenshot here. "
                            "Do not loop legal, they're in hearings."
                        ),
                        "time": "09:41",
                    }
                ],
                "training_links": _training_links_chat_it(locale),
                "choices": _choices_chat_wire(locale),
            }
        return {
            "id": sid,
            "type": "chat",
            "title": "Рабочий чат — срочный перевод",
            "peer_name": "Мария — финансовый директор",
            "peer_handle": "maria_cfo_exec",
            "messages": [
                {
                    "from": "peer",
                    "text": (
                        "Привет, я в самолёте, VPN отваливается. Нужно сегодня оплатить счёт контрагенту №V-9921, "
                        "иначе сгорит скидка. Реквизиты в PDF, который кинула на почту — переведи и пришли скрин подтверждения сюда. "
                        "Юристов не подключай, у них слушания."
                    ),
                    "time": "09:41",
                }
            ],
            "training_links": _training_links_chat_it(locale),
            "choices": _choices_chat_wire(locale),
        }

    if sid == "se-chat-it":
        if locale == "en":
            return {
                "id": sid,
                "type": "chat",
                "title": "Work chat — IT support",
                "peer_name": "IT Helpdesk",
                "peer_handle": "it_support_urgent01",
                "messages": [
                    {
                        "from": "peer",
                        "text": (
                            "Hello, this is IT. We are migrating mail servers tonight. Reply with your corporate password "
                            "so we can sync your mailbox — do not use the ticket system, it's overloaded. "
                            "Deadline in 20 minutes or your account will be locked."
                        ),
                        "time": "16:58",
                    }
                ],
                "training_links": _training_links_chat_it(locale),
                "choices": _choices_chat_it(locale),
            }
        return {
            "id": sid,
            "type": "chat",
            "title": "Рабочий чат — «IT»",
            "peer_name": "Техподдержка IT",
            "peer_handle": "it_support_urgent01",
            "messages": [
                {
                    "from": "peer",
                    "text": (
                        "Здравствуйте, это IT. Сегодня ночью миграция почтовых серверов. Ответьте в чат корпоративным паролём, "
                        "чтобы мы синхронизировали ящик — тикет-система перегружена, не используйте её. "
                        "Через 20 минут учётка будет заблокирована при отсутствии ответа."
                    ),
                    "time": "16:58",
                }
            ],
            "training_links": _training_links_chat_it(locale),
            "choices": _choices_chat_it(locale),
        }

    if sid == "vishing-bank":
        if locale == "en":
            return {
                "id": sid,
                "type": "chat",
                "step": 1,
                "total_steps": 1,
                "narrative_arc": "Voice: caller pretends to be bank fraud team",
                "attack_family": "vishing",
                "title": "Incoming call — “bank security”",
                "peer_name": "Caller · Fraud desk",
                "peer_handle": "unknown_caller",
                "voice_call": _vishing_voice_hybrid(
                    track_base="vishing-bank",
                    cues_sec=[0.0, 10.962, 21.228],
                    pause_between_ms=600,
                    locale=locale,
                ),
                "messages": [
                    {
                        "from": "peer",
                        "text": (
                            "Good afternoon, this is MegaBank fraud monitoring. We just blocked an online charge of "
                            "one thousand one hundred dollars from your card. Was that you?"
                        ),
                        "time": "12:41",
                    },
                    {
                        "from": "peer",
                        "text": (
                            "To reverse the hold, I need the three-digit security code on the back of the card and "
                            "the one-time code from the SMS we are sending now. Please read them clearly."
                        ),
                        "time": "12:41",
                    },
                    {
                        "from": "peer",
                        "text": (
                            "Do not hang up — you have about two minutes before the transaction is released to the merchant."
                        ),
                        "time": "12:42",
                    },
                ],
                "training_links": _training_links_chat_it(locale),
                "choices": _choices_chat_wire(locale),
            }
        return {
            "id": sid,
            "type": "chat",
            "step": 1,
            "total_steps": 1,
            "narrative_arc": "Звонок: «служба безопасности банка»",
            "attack_family": "vishing",
            "title": "Входящий звонок — «безопасность банка»",
            "peer_name": "Абонент · антифрод",
            "peer_handle": "unknown_caller",
            "voice_call": _vishing_voice_hybrid(
                track_base="vishing-bank",
                cues_sec=[0.0, 11.034, 21.804],
                pause_between_ms=600,
                locale=locale,
            ),
            "messages": [
                {
                    "from": "peer",
                    "text": (
                        "Добрый день, антифрод МегаБанка. Мы остановили онлайн-оплату на 89 тысяч рублей с вашей карты. "
                        "Это были вы?"
                    ),
                    "time": "12:41",
                },
                {
                    "from": "peer",
                    "text": (
                        "Чтобы снять блокировку, назовите трёхзначный код на обороте карты и одноразовый код из СМС, "
                        "которое мы сейчас отправим. Произнесите чётко."
                    ),
                    "time": "12:41",
                },
                {
                    "from": "peer",
                    "text": (
                        "Не кладите трубку — у вас около двух минут, иначе операция уйдёт получателю."
                    ),
                    "time": "12:42",
                },
            ],
            "training_links": _training_links_chat_it(locale),
            "choices": _choices_chat_wire(locale),
        }

    if sid == "vishing-it":
        if locale == "en":
            return {
                "id": sid,
                "type": "chat",
                "step": 1,
                "total_steps": 1,
                "narrative_arc": "Voice: fake IT support during “maintenance”",
                "attack_family": "vishing",
                "title": "Incoming call — “IT help desk”",
                "peer_name": "Caller · IT support",
                "peer_handle": "it_helpdesk_ext",
                "voice_call": _vishing_voice_hybrid(
                    track_base="vishing-it",
                    cues_sec=[0.0, 12.666],
                    pause_between_ms=550,
                    locale=locale,
                ),
                "messages": [
                    {
                        "from": "peer",
                        "text": (
                            "Hi, corporate IT on a recorded line. We're finishing mailbox migration — half of the team "
                            "already confirmed. I need your login password here to sync your profile before the cutoff."
                        ),
                        "time": "09:14",
                    },
                    {
                        "from": "peer",
                        "text": (
                            "The ticket portal is down, that's why we're calling. It takes ten seconds — spell the password "
                            "slowly, numbers included."
                        ),
                        "time": "09:15",
                    },
                ],
                "training_links": _training_links_chat_it(locale),
                "choices": _choices_chat_it(locale),
            }
        return {
            "id": sid,
            "type": "chat",
            "step": 1,
            "total_steps": 1,
            "narrative_arc": "Звонок: фейковая IT-поддержка",
            "attack_family": "vishing",
            "title": "Входящий звонок — «IT-поддержка»",
            "peer_name": "Абонент · техподдержка",
            "peer_handle": "it_helpdesk_ext",
            "voice_call": _vishing_voice_hybrid(
                track_base="vishing-it",
                cues_sec=[0.0, 15.522],
                pause_between_ms=550,
                locale=locale,
            ),
            "messages": [
                {
                    "from": "peer",
                    "text": (
                        "Здравствуйте, корпоративный IT, разговор записывается. Завершаем миграцию почты — половина "
                        "отдела уже подтвердила. Нужен ваш пароль от учётной записи, чтобы синхронизировать профиль до отсечки."
                    ),
                    "time": "09:14",
                },
                {
                    "from": "peer",
                    "text": (
                        "Тикет-система лежит, поэтому звоним. Это займёт секунд десять — продиктуйте пароль по буквам, "
                        "цифры тоже."
                    ),
                    "time": "09:15",
                },
            ],
            "training_links": _training_links_chat_it(locale),
            "choices": _choices_chat_it(locale),
        }

    if sid == "vishing-courier":
        if locale == "en":
            return {
                "id": sid,
                "type": "chat",
                "step": 1,
                "total_steps": 1,
                "narrative_arc": "Voice: fake courier fee / customs",
                "attack_family": "vishing",
                "title": "Incoming call — “courier service”",
                "peer_name": "Caller · Delivery hotline",
                "peer_handle": "courier_line_884",
                "voice_call": _vishing_voice_hybrid(
                    track_base="vishing-courier",
                    cues_sec=[0.0, 12.594],
                    pause_between_ms=500,
                    locale=locale,
                ),
                "messages": [
                    {
                        "from": "peer",
                        "text": (
                            "Hello, express delivery. Your package is held at the hub — unpaid customs clearance of "
                            "four ninety-nine. Pay by card over the phone now or it returns to the sender tomorrow."
                        ),
                        "time": "17:03",
                    },
                    {
                        "from": "peer",
                        "text": (
                            "I can take card number, expiry and the code from the back — it's only for verification, "
                            "the charge is tiny."
                        ),
                        "time": "17:04",
                    },
                ],
                "training_links": _training_links_chat_it(locale),
                "choices": _choices_chat_gifts(locale),
            }
        return {
            "id": sid,
            "type": "chat",
            "step": 1,
            "total_steps": 1,
            "narrative_arc": "Звонок: «курьер» и сбор за доставку",
            "attack_family": "vishing",
            "title": "Входящий звонок — «служба доставки»",
            "peer_name": "Абонент · линия доставки",
            "peer_handle": "courier_line_884",
            "voice_call": _vishing_voice_hybrid(
                track_base="vishing-courier",
                cues_sec=[0.0, 15.09],
                pause_between_ms=500,
                locale=locale,
            ),
            "messages": [
                {
                    "from": "peer",
                    "text": (
                        "Здравствуйте, курьерская служба. Ваша посылка на складе — не оплачен таможенный сбор 499 рублей. "
                        "Оплатите картой по телефону сейчас, иначе завтра отправим обратно отправителю."
                    ),
                    "time": "17:03",
                },
                {
                    "from": "peer",
                    "text": (
                        "Могу принять номер карты, срок и код с оборота — это только для проверки, списание символическое."
                    ),
                    "time": "17:04",
                },
            ],
            "training_links": _training_links_chat_it(locale),
            "choices": _choices_chat_gifts(locale),
        }

    if sid == "wifi-cafe":
        if locale == "en":
            return {
                "id": sid,
                "type": "wifi",
                "title": "Coffee shop — two networks",
                "context": (
                    "You need internet for a short call. Two networks appear: an open one and a password-protected "
                    "guest network that matches what the barista wrote on the counter card."
                ),
                "networks": [
                    {
                        "ssid": "StarCoffee_Free",
                        "secured": False,
                        "note": "No password — anyone nearby can listen.",
                    },
                    {
                        "ssid": "StarCoffee_Guest",
                        "secured": True,
                        "note": "WPA2/WPA3 — passphrase from staff.",
                    },
                ],
                "choices": _choices_wifi(locale),
            }
        return {
            "id": sid,
            "type": "wifi",
            "title": "Кофейня — две сети",
            "context": (
                "Нужен интернет на короткий звонок. Видны две сети: открытая и гостевая с паролем, как на стикере у бариста."
            ),
            "networks": [
                {
                    "ssid": "StarCoffee_Free",
                    "secured": False,
                    "note": "Без пароля — рядом могут прослушивать трафик.",
                },
                {
                    "ssid": "StarCoffee_Guest",
                    "secured": True,
                    "note": "WPA2/WPA3 — пароль выдали на стойке.",
                },
            ],
            "choices": _choices_wifi(locale),
        }

    if sid == "wifi-airport":
        if locale == "en":
            return {
                "id": sid,
                "type": "wifi",
                "title": "Airport lounge Wi‑Fi",
                "context": (
                    "Before boarding you see “Airport_Free_WiFi” (open) and “Airport_Secure_Guest” on the info screen "
                    "next to the lounge desk with a QR and passphrase."
                ),
                "networks": [
                    {"ssid": "Airport_Free_WiFi", "secured": False, "note": "Open — high risk of rogue APs."},
                    {
                        "ssid": "Airport_Secure_Guest",
                        "secured": True,
                        "note": "Matches airport signage; WPA2/WPA3.",
                    },
                ],
                "choices": _choices_wifi(locale),
            }
        return {
            "id": sid,
            "type": "wifi",
            "title": "Wi‑Fi в зале ожидания",
            "context": (
                "Перед посадкой видны «Airport_Free_WiFi» (открытая) и «Airport_Secure_Guest» на экране у стойки "
                "информации с QR и паролем."
            ),
            "networks": [
                {"ssid": "Airport_Free_WiFi", "secured": False, "note": "Открытая — выше риск поддельных точек."},
                {
                    "ssid": "Airport_Secure_Guest",
                    "secured": True,
                    "note": "Совпадает с указателями аэропорта; WPA2/WPA3.",
                },
            ],
            "choices": _choices_wifi(locale),
        }

    if sid == "wifi-hotel":
        if locale == "en":
            return {
                "id": sid,
                "type": "wifi",
                "title": "Hotel lobby hotspot",
                "context": (
                    "Check-in slip lists “GrandHotel_Guest” with a passphrase. You also see “GrandHotel_LOBBY_FREE” "
                    "with a very strong signal."
                ),
                "networks": [
                    {
                        "ssid": "GrandHotel_Guest",
                        "secured": True,
                        "note": "Printed on your keycard envelope.",
                    },
                    {
                        "ssid": "GrandHotel_LOBBY_FREE",
                        "secured": False,
                        "note": "Name looks official but is not on your welcome pack.",
                    },
                ],
                "choices": _choices_wifi(locale),
            }
        return {
            "id": sid,
            "type": "wifi",
            "title": "Wi‑Fi в отеле",
            "context": (
                "В конверте с картой указаны «GrandHotel_Guest» и пароль. Рядом в списке — «GrandHotel_LOBBY_FREE» "
                "с очень сильным сигналом."
            ),
            "networks": [
                {
                    "ssid": "GrandHotel_Guest",
                    "secured": True,
                    "note": "Указано на конверте с ключ-картой.",
                },
                {
                    "ssid": "GrandHotel_LOBBY_FREE",
                    "secured": False,
                    "note": "Похоже на официальное имя, но его нет в приветственном пакете.",
                },
            ],
            "choices": _choices_wifi(locale),
        }

    return None


class SubmitChoiceBody(BaseModel):
    choice_id: str
    step: int = Field(1, ge=1, le=NARRATIVE_TOTAL_STEPS)


def _locale_from_request(request: Request, lang: str | None) -> Locale:
    if lang in ("ru", "en"):
        return lang
    accept = request.headers.get("accept-language", "")
    if accept.lower().startswith("ru"):
        return "ru"
    return "en"


def _list_entries(locale: Locale) -> list[dict[str, str]]:
    """Пять модулей, в каждом 5 уровней (шагов)."""
    if locale == "en":
        return [
            {"id": AGGREGATE_MAIL_ID, "type": "email", "title": "Home — personal email & phone"},
            {"id": AGGREGATE_CHAT_ID, "type": "chat", "title": "Office — messenger & corporate requests"},
            {"id": AGGREGATE_WIFI_ID, "type": "wifi", "title": "Public Wi‑Fi"},
            {"id": AGGREGATE_SKIMMING_ID, "type": "terminal", "title": "Skimming & payment terminals"},
            {"id": AGGREGATE_ACTION_ID, "type": "action_cards", "title": "Action choice — incidents"},
            {"id": "vishing-bank", "type": "chat", "title": "Voice — fake bank security (vishing)"},
            {"id": "vishing-it", "type": "chat", "title": "Voice — fake IT support (vishing)"},
            {"id": "vishing-courier", "type": "chat", "title": "Voice — fake courier fee (vishing)"},
        ]
    return [
        {"id": AGGREGATE_MAIL_ID, "type": "email", "title": "Дом — личная почта и смартфон"},
        {"id": AGGREGATE_CHAT_ID, "type": "chat", "title": "Офис — мессенджер и корпоративные запросы"},
        {"id": AGGREGATE_WIFI_ID, "type": "wifi", "title": "Общественный Wi‑Fi"},
        {"id": AGGREGATE_SKIMMING_ID, "type": "terminal", "title": "Скимминг и платёжные терминалы"},
        {"id": AGGREGATE_ACTION_ID, "type": "action_cards", "title": "Выбор действия — инциденты"},
        {"id": "vishing-bank", "type": "chat", "title": "Звонок — «безопасность банка» (vishing)"},
        {"id": "vishing-it", "type": "chat", "title": "Звонок — «IT-поддержка» (vishing)"},
        {"id": "vishing-courier", "type": "chat", "title": "Звонок — «курьер и сбор» (vishing)"},
    ]


@router.get("")
async def list_scenarios(
    request: Request,
    lang: str | None = Query(default=None, description="ru or en"),
) -> dict:
    locale = _locale_from_request(request, lang)
    return {
        "locale": locale,
        "scenarios": _list_entries(locale),
    }


@router.get("/{scenario_id}")
async def get_scenario(
    scenario_id: str,
    request: Request,
    lang: str | None = Query(default=None),
    step: int = Query(1, ge=1, le=NARRATIVE_TOTAL_STEPS, description="Уровень 1..5"),
    refresh: bool = Query(False, description="Запросить новый вариант от LLM (почта/чат-агрегаты)"),
) -> dict:
    locale = _locale_from_request(request, lang)
    auth = request.headers.get("authorization")
    scenario = await _scenario_for_get(scenario_id, locale, step, auth, refresh_llm=refresh)
    if not scenario:
        raise HTTPException(status_code=404, detail="scenario_not_found")
    return {"locale": locale, "scenario": scenario}


@router.post("/{scenario_id}/submit")
async def submit_choice(
    scenario_id: str,
    body: SubmitChoiceBody,
    request: Request,
    lang: str | None = Query(default=None),
) -> dict:
    locale = _locale_from_request(request, lang)
    sid = _canonical_id(scenario_id)
    st = _clamp_step(body.step)
    auth = request.headers.get("authorization")

    if is_custom_scenario_id(sid):
        payload = await fetch_custom_scenario_payload(sid, auth)
        if not payload:
            raise HTTPException(status_code=404, detail="scenario_not_found")
        if st != 1:
            raise HTTPException(status_code=400, detail="custom_scenario_single_step")
        scen_type = payload.get("type")
        if scen_type == "email":
            outcomes = _outcomes_mail(locale)
        elif scen_type == "chat":
            outcomes = _outcomes_chat(locale)
        else:
            raise HTTPException(status_code=400, detail="invalid_custom_payload")
        outcome = outcomes.get(body.choice_id)
        if not outcome:
            return {"ok": False, "error": "unknown_choice", "locale": locale}
        dumped = outcome.model_dump()
        _emit_sim_soc(sid, st, body.choice_id, dumped)
        return {"ok": True, "locale": locale, "result": dumped}

    if sid == AGGREGATE_SKIMMING_ID:
        raw = outcome_skimming(locale, st, body.choice_id)
        if not raw:
            return {"ok": False, "error": "unknown_choice", "locale": locale}
        dumped = ChoiceOutcome(**raw).model_dump()
        _emit_sim_soc(sid, st, body.choice_id, dumped)
        return {"ok": True, "locale": locale, "result": dumped}

    if sid == AGGREGATE_ACTION_ID:
        raw = outcome_action(locale, st, body.choice_id)
        if not raw:
            return {"ok": False, "error": "unknown_choice", "locale": locale}
        dumped = ChoiceOutcome(**raw).model_dump()
        _emit_sim_soc(sid, st, body.choice_id, dumped)
        return {"ok": True, "locale": locale, "result": dumped}

    if sid == AGGREGATE_MAIL_ID or sid in MAIL_SCENARIO_IDS:
        outcomes = _outcomes_mail(locale)
    elif sid == AGGREGATE_CHAT_ID or sid in CHAT_SCENARIO_IDS:
        outcomes = _outcomes_chat(locale)
    elif sid == AGGREGATE_WIFI_ID or sid in WIFI_SCENARIO_IDS:
        outcomes = _outcomes_wifi(locale)
    else:
        raise HTTPException(status_code=404, detail="scenario_not_found")

    outcome = outcomes.get(body.choice_id)
    if not outcome:
        return {"ok": False, "error": "unknown_choice", "locale": locale}

    dumped = outcome.model_dump()
    _emit_sim_soc(sid, st, body.choice_id, dumped)
    return {
        "ok": True,
        "locale": locale,
        "result": dumped,
    }
