from dataclasses import dataclass


@dataclass(frozen=True)
class LocalizedMessage:
    code: str
    ru: str
    en: str


class AppError(Exception):
    def __init__(self, message: LocalizedMessage, status_code: int = 400) -> None:
        self.message = message
        self.status_code = status_code
        super().__init__(message.code)
