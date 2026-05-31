import os
import json
import re
import asyncio
from datetime import datetime
from pathlib import Path
from api.config import settings

_vault_lock = asyncio.Lock()


def _resolve_vault_path() -> Path:
    raw = settings.OBSIDIAN_VAULT_PATH or "~/Desktop/obsidian/video"
    p = Path(raw)
    if not p.is_absolute():
        p = Path(os.getcwd()) / p
    return Path(os.path.expanduser(str(p)))


def _read_vault_summary_sync(max_reports: int = 10) -> str:
    vault = _resolve_vault_path()
    if not vault.exists():
        return ""

    lines: list[str] = []
    reports: list[tuple[float, Path]] = []

    for f in vault.iterdir():
        if f.is_file() and f.suffix == ".md" and "_定位报告" in f.name:
            try:
                mtime = f.stat().st_mtime
                reports.append((mtime, f))
            except OSError:
                pass

    reports.sort(key=lambda x: x[0], reverse=True)
    recent = reports[:max_reports]

    for _, filepath in recent:
        try:
            content = filepath.read_text(encoding="utf-8")
        except Exception:
            continue

        keyword = ""
        m = re.search(r"> 关键词：(.+)", content)
        if m:
            keyword = m.group(1).strip()

        gen_time = ""
        m = re.search(r"> 生成时间：(.+)", content)
        if m:
            gen_time = m.group(1).strip()

        lines.append(f"\n{'='*60}")
        lines.append(f"## 报告：{keyword}")
        lines.append(f"生成时间：{gen_time}")
        lines.append(f"文件：{filepath.name}")
        lines.append(f"{'='*60}")

        sections = ["企业立项", "人设档案", "产品档案", "赛道分析"]
        for section_name in sections:
            pattern = rf"## (?:🏢|🎭|📦|🎯) {section_name}\s*\n([\s\S]*?)(?=\n(?:---|\*由 AI Video SOP))"
            m = re.search(pattern, content)
            if m:
                section_content = m.group(1).strip()
                if section_content:
                    lines.append(f"\n【{section_name}】")
                    truncated = section_content[:3000]
                    if len(section_content) > 3000:
                        truncated += "\n...(内容过长，已截断)"
                    lines.append(truncated)

    project_dirs = [d for d in vault.iterdir() if d.is_dir() and d.name.startswith("project_")]
    for proj_dir in project_dirs:
        lines.append(f"\n--- 项目 {proj_dir.name} ---")
        proj_files = sorted([f for f in proj_dir.iterdir() if f.suffix == ".md"])
        for pf in proj_files[:5]:
            try:
                text = pf.read_text(encoding="utf-8")[:2000]
                lines.append(f"\n📄 {pf.name}")
                lines.append(text)
            except Exception:
                pass

    return "\n".join(lines)


async def read_vault_summary(max_reports: int = 10) -> str:
    async with _vault_lock:
        return await asyncio.to_thread(_read_vault_summary_sync, max_reports)


def _write_to_obsidian_sync(positioning_result: dict) -> str:
    vault = _resolve_vault_path()
    vault.mkdir(parents=True, exist_ok=True)

    keywords = positioning_result.get("keywords", "未命名")
    safe_name = "".join(c if c.isalnum() or c in "._-" else "_" for c in keywords)[:40]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}_{safe_name}_定位报告.md"
    filepath = vault / filename

    lines = []
    lines.append(f"# 🎯 账号定位分析报告")
    lines.append(f"")
    lines.append(f"> 关键词：{keywords}")
    lines.append(f"> 生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"")

    enterprise = positioning_result.get("enterprise_project", {})
    if enterprise:
        lines.append(f"---")
        lines.append(f"## 🏢 企业立项")
        lines.append(f"")
        for key, value in enterprise.items():
            label = key.replace("_", " ").title()
            if isinstance(value, list):
                lines.append(f"### {label}")
                for item in value:
                    lines.append(f"- {item}")
                lines.append(f"")
            else:
                lines.append(f"### {label}")
                lines.append(f"{value}")
                lines.append(f"")

    persona = positioning_result.get("persona_archivist", {})
    if persona:
        lines.append(f"---")
        lines.append(f"## 🎭 人设档案")
        lines.append(f"")
        for key, value in persona.items():
            label = key.replace("_", " ").title()
            lines.append(f"### {label}")
            lines.append(f"{value}")
            lines.append(f"")

    product = positioning_result.get("product_profiler", {})
    if product:
        lines.append(f"---")
        lines.append(f"## 📦 产品档案")
        lines.append(f"")
        for key, value in product.items():
            label = key.replace("_", " ").title()
            if isinstance(value, list):
                lines.append(f"### {label}")
                for item in value:
                    lines.append(f"- {item}")
                lines.append(f"")
            else:
                lines.append(f"### {label}")
                lines.append(f"{value}")
                lines.append(f"")

    lines.append(f"---")
    lines.append(f"*由 AI Video SOP 系统自动生成*")

    filepath.write_text("\n".join(lines), encoding="utf-8")
    return str(filepath)


async def write_to_obsidian(positioning_result: dict) -> str:
    async with _vault_lock:
        return await asyncio.to_thread(_write_to_obsidian_sync, positioning_result)
