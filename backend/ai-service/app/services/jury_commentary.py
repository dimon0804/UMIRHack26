"""Короткий «голос председателя жюри» для тренажёра (Mistral)."""

from app.schemas.ai import ChatRequest
from app.schemas.jury import JuryTakeRequest, JuryTakeResponse
from app.services.mistral_client import MistralClient


async def generate_jury_commentary(body: JuryTakeRequest) -> JuryTakeResponse:
    if body.locale == "en":
        sys = (
            "You are the neutral chair of a training jury in a cybersecurity awareness simulator. "
            "Write 1–2 short sentences (max 320 characters) that acknowledge both sides without lecturing. "
            "No markdown, no bullet points."
        )
        risk = "the training rubric classifies this as a SAFER choice" if body.is_safe else (
            "the training rubric classifies this as a RISKIER choice"
        )
        prompt = (
            f"Scenario type: {body.scenario_type}. Context: {body.scenario_title}.\n"
            f"Learner picked: {body.choice_summary} (id {body.choice_id}).\n"
            f"Trainer headline: {body.teach_title}. Note: {risk}.\n"
            "Tie the 'for' and 'against' tension together in a human voice."
        )
    else:
        sys = (
            "Ты нейтральный председатель учебного жюри в тренажёре информационной безопасности. "
            "Напиши 1–2 коротких предложения (до 320 символов), признавая обе стороны без нравоучений. "
            "Без markdown и списков."
        )
        risk = (
            "по учебной методичке выбор в целом безопаснее"
            if body.is_safe
            else "по учебной методичке выбор повышает риск"
        )
        prompt = (
            f"Тип сценария: {body.scenario_type}. Контекст: {body.scenario_title}.\n"
            f"Игрок выбрал: {body.choice_summary} (id {body.choice_id}).\n"
            f"Заголовок разбора: {body.teach_title}. Важно: {risk}.\n"
            "Свяжи напряжение «за» и «против» живым языком."
        )

    client = MistralClient()
    res = await client.chat(
        ChatRequest(
            system_prompt=sys,
            prompt=prompt,
            temperature=0.55,
            max_tokens=220,
            json_mode=False,
        )
    )
    text = (res.content or "").strip()
    if len(text) > 600:
        text = text[:597] + "…"
    return JuryTakeResponse(commentary=text or "…")
