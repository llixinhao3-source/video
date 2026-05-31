import logging
from datetime import datetime
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)


def _build_front_matter(main_title: str) -> str:
    now = datetime.now()
    return (
        "---\n"
        f"title: \"{main_title}\"\n"
        f"date: {now.strftime('%Y-%m-%d')}\n"
        f"time: {now.strftime('%H:%M')}\n"
        "type: 短视频提案\n"
        "status: 待审核\n"
        "tags: [AI生成, 短视频运营]\n"
        "---\n"
    )


def _build_title_and_hook_section(title_and_hook: dict) -> str:
    titles = title_and_hook.get("titles", [])
    hooks = title_and_hook.get("hooks", [])

    lines = ["## 🪝 标题与前3秒钩子组合\n"]

    if titles:
        lines.append("### 📌 备选标题\n")
        for i, t in enumerate(titles, 1):
            style = t.get("style", "")
            content = t.get("content", "")
            prediction = t.get("click_prediction", "")
            reason = t.get("reason", "")
            lines.append(f"**{i}. [{style}]** {content}")
            if prediction:
                lines.append(f"   - 预估点击率：{prediction}")
            if reason:
                lines.append(f"   - 设计逻辑：{reason}")
            lines.append("")

    if hooks:
        lines.append("### 🎯 开头钩子\n")
        for i, h in enumerate(hooks, 1):
            hook_type = h.get("hook_type", "")
            content = h.get("content", "")
            retention = h.get("retention_prediction", "")
            reason = h.get("reason", "")
            lines.append(f"**{i}. [{hook_type}]** {content}")
            if retention:
                lines.append(f"   - 预估留存：{retention}")
            if reason:
                lines.append(f"   - 设计逻辑：{reason}")
            lines.append("")

    if not titles and not hooks:
        lines.append("> 暂无标题与钩子数据\n")

    return "\n".join(lines) + "\n"


def _build_body_section(body_content: str) -> str:
    content = body_content or "> 暂无正文内容"
    return f"## 📝 正文内容\n\n{content}\n\n"


def _build_cta_section(cta_and_tags: dict) -> str:
    guide_words = cta_and_tags.get("guide_words", "")
    tags = cta_and_tags.get("tags", [])

    lines = ["## 📢 引导语与话题标签\n"]

    lines.append("### 💬 互动引导语\n")
    if guide_words:
        lines.append(f"{guide_words}\n")
    else:
        lines.append("> 暂无引导语\n")

    lines.append("### #️⃣ 推荐话题标签\n")
    if tags:
        tag_strs = []
        for tag_item in tags:
            tag_name = tag_item.get("tag", "")
            if tag_name:
                tag_strs.append(f"#{tag_name}")
        lines.append(" ".join(tag_strs) + "\n")
        lines.append("")
        for tag_item in tags:
            tag_name = tag_item.get("tag", "")
            tag_type = tag_item.get("type", "")
            reason = tag_item.get("reason", "")
            lines.append(f"- **#{tag_name}** ({tag_type})：{reason}")
        lines.append("")
    else:
        lines.append("> 暂无推荐标签\n")

    return "\n".join(lines) + "\n"


def _build_risk_section(risk_report: dict) -> str:
    is_safe = risk_report.get("is_safe", True)
    risk_words = risk_report.get("risk_words", [])
    suggestions = risk_report.get("suggestions", "")
    overall = risk_report.get("overall_risk_level", "")

    lines = ["## ⚠️ 团队合规风控报告\n"]

    status_icon = "✅" if is_safe else "🚨"
    status_text = "合规通过" if is_safe else "存在风险"
    lines.append(f"**审核结论：{status_icon} {status_text}**\n")

    if overall:
        lines.append(f"- 综合风险等级：**{overall}**\n")

    if risk_words:
        lines.append("### 🔍 风险词详情\n")
        lines.append("| 风险词 | 等级 | 违规类型 | 替代方案 |")
        lines.append("|--------|------|----------|----------|")
        for rw in risk_words:
            word = rw.get("word", "")
            level = rw.get("level", "")
            category = rw.get("category", "")
            suggestion = rw.get("suggestion", "")
            lines.append(f"| {word} | {level} | {category} | {suggestion} |")
        lines.append("")

    if suggestions:
        lines.append("### ✏️ 修改建议\n")
        lines.append(f"{suggestions}\n")

    if not risk_words and not suggestions:
        lines.append("> 未检测到合规风险，内容可安全发布。\n")

    return "\n".join(lines) + "\n"


async def write_to_obsidian(workflow_result: dict) -> None:
    vault_path = settings.obsidian_vault_path
    if not vault_path:
        logger.warning("obsidian_vault_path is empty, skip writing")
        return

    vault = Path(vault_path)
    try:
        if not vault.exists():
            vault.mkdir(parents=True, exist_ok=True)
    except OSError:
        logger.exception("Failed to create vault directory: %s", vault_path)
        return

    title_and_hook = workflow_result.get("title_and_hook", {})
    titles = title_and_hook.get("titles", [])
    main_title = titles[0].get("content", "未命名视频提案") if titles else "未命名视频提案"

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = "".join(c for c in main_title if c.isalnum() or c in " _-")[:50].strip()
    if not safe_name:
        safe_name = "未命名视频提案"
    filename = f"{safe_name}_{timestamp}.md"
    filepath = vault / filename

    md = _build_front_matter(main_title)
    md += f"# 🎬 爆款短视频提案：{main_title}\n\n"
    md += _build_title_and_hook_section(title_and_hook)
    md += _build_body_section(workflow_result.get("body_content", ""))
    md += _build_cta_section(workflow_result.get("cta_and_tags", {}))
    md += _build_risk_section(workflow_result.get("risk_report", {}))
    md += "---\n\n"
    md += f"> 📅 生成时间：{datetime.now().isoformat()}\n\n"
    md += "[[短视频运营SOP]]\n"

    try:
        filepath.write_text(md, encoding="utf-8")
        logger.info("Obsidian note written: %s", filepath)
    except OSError:
        logger.exception("Failed to write Obsidian note to %s", filepath)


def _build_titles_section(titles: list) -> str:
    lines = ["## 🔥 爆款标题方案\n"]
    if not titles:
        lines.append("> 暂无标题方案\n")
        return "\n".join(lines) + "\n"

    for i, t in enumerate(titles, 1):
        style = t.get("style", "")
        content = t.get("content", "")
        prediction = t.get("click_prediction", "")
        reason = t.get("reason", "")
        lines.append(f"**{i}. [{style}]** {content}")
        if prediction:
            lines.append(f"   - 预估点击率：{prediction}")
        if reason:
            lines.append(f"   - 设计逻辑：{reason}")
        lines.append("")

    return "\n".join(lines) + "\n"


def _build_platform_section(platform_optimized: dict) -> str:
    if not platform_optimized:
        return ""

    lines = ["## 📱 平台适配标题\n"]

    platform_names = {
        "douyin": "抖音",
        "xiaohongshu": "小红书",
        "bilibili": "B站",
        "kuaishou": "快手",
    }

    for key, label in platform_names.items():
        items = platform_optimized.get(key, [])
        if not items:
            continue
        lines.append(f"### {label}\n")
        for item in items:
            title = item.get("title", "")
            reason = item.get("reason", "")
            lines.append(f"- **{title}**")
            if reason:
                lines.append(f"  - {reason}")
        lines.append("")

    return "\n".join(lines) + "\n"


def _build_ab_test_section(ab_test_plan: list) -> str:
    if not ab_test_plan:
        return ""

    lines = ["## 📊 A/B 测试方案\n"]
    lines.append("| 维度 | A版标题 | B版标题 | 预测 | 原因 |")
    lines.append("|------|---------|---------|------|------|")

    for group in ab_test_plan:
        dimension = group.get("dimension", "")
        title_a = group.get("title_a", "")
        title_b = group.get("title_b", "")
        prediction = group.get("prediction", "")
        reason = group.get("reason", "")
        lines.append(f"| {dimension} | {title_a} | {title_b} | {prediction} | {reason} |")

    lines.append("")
    return "\n".join(lines) + "\n"


async def write_title_to_obsidian(title_result: dict) -> None:
    vault_path = settings.obsidian_vault_path
    if not vault_path:
        logger.warning("obsidian_vault_path is empty, skip writing")
        return

    vault = Path(vault_path)
    try:
        if not vault.exists():
            vault.mkdir(parents=True, exist_ok=True)
    except OSError:
        logger.exception("Failed to create vault directory: %s", vault_path)
        return

    titles = title_result.get("titles", [])
    main_title = titles[0].get("content", "标题生成方案") if titles else "标题生成方案"

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = "".join(c for c in main_title if c.isalnum() or c in " _-")[:50].strip()
    if not safe_name:
        safe_name = "标题生成方案"
    filename = f"标题方案_{safe_name}_{timestamp}.md"
    filepath = vault / filename

    now = datetime.now()
    md = (
        "---\n"
        f"title: \"{main_title}\"\n"
        f"date: {now.strftime('%Y-%m-%d')}\n"
        f"time: {now.strftime('%H:%M')}\n"
        "type: 标题方案\n"
        "status: 待审核\n"
        f"tags: [AI生成, 标题方案, {title_result.get('style', '')}]\n"
        "---\n"
    )

    md += f"# 🏷️ 爆款标题方案：{main_title}\n\n"
    md += _build_titles_section(titles)
    md += _build_platform_section(title_result.get("platform_optimized", {}))
    md += _build_ab_test_section(title_result.get("ab_test_plan", []))
    md += "---\n\n"
    md += f"> 📅 生成时间：{now.isoformat()}\n\n"
    md += "[[短视频运营SOP]]\n"

    try:
        filepath.write_text(md, encoding="utf-8")
        logger.info("Title Obsidian note written: %s", filepath)
    except OSError:
        logger.exception("Failed to write title Obsidian note to %s", filepath)
