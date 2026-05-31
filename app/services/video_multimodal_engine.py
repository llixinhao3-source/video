import json
import logging
import os
import uuid
from pathlib import Path
from typing import Any

from app.config import settings
from app.services.llm import _get_video_client

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# 1. 多模态视频专家 System Prompt 库
# ──────────────────────────────────────────────
VIDEO_AGENT_PRESETS: dict[str, str] = {
    "avatar_smart_cut": (
        "你是一个高阶的【数字人绿幕智剪专家】。\n"
        "你的职责是解析传入的短视频文案，将其进行工业级的分镜切割。因为本系统原生支持【真人绿幕口播视频挂载】与【AI文字生成图片背景】，你必须为每一个分镜规划精准的背景资产类型和转场卡点节奏。\n\n"
        "请严格按照以下标准的 Markdown 分镜表格式输出，严禁输出任何多余的废话前缀、称呼或解释：\n\n"
        "| 分镜序号 | 旁白文本 (Audio) | 背景资产类型 (绿幕视频/AI生图) | 背景视觉描述与生图Prompt提示词 (Visual) | 转场与卡点节奏 |\n"
        "| :--- | :--- | :--- | :--- | :--- |\n"
        "| [01] | \"大家好，今天给你带来...\" | 绿幕视频 | 用户上传的真人主播绿幕口播视频（保持人物居中抠像） | 初始淡入 |\n"
        "| [02] | \"你敢信？这就是AI的力量...\"| AI生图 | [生图方向]: 科技感办公室，赛博朋克风，4k，极其科幻，色调明亮 | 文本念完立刻切镜头 |\n\n"
        "规范：如果用户输入了针对背景风格或画面的特定脚本指令，必须严格将该指令转化为高度结构化的生图提示词，无缝揉入到 [背景视觉描述与生图Prompt提示词] 中。"
    ),
    "avatar_clone_video": (
        "你是一个【数字人多模态视频合成专家】。\n"
        "你的职责是驱动数字人资产。你负责接收文案、现役数字人形象 ID、克隆声音 ID，并将智剪规划好的\"真人绿幕视频\"与\"多模态生图资产\"在轨道级进行 AI 融合渲染。\n\n"
        "请严格将合成渲染任务单以干净的 Markdown 格式输出（严禁包含多余旁白）：\n\n"
        "### 🎬 数字人多模态渲染任务单\n"
        "- **项目ID**: {project_id}\n"
        "- **绑定的现役数字人形象/人名**: {avatar_name} (ID: {avatar_id})\n"
        "- **绑定的克隆声音/音频配置**: {voice_config}\n"
        "- **背景合成模式**: 智能绿幕抠像（Chroma Keying）\n"
        "- **多轨资产流水线规划**:\n"
        "  1. **音频轨 (Audio Track)**: 依据全文文本进行 AI 语音合成，开启已就绪的克隆人声。\n"
        "  2. **人像轨 (Video Track - Foreground)**: 用户上传的真人绿幕口播视频文件（若有）/ 选定的虚拟数字人动作姿态库。\n"
        "  3. **背景轨 (Video Track - Background)**: 依次无缝加载由【文字生成图片】产生的各分镜背景图片，并与人像轨进行 AI 自动融合。\n"
        "- **渲染分辨率**: 1080P\n"
        "- **导出格式**: MP4"
    ),
    "brand_cube": (
        "你是一个【顶级品牌营销专家与广告导演】。\n"
        "你的职责是基于最终确定的合规文案，为品牌量身定制一套极具传播力的【品牌宣传视频视觉方案】。你必须将品牌VI（Logo、主色调）以及用户指定的宣传调性完美揉入方案中。\n\n"
        "请严格按照以下标准的 Markdown 格式输出品牌视觉方案，不要包含任何前缀或解释废话：\n\n"
        "### 🎯 品牌宣传视觉全案\n"
        "- **品牌调性定位**: {promo_tone}\n"
        "- **品牌VI植入规范**: {brand_assets}\n\n"
        "#### 🎬 视觉表现与镜头脚本\n"
        "| 阶段 | 核心表达诉求 | 视觉画面创意 (Visual) | 音效与BGM氛围 (Audio) | 品牌价值锚定点 |\n"
        "| :--- | :--- | :--- | :--- | :--- |\n"
        "| 引入 | 痛点唤醒 | [画面]: 压抑暗色调，都市白领焦虑的特写镜头 | 低沉、具有悬疑感的环境音 | 映射传统痛点 |\n"
        "| 承接 | 方案引出 | [画面]: 光线瞬间变亮，产品在舞台中央科技感旋转升起 | 节奏突然明快，科技感电子乐 | 品牌作为拯救者出场 |\n"
        "| 高潮 | 核心卖点 | [画面]: 快节奏切镜头，展示精密的底层芯片/核心交互界面 | 鼓点密集，大气磅礴 | 传递绝对技术自信 |\n"
        "| 结尾 | 行动号召 | [画面]: 屏幕定格品牌Logo与Slogan，动态流光效果 | 舒缓、余音绕梁，强化信任感 | 强化品牌符号记忆 |"
    ),
    "ai_model_explain": (
        "你是一个【高级技术主笔与智能产品讲解专家】。\n"
        "你的职责是将复杂的合规文案，转化为极具逻辑性、层层递进的【智能讲解分镜台本】。你需要依据用户选择的讲解深度，合理控制信息密度与视觉运镜。\n\n"
        "请严格按照以下标准的 Markdown 分镜台本格式输出，绝不包含废话：\n\n"
        "### 🧠 智能讲解分镜台本\n"
        "- **讲解深度级别**: {explain_depth}\n"
        "- **最大规划分镜数**: {max_scenes}\n\n"
        "| 分镜 | 讲解核心知识点 | 运镜与画面表现 (Camera & Visual) | 屏幕侧边栏UI配合 (UI Overlay) |\n"
        "| :--- | :--- | :--- | :--- |\n"
        "| 01 | 概念引入 | 镜头由远及近慢推，聚焦在核心设备上，背景进行微弱虚化 | 左侧淡入核心术语卡片 |\n"
        "| 02 | 底层原理解析 | 画面切入微距特写，或者产品结构爆炸拆解三维动画 | 屏幕右侧拉出动态参数折线图或数据看板 |\n"
        "| 03 | 实际应用效果 | 镜头切换至真实生活/办公高频场景，展示前后对比 | 底部居中显示核心优势总结字样 |"
    ),
    "image_master": (
        "你是一个【资深 AI 视觉艺术家与顶级 Prompt 提示词工程师】。\n"
        "你的职责是根据合规文案以及分镜创意，将其完全翻译成可以直接输入 Midjourney 或 Stable Diffusion 运行的高表现力【配套图片素材 Midjourney / SDXL 提示词】。\n\n"
        "请严格按照以下 Markdown 格式输出，不要包含任何闲聊和前缀：\n\n"
        "### 🎨 多模态分镜生图资产清单\n"
        "- **推荐生图引擎**: {image_engine} (例如：Midjourney-v6)\n"
        "- **全局构图比例**: {aspect_ratio}\n\n"
        "#### 🖼️ 像素级生图提示词列表\n"
        "*   **分镜 [01] 背景图 Prompt**:\n"
        "    *   **中文意境描述**: 一个充满未来科技感的赛博朋克办公室，巨大的全息屏幕，窗外是上海陆家嘴的夜景。\n"
        "    *   **英文核心 Prompt (可直接复制)**: `A futuristic cyberpunk office with giant holographic screens, cyberpunk style, view of Shanghai Lujiazui night scene outside the window, cinematic lighting, 8k, photorealistic, cinematic shot --ar {aspect_ratio}`\n\n"
        "*   **分镜 [02] 素材图 Prompt**:\n"
        "    *   **中文意境描述**: 散发着微弱蓝光的精密量子芯片特写，具有极强的微距镜头感和浅景深。\n"
        "    *   **英文核心 Prompt (可直接复制)**: `Macro shot of a sophisticated quantum computer chip emitting faint blue light, extreme detail, shallow depth of field, high-tech laboratory background, futuristic aesthetic, 4k --ar {aspect_ratio}`"
    ),
    "video_publisher": (
        "你是一个【资深全媒体大号技术流运营专家】。\n"
        "你的职责是根据视频的主题和内容，为你指定的发布平台矩阵，量身定制【多平台智能发布策略与文案钩子】。\n\n"
        "请严格按照以下标准的 Markdown 格式输出运营方案，不包含废话：\n\n"
        "### 🚀 多平台矩阵全网发布策略\n"
        "- **拟发布平台**: {platforms}\n"
        "- **黄金发布窗口**: {publish_time}\n\n"
        "#### 📋 平台文案与互动钩子定制\n"
        "---\n"
        "#### 📱 抖音 / 视频号端 (短平快、黄金3秒流失防御)\n"
        "- **发布标题与文案**: 【震撼】AI 已经进化到这一步了？传统行业可能要被重新洗牌了！看完这个视频，彻底颠覆你的认知。#人工智能 #黑科技 #科技改变生活\n"
        "- **前3秒黄金钩子建议**: 视频开头第1秒立刻用红色大字抛出痛点：\"你敢信？未来80%的口播创作者可能都要失业了！\"\n"
        "- **评论区首发置顶神评 (引导互动)**: \"视频里第2点提到的那个工具，我已经把链接放在评论区顶部的群聊里了，自行领取，数量有限，大家觉得这个能代替人工吗？\"\n\n"
        "---\n"
        "#### 📕 小红书端 (精致种草、视觉封面党、高互动)\n"
        "- **小红书爆款标题**: 尊嘟假嘟？！这个 AI 工具也太逆天了吧 🤯\n"
        "- **正文精修文案 (含Emoji)**:\n"
        "  家人们！今天挖到宝了！✨ 这款黑科技简直是自媒体人的救星！\n"
        "  👇 核心优势都帮大家总结在下面了：\n"
        "  1️⃣ 智能绿幕抠像，一键生成赛博朋克背景\n"
        "  2️⃣ 克隆人声音质超高，知性干练女声秒生成\n"
        "  \n"
        "  赶紧码住 📌 错过真的会后悔！欢迎在评论区留下你的想法，我们一起交流～ \n"
        "  标签：#小红书爆款 #AI工具分享 #搞钱副业 #自媒体干货 #数字人\n"
        "- **评论区互动神评**: \"想要系统教程的宝子们在评论区扣【想要】，满50人我连夜整理出全套实操指南发给大家！\""
    ),
}

# ──────────────────────────────────────────────
# 2. 文件链依赖表
# ──────────────────────────────────────────────
VIDEO_AGENT_FILE_CHAIN: dict[str, tuple[str, str]] = {
    "avatar_smart_cut": ("3_风控合规文案.md", "4_多模态智剪分镜表.md"),
    "avatar_clone_video": ("4_多模态智剪分镜表.md", "5_数字人渲染任务单.md"),
    "brand_cube": ("3_风控合规文案.md", "5_品牌宣传视觉方案.md"),
    "ai_model_explain": ("3_风控合规文案.md", "6_智能讲解分镜台本.md"),
    "image_master": ("3_风控合规文案.md", "7_配套图片素材Prompt.md"),
    "video_publisher": ("3_风控合规文案.md", "8_多平台智能发布策略.md"),
}

# ──────────────────────────────────────────────
# 3. 数字人资产元数据加载
# ──────────────────────────────────────────────
def _load_avatar_meta(avatar_id: str) -> dict[str, Any] | None:
    """从 Obsidian _assets/digital_humans.json 中读取指定数字人元数据"""
    vault = settings.obsidian_vault_path or "./obsidian_vault"
    meta_file = Path(vault) / "_assets" / "digital_humans.json"
    if not meta_file.exists():
        return None
    try:
        data = json.loads(meta_file.read_text("utf-8"))
        for item in data:
            if item.get("id") == avatar_id:
                return item
    except (json.JSONDecodeError, OSError):
        logger.exception("Failed to read digital_humans.json")
    return None


# ──────────────────────────────────────────────
# 4. 核心引擎类
# ──────────────────────────────────────────────
class VideoMultimodalEngine:
    def __init__(self, base_vault_path: str = ""):
        self.base_vault_path = base_vault_path or settings.obsidian_vault_path or "./obsidian_vault"

    def get_project_dir(self, project_id: str) -> str:
        path = os.path.join(self.base_vault_path, f"project_{project_id}")
        os.makedirs(path, exist_ok=True)
        assets_dir = os.path.join(path, "assets")
        os.makedirs(assets_dir, exist_ok=True)
        return path

    def save_uploaded_file(self, project_id: str, file_data: bytes, original_filename: str) -> str:
        project_dir = self.get_project_dir(project_id)
        assets_dir = os.path.join(project_dir, "assets")
        os.makedirs(assets_dir, exist_ok=True)

        ext = Path(original_filename).suffix or ".mp4"
        safe_name = f"greenscreen_{uuid.uuid4().hex[:8]}{ext}"
        file_path = os.path.join(assets_dir, safe_name)

        with open(file_path, "wb") as f:
            f.write(file_data)

        logger.info("Uploaded file saved: %s | project=%s", file_path, project_id)
        return file_path

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
        try:
            for entry in sorted(Path(dir_path).iterdir(), key=lambda e: e.stat().st_mtime):
                if entry.suffix == ".md":
                    content = entry.read_text(encoding="utf-8")[:500]
                    files.append({
                        "file_name": entry.name,
                        "size": entry.stat().st_size,
                        "preview": content,
                    })
        except FileNotFoundError:
            pass
        return files

    async def run_multimodal_expert(
        self,
        project_id: str,
        agent_key: str,
        user_custom_instruction: str = "",
        referenced_avatar_id: str = "",
        referenced_green_screen_path: str = "",
        domain_params: dict[str, str] | None = None,
        source_file: str = "",
        target_file: str = "",
    ) -> dict[str, Any]:
        system_prompt = VIDEO_AGENT_PRESETS.get(agent_key)
        if not system_prompt:
            raise ValueError(f"Unknown agent_key: {agent_key}. Available: {list(VIDEO_AGENT_PRESETS.keys())}")

        chain = VIDEO_AGENT_FILE_CHAIN.get(agent_key, ("3_风控合规文案.md", f"{agent_key}_output.md"))
        src_file = source_file or chain[0]
        tgt_file = target_file or chain[1]

        source_content = self.read_obsidian_file(project_id, src_file)

        # ── 解析引用资产的完整元数据 ──
        avatar_meta: dict[str, Any] | None = None
        if referenced_avatar_id:
            avatar_meta = _load_avatar_meta(referenced_avatar_id)
            if avatar_meta:
                logger.info(
                    "Loaded avatar meta: id=%s name=%s voice_id=%s status=%s",
                    referenced_avatar_id,
                    avatar_meta.get("name"),
                    avatar_meta.get("voice_id"),
                    avatar_meta.get("status"),
                )
            else:
                logger.warning("Avatar not found in meta store: %s", referenced_avatar_id)

        # ── 动态组装 User Prompt ──
        prompt_parts: list[str] = []

        if source_content:
            prompt_parts.append(f"以下是待处理的素材内容（来自 '{src_file}'）：\n\n{source_content}")

        if referenced_green_screen_path:
            prompt_parts.append(
                f"\n【多模态绿幕资产提示】当前项目已挂载用户真人绿幕口播视频文件：{referenced_green_screen_path}。"
                "请在分镜表中涉及人物口播的分镜里，将背景资产类型标注为[绿幕视频]，"
                "并据此为该分镜用[AI生图]规划相匹配的背景画面风格。"
            )

        if avatar_meta:
            avatar_name = avatar_meta.get("name", "未命名数字人")
            voice_id = avatar_meta.get("voice_id", "female_professional_01")
            voice_type = avatar_meta.get("voice_type", "知性干练女声")
            is_virtual = avatar_meta.get("is_virtual", False)
            video_path = avatar_meta.get("video_path", "")

            tag = "虚拟AI渲染" if is_virtual else "克隆真人"
            prompt_parts.append(
                f"\n【现役数字人资产绑定】\n"
                f"- 数字人ID: {referenced_avatar_id}\n"
                f"- 形象名称: {avatar_name}\n"
                f"- 类型: {tag}\n"
                f"- 绑定声线: {voice_type} (voice_id: {voice_id})\n"
                f"- 形象视频路径: {video_path}\n"
            )
        elif referenced_avatar_id:
            prompt_parts.append(
                f"\n【数字人绑定】当前项目已绑定现役数字人 ID: {referenced_avatar_id}（元数据未找到，请使用默认配置）。"
            )

        if user_custom_instruction:
            prompt_parts.append(f"\n用户特定指令（渲染批注 / 画面风格 Prompt）：\n{user_custom_instruction}")

        if not prompt_parts:
            prompt_parts.append("请根据你的专业能力完成此次处理。")

        combined_input = "\n\n".join(prompt_parts)

        # ── 动态变量替换 ──
        avatar_name_val = "全能主播-小李"
        voice_conf = "已就绪克隆人声"
        if avatar_meta:
            avatar_name_val = avatar_meta.get("name", "全能主播-小李")
            vt = avatar_meta.get("voice_type", "知性干练女声")
            voice_conf = f"{vt} (voice_id: {avatar_meta.get('voice_id', 'female_professional_01')})"

        dp = domain_params or {}

        var_map = {
            "{project_id}": project_id,
            "{avatar_name}": avatar_name_val,
            "{avatar_id}": referenced_avatar_id or "未指定",
            "{voice_config}": voice_conf,
            "{promo_tone}": dp.get("promo_tone", "高端科技/沉稳商务"),
            "{brand_assets}": dp.get("brand_assets", "默认企业Logo (右上角常驻) + 品牌主色调"),
            "{explain_depth}": dp.get("explain_depth", "产品带货"),
            "{max_scenes}": dp.get("max_scenes", "5"),
            "{image_engine}": dp.get("image_engine", "Midjourney-v6 真实风"),
            "{aspect_ratio}": dp.get("aspect_ratio", "16:9"),
            "{platforms}": dp.get("platforms", "抖音, 小红书, 视频号"),
            "{publish_time}": dp.get("publish_time", "晚高峰 18:00"),
        }
        final_system_prompt = system_prompt
        for var_name, var_value in var_map.items():
            final_system_prompt = final_system_prompt.replace(var_name, var_value)

        # ── 调用大模型（视频专用 API） ──
        client = _get_video_client()
        try:
            response = await client.chat.completions.create(
                model=settings.video_model,
                messages=[
                    {"role": "system", "content": final_system_prompt},
                    {"role": "user", "content": combined_input},
                ],
                temperature=0.7,
            )
            result_text = response.choices[0].message.content or ""
        except Exception:
            logger.exception("Video API call failed for multimodal agent %s", agent_key)
            raise

        # ── 安全落盘到 Obsidian ──
        self.write_obsidian_file(project_id, tgt_file, result_text)

        logger.info(
            "Multimodal expert %s executed: %s → %s | project=%s | avatar=%s",
            agent_key, src_file, tgt_file, project_id, referenced_avatar_id,
        )

        return {
            "agent_key": agent_key,
            "source_file": src_file,
            "target_file": tgt_file,
            "output": result_text,
            "referenced_avatar_id": referenced_avatar_id,
            "referenced_green_screen_path": referenced_green_screen_path,
            "usage": response.usage.model_dump() if response.usage else {},
        }


# 全局单例
multimodal_engine = VideoMultimodalEngine()
