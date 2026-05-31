import json
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

PROJECTS_DIR = Path("storage/projects")

STEPS = [
    "positioning",
    "topic_selection",
    "script_writing",
    "video_production",
    "private_domain",
]


class BrandIdentity(BaseModel):
    color_primary: str = "#007AFF"
    color_secondary: str = "#5856D6"
    visual_style: str = ""
    tone_of_voice: str = ""
    core_values: str = ""


class AccountProfile(BaseModel):
    brand_identity: BrandIdentity = Field(default_factory=BrandIdentity)
    persona_archivist: dict = Field(default_factory=dict)
    product_profiler: dict = Field(default_factory=dict)
    enterprise_project: dict = Field(default_factory=dict)


class SelectedTopic(BaseModel):
    topic_title: str = ""
    topic_angle: str = ""
    target_audience: str = ""
    estimated_performance: str = ""


class ScriptData(BaseModel):
    title_and_hook: dict = Field(default_factory=dict)
    body_content: str = ""
    cta_and_tags: dict = Field(default_factory=dict)
    risk_report: dict = Field(default_factory=dict)


class VideoAssets(BaseModel):
    image_paths: list[str] = Field(default_factory=list)
    audio_path: str = ""
    video_clips: list[str] = Field(default_factory=list)
    final_video_url: str = ""
    aspect_ratio: str = "9:16"


class ProjectContext(BaseModel):
    project_id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    account_profile: AccountProfile = Field(default_factory=AccountProfile)
    selected_topic: SelectedTopic = Field(default_factory=SelectedTopic)
    script_data: ScriptData = Field(default_factory=ScriptData)
    video_assets: VideoAssets = Field(default_factory=VideoAssets)
    current_step: str = "positioning"
    created_at: str = ""
    updated_at: str = ""


def _init_storage() -> None:
    PROJECTS_DIR.mkdir(parents=True, exist_ok=True)


def _json_path(project_id: str) -> Path:
    return PROJECTS_DIR / f"{project_id}.json"


def load_project(project_id: str) -> ProjectContext:
    _init_storage()
    if not project_id:
        project_id = uuid.uuid4().hex[:12]
    path = _json_path(project_id)

    if not path.exists():
        now = datetime.now().isoformat()
        ctx = ProjectContext(project_id=project_id, created_at=now, updated_at=now)
        _persist(ctx)
        return ctx

    try:
        raw = json.loads(path.read_text("utf-8"))
        return ProjectContext(**raw)
    except (json.JSONDecodeError, TypeError):
        logger.exception("Failed to parse project file %s, creating fresh", project_id)
        now = datetime.now().isoformat()
        ctx = ProjectContext(project_id=project_id, created_at=now, updated_at=now)
        _persist(ctx)
        return ctx


def _persist(ctx: ProjectContext) -> None:
    _init_storage()
    ctx.updated_at = datetime.now().isoformat()
    path = _json_path(ctx.project_id)
    path.write_text(ctx.model_dump_json(indent=2, ensure_ascii=False), encoding="utf-8")


_STEP_TO_NEXT: dict[str, str] = {
    "positioning": "topic_selection",
    "topic_selection": "script_writing",
    "script_writing": "video_production",
    "video_production": "private_domain",
    "private_domain": "private_domain",
}


async def save_step_data(
    project_id: str,
    step: str,
    data: dict[str, Any],
    advance: bool = True,
) -> ProjectContext:
    _init_storage()
    ctx = load_project(project_id)

    if step == "positioning":
        ctx.account_profile = AccountProfile(**data) if isinstance(data, dict) else data
    elif step == "topic_selection":
        ctx.selected_topic = SelectedTopic(**data) if isinstance(data, dict) else data
    elif step == "script_writing":
        ctx.script_data = ScriptData(**data) if isinstance(data, dict) else data
    elif step == "video_production":
        ctx.video_assets = VideoAssets(**data) if isinstance(data, dict) else data

    if advance:
        ctx.current_step = _STEP_TO_NEXT.get(step, step)

    _persist(ctx)
    logger.info("Project %s step=%s saved, advanced to %s", project_id, step, ctx.current_step)
    return ctx


def list_projects() -> list[dict]:
    _init_storage()
    results = []
    for f in sorted(PROJECTS_DIR.glob("*.json"), key=lambda x: x.stat().st_mtime, reverse=True):
        try:
            raw = json.loads(f.read_text("utf-8"))
            results.append({
                "project_id": raw.get("project_id", f.stem),
                "current_step": raw.get("current_step", "unknown"),
                "created_at": raw.get("created_at", ""),
                "updated_at": raw.get("updated_at", ""),
                "name": raw.get("script_data", {}).get("body_content", "")[:40] or f.stem,
            })
        except Exception:
            logger.warning("Failed to read project file: %s", f)
    return results


def build_brand_context(project_id: str | None) -> str:
    if not project_id:
        return ""
    try:
        ctx = load_project(project_id)
    except Exception:
        return ""

    ap = ctx.account_profile
    bi = ap.brand_identity

    parts: list[str] = []
    if bi.visual_style:
        parts.append(f"Visual style: {bi.visual_style}")
    if bi.core_values:
        parts.append(f"Brand values: {bi.core_values}")
    if bi.color_primary:
        parts.append(f"Primary brand color: {bi.color_primary}")
    if bi.tone_of_voice:
        parts.append(f"Tone of voice: {bi.tone_of_voice}")
    if ap.persona_archivist:
        persona_text = json.dumps(ap.persona_archivist, ensure_ascii=False)
        parts.append(f"Brand persona: {persona_text[:300]}")

    return ". ".join(parts) + "." if parts else ""
