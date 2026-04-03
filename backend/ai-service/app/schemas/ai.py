from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=32000)
    system_prompt: str = Field(default="You are a helpful assistant.")
    temperature: float = Field(default=0.2, ge=0, le=2)
    max_tokens: int = Field(default=800, ge=1, le=4096)
    json_mode: bool = Field(
        default=False,
        description="Провайдер отвечает строго JSON-объектом (response_format json_object).",
    )


class ChatResponse(BaseModel):
    content: str
    model: str
