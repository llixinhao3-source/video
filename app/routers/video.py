import asyncio
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field

from app.config import settings
from app.services.video_engine import execute_video_workflow
from app.services.video_multimodal_engine import multimodal_engine, VIDEO_AGENT_PRESETS, VIDEO_AGENT_FILE_CHAIN

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/video", tags=["video"])

VALID_RATIOS = {"9:16", "16:9", "1:1"}

VIDEO_SWITCH_KEYS = [
    "draw_master",
    "avatar_video",
    "model_explain",
    "smart_cut",
    "brand_magic",
    "video_publisher",
]


class VideoWorkflowPayload(BaseModel):
    script_text: str = Field(..., description="用户输入的视频文案")
    aspect_ratio: str = Field("9:16", description="画面比例：9:16 / 16:9 / 1:1")
    switches: dict[str, bool] = Field(
        default_factory=lambda: {k: False for k in VIDEO_SWITCH_KEYS},
        description="前端 6 个专家开关布尔值字典",
    )
    project_id: str | None = Field(None, description="关联的项目 ID，用于读取品牌人设信息")


async def _append_video_to_obsidian(payload: VideoWorkflowPayload, result: dict) -> None:
    vault_path = settings.obsidian_vault_path
    if not vault_path:
        logger.warning("obsidian_vault_path is empty, skip video obsidian sync")
        return

    vault = Path(vault_path)
    try:
        if not vault.exists():
            vault.mkdir(parents=True, exist_ok=True)
    except OSError:
        logger.exception("Failed to create vault directory: %s", vault_path)
        return

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = "".join(c for c in payload.script_text[:30] if c.isalnum() or c in " _-").strip()
    if not safe_name:
        safe_name = "视频制作记录"
    filename = f"{safe_name}_视频_{timestamp}.md"
    filepath = vault / filename

    switches = {k: payload.switches.get(k, False) for k in VIDEO_SWITCH_KEYS}
    steps = result.get("steps_executed", [])
    node_results = result.get("node_results", {})
    assets_summary = result.get("assets_summary", {})

    md = "---\n"
    md += f"title: \"视频制作：{payload.script_text[:30]}\"\n"
    md += f"date: {datetime.now().strftime('%Y-%m-%d')}\n"
    md += f"time: {datetime.now().strftime('%H:%M')}\n"
    md += "type: 视频制作记录\n"
    md += "status: 已生成\n"
    md += "tags: [AI生成, 视频制作]\n"
    md += "---\n\n"

    md += f"# 🎬 视频制作记录：{payload.script_text[:30]}\n\n"

    md += "## 📋 制作参数\n\n"
    md += f"- **画面比例**：{payload.aspect_ratio}\n"
    md += f"- **文案长度**：{len(payload.script_text)} 字\n"
    md += f"- **执行状态**：{result.get('status', 'unknown')}\n"
    md += f"- **生成时间**：{datetime.now().isoformat()}\n\n"

    md += "## 🔧 专家开关\n\n"
    md += "| 开关 | 状态 |\n"
    md += "|------|------|\n"
    for k in VIDEO_SWITCH_KEYS:
        label_map = {
            "draw_master": "生图大师",
            "avatar_video": "数字人视频",
            "model_explain": "智模讲解",
            "smart_cut": "数字人智剪",
            "brand_magic": "品宣魔方",
            "video_publisher": "视频发布员",
        }
        md += f"| {label_map.get(k, k)} | {'✅ 开启' if switches[k] else '⬜ 关闭'} |\n"
    md += "\n"

    md += "## 📝 视频文案\n\n"
    md += f"{payload.script_text}\n\n"

    md += "## 📊 执行结果\n\n"
    md += f"- **已执行节点**：{', '.join(steps) if steps else '无'}\n"
    md += f"- **生成图片**：{assets_summary.get('images', 0)} 张\n"
    md += f"- **音频轨道**：{'✅ 有' if assets_summary.get('audio') else '❌ 无'}\n"
    md += f"- **视频片段**：{assets_summary.get('video_clips', 0)} 段\n\n"

    video_url = result.get("video_url")
    if video_url:
        md += "## 🎥 输出视频\n\n"
        md += f"- **文件路径**：`{video_url}`\n\n"

    node3 = node_results.get("node3", {})
    if node3.get("final_video_path"):
        md += f"- **本地路径**：`{node3['final_video_path']}`\n\n"

    node4 = node_results.get("video_publisher", {})
    if node4.get("published_platforms"):
        md += "## 📤 发布状态\n\n"
        for p in node4["published_platforms"]:
            md += f"- {p}：已加入发布队列\n"
        md += "\n"

    md += "---\n\n"
    md += "[[短视频运营SOP]]\n"

    try:
        filepath.write_text(md, encoding="utf-8")
        logger.info("Video obsidian note written: %s", filepath)
    except OSError:
        logger.exception("Failed to write video obsidian note to %s", filepath)


@router.post("/workflow")
async def video_workflow(payload: VideoWorkflowPayload):
    if payload.aspect_ratio not in VALID_RATIOS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid aspect_ratio: {payload.aspect_ratio}, must be one of {VALID_RATIOS}",
        )

    switches = {k: payload.switches.get(k, False) for k in VIDEO_SWITCH_KEYS}

    try:
        result = await execute_video_workflow(
            script_text=payload.script_text,
            aspect_ratio=payload.aspect_ratio,
            switches=switches,
            project_id=payload.project_id,
        )

        asyncio.create_task(_append_video_to_obsidian(payload, result))

        return {
            "status": result.get("status", "unknown"),
            "video_url": result.get("video_url"),
            "steps_executed": result.get("steps_executed", []),
            "aspect_ratio": result.get("aspect_ratio", payload.aspect_ratio),
            "assets_summary": result.get("assets_summary", {}),
        }

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    except Exception as e:
        logger.exception("Video workflow failed")
        raise HTTPException(status_code=500, detail="Video workflow error") from e


# ──────────────────────────────────────────────
# 多模态专家执行端点
# ──────────────────────────────────────────────

@router.post("/upload-greenscreen")
async def upload_greenscreen(
    project_id: str = Form(...),
    file: UploadFile = File(...),
):
    try:
        file_data = await file.read()
        saved_path = multimodal_engine.save_uploaded_file(
            project_id=project_id,
            file_data=file_data,
            original_filename=file.filename or "greenscreen.mp4",
        )
        return {"status": "ok", "file_path": saved_path, "file_name": file.filename}
    except Exception as e:
        logger.exception("Failed to upload greenscreen for project %s", project_id)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/run-multimodal-expert")
async def run_multimodal_expert(
    project_id: str = Form(...),
    agent_key: str = Form(...),
    user_custom_instruction: str = Form(""),
    referenced_avatar_id: str = Form(""),
    referenced_green_screen_path: str = Form(""),
    domain_params_json: str = Form("{}"),
    source_file: str = Form(""),
    target_file: str = Form(""),
):
    if agent_key not in VIDEO_AGENT_PRESETS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown agent_key: {agent_key}. Available: {list(VIDEO_AGENT_PRESETS.keys())}",
        )

    try:
        domain_params: dict[str, str] = json.loads(domain_params_json)
    except json.JSONDecodeError:
        domain_params = {}

    try:
        result = await multimodal_engine.run_multimodal_expert(
            project_id=project_id,
            agent_key=agent_key,
            user_custom_instruction=user_custom_instruction,
            referenced_avatar_id=referenced_avatar_id,
            referenced_green_screen_path=referenced_green_screen_path,
            domain_params=domain_params,
            source_file=source_file,
            target_file=target_file,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(
            "run-multimodal-expert failed | project=%s | agent=%s", project_id, agent_key
        )
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "status": "ok",
        "agent_key": result["agent_key"],
        "source_file": result["source_file"],
        "target_file": result["target_file"],
        "output": result["output"],
        "referenced_avatar_id": result.get("referenced_avatar_id", ""),
    }


@router.get("/multimodal-files/{project_id}")
async def list_multimodal_files(project_id: str):
    try:
        files = multimodal_engine.list_project_files(project_id)
        return {"project_id": project_id, "files": files}
    except Exception:
        logger.exception("Failed to list multimodal files for %s", project_id)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/multimodal-files/{project_id}/{file_name:path}")
async def read_multimodal_file(project_id: str, file_name: str):
    try:
        content = multimodal_engine.read_obsidian_file(project_id, file_name)
        return {"project_id": project_id, "file_name": file_name, "content": content}
    except Exception:
        raise HTTPException(status_code=404, detail=f"File not found: {file_name}")
