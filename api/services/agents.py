import json
import re
import asyncio
from api.services.llm import chat

STYLE_MAP = {
    "humor": "幽默风趣",
    "professional": "专业严谨",
    "warm": "温馨感人",
    "viral": "爆款吸睛",
}


def _parse_json(text: str) -> dict | list | None:
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if match:
        text = match.group(1)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


async def _llm(system: str, user: str, temperature: float = 0.7) -> str:
    return await asyncio.to_thread(chat, system, user, temperature)


async def agent_framework(topic: str, style: str) -> str:
    system = (
        "你是一位短视频文案架构师。根据用户提供的选题和风格，生成一份结构清晰的文案框架。"
        "框架应包含：开头钩子区、核心内容区（2-3个要点）、结尾引导区。"
        "只输出框架文本，不要输出多余解释。"
    )
    user = f"选题：{topic}\n风格：{STYLE_MAP.get(style, style)}\n请生成文案框架。"
    return await _llm(system, user, 0.7)


async def agent_title_generator(topic: str, style: str) -> list[str]:
    system = (
        "你是一位爆款标题专家。根据选题和风格，生成5个不同角度的短视频标题。"
        "以JSON数组格式输出，例如：[\"标题1\",\"标题2\",\"标题3\",\"标题4\",\"标题5\"]"
        "只输出JSON数组，不要输出其他内容。"
    )
    user = f"选题：{topic}\n风格：{STYLE_MAP.get(style, style)}\n请生成5个标题。"
    raw = await _llm(system, user, 0.9)
    parsed = _parse_json(raw)
    if isinstance(parsed, list):
        return [str(t) for t in parsed[:5]]
    lines = [l.strip().lstrip("0123456789.-) ") for l in raw.split("\n") if l.strip()]
    return lines[:5] if lines else [f"关于{topic}的短视频"]


async def agent_hook_designer(topic: str, style: str) -> str:
    system = (
        "你是一位短视频钩子设计师，专精于设计前3秒吸睛开头。"
        "根据选题和风格，设计一个能瞬间抓住观众注意力的开头话术（30字以内）。"
        "只输出钩子文本，不要输出多余解释。"
    )
    user = f"选题：{topic}\n风格：{STYLE_MAP.get(style, style)}\n请设计前3秒钩子。"
    return await _llm(system, user, 0.8)


async def agent_text_rewriter(framework: str, topic: str, style: str) -> str:
    system = (
        "你是一位文本改写师，擅长将框架改写为口语化、节奏感强的短视频脚本正文。"
        "要求：语言通俗自然，适合口播，每段2-3句话，节奏明快。"
        "只输出脚本正文，不要输出多余解释。"
    )
    user = f"选题：{topic}\n风格：{STYLE_MAP.get(style, style)}\n文案框架：\n{framework}\n请改写为口播脚本正文。"
    return await _llm(system, user, 0.7)


async def agent_selling_point(topic: str, style: str) -> str:
    system = (
        "你是一位卖点策划师。根据选题，提炼3个核心卖点/痛点，"
        "以简洁有力的短句形式输出，每行一个卖点。"
        "只输出卖点列表，不要输出多余解释。"
    )
    user = f"选题：{topic}\n风格：{STYLE_MAP.get(style, style)}\n请提炼核心卖点。"
    return await _llm(system, user, 0.6)


async def agent_marketing_copy(topic: str, style: str, selling_points: str) -> str:
    system = (
        "你是一位营销文案助手，擅长撰写引导用户点赞、关注、评论的互动话术。"
        "根据选题和卖点，生成一段自然的互动引导语（包含点赞、关注、评论引导）。"
        "只输出引导语文本，不要输出多余解释。"
    )
    user = f"选题：{topic}\n风格：{STYLE_MAP.get(style, style)}\n核心卖点：\n{selling_points}\n请生成互动引导语。"
    return await _llm(system, user, 0.7)


async def agent_tags_generator(topic: str, style: str) -> list[str]:
    system = (
        "你是一位话题标签专家。根据选题和风格，推荐8个适合的短视频话题标签。"
        "以JSON数组格式输出，例如：[\"标签1\",\"标签2\",...]"
        "只输出JSON数组，不要输出其他内容。标签不要带#号。"
    )
    user = f"选题：{topic}\n风格：{STYLE_MAP.get(style, style)}\n请推荐话题标签。"
    raw = await _llm(system, user, 0.7)
    parsed = _parse_json(raw)
    if isinstance(parsed, list):
        return [str(t).strip("#") for t in parsed[:8]]
    lines = [l.strip().lstrip("0123456789.-) ").strip("#") for l in raw.split("\n") if l.strip()]
    return lines[:8] if lines else ["短视频", "AI文案"]


async def run_agent_pipeline(
    topic: str,
    style: str,
    agents: dict,
) -> dict:
    framework = ""
    titles: list[str] = []
    hook = ""
    content = ""
    selling_points = ""
    cta = ""
    tags: list[str] = []

    independent_tasks = {}
    if agents.get("titleGenerator", True):
        independent_tasks["titles"] = agent_title_generator(topic, style)
    if agents.get("hookDesigner", True):
        independent_tasks["hook"] = agent_hook_designer(topic, style)
    if agents.get("sellingPoint", True):
        independent_tasks["selling_points"] = agent_selling_point(topic, style)
    independent_tasks["tags"] = agent_tags_generator(topic, style)
    if agents.get("framework", True):
        independent_tasks["framework"] = agent_framework(topic, style)

    results = await asyncio.gather(*independent_tasks.values(), return_exceptions=True)
    resolved = dict(zip(independent_tasks.keys(), results))

    for key, result in resolved.items():
        if isinstance(result, Exception):
            continue
        if key == "titles":
            titles = result
        elif key == "hook":
            hook = result
        elif key == "selling_points":
            selling_points = result
        elif key == "tags":
            tags = result
        elif key == "framework":
            framework = result

    dependent_tasks = {}
    if agents.get("textRewriter", True):
        dependent_tasks["content"] = agent_text_rewriter(
            framework or f"关于「{topic}」的短视频", topic, style
        )
    if agents.get("marketingCopy", True):
        dependent_tasks["cta"] = agent_marketing_copy(
            topic, style, selling_points or ""
        )

    if dependent_tasks:
        dep_results = await asyncio.gather(*dependent_tasks.values(), return_exceptions=True)
        dep_resolved = dict(zip(dependent_tasks.keys(), dep_results))
        for key, result in dep_resolved.items():
            if isinstance(result, Exception):
                continue
            if key == "content":
                content = result
            elif key == "cta":
                cta = result

    if not agents.get("textRewriter", True):
        content = framework

    if not titles:
        titles = [f"关于{topic}的短视频"]
    if not hook:
        hook = f"你知道吗？关于{topic}，有一个你绝对想不到的秘密..."
    if not content:
        content = f"这是关于「{topic}」的短视频内容。"
    if not cta:
        cta = "如果觉得有帮助，记得点赞关注，评论区告诉我你的想法！"
    if not tags:
        tags = ["短视频", "AI文案"]

    return {
        "titles": titles,
        "hook": hook,
        "content": content,
        "cta": cta,
        "tags": tags,
    }
