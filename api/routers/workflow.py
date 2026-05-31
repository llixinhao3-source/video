import asyncio
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from api.services.agents import run_agent_pipeline
from api.services.risk_control import check_risk
from api.services.workflows import (
    run_positioning,
    run_topic,
    run_video,
    run_private_domain,
    run_market,
    run_boss,
    run_resource,
    run_channel_task,
)
from api.services.llm import chat
from api.services.prompts import get_prompt, parse_json_response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/workflow", tags=["workflow"])

AGENT_ORDER = [
    "inspiration_center",
    "video_mining",
    "competitor_monitor",
    "ip_benchmark",
    "video_analyzer",
    "video_deconstructor",
    "ip_positioning_expert",
    "viral_title_specialist",
]

AGENT_LABELS = {
    "inspiration_center": "灵感中心",
    "video_mining": "视频挖掘",
    "competitor_monitor": "同行监控",
    "ip_benchmark": "IP对标",
    "video_analyzer": "视频分析",
    "video_deconstructor": "视频拆解",
    "ip_positioning_expert": "IP定位专家",
    "viral_title_specialist": "爆款标题专员",
    "long_term_planner": "长线选题规划",
}


class GenericWorkflowRequest(BaseModel):
    inputs: dict = {}
    style: str = ""
    agents: dict = {}


class TopicWorkflowRequest(BaseModel):
    keyword: str = Field(..., min_length=1, description="选题关键词")
    param_style: str = Field("追热点", description="内容策略参数（追热点/常青内容/混合策略）")
    inspiration_center: bool = True
    video_mining: bool = True
    competitor_monitor: bool = True
    ip_benchmark: bool = True
    video_analyzer: bool = True
    video_deconstructor: bool = True
    ip_positioning_expert: bool = True
    viral_title_specialist: bool = True
    long_term_planner: bool = True


async def _call_topic_agent(agent_key: str, user_message: str) -> dict:
    label = AGENT_LABELS.get(agent_key, agent_key)
    system_prompt = get_prompt(agent_key)
    if not system_prompt:
        logger.warning(f"{label}: 提示词 {agent_key} 不存在，跳过")
        return {"agent": agent_key, "label": label, "parsed": None, "raw": "", "error": f"提示词 {agent_key} 不存在"}

    try:
        raw = await asyncio.to_thread(chat, system_prompt, user_message, 0.7)
        parsed = parse_json_response(raw)
        if parsed is None:
            logger.warning(f"{label}: JSON 解析失败，保留原始文本")
            return {"agent": agent_key, "label": label, "parsed": None, "raw": raw, "error": "JSON 解析失败"}
        return {"agent": agent_key, "label": label, "parsed": parsed, "raw": raw, "error": None}
    except Exception as e:
        logger.error(f"{label} 执行失败: {e}")
        return {"agent": agent_key, "label": label, "parsed": None, "raw": "", "error": str(e)}


def _build_context_from_results(results: list[dict]) -> str:
    parts = []
    for r in results:
        if r.get("parsed"):
            content = "\n".join(f"  {k}：{v}" for k, v in r["parsed"].items())
            parts.append(f"【{r['label']}】\n{content}")
        elif r.get("raw"):
            parts.append(f"【{r['label']}】\n{r['raw']}")
    return "\n\n".join(parts)


@router.post("/create_topic")
async def create_topic(req: TopicWorkflowRequest):
    if not req.keyword.strip():
        raise HTTPException(status_code=400, detail="请输入选题关键词")

    keyword = req.keyword.strip()
    param_style = req.param_style.strip() or "追热点"

    enabled_agents = [key for key in AGENT_ORDER if getattr(req, key, False)]

    if not enabled_agents and not req.long_term_planner:
        raise HTTPException(status_code=400, detail="请至少开启一个智能体")

    agent_results: list[dict] = []
    accumulated_context = f"选题关键词：{keyword}\n内容策略：{param_style}"

    for agent_key in enabled_agents:
        label = AGENT_LABELS[agent_key]
        user_message = accumulated_context

        logger.info(f"[选题工作流] 调用 {label}({agent_key})...")
        result = await _call_topic_agent(agent_key, user_message)

        agent_results.append(result)

        if result.get("parsed"):
            step_summary = "\n".join(f"  {k}：{v}" for k, v in result["parsed"].items())
            accumulated_context = f"{accumulated_context}\n\n【{label}分析结果】\n{step_summary}"
        elif result.get("raw"):
            accumulated_context = f"{accumulated_context}\n\n【{label}分析结果】\n{result['raw']}"

    final_result = None
    if req.long_term_planner:
        all_context = _build_context_from_results(agent_results) if agent_results else "（无前置智能体输出）"
        planner_message = (
            f"选题关键词：{keyword}\n"
            f"内容策略：{param_style}\n\n"
            f"以下是各前置智能体的分析结果，请深度整合后输出最终选题方案：\n\n{all_context}"
        )

        logger.info("[选题工作流] 调用 长线选题规划(long_term_planner)...")
        planner_result = await _call_topic_agent("long_term_planner", planner_message)
        agent_results.append(planner_result)
        final_result = planner_result.get("parsed") or {"raw_response": planner_result.get("raw", "")}

    sections = {}
    for r in agent_results:
        key = r["agent"]
        sections[key] = {
            "label": r["label"],
            "data": r.get("parsed") or r.get("raw", ""),
            "error": r.get("error"),
        }

    return {
        "success": True,
        "data": {
            "keyword": keyword,
            "param_style": param_style,
            "enabled_agents": enabled_agents + (["long_term_planner"] if req.long_term_planner else []),
            "sections": sections,
            "final_topics": final_result,
        },
    }


@router.post("/create_script")
async def create_script(req: GenericWorkflowRequest):
    topic = req.inputs.get("topic", "")
    if not topic.strip():
        raise HTTPException(status_code=400, detail="请输入核心主题")

    try:
        result = await run_agent_pipeline(
            topic=topic,
            style=req.style or "viral",
            agents=req.agents,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 生成失败: {str(e)}")

    full_text = " ".join(result["titles"]) + " " + result["hook"] + " " + result["content"] + " " + result["cta"]

    risk_report = {"hasRisk": False, "riskyWords": []}
    if req.agents.get("riskControl", True):
        risk_report = check_risk(full_text)

    return {
        "success": True,
        "data": {
            "titles": result["titles"],
            "hook": result["hook"],
            "content": result["content"],
            "cta": result["cta"],
            "tags": result["tags"],
            "riskReport": risk_report,
        },
    }


@router.post("/positioning")
async def positioning(req: GenericWorkflowRequest):
    try:
        result = await run_positioning(req.inputs, req.agents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 生成失败: {str(e)}")
    return {"success": True, "data": result}


@router.post("/topic")
async def topic(req: GenericWorkflowRequest):
    try:
        result = await run_topic(req.inputs, req.style, req.agents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 生成失败: {str(e)}")
    return {"success": True, "data": result}


@router.post("/video")
async def video(req: GenericWorkflowRequest):
    try:
        result = await run_video(req.inputs, req.style, req.agents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 生成失败: {str(e)}")
    return {"success": True, "data": result}


@router.post("/private_domain")
async def private_domain(req: GenericWorkflowRequest):
    try:
        result = await run_private_domain(req.inputs, req.agents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 生成失败: {str(e)}")
    return {"success": True, "data": result}


@router.post("/market")
async def market(req: GenericWorkflowRequest):
    try:
        result = await run_market(req.inputs, req.style, req.agents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 生成失败: {str(e)}")
    return {"success": True, "data": result}


@router.post("/boss")
async def boss(req: GenericWorkflowRequest):
    try:
        result = await run_boss(req.inputs, req.style, req.agents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 生成失败: {str(e)}")
    return {"success": True, "data": result}


@router.post("/resource")
async def resource(req: GenericWorkflowRequest):
    try:
        result = await run_resource(req.inputs, req.agents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 生成失败: {str(e)}")
    return {"success": True, "data": result}


@router.post("/channel_task")
async def channel_task(req: GenericWorkflowRequest):
    try:
        result = await run_channel_task(req.inputs, req.agents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 生成失败: {str(e)}")
    return {"success": True, "data": result}
