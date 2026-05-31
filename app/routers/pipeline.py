import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.models.pipeline import (
    STEP_FLOW,
    list_pipelines,
    load_pipeline,
    update_step,
)
from app.services.project_engine import (
    AGENT_FILE_CHAIN,
    FRONTEND_AGENT_MAP,
    engine,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/pipeline", tags=["pipeline"])


class UpdateStepRequest(BaseModel):
    project_id: str = Field(..., description="项目 ID")
    step_name: str = Field(
        ...,
        description="步骤名称：positioning | topic | script | video | done",
    )
    data: dict = Field(..., description="该步骤产出的 JSON 数据")
    advance: bool = Field(True, description="是否自动推进到下一步")


class UpdateStepResponse(BaseModel):
    project_id: str
    current_status: str
    updated_fields: list[str]


class RunExpertRequest(BaseModel):
    project_id: str = Field(..., description="全局项目 ID，用于锁定 Obsidian 文件夹")
    agent_key: str = Field(..., description="当前调用哪个专家，如 framework / hookDesigner")
    user_custom_instruction: str = Field("", description="用户针对该专家的个性化指令")
    source_file: str | None = Field(None, description="从 Obsidian 读取的源文件，不传则使用预设文件链")
    target_file: str | None = Field(None, description="处理完毕后的目标文件，不传则使用预设文件链")


@router.post("/update-step", response_model=UpdateStepResponse)
async def update_pipeline_step(req: UpdateStepRequest):
    if req.step_name not in STEP_FLOW:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid step_name: {req.step_name}. Must be one of {STEP_FLOW}",
        )

    try:
        proj = update_step(
            project_id=req.project_id,
            step=req.step_name,
            data=req.data,
            advance=req.advance,
        )
    except Exception as e:
        logger.exception("update-step failed for %s", req.project_id)
        raise HTTPException(status_code=500, detail=str(e))

    changed_fields: list[str] = []
    if req.step_name == "positioning" and proj.account_profile is not None:
        changed_fields.append("account_profile")
    elif req.step_name == "topic" and proj.selected_topic is not None:
        changed_fields.append("selected_topic")
    elif req.step_name == "script" and proj.script_output is not None:
        changed_fields.append("script_output")
    elif req.step_name == "video" and proj.video_output is not None:
        changed_fields.append("video_output")

    return UpdateStepResponse(
        project_id=proj.project_id,
        current_status=proj.current_status,
        updated_fields=changed_fields,
    )


@router.get("/fetch-context/{project_id}")
async def fetch_pipeline_context(project_id: str):
    try:
        proj = load_pipeline(project_id)
    except Exception:
        raise HTTPException(status_code=404, detail=f"Project not found: {project_id}")

    return {
        "project_id": proj.project_id,
        "current_status": proj.current_status,
        "account_profile": proj.account_profile,
        "selected_topic": proj.selected_topic,
        "script_output": proj.script_output,
        "video_output": proj.video_output,
        "private_domain_data": proj.private_domain_data,
        "boss_report_url": proj.boss_report_url,
        "created_at": proj.created_at,
        "updated_at": proj.updated_at,
    }


@router.post("/run-expert")
async def run_expert(req: RunExpertRequest):
    chain = AGENT_FILE_CHAIN.get(req.agent_key)
    if not chain:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown agent_key: {req.agent_key}. Available: {list(AGENT_FILE_CHAIN.keys())}",
        )

    source_file = req.source_file or chain[0]
    target_file = req.target_file or chain[1]

    try:
        result = await engine.run_expert(
            project_id=req.project_id,
            agent_key=req.agent_key,
            user_custom_instruction=req.user_custom_instruction or "",
            source_file=source_file,
            target_file=target_file,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("run-expert failed for %s agent=%s", req.project_id, req.agent_key)
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "status": "ok",
        "agent_key": result["agent_key"],
        "source_file": result["source_file"],
        "target_file": result["target_file"],
        "output": result["output"],
    }


@router.get("/project-files/{project_id}")
async def list_project_files(project_id: str):
    try:
        files = engine.list_project_files(project_id)
        return {"project_id": project_id, "files": files}
    except Exception:
        logger.exception("Failed to list project files for %s", project_id)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/project-files/{project_id}/{file_name:path}")
async def read_project_file(project_id: str, file_name: str):
    try:
        content = engine.read_obsidian_file(project_id, file_name)
        return {"project_id": project_id, "file_name": file_name, "content": content}
    except Exception:
        raise HTTPException(status_code=404, detail=f"File not found: {file_name}")
