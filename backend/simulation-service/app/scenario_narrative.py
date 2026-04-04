"""Многошаговые сюжеты (5 уровней), скимминг и модуль «выбор действия» — контент по локали."""

from __future__ import annotations

from typing import Literal

Locale = Literal["ru", "en"]

TOTAL_STEPS = 5
NARRATIVE_TOTAL_STEPS = TOTAL_STEPS

AGG_SKIM = "skimming"
AGG_ACTION = "action-choice"

def choices_skim_step(locale: Locale, step: int) -> list[dict[str, str]]:
    if step == 1:
        if locale == "en":
            return [
                {"id": "sk1_insert", "label": "Insert card and enter PIN normally"},
                {"id": "sk1_pull", "label": "Pull gently on the card slot before using"},
                {"id": "sk1_other", "label": "Use another ATM / notify bank hotline"},
                {"id": "sk1_pin_visible", "label": "Enter PIN quickly without covering"},
            ]
        return [
            {"id": "sk1_insert", "label": "Вставить карту и ввести PIN как обычно"},
            {"id": "sk1_pull", "label": "Слегка потянуть кард-ридер перед использованием"},
            {"id": "sk1_other", "label": "Пойти к другому банкомату / позвонить на горячую линию банка"},
            {"id": "sk1_pin_visible", "label": "Быстро ввести PIN, не прикрывая клавиатуру"},
        ]
    if step == 2:
        if locale == "en":
            return [
                {"id": "sk2_ignore", "label": "Ignore the wobbly keypad — speed matters"},
                {"id": "sk2_cover", "label": "Cover PIN with hand and inspect keypad edges"},
                {"id": "sk2_inside", "label": "Go inside the branch instead of outdoor ATM"},
                {"id": "sk2_share", "label": "Let a “helpful” stranger type your PIN for you"},
            ]
        return [
            {"id": "sk2_ignore", "label": "Не обращать внимания на люфт клавиатуры — главное скорость"},
            {"id": "sk2_cover", "label": "Прикрыть рукой PIN и осмотреть края клавиатуры"},
            {"id": "sk2_inside", "label": "Зайти в отделение вместо уличного банкомата"},
            {"id": "sk2_share", "label": "Разрешить «помощнику» набрать PIN за вас"},
        ]
    if step == 3:
        if locale == "en":
            return [
                {"id": "sk3_tap", "label": "Tap card on the odd-looking reader without checking"},
                {"id": "sk3_staff", "label": "Ask staff which terminal is official"},
                {"id": "sk3_phone", "label": "Pay with phone wallet to avoid mag-stripe"},
                {"id": "sk3_receipt", "label": "Take receipt and verify merchant name"},
            ]
        return [
            {"id": "sk3_tap", "label": "Приложить карту к подозрительному терминалу без проверки"},
            {"id": "sk3_staff", "label": "Спросить у персонала, какой терминал официальный"},
            {"id": "sk3_phone", "label": "Оплатить телефоном, минуя магнитную полосу"},
            {"id": "sk3_receipt", "label": "Взять чек и сверить название мерчанта"},
        ]
    if step == 4:
        if locale == "en":
            return [
                {"id": "sk4_limit", "label": "Raise tap limit in the bank app to “save time” via link in SMS"},
                {"id": "sk4_app", "label": "Change limits only inside the official bank app"},
                {"id": "sk4_sms", "label": "Delete SMS and report phishing to the bank"},
                {"id": "sk4_call", "label": "Call bank from number on the card back"},
            ]
        return [
            {"id": "sk4_limit", "label": "Перейти по SMS и поднять лимит бесконтакта «для удобства»"},
            {"id": "sk4_app", "label": "Менять лимиты только в официальном приложении банка"},
            {"id": "sk4_sms", "label": "Удалить SMS и сообщить банку о фишинге"},
            {"id": "sk4_call", "label": "Позвонить в банк по номеру с оборота карты"},
        ]
    if locale == "en":
        return [
            {"id": "sk5_use", "label": "Use pump #3 because the card reader looks “newer”"},
            {"id": "sk5_inside", "label": "Pay inside the station where terminals are supervised"},
            {"id": "sk5_credit", "label": "Use credit with stronger chargeback rules if unsure"},
            {"id": "sk5_report", "label": "Report loose or bulky reader to station staff"},
        ]
    return [
        {"id": "sk5_use", "label": "Использовать колонку №3 — ридер «поновее»"},
        {"id": "sk5_inside", "label": "Оплатить внутри станции, где терминалы под контролем"},
        {"id": "sk5_credit", "label": "При сомнениях использовать кредитку с сильным chargeback"},
        {"id": "sk5_report", "label": "Сообщить персоналу о подозрительно выпирающем ридере"},
    ]


def scenario_skimming(locale: Locale, step: int) -> dict:
    titles = {
        1: (
            "Банкомат: подозрительный слот",
            "ATM: suspicious card slot",
        ),
        2: (
            "Клавиатура с люфтом",
            "Loose keypad overlay",
        ),
        3: (
            "Магазин: терминал у кассы",
            "Store checkout terminal",
        ),
        4: (
            "SMS про лимит бесконтакта",
            "SMS about contactless limit",
        ),
        5: (
            "АЗС: колонка с ридером",
            "Gas pump card reader",
        ),
    }
    ctx = {
        1: (
            "Вы у банкомата на улице. Слот для карты слегка длиннее обычного, пластик блестит неестественно.",
            "Outdoor ATM: the card slot looks slightly deeper than usual; plastic edge looks glued-on.",
        ),
        2: (
            "Клавиши «мягкие», одна из них чуть выше панели — возможная накладка.",
            "Keys feel spongy; one key sits higher — possible overlay.",
        ),
        3: (
            "Кассир отвернулся; рядом второй маленький терминал без логотипа эквайера.",
            "Cashier turned away; a second small terminal has no acquirer logo.",
        ),
        4: (
            "Пришло SMS «банка»: поднимите лимит tap-to-pay по ссылке до конца дня.",
            "SMS “from bank”: raise tap-to-pay limit via link before end of day.",
        ),
        5: (
            "На колонке ридер толще, чем на соседней; стикер «обновлено» наклеен криво.",
            "This pump’s reader is bulkier; “updated” sticker is crooked.",
        ),
    }
    ti_ru, ti_en = titles[step]
    cr_ru, cr_en = ctx[step]
    return {
        "type": "terminal",
        "title": ti_ru if locale == "ru" else ti_en,
        "context": cr_ru if locale == "ru" else cr_en,
        "device_label": "POS / ATM" if locale == "en" else "POS / банкомат",
        "choices": choices_skim_step(locale, step),
        "step": step,
        "total_steps": TOTAL_STEPS,
        "narrative_arc": (
            f"Уровень {step}/{TOTAL_STEPS}: скимминг и платёжные риски"
            if locale == "ru"
            else f"Level {step}/{TOTAL_STEPS}: skimming & payment risks"
        ),
        "attack_family": "skimming",
    }


def choices_action_step(locale: Locale, step: int) -> list[dict[str, str]]:
    """Карточки действия — те же id уходят в submit."""
    rows: dict[int, tuple[list[dict[str, str]], list[dict[str, str]]]] = {
        1: (
            [
                {"id": "ac1_plug", "label": "Воткнуть флешку в рабочий ПК — посмотреть содержимое"},
                {"id": "ac1_it", "label": "Передать флешку в IT / ИБ без вставления"},
                {"id": "ac1_bin", "label": "Выбросить в обычный мусор"},
                {"id": "ac1_home", "label": "Взять домой на личный ноутбук"},
            ],
            [
                {"id": "ac1_plug", "label": "Plug the USB into your work PC to preview files"},
                {"id": "ac1_it", "label": "Hand it to IT / security without plugging in"},
                {"id": "ac1_bin", "label": "Throw it in regular trash"},
                {"id": "ac1_home", "label": "Take home to your personal laptop"},
            ],
        ),
        2: (
            [
                {"id": "ac2_unlock", "label": "Разблокировать телефон и дать набрать номер"},
                {"id": "ac2_deny", "label": "Отказать и предложить позвонить с соседнего аппарата"},
                {"id": "ac2_unattended", "label": "Оставить телефон на секунду на стойке"},
                {"id": "ac2_codes", "label": "Диктовать код из банковского приложения"},
            ],
            [
                {"id": "ac2_unlock", "label": "Unlock and let them dial"},
                {"id": "ac2_deny", "label": "Refuse; suggest a nearby payphone / staff phone"},
                {"id": "ac2_unattended", "label": "Leave phone unattended on the counter"},
                {"id": "ac2_codes", "label": "Dictate a code from your banking app"},
            ],
        ),
        3: (
            [
                {"id": "ac3_shoulder", "label": "Продолжить ввод пароля — некогда"},
                {"id": "ac3_cover", "label": "Прикрыть экран и сменить позицию"},
                {"id": "ac3_ask", "label": "Вежливо попросить отойти на шаг"},
                {"id": "ac3_later", "label": "Войти позже из безопасного места"},
            ],
            [
                {"id": "ac3_shoulder", "label": "Keep typing — you are in a hurry"},
                {"id": "ac3_cover", "label": "Shield the screen and reposition"},
                {"id": "ac3_ask", "label": "Politely ask them to step back"},
                {"id": "ac3_later", "label": "Authenticate later from a safer spot"},
            ],
        ),
        4: (
            [
                {"id": "ac4_reuse", "label": "Сменить только на этом сайте, пароль простой для запоминания"},
                {"id": "ac4_unique", "label": "Включить менеджер паролей и уникальный пароль"},
                {"id": "ac4_2fa", "label": "Включить 2FA в сервисе"},
                {"id": "ac4_ignore", "label": "Игнорировать — вдруг спам"},
            ],
            [
                {"id": "ac4_reuse", "label": "Reuse a simple password on that site only"},
                {"id": "ac4_unique", "label": "Use a password manager with a unique password"},
                {"id": "ac4_2fa", "label": "Enable 2FA on the service"},
                {"id": "ac4_ignore", "label": "Ignore — probably spam"},
            ],
        ),
        5: (
            [
                {"id": "ac5_codes", "label": "Назвать коды и последние операции по просьбе «админа»"},
                {"id": "ac5_callback", "label": "Положить трубку и перезвонить по номеру с сайта компании"},
                {"id": "ac5_ticket", "label": "Создать тикет в service desk из корпоративного портала"},
                {"id": "ac5_team", "label": "Написать коллеге в известный рабочий чат для проверки"},
            ],
            [
                {"id": "ac5_codes", "label": "Read out codes and recent transactions to the “admin”"},
                {"id": "ac5_callback", "label": "Hang up and call back via the company site number"},
                {"id": "ac5_ticket", "label": "Open a ticket in the corporate service desk"},
                {"id": "ac5_team", "label": "Ping a colleague in a known work chat to verify"},
            ],
        ),
    }
    ru, en = rows[step]
    return ru if locale == "ru" else en


def scenario_action_cards(locale: Locale, step: int) -> dict:
    situations = {
        1: (
            "В парковке у входа в офис лежит блестящая USB-флешка с наклейкой «Зарплата_реестр».",
            "A shiny USB stick labeled “Payroll_register” lies in the parking lot by the office door.",
        ),
        2: (
            "Незнакомец просит «срочно набрать маме в больницу» с вашего смартфона.",
            "A stranger urgently asks to use your smartphone to call their mom in hospital.",
        ),
        3: (
            "В кофейне за спиной кто-то смотрит, как вы вводите пароль в приложение банка.",
            "Someone behind you in a café is watching you type your banking app password.",
        ),
        4: (
            "Сервис пишет: ваш пароль попал в утечку. Нужно срочно обновить доступ.",
            "A service emails: your password appeared in a breach. You must update access.",
        ),
        5: (
            "Звонок: «Это ИБ, мы видим атаку на вашу учётку, продиктуйте код из приложения для блокировки».",
            "Call: “This is security — we see an attack; read out your app code to block it.”",
        ),
    }
    sr, se = situations[step]
    ch = choices_action_step(locale, step)
    cards = [{"id": c["id"], "title": c["label"], "detail": ""} for c in ch]
    return {
        "type": "action_cards",
        "title": (
            f"Выбор действия — уровень {step}"
            if locale == "ru"
            else f"Action choice — level {step}"
        ),
        "situation": sr if locale == "ru" else se,
        "cards": cards,
        "choices": ch,
        "step": step,
        "total_steps": TOTAL_STEPS,
        "narrative_arc": (
            f"Уровень {step}/{TOTAL_STEPS}: инцидент и правильная реакция"
            if locale == "ru"
            else f"Level {step}/{TOTAL_STEPS}: incident response"
        ),
        "attack_family": (
            "social_engineering"
            if step in (1, 2, 5)
            else "password_attack"
            if step == 4
            else "shoulder_surfing"
        ),
    }


def _safe(
    title: str,
    body: str,
    xp: int = 12,
    hp: int = 18,
) -> dict:
    return {
        "is_safe": True,
        "severity": "none",
        "security_delta": hp,
        "xp_delta": xp,
        "teach_title": title,
        "teach_body": body,
        "show_consequences": False,
        "consequence_steps": [],
        "hint": None,
    }


def _unsafe(
    title: str,
    body: str,
    hp: int = -22,
    xp: int = -12,
    hint: str | None = None,
    steps: list | None = None,
) -> dict:
    return {
        "is_safe": False,
        "severity": "critical" if hp < -25 else "medium",
        "security_delta": hp,
        "xp_delta": xp,
        "teach_title": title,
        "teach_body": body,
        "show_consequences": bool(steps),
        "consequence_steps": steps or [],
        "hint": hint,
    }


def outcome_skimming(locale: Locale, step: int, choice_id: str) -> dict | None:
    if locale == "en":
        bank = {
            "sk1_insert": _unsafe(
                "Skimmer risk",
                "Criminals capture mag-stripe + PIN. Prefer supervised terminals and inspect the slot.",
                hint="Pull the reader gently; if loose, walk away and report.",
            ),
            "sk1_pull": _safe(
                "Good habit",
                "A quick tug can reveal a skimmer overlay; if unsure, use another machine.",
            ),
            "sk1_other": _safe(
                "Best option",
                "Using a known-good ATM or calling the bank reduces exposure to tampered devices.",
            ),
            "sk1_pin_visible": _unsafe(
                "Shoulder surfing",
                "Hidden cameras and bystanders can record your PIN.",
                hint="Cover the keypad with your other hand.",
            ),
            "sk2_ignore": _unsafe(
                "Overlay keypad",
                "Fake keypads record PINs while the real transaction still happens.",
                hint="Wiggle keys; overlays often move.",
            ),
            "sk2_cover": _safe(
                "Protect PIN",
                "Covering plus visual inspection defeats many camera + overlay setups.",
            ),
            "sk2_inside": _safe(
                "Lower risk",
                "Indoor, monitored ATMs are harder to compromise than isolated outdoor units.",
            ),
            "sk2_share": _unsafe(
                "Never share PIN",
                "Anyone typing your PIN can memorize it or install malware mentally — never allow this.",
            ),
            "sk3_tap": _unsafe(
                "Unknown terminal",
                "Rogue terminals can clone data or MITM the payment.",
                hint="Match device to merchant branding.",
            ),
            "sk3_staff": _safe(
                "Verify",
                "Staff can confirm which reader is legitimate.",
            ),
            "sk3_phone": _safe(
                "Tokenized payment",
                "Phone wallets use tokens and avoid mag-stripe exposure.",
            ),
            "sk3_receipt": _safe(
                "Check merchant",
                "Receipt name mismatches are a red flag for merchant fraud.",
            ),
            "sk4_limit": _unsafe(
                "Phishing SMS",
                "Link leads to a fake bank page harvesting credentials.",
                hint="Never change limits via SMS links.",
            ),
            "sk4_app": _safe(
                "Official channel",
                "Limits belong in the bank’s verified app or website.",
            ),
            "sk4_sms": _safe(
                "Report",
                "Reporting helps the bank block sender domains and warn others.",
            ),
            "sk4_call": _safe(
                "Verified number",
                "Card-back numbers route to real fraud teams.",
            ),
            "sk5_use": _unsafe(
                "Pump skimmer",
                "Gas pumps are classic skimmer targets; “newer” look can be fake.",
            ),
            "sk5_inside": _safe(
                "Supervised terminal",
                "Indoor payment reduces tamper opportunity.",
            ),
            "sk5_credit": _safe(
                "Stronger protections",
                "Credit cards often have better fraud reversal than debit.",
            ),
            "sk5_report": _safe(
                "Help everyone",
                "Staff can disable the pump and call technicians.",
            ),
        }
    else:
        bank = {
            "sk1_insert": _unsafe(
                "Риск скиммера",
                "Мошенники снимают магнитную дорожку и PIN. Предпочитайте контролируемые банкоматы и осматривайте слот.",
                hint="Слегка потяните ридер; если шевелится — уходите и сообщите банку.",
            ),
            "sk1_pull": _safe(
                "Правильная привычка",
                "Лёгкое движение может выявить накладку; при сомнении используйте другой аппарат.",
            ),
            "sk1_other": _safe(
                "Лучший вариант",
                "Другой банкомат или звонок на официальную линию снижают риск подмены.",
            ),
            "sk1_pin_visible": _unsafe(
                "Подсмотр PIN",
                "Камеры и прохожие могут снять ввод PIN.",
                hint="Прикрывайте клавиатуру второй рукой.",
            ),
            "sk2_ignore": _unsafe(
                "Накладка на клавиатуру",
                "Фальш-клавиатуры записывают PIN, пока транзакция проходит в штатном режиме.",
                hint="Пошевелите клавиши — накладка часто двигается.",
            ),
            "sk2_cover": _safe(
                "Защита PIN",
                "Прикрытие и осмотр краёв ломают схему «камера + оверлей».",
            ),
            "sk2_inside": _safe(
                "Ниже риск",
                "В помещении банка банкоматы сложнее доработать незаметно.",
            ),
            "sk2_share": _unsafe(
                "PIN никому",
                "Любой, кто вводит ваш PIN, может его запомнить или злоупотребить.",
            ),
            "sk3_tap": _unsafe(
                "Неизвестный терминал",
                "Поддельный терминал может клонировать данные или подменять платёж.",
                hint="Сверьте бренд эквайера с вывеской.",
            ),
            "sk3_staff": _safe(
                "Проверка",
                "Персонал подтвердит легитимный терминал.",
            ),
            "sk3_phone": _safe(
                "Токенизация",
                "Оплата телефоном снижает риск магнитной полосы.",
            ),
            "sk3_receipt": _safe(
                "Сверка чека",
                "Несовпадение названия в чеке — признак мошеннического мерчанта.",
            ),
            "sk4_limit": _unsafe(
                "Фишинг по SMS",
                "Ссылка ведёт на поддельный банк и крадёт доступ.",
                hint="Лимиты не меняют по ссылкам из SMS.",
            ),
            "sk4_app": _safe(
                "Официальный канал",
                "Лимиты — только в проверенном приложении или сайте банка.",
            ),
            "sk4_sms": _safe(
                "Репорт",
                "Сообщение банку помогает заблокировать рассылку.",
            ),
            "sk4_call": _safe(
                "Проверенный номер",
                "Номер с карты ведёт в настоящую службу.",
            ),
            "sk5_use": _unsafe(
                "Скиммер на АЗС",
                "Колонки — частая цель; «новый» вид может быть маскировкой.",
            ),
            "sk5_inside": _safe(
                "Под присмотром",
                "Оплата внутри снижает шанс подмены.",
            ),
            "sk5_credit": _safe(
                "Защита списаний",
                "По кредитке проще оспорить мошеннические списания.",
            ),
            "sk5_report": _safe(
                "Помощь всем",
                "Персонал отключит колонку и вызовет техников.",
            ),
        }
    keys = choices_skim_step(locale, step)
    allowed = {c["id"] for c in keys}
    if choice_id not in allowed:
        return None
    raw = bank.get(choice_id)
    if raw is None:
        return None
    return {**raw, "choice_id": choice_id}


def outcome_action(locale: Locale, step: int, choice_id: str) -> dict | None:
    keys = {c["id"] for c in choices_action_step(locale, step)}
    if choice_id not in keys:
        return None

    def ru_en(r: tuple[dict, dict]) -> dict:
        return r[0] if locale == "ru" else r[1]

    # (ru_outcome_dict, en_outcome_dict) per id - compact: only unsafe need hints
    if step == 1:
        data = {
            "ac1_plug": (
                _unsafe(
                    "USB-ловушка",
                    "Автозапуск и скрытые вредоносы — типичная цель «потерянных» флешек.",
                    hint="Никогда не подключайте неизвестные носители к рабочему ПК.",
                ),
                _unsafe(
                    "USB bait",
                    "Autorun malware is a classic goal of “lost” drives.",
                    hint="Never plug unknown drives into a work PC.",
                ),
            ),
            "ac1_it": (
                _safe("Правильно", "ИБ проверит носитель изолированно."),
                _safe("Correct", "Security can inspect it in an isolated lab."),
            ),
            "ac1_bin": (
                _unsafe(
                    "Утечка",
                    "Кто-то найдёт флешку и подключит — риск для компании остаётся.",
                    hint="Передайте в ИБ или уничтожите шредером по политике.",
                    hp=-10,
                    xp=-6,
                ),
                _unsafe(
                    "Still risky",
                    "Someone else may pick it up and plug it in.",
                    hint="Hand to security or destroy per policy.",
                    hp=-10,
                    xp=-6,
                ),
            ),
            "ac1_home": (
                _unsafe(
                    "Двойной риск",
                    "Заражение домашнего устройства и перенос в корпоративную сеть через VPN/файлы.",
                    hint="Не используйте находки на личных машинах для просмотра «содержимого».",
                ),
                _unsafe(
                    "Double risk",
                    "Home infection can pivot into corporate via VPN or files.",
                    hint="Do not preview unknown drives at home.",
                ),
            ),
        }
    elif step == 2:
        data = {
            "ac2_unlock": (
                _unsafe(
                    "Социальная инженерия",
                    "С устройства могут снять коды, сессии банка или установить доверие к звонку.",
                    hint="Предложите позвонить с телефона заведения или сами наберите экстренный номер.",
                ),
                _unsafe(
                    "Social engineering",
                    "They may exfil codes, bank sessions, or set up vishing trust.",
                    hint="Offer a staff phone or let them use a payphone supervised.",
                ),
            ),
            "ac2_deny": (
                _safe("Верно", "Вы не открыли доступ к MFA и приложениям."),
                _safe("Right call", "You kept MFA and apps private."),
            ),
            "ac2_unattended": (
                _unsafe("Кража / свап", "Устройство могут украсть или подменить SIM.", hp=-30, xp=-18),
                _unsafe("Theft / SIM swap risk", "Device theft or SIM swap in seconds.", hp=-30, xp=-18),
            ),
            "ac2_codes": (
                _unsafe(
                    "Перевод доверия",
                    "Коды из банка = ключ к деньгам; никому не диктуют.",
                    hint="Банк не просит коды по телефону от случайного звонка.",
                ),
                _unsafe(
                    "Never share OTP",
                    "Bank codes are money keys; nobody legitimate asks you to dictate them.",
                    hint="Real banks don’t ask for OTPs over cold calls.",
                ),
            ),
        }
    elif step == 3:
        data = {
            "ac3_shoulder": (
                _unsafe(
                    "Shoulder surfing",
                    "Наблюдатель может угадать шаблон или снять видео.",
                    hint="Смените позицию или войдите позже.",
                ),
                _unsafe(
                    "Shoulder surfing",
                    "Observers can film or guess your pattern.",
                    hint="Reposition or authenticate later.",
                ),
            ),
            "ac3_cover": (_safe("Хорошо", "Экран и углы закрыты."), _safe("Good", "Screen shielded.")),
            "ac3_ask": (_safe("Границы", "Вежливый запрос снижает давление."), _safe("Boundaries", "Polite pushback works.")),
            "ac3_later": (_safe("Лучше отложить", "Ввод в спокойной обстановке без зрителей."), _safe("Defer", "Authenticate when no audience.")),
        }
    elif step == 4:
        data = {
            "ac4_reuse": (
                _unsafe(
                    "Повтор пароля",
                    "Утечка + reuse = доступ к десяткам сервисов.",
                    hint="Уникальный пароль + 2FA.",
                ),
                _unsafe(
                    "Password reuse",
                    "Breach + reuse unlocks many accounts.",
                    hint="Unique passwords + 2FA.",
                ),
            ),
            "ac4_unique": (_safe("Уникальный пароль", "Снижает цепные взломы."), _safe("Unique password", "Stops chain breaches.")),
            "ac4_2fa": (_safe("2FA", "Даже при утечке пароля вход сложнее."), _safe("2FA", "Blocks many takeover attempts.")),
            "ac4_ignore": (
                _unsafe(
                    "Игнор утечки",
                    "Если письмо правдиво, аккаунт остаётся уязвимым.",
                    hint="Проверьте через официальный сайт сервиса, не по ссылке в письме.",
                    hp=-14,
                    xp=-8,
                ),
                _unsafe(
                    "Ignoring breach alerts",
                    "If real, the account stays exposed.",
                    hint="Verify via official site, not email links.",
                    hp=-14,
                    xp=-8,
                ),
            ),
        }
    else:
        data = {
            "ac5_codes": (
                _unsafe(
                    "Вишинг",
                    "Коды = подтверждение переводов и смены настроек.",
                    hint="ИБ не просит коды по входящему звонку.",
                ),
                _unsafe(
                    "Vishing",
                    "Codes approve transfers and settings changes.",
                    hint="Security won’t cold-call for your OTP.",
                ),
            ),
            "ac5_callback": (_safe("Обратный звонок", "Вы контролируете линию."), _safe("Callback", "You control the line.")),
            "ac5_ticket": (_safe("Тикет", "Официальный след инцидента."), _safe("Ticket", "Official audit trail.")),
            "ac5_team": (_safe("Второй канал", "Коллега подтвердит легенду звонка."), _safe("Out-of-band", "Peer confirms the story.")),
        }
    pair = data.get(choice_id)
    if not pair:
        return None
    out = dict(ru_en(pair))
    out["choice_id"] = choice_id
    return out
