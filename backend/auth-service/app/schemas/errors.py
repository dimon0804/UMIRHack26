from pydantic import BaseModel, Field


class ErrorBody(BaseModel):
    code: str
    message: str
    messages: dict[str, str] = Field(description="Localized copies: ru, en")
