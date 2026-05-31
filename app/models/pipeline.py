import json
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

PIPELINE_DIR = Path("storage/pipeline")

StepStatus = Literal["positioning", "topic", "script", "title", "video", "done"]

STEP_FLOW: list[StepStatus] = ["positioning", "topic", "script", "title", "video", "done"]


class ShortVideoProject(BaseModel):
    project_id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    current_status: StepStatus = "positioning"

    account_profile: dict | None = None
    selected_topic: dict | None = None
    script_output: dict | None = None
    title_output: dict | None = None
    video_output: dict | None = None

    private_domain_data: dict | None = None
    boss_report_url: str | None = None

    created_at: str = ""
    updated_at: str = ""


def _init_storage() -> None:
    PIPELINE_DIR.mkdir(parents=True, exist_ok=True)


def _json_path(project_id: str) -> Path:
    return PIPELINE_DIR / f"{project_id}.json"


def load_pipeline(project_id: str) -> ShortVideoProject:
    _init_storage()
    path = _json_path(project_id)

    if not path.exists():
        now = datetime.now().isoformat()
        proj = ShortVideoProject(project_id=project_id, created_at=now, updated_at=now)
        _persist(proj)
        return proj

    try:
        raw = json.loads(path.read_text("utf-8"))
        return ShortVideoProject(**raw)
    except (json.JSONDecodeError, TypeError):
        logger.exception(
            "Corrupted pipeline file %s, replacing with fresh", project_id
        )
        now = datetime.now().isoformat()
        proj = ShortVideoProject(project_id=project_id, created_at=now, updated_at=now)
        _persist(proj)
        return proj


def _persist(proj: ShortVideoProject) -> None:
    _init_storage()
    proj.updated_at = datetime.now().isoformat()
    path = _json_path(proj.project_id)
    path.write_text(
        proj.model_dump_json(indent=2, ensure_ascii=False), encoding="utf-8"
    )


_FIELD_MAP: dict[StepStatus, str] = {
    "positioning": "account_profile",
    "topic": "selected_topic",
    "script": "script_output",
    "title": "title_output",
    "video": "video_output",
}

_STATUS_ADVANCE: dict[StepStatus, StepStatus] = {
    "positioning": "topic",
    "topic": "script",
    "script": "title",
    "title": "video",
    "video": "done",
    "done": "done",
}


def update_step(
    project_id: str,
    step: StepStatus,
    data: dict,
    advance: bool = True,
) -> ShortVideoProject:
    _init_storage()
    proj = load_pipeline(project_id)

    field = _FIELD_MAP.get(step)
    if field:
        setattr(proj, field, data)

    if advance:
        proj.current_status = _STATUS_ADVANCE.get(step, step)

    if step == "done":
        proj.current_status = "done"

    _persist(proj)
    logger.info(
        "Pipeline %s step=%s updated, status→%s", project_id, step, proj.current_status
    )
    return proj


def fetch_context(project_id: str) -> ShortVideoProject:
    return load_pipeline(project_id)


def list_pipelines() -> list[dict]:
    _init_storage()
    results = []
    for f in sorted(
        PIPELINE_DIR.glob("*.json"),
        key=lambda x: x.stat().st_mtime,
        reverse=True,
    ):
        try:
            raw = json.loads(f.read_text("utf-8"))
            results.append({
                "project_id": raw.get("project_id", f.stem),
                "current_status": raw.get("current_status", "unknown"),
                "created_at": raw.get("created_at", ""),
                "updated_at": raw.get("updated_at", ""),
                "has_profile": raw.get("account_profile") is not None,
                "has_topic": raw.get("selected_topic") is not None,
                "has_script": raw.get("script_output") is not None,
                "has_video": raw.get("video_output") is not None,
            })
        except Exception:
            logger.warning("Could not read pipeline file: %s", f)
    return results


def build_pipeline_brand_context(project_id: str | None) -> str:
    if not project_id:
        return ""
    try:
        proj = load_pipeline(project_id)
    except Exception:
        return ""

    profile = proj.account_profile or {}
    parts: list[str] = []

    if profile.get("visual_style"):
        parts.append(f"Visual style: {profile['visual_style']}")
    if profile.get("core_values"):
        parts.append(f"Brand values: {profile['core_values']}")
    if profile.get("color_primary"):
        parts.append(f"Primary brand color: {profile['color_primary']}")
    if profile.get("tone_of_voice"):
        parts.append(f"Tone of voice: {profile['tone_of_voice']}")
    persona = profile.get("persona_archivist", {})
    if persona:
        parts.append(
            "Brand persona: "
            + json.dumps(persona, ensure_ascii=False)[:300]
        )

    return ". ".join(parts) + "." if parts else ""
