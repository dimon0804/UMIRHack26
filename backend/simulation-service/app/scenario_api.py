"""Сценарии тренажёра: две вкладки (почта, чат); контент — Mistral через ai-service, иначе запасной хардкод."""

from __future__ import annotations

import random
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field

from app.services.scenario_llm_client import fetch_llm_scenario

router = APIRouter(prefix="/scenarios", tags=["simulator"])

Locale = Literal["ru", "en"]

# Одна вкладка в UI; submit идёт на эти id
AGGREGATE_MAIL_ID = "phishing-mail"
AGGREGATE_CHAT_ID = "se-chat"

# Старый алиас мессенджера → общая вкладка «чат»
SCENARIO_ALIASES: dict[str, str] = {
    "se-telegram": AGGREGATE_CHAT_ID,
}

MAIL_SCENARIO_IDS: tuple[str, ...] = (
    "phishing-mail-bank",
    "phishing-mail-parcel",
    "phishing-mail-payroll",
)

CHAT_SCENARIO_IDS: tuple[str, ...] = (
    "se-chat-gifts",
    "se-chat-wire",
    "se-chat-it",
)


def _canonical_id(scenario_id: str) -> str:
    return SCENARIO_ALIASES.get(scenario_id, scenario_id)


async def _scenario_for_get(scenario_id: str, locale: Locale) -> dict | None:
    """GET: для вкладок почта/чат — сначала Mistral; иначе случайный заранее прописанный вариант."""
    sid = _canonical_id(scenario_id)

    if sid == AGGREGATE_MAIL_ID:
        llm = await fetch_llm_scenario(
            aggregate_id=AGGREGATE_MAIL_ID,
            scenario_type="email",
            locale=locale,
        )
        if llm:
            return llm
        pick = random.choice(MAIL_SCENARIO_IDS)
        base = _scenario_by_id(pick, locale)
        if not base:
            return None
        out = dict(base)
        out["id"] = AGGREGATE_MAIL_ID
        return out

    if sid == AGGREGATE_CHAT_ID:
        llm = await fetch_llm_scenario(
            aggregate_id=AGGREGATE_CHAT_ID,
            scenario_type="chat",
            locale=locale,
        )
        if llm:
            return llm
        pick = random.choice(CHAT_SCENARIO_IDS)
        base = _scenario_by_id(pick, locale)
        if not base:
            return None
        out = dict(base)
        out["id"] = AGGREGATE_CHAT_ID
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
    }


def _choices_mail(locale: Locale) -> list[dict[str, str]]:
    if locale == "en":
        return [
            {"id": "open_link", "label": "Open the link"},
            {"id": "delete_only", "label": "Delete email"},
            {"id": "verify_sender", "label": "Check sender details"},
            {"id": "report", "label": "Report phishing"},
        ]
    return [
        {"id": "open_link", "label": "Открыть ссылку"},
        {"id": "delete_only", "label": "Удалить письмо"},
        {"id": "verify_sender", "label": "Проверить отправителя"},
        {"id": "report", "label": "Сообщить о фишинге"},
    ]


def _choices_chat_gifts(locale: Locale) -> list[dict[str, str]]:
    if locale == "en":
        return [
            {"id": "send_codes", "label": "Send the codes now"},
            {"id": "callback", "label": "Call back on a known number"},
            {"id": "official_channel", "label": "Ask to use official procurement"},
            {"id": "ignore", "label": "Ignore for now"},
        ]
    return [
        {"id": "send_codes", "label": "Отправить коды сейчас"},
        {"id": "callback", "label": "Перезвонить на известный номер"},
        {"id": "official_channel", "label": "Попросить оформить через закупки"},
        {"id": "ignore", "label": "Пока не отвечать"},
    ]


def _choices_chat_wire(locale: Locale) -> list[dict[str, str]]:
    if locale == "en":
        return [
            {"id": "send_codes", "label": "Wire the money now"},
            {"id": "callback", "label": "Call finance / manager on a known line"},
            {"id": "official_channel", "label": "Open a ticket in the banking portal"},
            {"id": "ignore", "label": "Ignore until verified"},
        ]
    return [
        {"id": "send_codes", "label": "Срочно перевести по реквизитам"},
        {"id": "callback", "label": "Позвонить в финансы / руководителю"},
        {"id": "official_channel", "label": "Оформить через корпоративный портал / тикет"},
        {"id": "ignore", "label": "Не реагировать до проверки"},
    ]


def _choices_chat_it(locale: Locale) -> list[dict[str, str]]:
    if locale == "en":
        return [
            {"id": "send_codes", "label": "Send my password here"},
            {"id": "callback", "label": "Call IT on the internal directory number"},
            {"id": "official_channel", "label": "Open a ticket in the service desk"},
            {"id": "ignore", "label": "Ignore — IT never asks for passwords"},
        ]
    return [
        {"id": "send_codes", "label": "Написать пароль в чат"},
        {"id": "callback", "label": "Позвонить в IT по внутреннему номеру"},
        {"id": "official_channel", "label": "Создать тикет в service desk"},
        {"id": "ignore", "label": "Игнор — IT не просит пароли в чате"},
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
            "choices": _choices_chat_it(locale),
        }

    return None


class SubmitChoiceBody(BaseModel):
    choice_id: str


def _locale_from_request(request: Request, lang: str | None) -> Locale:
    if lang in ("ru", "en"):
        return lang
    accept = request.headers.get("accept-language", "")
    if accept.lower().startswith("ru"):
        return "ru"
    return "en"


def _list_entries(locale: Locale) -> list[dict[str, str]]:
    """Две вкладки: почта и чат (конкретная ситуация подставляется при GET)."""
    if locale == "en":
        return [
            {"id": AGGREGATE_MAIL_ID, "type": "email", "title": "Inbox — phishing"},
            {"id": AGGREGATE_CHAT_ID, "type": "chat", "title": "Messenger — social engineering"},
        ]
    return [
        {"id": AGGREGATE_MAIL_ID, "type": "email", "title": "Почта — фишинг"},
        {"id": AGGREGATE_CHAT_ID, "type": "chat", "title": "Чат — социальная инженерия"},
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
) -> dict:
    locale = _locale_from_request(request, lang)
    scenario = await _scenario_for_get(scenario_id, locale)
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

    if sid == AGGREGATE_MAIL_ID or sid in MAIL_SCENARIO_IDS:
        outcomes = _outcomes_mail(locale)
    elif sid == AGGREGATE_CHAT_ID or sid in CHAT_SCENARIO_IDS:
        outcomes = _outcomes_chat(locale)
    else:
        raise HTTPException(status_code=404, detail="scenario_not_found")

    outcome = outcomes.get(body.choice_id)
    if not outcome:
        return {"ok": False, "error": "unknown_choice", "locale": locale}

    return {
        "ok": True,
        "locale": locale,
        "result": outcome.model_dump(),
    }
