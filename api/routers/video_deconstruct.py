import subprocess
import json
import asyncio
from fastapi import APIRouter
from pydantic import BaseModel
from api.services.llm import chat
from api.services.workflows import _section

router = APIRouter(prefix="/api/v1/video", tags=["video"])


class ParseRequest(BaseModel):
    url: str


class DeconstructRequest(BaseModel):
    inputs: dict
    agents: dict


def _detect_platform(url: str) -> str:
    u = url.lower()
    if "douyin.com" in u or "iesdouyin.com" in u:
        return "抖音"
    if "xiaohongshu.com" in u or "xhslink.com" in u:
        return "小红书"
    if "bilibili.com" in u or "b23.tv" in u:
        return "B站"
    if "kuaishou.com" in u or "gifshow.com" in u:
        return "快手"
    if "youtube.com" in u or "youtu.be" in u:
        return "YouTube"
    if "weibo.com" in u or "weibo.cn" in u:
        return "微博"
    return "未知平台"


async def _run_yt_dlp(url: str) -> dict:
    cmd = [
        "yt-dlp",
        "--dump-json",
        "--no-download",
        "--no-warnings",
        "--quiet",
        "--no-check-certificates",
        url,
    ]
    result = await asyncio.to_thread(
        subprocess.run,
        cmd,
        capture_output=True,
        text=True,
        timeout=60,
    )
    if result.returncode != 0:
        stderr = result.stderr.strip()
        raise RuntimeError(f"yt-dlp 解析失败：{stderr[:500]}")

    info = json.loads(result.stdout)

    return {
        "title": info.get("title", ""),
        "description": info.get("description", ""),
        "duration": info.get("duration"),
        "view_count": info.get("view_count"),
        "like_count": info.get("like_count"),
        "comment_count": info.get("comment_count"),
        "uploader": info.get("uploader", info.get("channel", "")),
        "upload_date": info.get("upload_date", ""),
        "thumbnail": info.get("thumbnail", ""),
        "video_url": info.get("webpage_url", url),
        "platform": _detect_platform(url),
        "tags": info.get("tags", []),
        "categories": info.get("categories", []),
    }


@router.post("/parse")
async def parse_video(req: ParseRequest):
    try:
        video_info = await _run_yt_dlp(req.url)
        return {"success": True, "video_info": video_info}
    except subprocess.TimeoutExpired:
        return {"success": False, "detail": "视频解析超时，请检查链接是否正确"}
    except json.JSONDecodeError:
        return {"success": False, "detail": "视频信息解析失败，请确认链接可访问"}
    except Exception as e:
        return {"success": False, "detail": str(e)[:200]}


@router.post("/deconstruct")
async def deconstruct_video(req: DeconstructRequest):
    video_info = req.inputs.get("videoInfo", {})
    agents = req.agents
    sections = []

    title = video_info.get("title", "")
    description = video_info.get("description", "")
    platform = video_info.get("platform", "")
    uploader = video_info.get("uploader", "")
    duration = video_info.get("duration")
    view_count = video_info.get("view_count")
    like_count = video_info.get("like_count")
    comment_count = video_info.get("comment_count")
    tags = video_info.get("tags", [])

    video_context = f"视频标题：{title}\n平台：{platform}\n作者：{uploader}"
    if duration:
        video_context += f"\n时长：{duration}秒"
    if view_count is not None:
        video_context += f"\n播放量：{view_count}"
    if like_count is not None:
        video_context += f"\n点赞数：{like_count}"
    if comment_count is not None:
        video_context += f"\n评论数：{comment_count}"
    if description:
        video_context += f"\n描述：{description[:500]}"
    if tags:
        video_context += f"\n标签：{', '.join(str(t) for t in tags[:10])}"

    agent_prompts = {
        "structure": (
            "短视频结构拆解专家",
            "根据视频信息，拆解视频的完整结构框架，包括：开头钩子区（前3秒做了什么）、内容展开区（分几个段落/要点）、结尾引导区（CTA是什么）。输出清晰的结构图。",
            "结构拆解",
        ),
        "hook": (
            "短视频钩子分析专家",
            "根据视频信息，深度分析视频开头3秒的钩子设计：用了什么吸引手法（悬念/冲突/反常识/痛点共鸣）、钩子的心理机制、为什么有效、如何复用这种钩子模式。",
            "钩子分析",
        ),
        "script": (
            "短视频文案还原专家",
            "根据视频标题和描述，还原视频的口播文案。按照原视频可能的叙事逻辑，还原出完整的口播脚本，包括开场白、正文、结尾引导语。用Markdown格式输出。",
            "文案还原",
        ),
        "visual": (
            "短视频视觉分析专家",
            "根据视频信息，分析视频可能的视觉呈现方式：画面构图、镜头切换节奏、字幕样式、色彩调性、特效使用等。给出视觉层面的拆解和建议。",
            "视觉分析",
        ),
        "rhythm": (
            "短视频节奏分析专家",
            "根据视频信息，分析视频的叙事节奏：信息密度分布、情绪曲线变化、快慢节奏切换点、高潮设置位置等。给出节奏层面的拆解。",
            "节奏分析",
        ),
        "replicate": (
            "短视频复刻策略专家",
            "根据以上视频拆解信息，提炼可复制的核心元素和模式，给出3个可立即执行的复刻方案，每个方案包含：选题角度、脚本框架、拍摄建议。",
            "复刻建议",
        ),
    }

    tasks = []
    keys = []
    for key, (role, task, section_title) in agent_prompts.items():
        if agents.get(key, True):
            system = f"你是一位{role}。{task}输出结构化的分析结果，用Markdown格式。"
            user = f"{video_context}\n\n请进行分析。"
            tasks.append(asyncio.to_thread(chat, system, user, 0.7))
            keys.append((key, section_title))

    if tasks:
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for (key, section_title), result in zip(keys, results):
            if isinstance(result, Exception):
                sections.append(_section(section_title, f"分析失败：{str(result)}"))
            else:
                sections.append(_section(section_title, result))

    return {"sections": sections}


@router.post("/viral_follow_up")
async def viral_follow_up(req: DeconstructRequest):
    video_info = req.inputs.get("videoInfo", {})
    agents = req.agents
    sections = []

    title = video_info.get("title", "")
    description = video_info.get("description", "")
    platform = video_info.get("platform", "")
    uploader = video_info.get("uploader", "")
    duration = video_info.get("duration")
    view_count = video_info.get("view_count")
    like_count = video_info.get("like_count")
    comment_count = video_info.get("comment_count")
    tags = video_info.get("tags", [])

    video_context = f"爆款视频标题：{title}\n平台：{platform}\n作者：{uploader}"
    if duration:
        video_context += f"\n时长：{duration}秒"
    if view_count is not None:
        video_context += f"\n播放量：{view_count}"
    if like_count is not None:
        video_context += f"\n点赞数：{like_count}"
    if comment_count is not None:
        video_context += f"\n评论数：{comment_count}"
    if description:
        video_context += f"\n描述/文案：{description[:800]}"
    if tags:
        video_context += f"\n标签：{', '.join(str(t) for t in tags[:10])}"

    agent_prompts = {
        "scriptAdapt": (
            "短视频脚本改编专家",
            "根据这个爆款视频的信息，改编一个适合新手执行的跟拍脚本。保留原视频的核心吸引力和结构，但替换为可落地的内容。输出完整的口播脚本，包含开场钩子、正文3个要点、结尾CTA。用Markdown格式。",
            "脚本改编",
        ),
        "shotList": (
            "短视频分镜脚本专家",
            "根据这个爆款视频的信息，生成逐镜拍摄方案。每个镜头包含：时长、景别（近景/中景/远景）、画面内容描述、旁白/字幕内容。用表格格式输出，适合新手直接照着拍。",
            "分镜脚本",
        ),
        "propList": (
            "短视频拍摄道具专家",
            "根据这个爆款视频的信息，列出跟拍所需的全部道具和设备清单。分类为：必备道具（没有不行）、加分道具（有了更好）、可选替代方案。每项标注预估成本。",
            "道具清单",
        ),
        "caption": (
            "短视频字幕文案专家",
            "根据这个爆款视频的信息，生成完整的口播字幕文案。要求：口语化、节奏感强、每句不超过15字、适合配字幕显示。同时生成3组备选标题。",
            "字幕文案",
        ),
        "publishPlan": (
            "短视频发布策略专家",
            "根据这个爆款视频的信息和平台特征，制定最佳发布策略。包含：推荐发布时间、话题标签组合、封面文字建议、评论区互动话术。用Markdown格式输出。",
            "发布策略",
        ),
        "diffStrategy": (
            "短视频差异化策略专家",
            "根据这个爆款视频的信息，分析如何跟拍但避免同质化。给出3个差异化切入角度，每个角度包含：差异化点、目标受众、内容方向。确保跟拍但有自己特色，避免被平台判定为搬运。",
            "差异化建议",
        ),
    }

    tasks = []
    keys = []
    for key, (role, task, section_title) in agent_prompts.items():
        if agents.get(key, True):
            system = f"你是一位{role}。{task}输出结构化的结果，用Markdown格式。"
            user = f"{video_context}\n\n请生成跟拍方案。"
            tasks.append(asyncio.to_thread(chat, system, user, 0.7))
            keys.append((key, section_title))

    if tasks:
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for (key, section_title), result in zip(keys, results):
            if isinstance(result, Exception):
                sections.append(_section(section_title, f"生成失败：{str(result)}"))
            else:
                sections.append(_section(section_title, result))

    return {"sections": sections}
