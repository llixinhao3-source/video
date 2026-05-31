import json
import logging

from fastapi import APIRouter, Form, HTTPException
from pydantic import BaseModel
from typing import Any

from app.services.private_domain_engine import engine
from app.services.private_domain_prompts import DYNAMIC_EXPERT_CHAIN_CONFIG, all_expert_keys

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/private-domain", tags=["private_domain"])

VALID_EXPERT_IDS = set(all_expert_keys())


def _validate_expert(expert_id: str) -> None:
    if expert_id not in VALID_EXPERT_IDS:
        raise HTTPException(status_code=400, detail=f"Invalid expert_id: {expert_id}")


# ── expert listing ──

@router.get("/experts")
async def list_experts():
    results = []
    for ex in DYNAMIC_EXPERT_CHAIN_CONFIG.values():
        results.append({
            "expert_id": ex["expert_id"],
            "expert_name": ex["expert_name"],
            "emoji": ex["emoji"],
            "color": ex["color"],
            "business_sop": ex["business_sop"],
            "form_schema": ex["form_schema"],
            "asset_center_schema": {
                "tab_title": ex["asset_center_schema"]["tab_title"],
                "table_columns": ex["asset_center_schema"]["table_columns"],
            },
        })
    return {"data": results, "total": len(results)}


# ── run expert ──

@router.post("/run-expert")
async def run_private_domain_expert(
    project_id: str = Form(...),
    agent_key: str = Form(...),
    user_custom_instruction: str = Form(""),
    domain_params_json: str = Form("{}"),
):
    _validate_expert(agent_key)
    try:
        domain_params: dict[str, str] = json.loads(domain_params_json)
    except json.JSONDecodeError:
        domain_params = {}

    try:
        result = await engine.run_expert(
            project_id=project_id,
            agent_key=agent_key,
            user_custom_instruction=user_custom_instruction,
            domain_params=domain_params,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("run-private-domain-expert failed | project=%s | agent=%s", project_id, agent_key)
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "status": "ok",
        "agent_key": result["agent_key"],
        "source_file": result["source_file"],
        "target_file": result["target_file"],
        "output": result["output"],
    }


# ── merged config (with project overrides) ──

@router.get("/{expert_id}/config")
async def get_expert_config(expert_id: str, project_id: str):
    _validate_expert(expert_id)
    merged = engine.get_merged_config(project_id, expert_id)
    if not merged:
        raise HTTPException(status_code=404, detail=f"Expert not found: {expert_id}")
    return {"data": merged}


# ── data record CRUD ──

@router.get("/{expert_id}/records")
async def list_records(expert_id: str, project_id: str):
    _validate_expert(expert_id)
    records = engine.list_records(project_id, expert_id)
    return {"data": records, "total": len(records)}


class CreateRecordRequest(BaseModel):
    project_id: str
    record: dict[str, Any]


@router.post("/{expert_id}/records")
async def create_record(expert_id: str, req: CreateRecordRequest):
    _validate_expert(expert_id)
    try:
        result = engine.create_record(req.project_id, expert_id, req.record)
    except Exception as e:
        logger.exception("create-record failed | expert=%s", expert_id)
        raise HTTPException(status_code=500, detail=str(e))
    return {"status": "ok", "data": result}


class UpdateRecordRequest(BaseModel):
    project_id: str
    updates: dict[str, Any]


@router.patch("/{expert_id}/records/{record_id}")
async def update_record(expert_id: str, record_id: str, req: UpdateRecordRequest):
    _validate_expert(expert_id)
    result = engine.update_record(req.project_id, expert_id, record_id, req.updates)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Record not found: {record_id}")
    return {"status": "ok", "data": result}


class DeleteRecordRequest(BaseModel):
    project_id: str


@router.delete("/{expert_id}/records/{record_id}")
async def delete_record(expert_id: str, record_id: str, project_id: str):
    _validate_expert(expert_id)
    ok = engine.delete_record(project_id, expert_id, record_id)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Record not found: {record_id}")
    return {"status": "ok", "deleted": record_id}


# ── table column CRUD ──

@router.get("/{expert_id}/columns")
async def list_columns(expert_id: str, project_id: str):
    _validate_expert(expert_id)
    merged = engine.get_merged_config(project_id, expert_id)
    cols = merged.get("asset_center_schema", {}).get("table_columns", [])
    return {"data": cols, "total": len(cols)}


class AddColumnRequest(BaseModel):
    project_id: str
    column: dict[str, Any]


@router.post("/{expert_id}/columns")
async def add_column(expert_id: str, req: AddColumnRequest):
    _validate_expert(expert_id)
    try:
        result = engine.add_table_column(req.project_id, expert_id, req.column)
    except Exception as e:
        logger.exception("add-column failed | expert=%s", expert_id)
        raise HTTPException(status_code=500, detail=str(e))
    return {"status": "ok", "data": result}


class UpdateColumnRequest(BaseModel):
    project_id: str
    updates: dict[str, Any]


@router.patch("/{expert_id}/columns/{column_id}")
async def update_column(expert_id: str, column_id: str, req: UpdateColumnRequest):
    _validate_expert(expert_id)
    result = engine.update_table_column(req.project_id, expert_id, column_id, req.updates)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Column not found: {column_id}")
    return {"status": "ok", "data": result}


class DeleteColumnRequest(BaseModel):
    project_id: str


@router.delete("/{expert_id}/columns/{column_id}")
async def delete_column(expert_id: str, column_id: str, project_id: str):
    _validate_expert(expert_id)
    ok = engine.delete_table_column(project_id, expert_id, column_id)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Column not found: {column_id}")
    return {"status": "ok", "deleted": column_id}


# ── form field CRUD ──

@router.get("/{expert_id}/fields")
async def list_fields(expert_id: str, project_id: str):
    _validate_expert(expert_id)
    merged = engine.get_merged_config(project_id, expert_id)
    fields = merged.get("form_schema", {}).get("fields", [])
    return {"data": fields, "total": len(fields)}


class AddFieldRequest(BaseModel):
    project_id: str
    field: dict[str, Any]


@router.post("/{expert_id}/fields")
async def add_field(expert_id: str, req: AddFieldRequest):
    _validate_expert(expert_id)
    try:
        result = engine.add_form_field(req.project_id, expert_id, req.field)
    except Exception as e:
        logger.exception("add-field failed | expert=%s", expert_id)
        raise HTTPException(status_code=500, detail=str(e))
    return {"status": "ok", "data": result}


class UpdateFieldRequest(BaseModel):
    project_id: str
    updates: dict[str, Any]


@router.patch("/{expert_id}/fields/{field_id}")
async def update_field(expert_id: str, field_id: str, req: UpdateFieldRequest):
    _validate_expert(expert_id)
    result = engine.update_form_field(req.project_id, expert_id, field_id, req.updates)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Field not found: {field_id}")
    return {"status": "ok", "data": result}


class DeleteFieldRequest(BaseModel):
    project_id: str


@router.delete("/{expert_id}/fields/{field_id}")
async def delete_field(expert_id: str, field_id: str, project_id: str):
    _validate_expert(expert_id)
    ok = engine.delete_form_field(project_id, expert_id, field_id)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Field not found: {field_id}")
    return {"status": "ok", "deleted": field_id}
