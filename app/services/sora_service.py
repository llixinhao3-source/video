import asyncio
import logging
import uuid
from pathlib import Path
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

SORA_VIDEO_DIR = Path("storage/sora_videos")

# sora-2-all  → POST /v1/videos        (OpenAI 官方格式, 720p, 10s/15s)
# sora-2-pro  → POST /v1/video/create   (统一视频格式, 1080p, 15s/25s)
MODEL_ENDPOINT_MAP: dict[str, str] = {
    "sora-2-all": "/videos",
    "sora-2-pro": "/video/create",
}

MODEL_DURATION_OPTIONS: dict[str, list[int]] = {
    "sora-2-all": [10, 15],
    "sora-2-pro": [15, 25],
}

MODEL_SIZE_DEFAULT: dict[str, str] = {
    "sora-2-all": "small",
    "sora-2-pro": "large",
}


def _init_storage() -> None:
    SORA_VIDEO_DIR.mkdir(parents=True, exist_ok=True)


def _get_endpoint(model: str) -> str:
    base_url = settings.sora_api_base.rstrip("/")
    path = MODEL_ENDPOINT_MAP.get(model, "/videos")
    return f"{base_url}{path}"


async def create_sora_video(
    prompt: str,
    model: str = "sora-2-all",
    orientation: str = "portrait",
    duration: int = 10,
    size: str = "small",
    watermark: bool = False,
    private: bool = True,
    images: list[str] | None = None,
) -> dict[str, Any]:
    api_key = settings.sora_api_key

    if not api_key:
        raise ValueError("sora_api_key 未配置，请在 .env 中设置 SORA_API_KEY")

    url = _get_endpoint(model)
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    payload: dict[str, Any] = {
        "model": model,
        "prompt": prompt,
        "orientation": orientation,
        "duration": duration,
        "size": size,
        "watermark": watermark,
        "private": private,
        "images": images or [],
    }

    logger.info("Creating Sora video | model=%s | endpoint=%s | duration=%d", model, url, duration)

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(url, json=payload, headers=headers)

    if resp.status_code != 200:
        logger.error("Sora create failed: %d %s", resp.status_code, resp.text[:500])
        raise ValueError(f"Sora API 返回错误: {resp.status_code} - {resp.text[:300]}")

    data = resp.json()
    task_id = data.get("id", "")
    logger.info("Sora task created: %s (model=%s)", task_id, model)

    return {
        "task_id": task_id,
        "status": data.get("status", "pending"),
        "status_update_time": data.get("status_update_time"),
        "model": model,
    }


async def check_sora_status(task_id: str, model: str = "sora-2-all") -> dict[str, Any]:
    api_key = settings.sora_api_key

    if not api_key:
        raise ValueError("sora_api_key 未配置")

    # 状态查询端点：两种模型都用 /v1/videos/{task_id}
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
        logger.error("Sora status check failed: %d %s", resp.status_code, resp.text[:500])
        raise ValueError(f"Sora 状态查询失败: {resp.status_code}")

    data = resp.json()
    return data


async def poll_sora_until_done(task_id: str, model: str = "sora-2-all", max_wait: int = 600, interval: int = 10) -> dict[str, Any]:
    elapsed = 0
    while elapsed < max_wait:
        result = await check_sora_status(task_id, model)
        status = result.get("status", "unknown")

        if status in ("completed", "succeeded", "done", "success"):
            return result
        if status in ("failed", "error", "cancelled"):
            raise ValueError(f"Sora 视频生成失败: {result}")

        logger.info("Sora task %s status: %s, waiting %ds...", task_id, status, interval)
        await asyncio.sleep(interval)
        elapsed += interval

    raise TimeoutError(f"Sora 视频生成超时 ({max_wait}s)")


async def download_sora_video(video_url: str, filename: str | None = None) -> str:
    _init_storage()

    if not filename:
        filename = f"sora_{uuid.uuid4().hex[:12]}.mp4"
    output_path = SORA_VIDEO_DIR / filename

    logger.info("Downloading Sora video from %s to %s", video_url[:100], output_path)

    async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
        resp = await client.get(video_url)
        if resp.status_code != 200:
            raise ValueError(f"视频下载失败: {resp.status_code}")
        output_path.write_bytes(resp.content)

    file_size = output_path.stat().st_size
    logger.info("Sora video downloaded: %s (%d bytes)", output_path, file_size)

    return str(output_path)
