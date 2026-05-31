import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from api.services.llm import chat
from api.services.prompts import get_prompt, parse_json_response
from api.services.obsidian import write_to_obsidian
from api.services.feishu import sync_to_feishu

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/positioning", tags=["positioning"])


class PositioningRequest(BaseModel):
    keywords: str = Field("", description="品牌/产品/行业关键词")
    mode: str = Field("keyword", description="分析模式: keyword=行业关键词, account=账号分析")
    platform: str = Field("小红书", description="目标平台")
    own_account: str = Field("", description="自有账号名称（account模式必填）")
    competitor_account: str = Field("", description="对标账号名称（account模式可选）")
    keyword: str = Field("", description="行业关键词（keyword模式必填）")
    feishu_app_token: str = Field("", description="飞书多维表格 App Token（可选）")
    feishu_table_id: str = Field("", description="飞书多维表格 Table ID（可选）")


class PositioningStepResult(BaseModel):
    raw: str
    parsed: dict | None = None
    error: str | None = None


async def _call_step(step_name: str, prompt_key: str, user_message: str) -> PositioningStepResult:
    try:
        system_prompt = get_prompt(prompt_key)
        if not system_prompt:
            return PositioningStepResult(raw="", error=f"提示词 {prompt_key} 不存在")

        raw = chat(system_prompt, user_message, temperature=0.7)
        parsed = parse_json_response(raw)

        if parsed is None:
            logger.warning(f"{step_name}: LLM 返回内容无法解析为 JSON，使用原始文本")
            return PositioningStepResult(raw=raw, parsed=None, error="JSON 解析失败")

        return PositioningStepResult(raw=raw, parsed=parsed)

    except Exception as e:
        logger.error(f"{step_name} 执行失败: {e}")
        return PositioningStepResult(raw="", error=str(e))


async def _run_keyword_mode(keyword: str, platform: str) -> dict:
    user_msg = f"行业关键词：{keyword}\n目标平台：{platform}"

    step1 = await _call_step(
        step_name="赛道分析",
        prompt_key="keyword_enterprise_project",
        user_message=user_msg,
    )
    if step1.error and not step1.raw:
        raise HTTPException(status_code=500, detail=f"赛道分析生成失败: {step1.error}")

    enterprise_data = step1.parsed or {"raw_response": step1.raw}

    enterprise_context = ""
    if step1.parsed:
        enterprise_context = "\n".join(f"{k}：{v}" for k, v in step1.parsed.items())
    else:
        enterprise_context = step1.raw

    step2 = await _call_step(
        step_name="人设档案",
        prompt_key="keyword_persona_archivist",
        user_message=(
            f"行业关键词：{keyword}\n"
            f"目标平台：{platform}\n"
            f"赛道分析结果：\n{enterprise_context}"
        ),
    )
    if step2.error and not step2.raw:
        logger.warning(f"人设档案生成失败: {step2.error}")

    persona_data = step2.parsed or {"raw_response": step2.raw or "生成失败"}

    persona_context = ""
    if step2.parsed:
        persona_context = "\n".join(f"{k}：{v}" for k, v in step2.parsed.items())
    else:
        persona_context = step2.raw or ""

    step3 = await _call_step(
        step_name="内容策略",
        prompt_key="keyword_product_profiler",
        user_message=(
            f"行业关键词：{keyword}\n"
            f"目标平台：{platform}\n"
            f"赛道分析结果：\n{enterprise_context}\n"
            f"人设档案结果：\n{persona_context}"
        ),
    )
    if step3.error and not step3.raw:
        logger.warning(f"内容策略生成失败: {step3.error}")

    product_data = step3.parsed or {"raw_response": step3.raw or "生成失败"}

    return {
        "keywords": keyword,
        "enterprise_project": enterprise_data,
        "persona_archivist": persona_data,
        "product_profiler": product_data,
    }


async def _run_account_mode(own_account: str, platform: str) -> dict:
    user_msg = f"账号名称：{own_account}\n目标平台：{platform}\n请分析该账号定位，推荐对标账号并分析优缺点，给出一步步实操指导"

    step1 = await _call_step(
        step_name="赛道分析",
        prompt_key="keyword_enterprise_project",
        user_message=user_msg,
    )
    if step1.error and not step1.raw:
        raise HTTPException(status_code=500, detail=f"赛道分析生成失败: {step1.error}")

    enterprise_data = step1.parsed or {"raw_response": step1.raw}

    enterprise_context = ""
    if step1.parsed:
        enterprise_context = "\n".join(f"{k}：{v}" for k, v in step1.parsed.items())
    else:
        enterprise_context = step1.raw

    step2 = await _call_step(
        step_name="人设方案",
        prompt_key="keyword_persona_archivist",
        user_message=(
            f"账号名称：{own_account}\n"
            f"目标平台：{platform}\n"
            f"赛道分析结果：\n{enterprise_context}"
        ),
    )
    if step2.error and not step2.raw:
        logger.warning(f"人设方案生成失败: {step2.error}")

    persona_data = step2.parsed or {"raw_response": step2.raw or "生成失败"}

    persona_context = ""
    if step2.parsed:
        persona_context = "\n".join(f"{k}：{v}" for k, v in step2.parsed.items())
    else:
        persona_context = step2.raw or ""

    step3 = await _call_step(
        step_name="内容策略",
        prompt_key="keyword_product_profiler",
        user_message=(
            f"账号名称：{own_account}\n"
            f"目标平台：{platform}\n"
            f"赛道分析结果：\n{enterprise_context}\n"
            f"人设方案结果：\n{persona_context}"
        ),
    )
    if step3.error and not step3.raw:
        logger.warning(f"内容策略生成失败: {step3.error}")

    product_data = step3.parsed or {"raw_response": step3.raw or "生成失败"}

    return {
        "keywords": f"{own_account} {platform}",
        "enterprise_project": enterprise_data,
        "persona_archivist": persona_data,
        "product_profiler": product_data,
    }


@router.post("/analyze")
async def analyze_positioning(req: PositioningRequest):
    mode = req.mode or "keyword"

    if mode == "keyword":
        keyword = req.keyword.strip() or req.keywords.strip()
        if not keyword:
            raise HTTPException(status_code=400, detail="请输入行业关键词")
        platform = req.platform or "小红书"
        positioning_result = await _run_keyword_mode(keyword, platform)
    else:
        own_account = req.own_account.strip()
        if not own_account:
            raise HTTPException(status_code=400, detail="请输入自有账号名称")
        platform = req.platform or "小红书"
        positioning_result = await _run_account_mode(
            own_account, platform
        )

    obsidian_path = ""
    try:
        obsidian_path = await write_to_obsidian(positioning_result)
        logger.info(f"Obsidian 写入成功: {obsidian_path}")
    except Exception as e:
        logger.warning(f"Obsidian 写入失败: {e}")

    feishu_synced = False
    if req.feishu_app_token and req.feishu_table_id:
        try:
            feishu_synced = await sync_to_feishu(
                positioning_result,
                app_token=req.feishu_app_token,
                table_id=req.feishu_table_id,
            )
            logger.info(f"飞书同步结果: {feishu_synced}")
        except Exception as e:
            logger.warning(f"飞书同步失败: {e}")

    return {
        "success": True,
        "data": {
            **positioning_result,
            "obsidian_path": obsidian_path,
            "feishu_synced": feishu_synced,
        },
    }


class DeepCompareRequest(BaseModel):
    own_account: str = Field(..., description="自有账号名称或行业关键词")
    platform: str = Field("小红书", description="目标平台")
    benchmark_accounts: list = Field(..., description="选中的对标账号列表")
    niche_overview: str = Field("", description="赛道概况")


@router.post("/deep-compare")
async def deep_compare(req: DeepCompareRequest):
    if not req.own_account.strip():
        raise HTTPException(status_code=400, detail="请输入账号名称")
    if not req.benchmark_accounts:
        raise HTTPException(status_code=400, detail="请至少选择一个对标账号")

    accounts_desc = ""
    for i, acc in enumerate(req.benchmark_accounts):
        if isinstance(acc, dict):
            accounts_desc += f"\n对标账号{i+1}：{acc.get('name', '未知')} | 粉丝：{acc.get('followers', '未知')} | 内容风格：{acc.get('content_style', '未知')} | 优势：{acc.get('strengths', '未知')} | 劣势：{acc.get('weaknesses', '未知')}"
        else:
            accounts_desc += f"\n对标账号{i+1}：{acc}"

    user_msg = (
        f"自有账号/关键词：{req.own_account}\n"
        f"目标平台：{req.platform}\n"
    )
    if req.niche_overview:
        user_msg += f"赛道概况：{req.niche_overview}\n"
    user_msg += f"选中的对标账号：{accounts_desc}"

    system_prompt = get_prompt("deep_compare")
    if not system_prompt:
        raise HTTPException(status_code=500, detail="深度对比分析提示词不存在")

    try:
        raw = chat(system_prompt, user_msg, temperature=0.7)
        parsed = parse_json_response(raw)

        if parsed is None:
            parsed = {"raw_response": raw}

        return {
            "success": True,
            "data": parsed,
        }
    except Exception as e:
        logger.error(f"深度对比分析失败: {e}")
        raise HTTPException(status_code=500, detail=f"深度对比分析失败: {str(e)}")


class CategoryPositioningRequest(BaseModel):
    keyword: str = Field(..., description="品类关键词")


@router.post("/category")
async def category_positioning(req: CategoryPositioningRequest):
    if not req.keyword.strip():
        raise HTTPException(status_code=400, detail="请输入品类关键词")

    system_prompt = get_prompt("category_positioning")
    if not system_prompt:
        raise HTTPException(status_code=500, detail="品类定位分析提示词不存在")

    try:
        raw = chat(system_prompt, f"品类关键词：{req.keyword}", temperature=0.7)
        parsed = parse_json_response(raw)

        if parsed is None:
            parsed = {"raw_response": raw}

        return {
            "success": True,
            "data": parsed,
        }
    except Exception as e:
        logger.error(f"品类定位分析失败: {e}")
        raise HTTPException(status_code=500, detail=f"品类定位分析失败: {str(e)}")
