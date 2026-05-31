import logging
import os
from pathlib import Path
from typing import Any

from app.config import settings
from app.services.llm import _get_text_client

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# 1. 7 大文案专家后台固定 System Prompt 库
# ──────────────────────────────────────────────
AGENT_PRESETS: dict[str, str] = {
    "smart_follow": (
        "你是一个短视频【智能跟创专家】。你的职责是根据核心主题，"
        "直接输出一篇结构完整的短视频文案初稿。"
        "除了 Markdown 格式的文案内容，不要输出任何解释性废话。"
    ),
    "title_master": (
        "你是一个短视频【爆款标题生成师】。你的职责是深度分析传入的文案内容，"
        "直接输出 5 个爆款标题的 Markdown 列表。每个标题必须说明适用的平台和点击率预估。"
        "除了列表内容，不要输出任何解释性废话。"
    ),
    "hook_design": (
        "你是一个短视频【黄金3秒钩子设计师】。你的职责是重写传入文案的开头前3秒，"
        "使其具备极强的吸睛效果。输出三个不同风格的钩子版本（悬念型、共鸣型、反常识型），"
        "每个版本不超过 50 字。除了钩子内容，不要输出任何解释性废话。"
    ),
    "text_rewrite": (
        "你是一个短视频【文本口语化改写师】。你的职责是将传入的文案进行彻头彻尾的口语化改写，"
        "使其适合真人朗读。改写后的文案应当流畅自然、有节奏感，"
        "每句话不超过 25 字。除了改写后的文案，不要输出任何解释性废话。"
    ),
    "usp_planner": (
        "你是一个短视频【核心卖点策划师】。你的职责是在传入的文案中，"
        "精准并强有力地植入产品的核心卖点与痛点解决方案。"
        "输出一份标注了卖点植入位置的完整文案，用「卖点注入」标记每个植入点。"
        "除了标注版文案，不要输出任何解释性废话。"
    ),
    "risk_control": (
        "你是一个短视频【违禁词风控员】。你的职责是严格审查文案，"
        "找出并替换掉所有违反广告法和平台规则的敏感极限词，输出安全版文案。"
        "在安全版文案末尾，必须附上一个「删除/替换清单」，列出所有被修改的词。"
        "除了审查结果，不要输出任何解释性废话。"
    ),
    "marketing_helper": (
        "你是一个短视频【营销转化助手】。你的职责是在文案末尾追加互动引导语，"
        "并生成 3-5 个精准的话题标签。标签必须包含：1 个行业大词、1-2 个精准长尾词、1 个热点词。"
        "除了追加后的完整文案，不要输出任何解释性废话。"
    ),
    "title_expert": (
        "你是一个短视频【爆款标题师】。你的职责是深度分析传入的文案内容，"
        "生成 5 个不同风格的爆款标题。每个标题需要标注：适用平台（抖音/小红书/B站/快手）、"
        "风格类型（吸睛型/干货型/情感型/悬念型）、预估点击率。"
        "输出格式为 Markdown 列表。除了标题列表，不要输出任何解释性废话。"
    ),
    "platform_optimizer": (
        "你是一个短视频【平台适配师】。你的职责是根据不同平台的算法特点和用户偏好，"
        "将传入的标题进行针对性优化。需要为以下平台各生成 2 个优化标题："
        "抖音（短平快、情绪化）、小红书（生活化、种草风）、B站（知识感、趣味性）、快手（接地气、直白）。"
        "输出格式为按平台分组的 Markdown 列表。除了优化结果，不要输出任何解释性废话。"
    ),
    "ab_test_planner": (
        "你是一个短视频【A/B测试师】。你的职责是基于传入的标题方案，"
        "设计 3 组 A/B 测试对比方案。每组需要说明：测试维度（如长度/情绪/数字使用）、"
        "A 版标题、B 版标题、预期胜负及原因。"
        "输出格式为 Markdown 表格。除了测试方案，不要输出任何解释性废话。"
    ),
}

# 前端 agent key → 后端 agent key 映射
FRONTEND_AGENT_MAP: dict[str, str] = {
    "framework": "smart_follow",
    "titleGenerator": "title_master",
    "hookDesigner": "hook_design",
    "textRewriter": "text_rewrite",
    "sellingPoint": "usp_planner",
    "riskControl": "risk_control",
    "marketingCopy": "marketing_helper",
    "titleMaster": "title_expert",
    "platformOptimizer": "platform_optimizer",
    "abTestPlanner": "ab_test_planner",
}

AGENT_FILE_CHAIN: dict[str, tuple[str, str]] = {
    "framework": ("0_选题方向.md", "1_文案初稿.md"),
    "titleGenerator": ("1_文案初稿.md", "2_爆款标题.md"),
    "hookDesigner": ("1_文案初稿.md", "3_黄金钩子.md"),
    "textRewriter": ("1_文案初稿.md", "4_口语化文案.md"),
    "sellingPoint": ("1_文案初稿.md", "5_卖点植入.md"),
    "riskControl": ("1_文案初稿.md", "6_合规版文案.md"),
    "marketingCopy": ("6_合规版文案.md", "7_终稿带标签.md"),
    "titleMaster": ("1_文案初稿.md", "8_爆款标题.md"),
    "platformOptimizer": ("8_爆款标题.md", "9_平台适配标题.md"),
    "abTestPlanner": ("8_爆款标题.md", "10_AB测试方案.md"),
}


# ──────────────────────────────────────────────
# 2. 核心类与文件管理方法
# ──────────────────────────────────────────────
class VideoSopEngine:
    def __init__(self, base_vault_path: str = ""):
        self.base_vault_path = base_vault_path or settings.obsidian_vault_path or "./obsidian_vault"

    def get_project_dir(self, project_id: str) -> str:
        path = os.path.join(self.base_vault_path, f"project_{project_id}")
        os.makedirs(path, exist_ok=True)
        return path

    def write_obsidian_file(self, project_id: str, file_name: str, content: str) -> str:
        file_path = os.path.join(self.get_project_dir(project_id), file_name)
        Path(file_path).write_text(content, encoding="utf-8")
        logger.info("Obsidian file written: %s | %s", project_id, file_name)
        return file_path

    def read_obsidian_file(self, project_id: str, file_name: str) -> str:
        file_path = os.path.join(self.get_project_dir(project_id), file_name)
        if not os.path.exists(file_path):
            return ""
        return Path(file_path).read_text(encoding="utf-8")

    def list_project_files(self, project_id: str) -> list[dict]:
        dir_path = self.get_project_dir(project_id)
        files = []
        for entry in sorted(Path(dir_path).iterdir(), key=lambda e: e.stat().st_mtime):
            if entry.suffix == ".md":
                content = entry.read_text(encoding="utf-8")[:500]
                files.append({
                    "file_name": entry.name,
                    "size": entry.stat().st_size,
                    "preview": content,
                })
        return files

    async def run_expert(
        self,
        project_id: str,
        agent_key: str,
        user_custom_instruction: str,
        source_file: str,
        target_file: str,
    ) -> dict[str, Any]:
        backend_agent = FRONTEND_AGENT_MAP.get(agent_key, agent_key)
        system_prompt = AGENT_PRESETS.get(backend_agent, AGENT_PRESETS.get(agent_key, ""))

        if not system_prompt:
            raise ValueError(f"Unknown agent_key: {agent_key}")

        source_content = self.read_obsidian_file(project_id, source_file) if source_file else ""

        if source_content:
            combined_input = (
                f"原始素材（来自 '{source_file}'）：\n\n{source_content}\n\n"
                f"用户特定指令：\n{user_custom_instruction}"
            )
        else:
            combined_input = user_custom_instruction

        client = _get_text_client()
        try:
            response = await client.chat.completions.create(
                model=settings.deepseek_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": combined_input},
                ],
                temperature=0.7,
            )
            result_text = response.choices[0].message.content or ""
        except Exception:
            logger.exception("DeepSeek call failed for agent %s", agent_key)
            raise

        self.write_obsidian_file(project_id, target_file, result_text)

        logger.info(
            "Expert %s executed: %s → %s | project=%s",
            agent_key, source_file, target_file, project_id,
        )

        return {
            "agent_key": agent_key,
            "source_file": source_file,
            "target_file": target_file,
            "output": result_text,
            "usage": response.usage.model_dump() if response.usage else {},
        }


# 全局单例
engine = VideoSopEngine()
