import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.prompts import PROMPT_TEMPLATES
from app.services.llm import call_agent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/agent", tags=["agent"])


class AgentRunRequest(BaseModel):
    agent_type: str = Field(..., description="智能体类型，如 title_expert / hook_designer / script_generator / risk_control")
    user_input: str = Field(..., description="用户输入内容")


class AgentRunResponse(BaseModel):
    agent_type: str
    result: dict


@router.post("/run", response_model=AgentRunResponse)
async def run_agent(req: AgentRunRequest):
    if req.agent_type not in PROMPT_TEMPLATES:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown agent_type: {req.agent_type}, available: {list(PROMPT_TEMPLATES.keys())}",
        )

    try:
        result = await call_agent(req.agent_type, req.user_input)
        return AgentRunResponse(agent_type=req.agent_type, result=result)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    except Exception as e:
        logger.exception("Agent run failed")
        raise HTTPException(status_code=500, detail="Internal server error") from e
