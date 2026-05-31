import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.project_context import (
    STEPS,
    ProjectContext,
    list_projects,
    load_project,
    save_step_data,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/project", tags=["project"])


class SaveStepRequest(BaseModel):
    project_id: str = Field(..., description="项目 ID")
    step: str = Field(..., description="步骤名称")
    data: dict = Field(..., description="该步骤产出的数据字典")
    advance: bool = Field(True, description="是否自动推进到下一步")


class SaveStepResponse(BaseModel):
    project_id: str
    current_step: str
    previous_step: str


class InitProjectRequest(BaseModel):
    project_id: str | None = Field(None, description="可选，不传则自动生成")


@router.post("/init")
async def init_project(req: InitProjectRequest):
    ctx = load_project(req.project_id or "")
    return {
        "project_id": ctx.project_id,
        "current_step": ctx.current_step,
        "created_at": ctx.created_at,
    }


@router.get("/{project_id}")
async def get_project(project_id: str):
    try:
        ctx = load_project(project_id)
        return ctx.model_dump()
    except Exception:
        raise HTTPException(status_code=404, detail=f"Project not found: {project_id}")


@router.get("/{project_id}/context")
async def get_project_context(project_id: str):
    try:
        ctx = load_project(project_id)
        return ctx.model_dump()
    except Exception:
        raise HTTPException(status_code=404, detail=f"Project not found: {project_id}")


@router.post("/save-step", response_model=SaveStepResponse)
async def save_step(req: SaveStepRequest):
    if req.step not in STEPS:
        raise HTTPException(status_code=400, detail=f"Invalid step: {req.step}, must be one of {STEPS}")

    try:
        ctx = await save_step_data(
            project_id=req.project_id,
            step=req.step,
            data=req.data,
            advance=req.advance,
        )
        # figure out previous step for the response
        prev_idx = STEPS.index(req.step)
        prev_step = STEPS[prev_idx - 1] if prev_idx > 0 else req.step

        return SaveStepResponse(
            project_id=ctx.project_id,
            current_step=ctx.current_step,
            previous_step=prev_step,
        )
    except Exception as e:
        logger.exception("Failed to save step data")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
async def list_all_projects():
    try:
        projects = list_projects()
        return {"projects": projects, "total": len(projects)}
    except Exception:
        logger.exception("Failed to list projects")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{project_id}/brand-context")
async def get_brand_context(project_id: str):
    try:
        ctx = load_project(project_id)
        return {
            "project_id": project_id,
            "brand_identity": ctx.account_profile.brand_identity.model_dump(),
            "persona": ctx.account_profile.persona_archivist,
        }
    except Exception:
        raise HTTPException(status_code=404, detail=f"Project not found: {project_id}")
