import json
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/domain-assets", tags=["domain_assets"])

OBSIDIAN_VAULT = settings.obsidian_vault_path or "./obsidian_vault"
ASSETS_DIR = Path(OBSIDIAN_VAULT) / "_assets"
META_FILE = ASSETS_DIR / "domain_assets.json"

VALID_DOMAINS = {"brand_cube", "ai_model_explain", "image_master", "video_publisher"}


def _init() -> None:
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    if not META_FILE.exists():
        _write_json([])


def _read_json() -> list[dict]:
    _init()
    try:
        if META_FILE.exists():
            raw = META_FILE.read_text("utf-8")
            return json.loads(raw) if raw.strip() else []
        return []
    except (json.JSONDecodeError, OSError):
        logger.exception("Failed to read domain_assets.json")
        return []


def _write_json(data: list[dict]) -> None:
    _init()
    META_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _find(idx: str) -> tuple[dict | None, list[dict]]:
    items = _read_json()
    for i, item in enumerate(items):
        if item["id"] == idx:
            return item, items
    return None, items


# ── Models ──

class CreateDomainAssetRequest(BaseModel):
    domain_type: str
    name: str
    config: dict[str, Any] = {}


class UpdateDomainAssetRequest(BaseModel):
    name: str | None = None
    config: dict[str, Any] | None = None


# ── Endpoints ──

@router.get("")
async def list_domain_assets(domain_type: str | None = None):
    try:
        items = _read_json()
        if domain_type:
            if domain_type not in VALID_DOMAINS:
                raise HTTPException(status_code=400, detail=f"Invalid domain_type: {domain_type}. Must be one of {VALID_DOMAINS}")
            items = [a for a in items if a.get("domain_type") == domain_type]
        return {"data": items, "total": len(items)}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to list domain-assets")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("")
async def create_domain_asset(req: CreateDomainAssetRequest):
    if req.domain_type not in VALID_DOMAINS:
        raise HTTPException(status_code=400, detail=f"Invalid domain_type: {req.domain_type}")
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="name is required")

    now = datetime.now().isoformat()
    asset_id = f"da_{uuid.uuid4().hex[:10]}"

    record: dict[str, Any] = {
        "id": asset_id,
        "domain_type": req.domain_type,
        "name": req.name.strip(),
        "config": req.config,
        "created_at": now,
        "updated_at": now,
    }

    try:
        items = _read_json()
        items.append(record)
        _write_json(items)
    except Exception:
        logger.exception("Failed to persist domain-asset")
        raise HTTPException(status_code=500, detail="Failed to persist")

    logger.info("Domain asset created: id=%s domain=%s name=%s", asset_id, req.domain_type, req.name)
    return {"status": "ok", "data": record}


@router.patch("/{asset_id}")
async def update_domain_asset(asset_id: str, req: UpdateDomainAssetRequest):
    target, items = _find(asset_id)
    if target is None:
        raise HTTPException(status_code=404, detail=f"Domain asset not found: {asset_id}")

    if req.name is not None and req.name.strip():
        target["name"] = req.name.strip()
    if req.config is not None:
        target["config"] = req.config
    target["updated_at"] = datetime.now().isoformat()

    _write_json(items)
    logger.info("Domain asset updated: id=%s", asset_id)
    return {"status": "ok", "data": target}


@router.delete("/{asset_id}")
async def delete_domain_asset(asset_id: str):
    target, items = _find(asset_id)
    if target is None:
        raise HTTPException(status_code=404, detail=f"Domain asset not found: {asset_id}")

    items = [a for a in items if a["id"] != asset_id]
    _write_json(items)
    logger.info("Domain asset deleted: id=%s", asset_id)
    return {"status": "ok", "deleted": asset_id}
