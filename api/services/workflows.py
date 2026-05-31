import subprocess
import os
import asyncio
from api.services.llm import chat
from api.services.risk_control import check_risk
from api.services.prompts import get_prompt, parse_json_response
from api.services.obsidian import read_vault_summary


def _section(title: str, content: str, structured: dict | None = None) -> dict:
    result = {"title": title, "content": content}
    if structured:
        result["structured"] = structured
    return result


async def _run_agent(system: str, user: str, temperature: float = 0.7) -> str:
    return await asyncio.to_thread(chat, system, user, temperature)


async def _run_parallel_agents(agent_prompts: dict, user_template: str, agents: dict) -> list[dict]:
    tasks = []
    keys = []
    for key, (role, task, title) in agent_prompts.items():
        if agents.get(key, True):
            system = f"你是一位{role}。{task}。输出结构化的分析结果。"
            user = user_template
            tasks.append(_run_agent(system, user, 0.7))
            keys.append((key, title))

    results = await asyncio.gather(*tasks, return_exceptions=True)
    sections = []
    for (key, title), result in zip(keys, results):
        if isinstance(result, Exception):
            sections.append(_section(title, f"分析失败：{str(result)}"))
        else:
            sections.append(_section(title, result))
    return sections


async def run_positioning(inputs: dict, agents: dict) -> dict:
    brand = inputs.get("brand", "")
    goal = inputs.get("goal", "")
    sections = []

    if agents.get("enterprise", True):
        system = get_prompt("enterprise_project")
        user = f"品牌/产品/行业关键词：{brand}\n企业目标与愿景：{goal}"
        raw = await _run_agent(system, user, 0.6)
        parsed = parse_json_response(raw)
        display = ""
        if parsed:
            display = "\n\n".join(f"**{k}**：{v}" for k, v in parsed.items())
        else:
            display = raw
        sections.append(_section("企业立项分析", display, parsed))

    if agents.get("persona", True):
        system = get_prompt("persona_archivist")
        enterprise_context = ""
        if sections and sections[0].get("structured"):
            enterprise_context = "\n".join(f"{k}：{v}" for k, v in sections[0]["structured"].items())
        user = f"品牌/产品/行业关键词：{brand}\n企业目标与愿景：{goal}\n企业立项信息：\n{enterprise_context}"
        raw = await _run_agent(system, user, 0.7)
        parsed = parse_json_response(raw)
        display = ""
        if parsed:
            display = "\n\n".join(f"**{k}**：{v}" for k, v in parsed.items())
        else:
            display = raw
        sections.append(_section("人设档案", display, parsed))

    if agents.get("product", True):
        system = get_prompt("product_profiler")
        persona_context = ""
        if len(sections) > 1 and sections[1].get("structured"):
            persona_context = "\n".join(f"{k}：{v}" for k, v in sections[1]["structured"].items())
        user = f"品牌/产品/行业关键词：{brand}\n企业目标与愿景：{goal}\n人设档案信息：\n{persona_context}"
        raw = await _run_agent(system, user, 0.6)
        parsed = parse_json_response(raw)
        display = ""
        if parsed:
            display = "\n\n".join(f"**{k}**：{v}" for k, v in parsed.items())
        else:
            display = raw
        sections.append(_section("产品档案", display, parsed))

    summary_system = "你是一位综合定位分析师。根据以上分析结果，给出综合定位建议报告，包含受众画像、定位方向、内容策略建议。输出结构化的综合分析。"
    summary_user = f"品牌：{brand}\n分析结果：\n" + "\n".join(s["content"][:300] for s in sections)
    summary = await _run_agent(summary_system, summary_user, 0.6)

    return {"sections": sections, "summary": summary}


async def run_topic(inputs: dict, style: str, agents: dict) -> dict:
    keyword = inputs.get("keyword", "")

    agent_prompts = {
        "inspiration": ("灵感中心专家", "追踪热点话题、洞察行业趋势、挖掘用户兴趣、建设创意灵感库", "热点灵感推荐"),
        "videoMining": ("视频挖掘专家", "分析平台爆款内容、提取热门视频特征、探索内容形式创新、拆解流量密码", "爆款视频挖掘"),
        "competitor": ("竞品监控专家", "追踪竞品账号动态、分析竞品内容策略、识别差异化机会、发现市场空白点", "竞品监控分析"),
        "ipBenchmark": ("IP对标分析专家", "研究头部IP内容、分析IP成长路径、借鉴成功模式、制定差异化定位策略", "IP对标分析"),
        "videoAnalysis": ("视频数据分析专家", "解读数据指标、评估内容表现、分析用户反馈、提出优化方向建议", "视频数据分析"),
        "videoDeconstruct": ("视频拆解专家", "分析爆款视频结构、解析镜头语言、研究叙事节奏、提取可复制元素", "爆款视频拆解"),
        "ipPositioning": ("IP定位专家", "进行IP定位诊断、提供定位优化建议、规划内容方向、制定人设强化策略", "IP定位诊断"),
        "titleExpert": ("爆款标题专员", "评估标题吸引力、提供关键词优化建议、建设标题模板库、制定点击率提升策略", "标题优化建议"),
        "longTermPlan": ("选题规划专家", "制定选题日历、策划系列内容、构建选题矩阵、规划长期内容战略", "长线选题规划"),
    }

    sections = await _run_parallel_agents(
        agent_prompts,
        f"选题关键词：{keyword}\n请进行分析。",
        agents,
    )

    summary_system = "你是一位选题综合分析师。根据以上分析，生成5个精选选题推荐，每个选题包含标题、角度、预期效果。"
    summary_user = f"关键词：{keyword}\n分析结果摘要：\n" + "\n".join(s["content"][:150] for s in sections)
    summary = await _run_agent(summary_system, summary_user, 0.8)

    return {"sections": sections, "summary": summary}


async def run_video(inputs: dict, style: str, agents: dict) -> dict:
    script = inputs.get("script", "")

    agent_prompts = {
        "digitalEdit": ("数字人视频制作专家", "根据文案脚本，规划数字人智剪方案，包括模板选择、素材搭配、制作流程", "数字人智剪方案"),
        "digitalClone": ("数字人克隆专家", "根据文案脚本，规划数字人形象克隆和声音克隆方案，以及视频合成流程", "数字人克隆方案"),
        "brandVideo": ("品牌视频制作专家", "根据文案脚本，生成品牌宣传视频创意方案，包括画面描述、转场设计、品牌调性", "品宣视频方案"),
        "smartExplain": ("智能讲解视频专家", "根据文案脚本，制作智能讲解视频分镜脚本，包括画面、旁白、字幕设计", "讲解视频分镜"),
        "imageGen": ("AI绘图专家", "根据文案脚本，生成配套图片素材的提示词方案，包括场景图、配图、封面图", "配图素材方案"),
        "publisher": ("视频发布运营专家", "制定智能发布方案，包括多平台发布策略、矩阵管理、私信自动回复设置", "发布运营方案"),
    }

    sections = await _run_parallel_agents(
        agent_prompts,
        f"视频文案：{script}\n视频比例：{style or '9:16'}\n请生成方案。",
        agents,
    )

    return {"sections": sections}


async def run_private_domain(inputs: dict, agents: dict) -> dict:
    account_info = inputs.get("accountInfo", "")

    agent_prompts = {
        "management": ("私域管理专家", "进行私域基础配置方案设计，包括用户分层管理、数据统计分析、权限设置", "私域管理方案"),
        "growth": ("私域拉新专家", "制定拉新策略，包括渠道拓展、新用户转化策略、拉新活动策划、效果评估", "拉新策略方案"),
        "dmExpert": ("微信私信专家", "设计私信话术和自动回复规则，包括用户咨询解答、私信转化引导", "私信话术方案"),
        "moments": ("朋友圈策划专家", "规划朋友圈内容，包括发布时间优化、互动活动设计、转化引导策略", "朋友圈策划方案"),
        "funnel": ("私域引流专家", "生成引流方案和引导话术模板，包括引流渠道选择、效果追踪", "引流方案"),
        "ipStrategy": ("IP定位策划师", "优化私域IP定位，强化人设，规划内容方向，提升用户粘性", "IP定位优化方案"),
    }

    sections = await _run_parallel_agents(
        agent_prompts,
        f"账号/业务信息：{account_info}\n请生成方案。",
        agents,
    )

    return {"sections": sections}


async def run_market(inputs: dict, style: str, agents: dict) -> dict:
    dimension = inputs.get("dimension", "")

    agent_prompts = {
        "marketingPlan": ("营销方案专家", "制定整体营销方案，包括营销活动策划、渠道选择与投放策略、效果评估", "营销方案"),
        "demandAnalyst": ("需求分析专家", "分析用户需求，洞察市场痛点，进行竞品对比分析、需求趋势预测", "需求分析报告"),
        "salesTalk": ("成交话术专家", "设计销售转化话术，包括客户异议处理、跟进策略、话术效果优化", "成交话术方案"),
        "sellingPoint": ("产品卖点挖掘专家", "挖掘产品核心卖点，分析差异化优势，梳理用户价值主张", "卖点挖掘报告"),
        "branding": ("品牌宣传专家", "制定品牌定位策略、品牌形象塑造、品牌传播方案、舆情管理", "品牌宣传策略"),
        "adCopy": ("广告文案大师", "创作广告创意文案，设计广告语，优化广告内容，提供A/B测试方案", "广告文案方案"),
    }

    sections = await _run_parallel_agents(
        agent_prompts,
        f"分析维度：{dimension}\n分析方向：{style or '综合分析'}\n请进行分析。",
        agents,
    )

    return {"sections": sections}


async def run_boss(inputs: dict, style: str, agents: dict) -> dict:
    query = inputs.get("query", "")
    sections = []

    vault_data = await read_vault_summary(max_reports=8)

    async def run_dashboard():
        if not agents.get("dashboard", True):
            return None
        if vault_data:
            system = (
                "你是一位短视频运营数据看板分析师。下面提供了 Obsidian 知识库中存储的真实账号定位分析报告和项目文件数据。"
                "请根据这些真实数据，生成一份基于真实运营内容的数据看板分析报告。\n\n"
                "报告应包含：\n"
                "1. 已分析的账号/品类总览——列出所有已分析的账号或品类关键词、分析时间、所处赛道\n"
                "2. 赛道覆盖分析——按赛道/行业分类统计，判断哪个赛道分析最多、哪个赛道是空白\n"
                "3. 对标账号统计——列出所有报告中提到的对标账号，统计出现频率最高的对标账号\n"
                "4. 可采纳策略汇总——从各报告中提取核心策略，按赛道归并\n"
                "5. 项目产出统计——各项目文件夹中的文案/脚本产出数量\n\n"
                "重要：所有数据和结论必须基于提供的真实 Obsidian 数据，不要编造数据。如果某类数据缺失，请如实说明。"
            )
        else:
            system = (
                "你是一位短视频运营数据看板分析师。当前 Obsidian 知识库中暂无历史分析数据（尚未进行账号定位分析）。"
                "请如实告知用户当前数据为空，并建议用户先去「账号定位分析」或「品类定位分析」页面生成报告。"
                "用友好的语气输出，不要编造数据。"
            )
        user = f"查询需求：{query or '查看全部运营数据'}\n报告类型：{style or '日报'}\n"
        if vault_data:
            user += f"\n以下是 Obsidian 知识库中存储的真实运营数据：\n\n{vault_data[:15000]}"
        content = await _run_agent(system, user, 0.5)
        return _section("数据看板", content)

    async def run_smart_report():
        if not agents.get("smartReport", True):
            return None
        if vault_data:
            system = (
                "你是一位短视频运营智能报告生成专家。下面提供了 Obsidian 知识库中存储的真实运营数据。"
                "请根据真实数据生成一份结构化智能运营报告，包含：\n"
                "1. 数据汇总——已生成报告总数、覆盖赛道数、对标账号总数\n"
                "2. 运营健康度评分——基于数据完整度、赛道覆盖度、策略丰富度给出评分（满分100）\n"
                "3. 策略亮点——从各报告中提取最有价值的2-3条跨赛道通用策略\n"
                "4. 改进建议——基于数据分析结果，给出3条具体的下一步行动建议\n\n"
                "重要：所有数据和结论必须基于提供的真实 Obsidian 数据。"
            )
        else:
            system = (
                "你是一位短视频运营智能报告生成专家。当前 Obsidian 知识库中暂无历史分析数据。"
                "请告知用户当前数据为空，建议先去「账号定位分析」页面生成第一份报告，启动数据积累。"
            )
        user = f"查询需求：{query or '生成运营报告'}\n报告类型：{style or '周报'}\n"
        if vault_data:
            user += f"\n以下是 Obsidian 知识库中存储的真实运营数据：\n\n{vault_data[:15000]}"
        content = await _run_agent(system, user, 0.5)
        return _section("智能报告", content)

    async def run_assistant():
        if not agents.get("assistant", True):
            return None
        prompt_parts = []
        prompt_parts.append("你是一位专业的短视频运营助理。")
        if vault_data:
            prompt_parts.append("请根据以下 Obsidian 知识库中的真实运营数据，给出运营建议和执行计划。")
            prompt_parts.append("")
            prompt_parts.append(f"查询需求：{query or '今日运营建议'}")
            prompt_parts.append(f"报告类型：{style or '日报'}")
            prompt_parts.append("")
            prompt_parts.append("=== 运营数据 ===")
            prompt_parts.append(vault_data[:12000])
        else:
            prompt_parts.append("当前知识库中暂无历史数据。请友好地告知用户，并建议从「账号定位分析」开始积累数据。")
            prompt_parts.append("")
            prompt_parts.append(f"查询需求：{query or '今日运营建议'}")
        prompt_parts.append("")
        prompt_parts.append("请输出：")
        prompt_parts.append("1. 运营助理建议——基于数据给出具体可执行的建议")
        prompt_parts.append("2. 执行计划——制定今日/本周具体任务清单")
        prompt_parts.append("用 Markdown 格式输出。")
        full_prompt = "\n".join(prompt_parts)
        claude_bin = os.path.expanduser("~/.local/bin/claude")
        try:
            result = await asyncio.to_thread(
                subprocess.run,
                [claude_bin, "-p", "--output-format=text", full_prompt],
                capture_output=True,
                text=True,
                timeout=300,
                cwd="/Users/sevik/Desktop/video",
                env={
                    **os.environ,
                    "PATH": os.environ.get("PATH", "") + ":" + os.path.expanduser("~/.local/bin"),
                    "CLAUDE_CODE_SIMPLE": "1",
                },
            )
            if result.returncode == 0 and result.stdout.strip():
                content = result.stdout.strip()
            else:
                error_detail = result.stderr.strip() or "未知错误"
                content = f"Claude Code 调用失败（退出码 {result.returncode}）：{error_detail}"
        except subprocess.TimeoutExpired:
            content = "Claude Code 调用超时（300秒），请稍后重试。"
        except FileNotFoundError:
            content = f"未找到 Claude Code CLI，请确认已安装：{claude_bin}"
        except Exception as e:
            content = f"调用 Claude Code 时出错：{str(e)}"
        return _section("运营助理建议", content)

    results = await asyncio.gather(run_dashboard(), run_smart_report(), run_assistant())
    for r in results:
        if r is not None:
            sections.append(r)

    return {"sections": sections}


async def run_resource(inputs: dict, agents: dict) -> dict:
    search = inputs.get("search", "")

    agent_prompts = {
        "videoLib": ("视频素材管理专家", "根据搜索关键词，推荐视频素材管理方案，包括分类标签、检索优化、素材推荐", "视频素材库"),
        "copyLib": ("文案资产管理专家", "根据搜索关键词，推荐文案资产管理方案，包括文案分类、模板复用、版本管理", "文案库"),
        "templateLib": ("模板管理专家", "根据搜索关键词，推荐片头片尾字幕条模板方案", "模板库"),
        "imageLib": ("图片素材管理专家", "根据搜索关键词，推荐图片素材管理方案，包括AI生图提示词、素材分类", "图片素材库"),
        "musicLib": ("音乐音效管理专家", "根据搜索关键词，推荐背景音乐和音效方案", "音乐音效库"),
    }

    sections = await _run_parallel_agents(
        agent_prompts,
        f"搜索关键词：{search}\n请推荐资源。",
        agents,
    )

    return {"sections": sections}


async def run_channel_task(inputs: dict, agents: dict) -> dict:
    task_name = inputs.get("taskName", "")
    task_desc = inputs.get("taskDesc", "")
    platforms = inputs.get("platforms", [])
    period = inputs.get("period", "today")
    context = inputs.get("context", [])

    from datetime import datetime, timedelta
    today = datetime.now()
    period_map = {
        "today": (f"{today.strftime('%Y年%m月%d日')}", "今日"),
        "week": (f"{(today - timedelta(days=today.weekday())).strftime('%Y年%m月%d日')} ~ {today.strftime('%Y年%m月%d日')}", "本周"),
        "month": (f"{today.strftime('%Y年%m月')}", "本月"),
    }
    period_text, period_label = period_map.get(period, period_map["today"])

    platform_text = "、".join(platforms) if platforms else "全平台"
    context_text = "\n".join(f"- {c}" for c in context) if context else "无"

    base_user = (
        f"任务名称：{task_name}\n"
        f"任务描述：{task_desc}\n"
        f"运营平台：{platform_text}\n"
        f"时间范围：{period_text}\n"
        f"账号上下文：\n{context_text}"
    )

    sections = []
    tasks = []

    if agents.get("hotspot", True):
        system = (
            f"你是一位短视频热点追踪专家。请根据{period_label}日期和用户的行业信息，"
            f"生成{period_label}全网热点追踪报告。"
            "报告包括：热点榜单（附热度指数）、行业相关热点、热点解读与蹭热点角度、"
            "内容选题建议、最佳发布时机建议。"
            "请用 Markdown 格式输出，使用表格展示榜单。"
        )
        user = f"{base_user}\n请生成{period_label}热点追踪报告。"
        tasks.append(("hotspot", f"🔥 {period_label}热点追踪", _run_agent(system, user, 0.8)))

    agent_prompts = {
        "daily": (
            "日常任务规划专家",
            f"制定{period_label}日常任务方案，包括内容发布计划（含具体时间点）、互动维护策略、评论区运营话术",
            f"{period_label}日常任务方案",
        ),
        "special": (
            "专题任务策划专家",
            f"制定{period_label}专题任务方案，包括节日活动策划、热点追更计划、专题内容排期",
            f"{period_label}专题任务方案",
        ),
        "collab": (
            "合作任务策划专家",
            "制定合作任务方案，包括品牌合作流程、达人联动策略、跨平台互推方案",
            "合作任务方案",
        ),
        "conversion": (
            "转化任务专家",
            "制定转化任务方案，包括直播带货流程、私域引流策略、转化话术设计、促单节奏安排",
            "转化任务方案",
        ),
    }

    for key, (role, task, title) in agent_prompts.items():
        if agents.get(key, True):
            system = f"你是一位{role}。{task}。请用 Markdown 格式输出结构化方案，包含时间线。"
            user = f"{base_user}\n请生成任务方案。"
            tasks.append((key, title, _run_agent(system, user, 0.7)))

    if tasks:
        coros = [t[2] for t in tasks]
        results = await asyncio.gather(*coros, return_exceptions=True)
        for (key, title, _), result in zip(tasks, results):
            if isinstance(result, Exception):
                sections.append(_section(title, f"分析失败：{str(result)}"))
            else:
                sections.append(_section(title, result))

    return {"sections": sections}
