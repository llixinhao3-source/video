import json
import logging

from openai import AsyncOpenAI

from app.config import settings
from app.prompts import PROMPT_TEMPLATES

logger = logging.getLogger(__name__)

_text_client: AsyncOpenAI | None = None
_video_client: AsyncOpenAI | None = None


def _get_text_client() -> AsyncOpenAI:
    global _text_client
    if _text_client is None:
        _text_client = AsyncOpenAI(
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_api_base,
        )
    return _text_client


def _get_video_client() -> AsyncOpenAI:
    global _video_client
    if _video_client is None:
        _video_client = AsyncOpenAI(
            api_key=settings.video_api_key,
            base_url=settings.video_api_base,
        )
    return _video_client


async def call_agent(agent_type: str, user_input: str) -> dict:
    if agent_type not in PROMPT_TEMPLATES:
        raise ValueError(f"Unknown agent_type: {agent_type}, available: {list(PROMPT_TEMPLATES.keys())}")

    system_prompt = PROMPT_TEMPLATES[agent_type]
    client = _get_text_client()

    try:
        response = await client.chat.completions.create(
            model=settings.deepseek_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_input},
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
        )
        content = response.choices[0].message.content
        logger.info("Agent %s response received, tokens: %s", agent_type, response.usage)
        return json.loads(content)
    except json.JSONDecodeError as e:
        logger.error("Agent %s returned invalid JSON: %s", agent_type, e)
        raise ValueError(f"Agent {agent_type} returned invalid JSON") from e
    except Exception as e:
        logger.error("Agent %s call failed: %s", agent_type, e)
        raise
