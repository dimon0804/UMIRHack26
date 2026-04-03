import type { ChatScenario, EmailScenario } from "@/lib/simulator";

export function buildCoachSystemPrompt(lang: "ru" | "en"): string {
  if (lang === "en") {
    return `You are a senior SOC analyst and security awareness coach. The user is playing a training simulator (phishing email or messenger social engineering).

Give a SHORT brief (max ~120 words): what attack signals to notice in the scenario below. Teach critical thinking.
Rules:
- Do NOT name the exact "correct" button or action from the UI.
- Do NOT output choice ids.
- Be concrete about red flags (sender, urgency, channel, domain, tone).
- Match the user's language (English).`;
  }
  return `Ты ведущий аналитик SOC и тренер по кибергигиене. Пользователь проходит учебный симулятор: фишинговое письмо или сценарий социнженерии в мессенджере.

Дай КРАТКИЙ совет (до ~120 слов): на какие признаки атаки обратить внимание в сценарии ниже. Учи рассуждать самостоятельно.
Правила:
- НЕ называй дословно «правильную» кнопку или действие из интерфейса.
- НЕ перечисляй id вариантов ответа.
- Конкретно: отправитель, срочность, канал, домен, тон сообщения.
- Язык ответа — русский.`;
}

export function buildCoachUserPrompt(
  scenario: EmailScenario | ChatScenario,
  lang: "ru" | "en",
): string {
  if (scenario.type === "email") {
    return [
      lang === "en" ? "Scenario type: phishing email" : "Тип: фишинговое письмо",
      "",
      `From: ${scenario.sender_display} <${scenario.sender_email}>`,
      `Subject: ${scenario.subject}`,
      "",
      ...scenario.body_paragraphs.map((p) => p),
      "",
      `CTA: ${scenario.cta_label}`,
      scenario.cta_href_display,
    ].join("\n");
  }
  return [
    lang === "en" ? "Scenario type: messenger / social engineering" : "Тип: мессенджер / социнженерия",
    "",
    `${scenario.peer_name} @${scenario.peer_handle}`,
    "",
    ...scenario.messages.map((m) => `[${m.from}] ${m.text}`),
  ].join("\n");
}
