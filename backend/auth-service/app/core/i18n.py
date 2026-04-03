from fastapi import Request

from app.core.exceptions import LocalizedMessage


def pick_locale(request: Request) -> str:
    accept = request.headers.get("accept-language", "")
    parts = [p.strip().split(";")[0].lower() for p in accept.split(",") if p.strip()]
    for p in parts:
        if p.startswith("en"):
            return "en"
    return "ru"


def localize(msg: LocalizedMessage, locale: str) -> str:
    return msg.en if locale == "en" else msg.ru
