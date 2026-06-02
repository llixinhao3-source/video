import asyncio
import logging
import uuid
from pathlib import Path
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

SORA_VIDEO_DIR = Path("storage/sora_videos")


def _init_storage() -> None:
    SORA_VIDEO_DIR.mkdir(parents=True, exist_ok=True)


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
    base_url = settings.sora_api_base.rstrip("/")

    if not api_key:
        raise ValueError("sora_api_key 未配置，请在 .env 中设置 SORA_API_KEY")

    url = f"{base_url}/videos"
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

    logger.info("Creating Sora video | model=%s | orientation=%s | duration=%d", model, orientation, duration)

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(url, json=payload, headers=headers)

    if resp.status_code != 200:
        logger.error("Sora create failed: %d %s", resp.status_code, resp.text[:500])
        raise ValueError(f"Sora API 返回错误: {resp.status_code} - {resp.text[:200]}")

    data = resp.json()
    task_id = data.get("id", "")
    logger.info("Sora task created: %s", task_id)

    return {
        "task_id": task_id,
        "status": data.get("status", "pending"),
        "status_update_time": data.get("status_update_time"),
    }


async def check_sora_status(task_id: str) -> dict[str, Any]:
    api_key = settings.sora_api_key
    base_url = settings.sora_api_base.rstrip("/")

    if not api_key:
        raise ValueError("sora_api_key 未配置")

    url = f"{base_url}/videos/{task_id}"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, headers=headers)

    if resp.status_code != 200:
        logger.error("Sora status check failed: %d %s", resp.status_code, resp.text[:500])
        raise ValueError(f"Sora 状态查询失败: {resp.status_code}")

    data = resp.json()
    return data


async def poll_sora_until_done(task_id: str, max_wait: int = 600, interval: int = 10) -> dict[str, Any]:
    elapsed = 0
    while elapsed < max_wait:
        result = await check_sora_status(task_id)
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
