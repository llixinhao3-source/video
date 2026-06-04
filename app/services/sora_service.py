import asyncio
import logging
import uuid
from pathlib import Path
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

SORA_VIDEO_DIR = Path("storage/sora_videos")

# ── 模型配置 ──────────────────────────────────────────────
# /v1/videos 端点 (multipart/form-data)
# /v1/video/create 端点 (JSON)
# 状态查询统一用 GET /v1/videos/{task_id}

MODEL_ENDPOINT_MAP: dict[str, str] = {
    # Sora 系列
    "sora-2-pro": "/video/create",
    # 万相系列 (阿里通义万相)
    "wan2.6-i2v": "/video/create",
    "wan2.6-i2v-flash": "/video/create",
    # Veo 系列
    "veo_3_1-lite": "/videos",
    "veo3.1-4k": "/video/create",
}

MODEL_DURATION_OPTIONS: dict[str, list[int]] = {
    "sora-2-pro": [4, 8, 12],
    "wan2.6-i2v": [5, 8, 10],
    "wan2.6-i2v-flash": [5, 8, 10],
    "veo_3_1-lite": [3, 5, 8],
    "veo3.1-4k": [3, 5, 8],
}

MODEL_ASPECT_RATIOS: dict[str, list[str]] = {
    "sora-2-pro": ["9:16", "16:9", "1:1"],
    "wan2.6-i2v": ["9:16", "16:9", "1:1"],
    "wan2.6-i2v-flash": ["9:16", "16:9", "1:1"],
    "veo_3_1-lite": ["9:16", "16:9", "1:1"],
    "veo3.1-4k": ["9:16", "16:9", "1:1"],
}

# /v1/videos 端点需要 multipart/form-data
MULTIPART_MODELS = {"veo_3_1-lite"}


def _init_storage() -> None:
    SORA_VIDEO_DIR.mkdir(parents=True, exist_ok=True)


def _get_endpoint(model: str) -> str:
    base_url = settings.sora_api_base.rstrip("/")
    path = MODEL_ENDPOINT_MAP.get(model, "/video/create")
    return f"{base_url}{path}"


async def create_sora_video(
    prompt: str,
    model: str = "sora-2-pro",
    orientation: str = "portrait",
    duration: int = 4,
    size: str = "large",
    watermark: bool = False,
    private: bool = True,
    images: list[str] | None = None,
    aspect_ratio: str | None = None,
    max_retries: int = 3,
) -> dict[str, Any]:
    api_key = settings.sora_api_key

    if not api_key:
        raise ValueError("sora_api_key 未配置，请在 .env 中设置 SORA_API_KEY")

    # 自动推导 aspect_ratio
    if not aspect_ratio:
        aspect_ratio = "9:16" if orientation == "portrait" else "16:9" if orientation == "landscape" else "1:1"

    url = _get_endpoint(model)
    headers = {"Authorization": f"Bearer {api_key}", "Accept": "application/json"}

    for attempt in range(1, max_retries + 1):
        if model in MULTIPART_MODELS:
            # /v1/videos 端点 → multipart/form-data
            form_data = {
                "model": (None, model),
                "prompt": (None, prompt),
                "duration": (None, f"{duration}s"),
                "aspect_ratio": (None, aspect_ratio),
            }
            logger.info("Creating video (multipart) | model=%s | attempt=%d/%d", model, attempt, max_retries)
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(url, headers=headers, files=form_data)
        else:
            # /v1/video/create 端点 → JSON
            json_headers = {**headers, "Content-Type": "application/json"}
            payload: dict[str, Any] = {
                "model": model,
                "prompt": prompt,
                "duration": f"{duration}s" if model.startswith("veo") else duration,
                "aspect_ratio": aspect_ratio,
            }
            # sora-2-pro 专有字段
            if model == "sora-2-pro":
                payload.update({
                    "orientation": orientation,
                    "size": size,
                    "watermark": watermark,
                    "private": private,
                    "images": images or [],
                })
            logger.info("Creating video (json) | model=%s | attempt=%d/%d", model, attempt, max_retries)
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(url, json=payload, headers=json_headers)

        if resp.status_code == 200:
            break

        # 429/503 自动重试
        if resp.status_code in (429, 503) and attempt < max_retries:
            wait = 10 * attempt
            logger.warning("Video API %d, retrying in %ds (attempt %d/%d)", resp.status_code, wait, attempt, max_retries)
            await asyncio.sleep(wait)
            continue

        logger.error("Video create failed: %d %s", resp.status_code, resp.text[:500])
        raise ValueError(f"视频生成 API 返回错误: {resp.status_code} - {resp.text[:300]}")

    data = resp.json()
    task_id = data.get("id", "")
    logger.info("Video task created: %s (model=%s)", task_id, model)

    return {
        "task_id": task_id,
        "status": data.get("status", "pending"),
        "status_update_time": data.get("status_update_time"),
        "model": model,
    }


async def check_sora_status(task_id: str, model: str = "sora-2-pro") -> dict[str, Any]:
    api_key = settings.sora_api_key

    if not api_key:
        raise ValueError("sora_api_key 未配置")

    base_url = settings.sora_api_base.rstrip("/")
    url = f"{base_url}/videos/{task_id}"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, headers=headers)

    if resp.status_code != 200:
        # 尝试备用端点 /v1/video/create/{task_id}
        alt_url = f"{base_url}/video/create/{task_id}"
        try:
            async with httpx.AsyncClient(timeout=30) as client2:
                resp2 = await client2.get(alt_url, headers=headers)
                if resp2.status_code == 200:
                    return resp2.json()
        except Exception:
            pass
        logger.error("Video status check failed: %d %s", resp.status_code, resp.text[:500])
        raise ValueError(f"视频状态查询失败: {resp.status_code}")

    return resp.json()


async def poll_sora_until_done(task_id: str, model: str = "sora-2-pro", max_wait: int = 1800, interval: int = 15) -> dict[str, Any]:
    elapsed = 0
    while elapsed < max_wait:
        result = await check_sora_status(task_id, model)
        status = result.get("status", "unknown")

        if status in ("completed", "succeeded", "done", "success"):
            return result
        if status in ("failed", "error", "cancelled"):
            raise ValueError(f"视频生成失败: {result}")

        logger.info("Video task %s status: %s, waiting %ds...", task_id, status, interval)
        await asyncio.sleep(interval)
        elapsed += interval

    raise TimeoutError(f"视频生成超时 ({max_wait}s)")


async def download_sora_video(video_url: str, filename: str | None = None) -> str:
    _init_storage()

    if not filename:
        filename = f"video_{uuid.uuid4().hex[:12]}.mp4"
    output_path = SORA_VIDEO_DIR / filename

    logger.info("Downloading video from %s to %s", video_url[:100], output_path)

    async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
        resp = await client.get(video_url)
        if resp.status_code != 200:
            raise ValueError(f"视频下载失败: {resp.status_code}")
        output_path.write_bytes(resp.content)

    file_size = output_path.stat().st_size
    logger.info("Video downloaded: %s (%d bytes)", output_path, file_size)

    return str(output_path)
