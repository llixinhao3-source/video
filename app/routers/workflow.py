import asyncio
import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.feishu import feishu_service
from app.services.llm import call_agent
from app.services.obsidian import write_to_obsidian, write_title_to_obsidian

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/workflow", tags=["workflow"])

AGENT_SWITCH_KEYS = [
    "smart_follow",
    "title_generator",
    "hook_designer",
    "USP_planner",
    "text_rewriter",
    "risk_control",
    "marketing_assistant",
]


class WorkflowRequest(BaseModel):
    topic: str = Field(..., description="选题关键词")
    style: str = Field("专业", description="风格参数：幽默/专业/温馨等")
    agents: dict[str, bool] = Field(
        default_factory=lambda: {k: True for k in AGENT_SWITCH_KEYS},
        description="专家开关字典",
    )


def _safe_get(data: dict, *keys: str, default: Any = None) -> Any:
    current = data
    for key in keys:
        if isinstance(current, dict):
            current = current.get(key, default)
        else:
            return default
    return current


async def _fire_and_forget(coro) -> None:
    try:
        await coro
    except Exception:
        logger.exception("Fire-and-forget task failed")


@router.post("/create_script")
async def create_script(req: WorkflowRequest):
    agents = {k: req.agents.get(k, False) for k in AGENT_SWITCH_KEYS}

    try:
        # ── Step 1: 智能跟创 ──
        if agents["smart_follow"]:
            script_result = await call_agent(
                "script_generator",
                f"选题关键词：{req.topic}\n风格要求：{req.style}\n请生成短视频脚本初稿。",
            )
            draft_text = _safe_get(script_result, "script", "body", default=req.topic)
        else:
            script_result = {}
            draft_text = req.topic

        # ── Step 2: 并发深度优化 ──
        step2_coros = []
        step2_labels = []

        if agents["title_generator"]:
            step2_coros.append(
                call_agent(
                    "title_expert",
                    f"选题关键词：{req.topic}\n风格要求：{req.style}\n脚本内容：{draft_text}\n请生成多版标题方案。",
                )
            )
            step2_labels.append("title")

        if agents["hook_designer"]:
            step2_coros.append(
                call_agent(
                    "hook_designer",
                    f"选题关键词：{req.topic}\n风格要求：{req.style}\n脚本内容：{draft_text}\n请设计前3秒黄金钩子。",
                )
            )
            step2_labels.append("hook")

        if agents["USP_planner"]:
            step2_coros.append(
                call_agent(
                    "seller_planner",
                    f"选题关键词：{req.topic}\n脚本内容：{draft_text}\n请深度提炼产品核心卖点。",
                )
            )
            step2_labels.append("usp")

        step2_results = await asyncio.gather(*step2_coros, return_exceptions=True) if step2_coros else []

        title_result = {}
        hook_result = {}
        usp_result = {}

        for label, result in zip(step2_labels, step2_results):
            if isinstance(result, Exception):
                logger.error("Step2 %s failed: %s", label, result)
                continue
            if label == "title":
                title_result = result
            elif label == "hook":
                hook_result = result
            elif label == "usp":
                usp_result = result

        # ── Step 3: 文本改写与转化 ──
        titles_text = ""
        if title_result.get("titles"):
            titles_text = " | ".join(t.get("content", "") for t in title_result["titles"])

        hooks_text = ""
        if hook_result.get("hooks"):
            hooks_text = " | ".join(h.get("content", "") for h in hook_result["hooks"])

        usp_text = ""
        if usp_result.get("selling_points"):
            usp_text = " | ".join(sp.get("point", "") for sp in usp_result["selling_points"])

        combined_parts = []
        if titles_text:
            combined_parts.append(f"【标题】{titles_text}")
        if hooks_text:
            combined_parts.append(f"【钩子】{hooks_text}")
        combined_parts.append(f"【正文】{draft_text}")
        if usp_text:
            combined_parts.append(f"【卖点】{usp_text}")

        combined_text = "\n".join(combined_parts)
        body_content = draft_text

        if agents["text_rewriter"]:
            rewrite_result = await call_agent(
                "text_rewriter",
                f"风格要求：{req.style}\n请改写以下文案，使其更口语化、节奏感更强：\n{combined_text}",
            )
            body_content = _safe_get(rewrite_result, "rewritten_text", default=body_content)

        cta_result = {}
        if agents["marketing_assistant"]:
            marketing_input = f"选题关键词：{req.topic}\n风格要求：{req.style}\n正文内容：{body_content}\n请生成引导语和话题标签。"
            cta_result = await call_agent("marketing_assistant", marketing_input)

        # ── Step 4: 合规风控 ──
        risk_report: dict[str, Any] = {
            "is_safe": True,
            "risk_words": [],
            "suggestions": "",
        }

        if agents["risk_control"]:
            risk_input_parts = []
            if titles_text:
                risk_input_parts.append(f"标题：{titles_text}")
            if hooks_text:
                risk_input_parts.append(f"钩子：{hooks_text}")
            risk_input_parts.append(f"正文：{body_content}")
            if cta_result.get("guide_words"):
                risk_input_parts.append(f"引导语：{cta_result['guide_words']}")

            risk_result = await call_agent("risk_control", "\n".join(risk_input_parts))

            risk_report = {
                "is_safe": risk_result.get("is_safe", True),
                "risk_words": risk_result.get("risk_words", []),
                "suggestions": risk_result.get("suggestions", ""),
            }

            if not risk_report["is_safe"] and risk_report["suggestions"]:
                body_content = risk_report["suggestions"]

        # ── 拼装 SOP 3.3 规范返回体 ──
        workflow_result: dict[str, Any] = {
            "title_and_hook": {
                "titles": title_result.get("titles", []),
                "hooks": hook_result.get("hooks", []),
            },
            "body_content": body_content,
            "cta_and_tags": {
                "guide_words": cta_result.get("guide_words", ""),
                "tags": cta_result.get("tags", []),
            },
            "risk_report": risk_report,
        }

        # ── 保护性写入 Obsidian + 飞书 ──
        asyncio.create_task(_fire_and_forget(write_to_obsidian(workflow_result)))
        asyncio.create_task(_fire_and_forget(
            feishu_service.add_record_to_base(
                app_token="",
                table_id="",
                data={
                    "title": titles_text or req.topic,
                    "script": body_content,
                    "risk_result": "安全" if risk_report["is_safe"] else "有风险",
                    "created_at": datetime.now().isoformat(),
                },
            )
        ))

        return workflow_result

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    except Exception as e:
        logger.exception("Workflow create_script failed")
        raise HTTPException(status_code=500, detail="Internal server error") from e


TITLE_AGENT_SWITCH_KEYS = [
    "title_master",
    "platform_optimizer",
    "ab_test_planner",
]


class TitleWorkflowRequest(BaseModel):
    script_summary: str = Field(..., description="文案摘要内容")
    style: str = Field("clickbait", description="标题风格：clickbait/informative/emotional/suspense")
    agents: dict[str, bool] = Field(
        default_factory=lambda: {k: True for k in TITLE_AGENT_SWITCH_KEYS},
        description="标题专家开关字典",
    )


@router.post("/generate_titles")
async def generate_titles(req: TitleWorkflowRequest):
    agents = {k: req.agents.get(k, False) for k in TITLE_AGENT_SWITCH_KEYS}

    try:
        style_map = {
            "clickbait": "吸睛型",
            "informative": "干货型",
            "emotional": "情感型",
            "suspense": "悬念型",
        }
        style_label = style_map.get(req.style, "吸睛型")

        titles_result = {}
        if agents["title_master"]:
            titles_result = await call_agent(
                "title_expert",
                f"文案内容：{req.script_summary}\n标题风格：{style_label}\n请生成 5 个爆款标题方案。",
            )

        platform_result = {}
        if agents["platform_optimizer"]:
            titles_text = ""
            if titles_result.get("titles"):
                titles_text = " | ".join(
                    t.get("content", "") for t in titles_result["titles"]
                )
            platform_input = (
                f"文案内容：{req.script_summary}\n"
                f"已有标题：{titles_text or '暂无'}\n"
                f"请为各平台生成适配标题。"
            )
            platform_result = await call_agent("platform_optimizer", platform_input)

        ab_test_result = {}
        if agents["ab_test_planner"]:
            titles_text = ""
            if titles_result.get("titles"):
                titles_text = " | ".join(
                    t.get("content", "") for t in titles_result["titles"]
                )
            ab_input = (
                f"文案内容：{req.script_summary}\n"
                f"已有标题：{titles_text or '暂无'}\n"
                f"请设计 A/B 测试对比方案。"
            )
            ab_test_result = await call_agent("ab_test_planner", ab_input)

        workflow_result: dict[str, Any] = {
            "titles": titles_result.get("titles", []),
            "platform_optimized": platform_result.get("platform_titles", {}),
            "ab_test_plan": ab_test_result.get("test_groups", []),
            "style": req.style,
        }

        asyncio.create_task(_fire_and_forget(write_title_to_obsidian(workflow_result)))

        return {"success": True, "data": workflow_result}

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    except Exception as e:
        logger.exception("Workflow generate_titles failed")
        raise HTTPException(status_code=500, detail="Internal server error") from e
