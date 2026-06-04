import json
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

HISTORY_FILE = Path("storage/video_history.json")


def _ensure_storage() -> None:
    HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not HISTORY_FILE.exists():
        HISTORY_FILE.write_text("[]", encoding="utf-8")


def _load_records() -> list[dict[str, Any]]:
    _ensure_storage()
    try:
        data = HISTORY_FILE.read_text(encoding="utf-8")
        return json.loads(data)
    except (json.JSONDecodeError, OSError):
        logger.exception("Failed to load video history, resetting to empty list")
        return []


def _save_records(records: list[dict[str, Any]]) -> None:
    _ensure_storage()
    HISTORY_FILE.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")


def add_video_record(
    filename: str,
    prompt: str,
    model: str,
    duration: int,
    aspect_ratio: str,
    local_path: str,
    thumbnail_url: str = "",
    title: str = "",
    tags: list[str] | None = None,
) -> dict[str, Any]:
    records = _load_records()
    record: dict[str, Any] = {
        "id": uuid.uuid4().hex[:12],
        "filename": filename,
        "prompt": prompt,
        "model": model,
        "duration": duration,
        "aspect_ratio": aspect_ratio,
        "created_at": datetime.now().isoformat(),
        "local_path": local_path,
        "thumbnail_url": thumbnail_url,
        "title": title or filename,
        "tags": tags or [],
    }
    records.append(record)
    _save_records(records)
    logger.info("Video record added: %s (%s)", record["id"], filename)
    return record


def list_video_records(page: int = 1, page_size: int = 20) -> dict[str, Any]:
    records = _load_records()
    records.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    total = len(records)
    start = (page - 1) * page_size
    end = start + page_size
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": records[start:end],
    }


def get_video_record(video_id: str) -> dict[str, Any] | None:
    records = _load_records()
    for record in records:
        if record["id"] == video_id:
            return record
    return None


def update_video_record(video_id: str, title: str | None = None, tags: list[str] | None = None) -> dict[str, Any] | None:
    records = _load_records()
    for record in records:
        if record["id"] == video_id:
            if title is not None:
                record["title"] = title
            if tags is not None:
                record["tags"] = tags
            _save_records(records)
            logger.info("Video record updated: %s", video_id)
            return record
    return None


def delete_video_record(video_id: str) -> bool:
    records = _load_records()
    target = None
    for i, record in enumerate(records):
        if record["id"] == video_id:
            target = records.pop(i)
            break
    if target is None:
        return False

    # 删除本地文件
    local_path = target.get("local_path", "")
    if local_path:
        file_path = Path(local_path)
        try:
            if file_path.exists():
                file_path.unlink()
                logger.info("Deleted video file: %s", local_path)
        except OSError:
            logger.exception("Failed to delete video file: %s", local_path)

    _save_records(records)
    logger.info("Video record deleted: %s", video_id)
    return True
