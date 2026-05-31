from openai import OpenAI
from api.config import settings

_deepseek_client: OpenAI | None = None
_claude_client: OpenAI | None = None


def get_deepseek_client() -> OpenAI:
    global _deepseek_client
    if _deepseek_client is None:
        _deepseek_client = OpenAI(
            api_key=settings.DEEPSEEK_API_KEY,
            base_url=settings.DEEPSEEK_API_BASE,
        )
    return _deepseek_client


def get_claude_client() -> OpenAI:
    global _claude_client
    if _claude_client is None:
        _claude_client = OpenAI(
            api_key=settings.CLAUDE_API_KEY,
            base_url=settings.CLAUDE_API_BASE,
        )
    return _claude_client


def chat(system_prompt: str, user_prompt: str, temperature: float = 0.7, model: str = "deepseek") -> str:
    if model == "claude":
        client = get_claude_client()
        model_name = settings.CLAUDE_MODEL
    else:
        client = get_deepseek_client()
        model_name = settings.DEEPSEEK_MODEL

    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=temperature,
    )
    return response.choices[0].message.content or ""
