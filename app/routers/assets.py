import json
import logging
import os
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/assets/avatars", tags=["assets_avatars"])

OBSIDIAN_VAULT = settings.obsidian_vault_path or "./obsidian_vault"
ASSETS_META_DIR = Path(OBSIDIAN_VAULT) / "_assets"
ASSETS_META_FILE = ASSETS_META_DIR / "digital_humans.json"
UPLOAD_DIR = ASSETS_META_DIR / "uploads"

ALLOWED_VIDEO_MIMES = {"video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"}
ALLOWED_AUDIO_MIMES = {"audio/mpeg", "audio/wav", "audio/aac", "audio/ogg", "audio/mp4", "audio/wave"}
MAX_UPLOAD_BYTES = 50 * 1024 * 1024

VOICE_TYPE_MAP = {
    "专业沉稳男声": "male_professional_01",
    "知性干练女声": "female_professional_01",
    "活力元气少女": "female_energetic_01",
}

IMAGE_GEN_API_URL = "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image"
IMAGE_GEN_TIMEOUT = 60.0

VIRTUAL_AVATAR_PROMPT_TEMPLATE = (
    "A medium shot of {description}, "
    "looking directly into the camera, neutral expression, "
    "high-end professional lighting, photorealistic, 8k resolution, "
    "clean studio background, shallow depth of field, "
    "suitable for a professional video talking avatar, "
    "bright natural catchlights in eyes, detailed skin texture, "
    "cinematic color grading --ar 9:16"
)


def _init_storage() -> None:
    ASSETS_META_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    if not ASSETS_META_FILE.exists():
        _write_json([])


def _read_json() -> list[dict]:
    _init_storage()
    try:
        if ASSETS_META_FILE.exists():
            raw = ASSETS_META_FILE.read_text("utf-8")
            return json.loads(raw) if raw.strip() else []
        return []
    except (json.JSONDecodeError, OSError):
        logger.exception("Failed to read digital_humans.json, returning empty list")
        return []


def _write_json(data: list[dict]) -> None:
    _init_storage()
    ASSETS_META_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _find_avatar(avatar_id: str) -> tuple[dict | None, list[dict]]:
    avatars = _read_json()
    for i, a in enumerate(avatars):
        if a["id"] == avatar_id:
            return a, avatars
    return None, avatars


# ──────────────────────────────────────────────
# GET /  — 列出所有数字人
# ──────────────────────────────────────────────
@router.get("")
async def list_avatars(status: str | None = None):
    try:
        avatars = _read_json()
        if status:
            avatars = [a for a in avatars if a.get("status") == status]
        return {"data": avatars, "total": len(avatars)}
    except Exception:
        logger.exception("Failed to list avatars")
        raise HTTPException(status_code=500, detail="Internal server error")


# ──────────────────────────────────────────────
# GET /{avatar_id} — 获取单个数字人详情
# ──────────────────────────────────────────────
@router.get("/{avatar_id}")
async def get_avatar(avatar_id: str):
    target, _ = _find_avatar(avatar_id)
    if target is None:
        raise HTTPException(status_code=404, detail=f"Avatar not found: {avatar_id}")
    return {"data": target}


# ──────────────────────────────────────────────
# PATCH /{avatar_id} — 更新名称/声线/状态
# ──────────────────────────────────────────────
class UpdateAvatarRequest(BaseModel):
    name: str | None = None
    voice_type: str | None = None
    status: str | None = None


@router.patch("/{avatar_id}")
async def update_avatar(avatar_id: str, req: UpdateAvatarRequest):
    target, avatars = _find_avatar(avatar_id)
    if target is None:
        raise HTTPException(status_code=404, detail=f"Avatar not found: {avatar_id}")

    if req.name is not None:
        target["name"] = req.name.strip()
    if req.voice_type is not None:
        target["voice_type"] = req.voice_type
        target["voice_id"] = VOICE_TYPE_MAP.get(req.voice_type, "female_professional_01")
    if req.status is not None:
        target["status"] = req.status

    _write_json(avatars)
    logger.info("Avatar updated: id=%s fields=%s", avatar_id, req.model_dump(exclude_none=True))
    return {"status": "ok", "data": target}


# ──────────────────────────────────────────────
# POST /clone  — 形象 / 声音克隆
# ──────────────────────────────────────────────
@router.post("/clone")
async def clone_avatar(
    name: str = Form(..., description="数字人名称"),
    avatar_video: UploadFile = File(..., description="形象克隆视频 (≤50MB)"),
    voice_audio: UploadFile | None = File(None, description="声音克隆音频 (≤50MB)"),
    voice_type: str = Form("知性干练女声"),
):
    if avatar_video.content_type and avatar_video.content_type not in ALLOWED_VIDEO_MIMES:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的视频格式: {avatar_video.content_type}。支持: {ALLOWED_VIDEO_MIMES}",
        )

    _init_storage()
    avatar_id = f"av_{uuid.uuid4().hex[:10]}"
    now = datetime.now().isoformat()

    avatar_dir = UPLOAD_DIR / avatar_id
    avatar_dir.mkdir(parents=True, exist_ok=True)

    try:
        video_bytes = await avatar_video.read()
        if len(video_bytes) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=400, detail="视频文件超过 50MB 限制")

        ext = Path(avatar_video.filename or "video.mp4").suffix or ".mp4"
        video_path = avatar_dir / f"avatar_video{ext}"
        video_path.write_bytes(video_bytes)

        audio_path_str = ""
        if voice_audio:
            audio_bytes = await voice_audio.read()
            if len(audio_bytes) > MAX_UPLOAD_BYTES:
                raise HTTPException(status_code=400, detail="音频文件超过 50MB 限制")
            aext = Path(voice_audio.filename or "audio.wav").suffix or ".wav"
            audio_file = avatar_dir / f"voice_audio{aext}"
            audio_file.write_bytes(audio_bytes)
            audio_path_str = str(audio_file)

    except HTTPException:
        shutil.rmtree(avatar_dir, ignore_errors=True)
        raise
    except OSError:
        logger.exception("Failed to save upload files for clone %s", avatar_id)
        shutil.rmtree(avatar_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail="Failed to save uploaded files")

    record: dict[str, Any] = {
        "id": avatar_id,
        "name": name.strip(),
        "avatar_url": None,
        "voice_type": voice_type,
        "voice_id": VOICE_TYPE_MAP.get(voice_type, "female_professional_01"),
        "voice_status": "cloning",
        "status": "cloning",
        "video_path": str(video_path),
        "audio_path": audio_path_str,
        "is_virtual": False,
        "created_at": now,
        "updated_at": now,
    }

    try:
        avatars = _read_json()
        avatars.append(record)
        _write_json(avatars)
    except Exception:
        logger.exception("Failed to persist avatar clone record")
        shutil.rmtree(avatar_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail="Failed to persist avatar record")

    logger.info("Clone task created: id=%s name=%s", avatar_id, name.strip())
    return {"status": "ok", "data": record}


# ──────────────────────────────────────────────
# DELETE /{avatar_id}  — 物理删除资产
# ──────────────────────────────────────────────
@router.delete("/{avatar_id}")
async def delete_avatar(avatar_id: str):
    target, avatars = _find_avatar(avatar_id)
    if target is None:
        raise HTTPException(status_code=404, detail=f"Avatar not found: {avatar_id}")

    avatars = [a for a in avatars if a["id"] != avatar_id]
    _write_json(avatars)

    uploads_dir = UPLOAD_DIR / avatar_id
    if uploads_dir.exists():
        shutil.rmtree(uploads_dir, ignore_errors=True)

    logger.info("Avatar deleted: id=%s", avatar_id)
    return {"status": "ok", "deleted": avatar_id}


# ──────────────────────────────────────────────
# POST /text-to-avatar  — AI 文生数字人
# ──────────────────────────────────────────────
class TextToAvatarRequest(BaseModel):
    description: str
    voice_type: str = "知性干练女声"


async def _render_placeholder_avatar(avatar_id: str, description: str) -> Path:
    output_path = UPLOAD_DIR / f"virtual_{avatar_id}.png"

    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        output_path.write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)
        return output_path

    width, height = 720, 1280
    img = Image.new("RGB", (width, height), color=(25, 30, 45))
    draw = ImageDraw.Draw(img)

    silhouette_color = (80, 90, 120)
    head_cy = height // 3
    head_r = 120
    draw.ellipse([width // 2 - head_r, head_cy - head_r, width // 2 + head_r, head_cy + head_r], fill=silhouette_color)
    body_top = head_cy + head_r - 20
    draw.rectangle([width // 2 - 140, body_top, width // 2 + 140, body_top + 300], fill=silhouette_color)

    try:
        fnt = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 32)
        small_fnt = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20)
    except Exception:
        fnt = ImageFont.load_default()
        small_fnt = ImageFont.load_default()

    label = "AI 虚拟数字人"
    bbox = draw.textbbox((0, 0), label, font=fnt)
    tw = bbox[2] - bbox[0]
    draw.text(((width - tw) // 2, height - 200), label, font=fnt, fill=(180, 190, 210))

    truncated = description[:40]
    bbox2 = draw.textbbox((0, 0), truncated, font=small_fnt)
    tw2 = bbox2[2] - bbox2[0]
    draw.text(((width - tw2) // 2, height - 160), truncated, font=small_fnt, fill=(120, 130, 150))

    img.save(output_path, "PNG")
    return output_path


@router.post("/text-to-avatar")
async def text_to_avatar(req: TextToAvatarRequest):
    if not req.description.strip():
        raise HTTPException(status_code=400, detail="数字人形象描述不能为空")

    _init_storage()
    avatar_id = f"av_{uuid.uuid4().hex[:10]}"
    short_name = req.description.strip()[:10]
    now = datetime.now().isoformat()

    wrapped_prompt = VIRTUAL_AVATAR_PROMPT_TEMPLATE.format(description=req.description.strip())
    voice_id = VOICE_TYPE_MAP.get(req.voice_type, "female_professional_01")

    image_path: Path | None = None
    image_url: str | None = None

    gen_api_key = getattr(settings, "STABILITY_API_KEY", "")
    if gen_api_key:
        try:
            async with httpx.AsyncClient(timeout=IMAGE_GEN_TIMEOUT) as client:
                gen_resp = await client.post(
                    IMAGE_GEN_API_URL,
                    headers={
                        "Authorization": f"Bearer {gen_api_key}",
                        "Content-Type": "application/json",
                        "Accept": "image/png",
                    },
                    json={
                        "text_prompts": [{"text": wrapped_prompt, "weight": 1.0}],
                        "cfg_scale": 7,
                        "height": 1280,
                        "width": 720,
                        "samples": 1,
                    },
                )
                if gen_resp.status_code == 200:
                    save_dir = UPLOAD_DIR / f"virtual_render_{avatar_id}"
                    save_dir.mkdir(parents=True, exist_ok=True)
                    output_path = save_dir / "avatar.png"
                    output_path.write_bytes(gen_resp.content)
                    image_path = output_path
                    image_url = f"/storage/_assets/uploads/virtual_render_{avatar_id}/avatar.png"
                    logger.info("AI virtual avatar generated: %s", avatar_id)
                else:
                    logger.warning("Image gen API returned %s: %s", gen_resp.status_code, gen_resp.text[:200])
        except Exception:
            logger.exception("Image gen API call failed, falling back to placeholder")

    if image_path is None:
        image_path = await _render_placeholder_avatar(avatar_id, req.description)
        image_url = None

    record: dict[str, Any] = {
        "id": avatar_id,
        "name": f"AI虚拟-{short_name}",
        "avatar_url": image_url,
        "voice_type": req.voice_type,
        "voice_id": voice_id,
        "voice_status": "ready",
        "status": "ready",
        "is_virtual": True,
        "video_path": str(image_path) if image_path else "",
        "audio_path": "",
        "created_at": now,
        "updated_at": now,
    }

    try:
        avatars = _read_json()
        avatars.append(record)
        _write_json(avatars)
    except Exception:
        logger.exception("Failed to persist virtual avatar")
        raise HTTPException(status_code=500, detail="Failed to persist avatar record")

    logger.info("Virtual avatar created: id=%s name=%s", record["id"], record["name"])
    return {
        "status": "ok",
        "data": {
            "id": record["id"],
            "name": record["name"],
            "avatar_url": image_url,
            "voice_type": req.voice_type,
            "voice_status": "ready",
            "status": "ready",
            "is_virtual": True,
            "created_at": now,
        },
    }
