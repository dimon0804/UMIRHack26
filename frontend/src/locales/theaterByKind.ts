/** Динамические строки IntrusionTheater по BreachPageKind (RU / EN). */

export const theaterByKindRu: Record<string, string> = {
  "theater.hackAcc1": "Подключение к корп. SSO {ip}:443 [симуляция]",
  "theater.hackAcc2": "Проверка домена учётной записи… соответствие [макет]",
  "theater.hackAcc3": "Подбор токена сессии pid={pid} [вымышленно]",
  "theater.hackAcc4": "Эскалация привилегий до роли с публикацией контента…",
  "theater.hackAcc5": "Фиксация входа в журнале IAM [учебная запись]",
  "theater.hackAcc6": "Журнал: INC-ACCOUNT-TRAIN-{pid}",

  "theater.hackPay1": "TLS к платёжному шлюзу {ip}:443 [симуляция]",
  "theater.hackPay2": "Подмена merchant session в checkout [макет]",
  "theater.hackPay3": "Токенизация карты (mock PAN) pid={pid}",
  "theater.hackPay4": "«Тестовая» авторизация списания [не выполняется]",
  "theater.hackPay5": "Пересылка платёжных полей на учебный sink…",
  "theater.hackPay6": "Журнал: LOG-PAY-TRAINING-{pid}",

  "theater.hackTrk1": "Запрос к API перевозчика {ip}:443 [симуляция]",
  "theater.hackTrk2": "Подставной tracking_id… OK [макет]",
  "theater.hackTrk3": "Разбор AWB / трек-номера pid={pid} [вымышленно]",
  "theater.hackTrk4": "Редирект на фейковую страницу «статус доставки»…",
  "theater.hackTrk5": "Сбор контактных данных получателя [mock]",
  "theater.hackTrk6": "Журнал: TRK-INC-{pid}",

  "theater.hackWifi1": "Скан эфира → точка доступа рядом с {ip} [симуляция]",
  "theater.hackWifi2": "Beacon / подмена SSID [учебный скрипт]… OK",
  "theater.hackWifi3": "Подбор PSK / handshake pid={pid} [вымышленно]",
  "theater.hackWifi4": "ARP-подмена шлюза по умолчанию [макет]",
  "theater.hackWifi5": "Зеркалирование HTTP captive portal…",
  "theater.hackWifi6": "Журнал: WIFI-LOG-{pid}",

  "theater.hackGen1": "TCP handshake → {ip}:443 [симуляция]",
  "theater.hackGen2": "Подмена Host (учебный скрипт)… OK",
  "theater.hackGen3": "Подбор сессии pid={pid} [вымышленные данные]",
  "theater.hackGen4": "Перехват cookie: training_dummy_token…",
  "theater.hackGen5": "Редирект на копию страницы [макет]",
  "theater.hackGen6": "Запись в журнал: INC-GEN-{pid}",

  "theater.hackPermAcc1": "Запрос уведомлений для «панели учётной записи» [макет]",
  "theater.hackPermAcc2": "Service Worker с недоверенного origin [симуляция]",
  "theater.hackPermAcc3": "Чтение автозаполнения форм входа pid={pid} [не выполняется]",
  "theater.hackPermAcc4": "Доступ к буферу под «код подтверждения» [макет]",
  "theater.hackPermAcc5": "Фоновая синхронизация сохранённых паролей…",
  "theater.hackPermAcc6": "Журнал: PERM-ACC-{pid}",

  "theater.hackPermPay1": "Запрос геолокации «антимошенничество» [макет]",
  "theater.hackPermPay2": "Push «статус платежа» [симуляция]",
  "theater.hackPermPay3": "Clipboard «реквизиты / IBAN» pid={pid}",
  "theater.hackPermPay4": "Контакты для «сверки плательщика» [mock]",
  "theater.hackPermPay5": "Долгоживущая подписка на события checkout…",
  "theater.hackPermPay6": "Журнал: PERM-PAY-{pid}",

  "theater.hackPermTrk1": "Уведомления «статус доставки» [макет]",
  "theater.hackPermTrk2": "Фоновая синхронизация трек-номера [симуляция]",
  "theater.hackPermTrk3": "Clipboard с AWB pid={pid}",
  "theater.hackPermTrk4": "Календарь / окно встречи курьера [mock]",
  "theater.hackPermTrk5": "Расширенный доступ к вкладке отслеживания…",
  "theater.hackPermTrk6": "Журнал: PERM-TRK-{pid}",

  "theater.hackPermWifi1": "Профиль корпоративной Wi‑Fi сети [макет]",
  "theater.hackPermWifi2": "Установка сертификата captive portal [симуляция]",
  "theater.hackPermWifi3": "Запрос доступа к локальной сети pid={pid}",
  "theater.hackPermWifi4": "Bluetooth / соседние устройства [mock]",
  "theater.hackPermWifi5": "Постоянный доступ к настройкам сети…",
  "theater.hackPermWifi6": "Журнал: PERM-WIFI-{pid}",

  "theater.hackPermGen1": "Запрос разрешений на origin [учебный макет]…",
  "theater.hackPermGen2": "Service Worker «update» из недоверенного скрипта [симуляция]",
  "theater.hackPermGen3": "Подписка на push без явного согласия pid={pid}",
  "theater.hackPermGen4": "Чтение clipboard / автозаполнение [макет]",
  "theater.hackPermGen5": "Фоновая синхронизация «credentials» [учебная строка]",
  "theater.hackPermGen6": "Журнал: PERM-GEN-{pid}",

  "theater.progAccA": "SSO / сессия",
  "theater.progAccB": "Учётка / MFA",
  "theater.progAccC": "Эскалация доступа",
  "theater.progPayA": "Сессия оплаты",
  "theater.progPayB": "Реквизиты / токен",
  "theater.progPayC": "Подтверждение списания",
  "theater.progTrkA": "Сессия трекинга",
  "theater.progTrkB": "Данные получателя",
  "theater.progTrkC": "Подмена страницы статуса",
  "theater.progWifiA": "Связь с точкой доступа",
  "theater.progWifiB": "Ключ / handshake",
  "theater.progWifiC": "Перехват трафика",
  "theater.progGenA": "Захват сессии",
  "theater.progGenB": "Учётные данные",
  "theater.progGenC": "Передача пакета",

  "theater.progPermAccA": "Разрешения браузера",
  "theater.progPermAccB": "Формы / автозаполнение",
  "theater.progPermAccC": "Фоновая синхронизация",
  "theater.progPermPayA": "Push / геолокация",
  "theater.progPermPayB": "Clipboard / контакты",
  "theater.progPermPayC": "Подписка на события оплаты",
  "theater.progPermTrkA": "Уведомления доставки",
  "theater.progPermTrkB": "Синхронизация трека",
  "theater.progPermTrkC": "Календарь / гео",
  "theater.progPermWifiA": "Профиль сети",
  "theater.progPermWifiB": "Сертификат портала",
  "theater.progPermWifiC": "Доступ к LAN",
  "theater.progPermGenA": "Push / API",
  "theater.progPermGenB": "Clipboard / автозаполнение",
  "theater.progPermGenC": "Фоновые разрешения",

  "theater.linkDemoTitleAcc": "Сценарий: компрометация учётной записи",
  "theater.linkDemoBodyAcc":
    "Лог имитирует захват корпоративного входа и эскалацию прав. Это только учебная анимация — закройте окно и в модуле выберите безопасное действие.",
  "theater.linkDemoTitlePay": "Сценарий: атака на оплату",
  "theater.linkDemoBodyPay":
    "Строки имитируют платёжную сессию и кражу реквизитов. Реальных списаний нет — закройте окно и отметьте безопасный вариант в сценарии.",
  "theater.linkDemoTitleTrk": "Сценарий: фишинг отслеживания посылки",
  "theater.linkDemoBodyTrk":
    "Показан перехват трекинга и поддельная страница статуса. Всё вымысел в браузере — закройте и вернитесь к безопасному выбору.",
  "theater.linkDemoTitleWifi": "Сценарий: атака через Wi‑Fi",
  "theater.linkDemoBodyWifi":
    "Имитация подключения к подставной точке и перехвата трафика. На устройство это не влияет — закройте окно и продолжите обучение безопасно.",
  "theater.linkDemoTitleGen": "Сценарий: универсальная имитация",
  "theater.linkDemoBodyGen":
    "Общий учебный «взлом» без реальной сети. Закройте окно и в основном сценарии выберите действие, которое не раскрывает данные.",

  "theater.linkDemoTitlePermAcc": "Сценарий: лишние разрешения для «аккаунта»",
  "theater.linkDemoBodyPermAcc":
    "Показано, как через разрешения и автозаполнение добираются до входа. Только макет — закройте и выберите безопасный ответ.",
  "theater.linkDemoTitlePermPay": "Сценарий: разрешения под платёж",
  "theater.linkDemoBodyPermPay":
    "Push, гео и буфер часто используют в схемах с оплатой. Здесь это учебная картинка — закройте окно и отметьте безопасный шаг.",
  "theater.linkDemoTitlePermTrk": "Сценарий: разрешения под доставку",
  "theater.linkDemoBodyPermTrk":
    "Уведомления и доступ к данным помогают мошенникам уточнять жертву. Это симуляция — закройте и вернитесь к модулю.",
  "theater.linkDemoTitlePermWifi": "Сценарий: разрешения сети",
  "theater.linkDemoBodyPermWifi":
    "Профили Wi‑Fi и сертификаты могут обходить привычные проверки. Учебный экран только для наглядности — закройте и выберите безопасное действие.",
  "theater.linkDemoTitlePermGen": "Сценарий: расширенные разрешения страницы",
  "theater.linkDemoBodyPermGen":
    "Лишние права в браузере — отдельный вектор. Здесь только анимация — закройте окно и продолжите сценарий безопасно.",

  "theater.alertTitleAcc": "Имитация компрометации учётной записи",
  "theater.alertBodyAcc":
    "Так мог бы выглядеть захват сессии и эскалация в кино. У вас — только текст и анимация; пароли и сеть не затрагиваются.",
  "theater.alertTitlePay": "Имитация атаки на оплату",
  "theater.alertBodyPay":
    "Показана вымышленная платёжная цепочка. Реальных транзакций нет — дальше разбор и советы по защите.",
  "theater.alertTitleTrk": "Имитация фишинга доставки",
  "theater.alertBodyTrk":
    "Трекинг и «статус посылки» часто подделывают. Это учебный спектакль в браузере, без доступа к вашим данным.",
  "theater.alertTitleWifi": "Имитация атаки в Wi‑Fi",
  "theater.alertBodyWifi":
    "Показан типичный сюжет с подставной точкой. В симуляции сеть устройства не используется.",
  "theater.alertTitleGen": "Имитация инцидента",
  "theater.alertBodyGen":
    "Универсальный учебный ролик: только оформление в интерфейсе. Дальше — обратная связь по сценарию.",
};

export const theaterByKindEn: Record<string, string> = {
  "theater.hackAcc1": "Connecting to corp SSO {ip}:443 [simulated]",
  "theater.hackAcc2": "Account domain check… match [mock]",
  "theater.hackAcc3": "Session token brute pid={pid} [fictional]",
  "theater.hackAcc4": "Privilege escalation to publishing role…",
  "theater.hackAcc5": "IAM login event logged [training]",
  "theater.hackAcc6": "Log: INC-ACCOUNT-TRAIN-{pid}",

  "theater.hackPay1": "TLS to payment gateway {ip}:443 [simulated]",
  "theater.hackPay2": "Merchant session swap in checkout [mock]",
  "theater.hackPay3": "Card tokenization (mock PAN) pid={pid}",
  "theater.hackPay4": "Fake auth capture [not executed]",
  "theater.hackPay5": "Forwarding card fields to training sink…",
  "theater.hackPay6": "Log: LOG-PAY-TRAINING-{pid}",

  "theater.hackTrk1": "Carrier API request {ip}:443 [simulated]",
  "theater.hackTrk2": "Spoofed tracking_id… OK [mock]",
  "theater.hackTrk3": "AWB parse pid={pid} [fictional]",
  "theater.hackTrk4": "Redirect to fake delivery status page…",
  "theater.hackTrk5": "Harvesting recipient contact info [mock]",
  "theater.hackTrk6": "Log: TRK-INC-{pid}",

  "theater.hackWifi1": "Air scan → AP near {ip} [simulated]",
  "theater.hackWifi2": "Beacon / SSID spoof [training script]… OK",
  "theater.hackWifi3": "PSK / handshake guess pid={pid} [fictional]",
  "theater.hackWifi4": "Default gateway ARP spoof [mock]",
  "theater.hackWifi5": "Mirroring captive portal HTTP…",
  "theater.hackWifi6": "Log: WIFI-LOG-{pid}",

  "theater.hackGen1": "TCP handshake → {ip}:443 [simulated]",
  "theater.hackGen2": "Host spoof (training script)… OK",
  "theater.hackGen3": "Session brute pid={pid} [fictional]",
  "theater.hackGen4": "Cookie grab: training_dummy_token…",
  "theater.hackGen5": "Redirect to page clone [mock]",
  "theater.hackGen6": "Log entry: INC-GEN-{pid}",

  "theater.hackPermAcc1": "Notifications for “account panel” [mock]",
  "theater.hackPermAcc2": "Service Worker from untrusted origin [simulated]",
  "theater.hackPermAcc3": "Reading login autofill pid={pid} [not executed]",
  "theater.hackPermAcc4": "Clipboard for “verification code” [mock]",
  "theater.hackPermAcc5": "Background password sync…",
  "theater.hackPermAcc6": "Log: PERM-ACC-{pid}",

  "theater.hackPermPay1": "Geolocation “anti-fraud” [mock]",
  "theater.hackPermPay2": "Push for “payment status” [simulated]",
  "theater.hackPermPay3": "Clipboard “IBAN / details” pid={pid}",
  "theater.hackPermPay4": "Contacts for “payer check” [mock]",
  "theater.hackPermPay5": "Long-lived checkout event subscription…",
  "theater.hackPermPay6": "Log: PERM-PAY-{pid}",

  "theater.hackPermTrk1": "Delivery status notifications [mock]",
  "theater.hackPermTrk2": "Background tracking sync [simulated]",
  "theater.hackPermTrk3": "Clipboard AWB pid={pid}",
  "theater.hackPermTrk4": "Calendar / courier window [mock]",
  "theater.hackPermTrk5": "Expanded tracking tab access…",
  "theater.hackPermTrk6": "Log: PERM-TRK-{pid}",

  "theater.hackPermWifi1": "Corporate Wi‑Fi profile [mock]",
  "theater.hackPermWifi2": "Captive portal cert install [simulated]",
  "theater.hackPermWifi3": "Local network access pid={pid}",
  "theater.hackPermWifi4": "Bluetooth / nearby devices [mock]",
  "theater.hackPermWifi5": "Persistent network settings access…",
  "theater.hackPermWifi6": "Log: PERM-WIFI-{pid}",

  "theater.hackPermGen1": "Permission prompts on origin [training mock]…",
  "theater.hackPermGen2": "Service Worker “update” from untrusted script [simulated]",
  "theater.hackPermGen3": "Push without clear consent pid={pid}",
  "theater.hackPermGen4": "Clipboard / autofill read [mock]",
  "theater.hackPermGen5": "Background “credentials” sync [training]",
  "theater.hackPermGen6": "Log: PERM-GEN-{pid}",

  "theater.progAccA": "SSO session",
  "theater.progAccB": "Account / MFA",
  "theater.progAccC": "Access escalation",
  "theater.progPayA": "Checkout session",
  "theater.progPayB": "Card / token",
  "theater.progPayC": "Charge confirm",
  "theater.progTrkA": "Tracking session",
  "theater.progTrkB": "Recipient data",
  "theater.progTrkC": "Status page swap",
  "theater.progWifiA": "AP association",
  "theater.progWifiB": "Key / handshake",
  "theater.progWifiC": "Traffic capture",
  "theater.progGenA": "Session takeover",
  "theater.progGenB": "Credentials",
  "theater.progGenC": "Exfiltration",

  "theater.progPermAccA": "Browser permissions",
  "theater.progPermAccB": "Forms / autofill",
  "theater.progPermAccC": "Background sync",
  "theater.progPermPayA": "Push / geo",
  "theater.progPermPayB": "Clipboard / contacts",
  "theater.progPermPayC": "Payment events",
  "theater.progPermTrkA": "Delivery alerts",
  "theater.progPermTrkB": "Track sync",
  "theater.progPermTrkC": "Calendar / geo",
  "theater.progPermWifiA": "Network profile",
  "theater.progPermWifiB": "Portal certificate",
  "theater.progPermWifiC": "LAN access",
  "theater.progPermGenA": "Push / API",
  "theater.progPermGenB": "Clipboard / autofill",
  "theater.progPermGenC": "Background perms",

  "theater.linkDemoTitleAcc": "Scenario: account takeover fiction",
  "theater.linkDemoBodyAcc":
    "The log mimics corporate login and privilege escalation. Browser-only training — close and pick the safe option in the module.",
  "theater.linkDemoTitlePay": "Scenario: payment attack fiction",
  "theater.linkDemoBodyPay":
    "Lines mimic checkout and card theft. No real charges — close and mark the safe choice.",
  "theater.linkDemoTitleTrk": "Scenario: parcel-tracking phish",
  "theater.linkDemoBodyTrk":
    "Shows tracking hijack and a fake status page. Fiction only — close and return to the safe path.",
  "theater.linkDemoTitleWifi": "Scenario: Wi‑Fi lure",
  "theater.linkDemoBodyWifi":
    "Mock rogue hotspot and traffic capture. Does not touch your device — close and continue safely.",
  "theater.linkDemoTitleGen": "Scenario: generic training hack",
  "theater.linkDemoBodyGen":
    "A generic in-browser storyboard. Close and choose the safe action in the main scenario.",

  "theater.linkDemoTitlePermAcc": "Scenario: extra permissions for “account”",
  "theater.linkDemoBodyPermAcc":
    "Shows how permissions and autofill can backdoor login. Mock only — close and pick the safe answer.",
  "theater.linkDemoTitlePermPay": "Scenario: permissions for payments",
  "theater.linkDemoBodyPermPay":
    "Push, geo, and clipboard are abused in payment scams. Training visuals only — close and continue.",
  "theater.linkDemoTitlePermTrk": "Scenario: permissions for delivery lures",
  "theater.linkDemoBodyPermTrk":
    "Alerts and data access refine the target. Simulation only — close and go back to the module.",
  "theater.linkDemoTitlePermWifi": "Scenario: network permissions",
  "theater.linkDemoBodyPermWifi":
    "Wi‑Fi profiles and certs bypass usual checks in stories. For illustration only — close and stay safe.",
  "theater.linkDemoTitlePermGen": "Scenario: broad page permissions",
  "theater.linkDemoBodyPermGen":
    "Extra browser rights are an attack vector. Animation only — close and finish the scenario safely.",

  "theater.alertTitleAcc": "Fictional account compromise",
  "theater.alertBodyAcc":
    "How session hijack might look in fiction. Here it is only copy and motion — no real passwords or network access.",
  "theater.alertTitlePay": "Fictional payment attack",
  "theater.alertBodyPay":
    "A made-up payment chain. Next: debrief and defense tips.",
  "theater.alertTitleTrk": "Fictional delivery phish",
  "theater.alertBodyTrk":
    "Tracking pages are often faked. This is a browser-only lesson, not access to your data.",
  "theater.alertTitleWifi": "Fictional Wi‑Fi attack",
  "theater.alertBodyWifi":
    "Rogue hotspot trope for training. Your real network is not used in this simulation.",
  "theater.alertTitleGen": "Fictional incident",
  "theater.alertBodyGen":
    "Generic training theater in the UI only. Continue with the scenario feedback.",
};
