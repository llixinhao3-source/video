import json
import httpx
from api.config import settings

_token_cache: dict = {"token": "", "expires": 0}


async def _get_tenant_token() -> str:
    if not settings.FEISHU_APP_ID or settings.FEISHU_APP_ID.startswith("your_"):
        return ""

    if _token_cache["token"] and _token_cache["expires"] > __import__("time").time():
        return _token_cache["token"]

    url = f"{settings.FEISHU_BASE_URL}/auth/v3/tenant_access_token/internal"
    payload = {
        "app_id": settings.FEISHU_APP_ID,
        "app_secret": settings.FEISHU_APP_SECRET,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(url, json=payload)
        data = resp.json()

    if data.get("code") != 0:
        return ""

    _token_cache["token"] = data["tenant_access_token"]
    _token_cache["expires"] = __import__("time").time() + data.get("expire", 7200) - 300
    return _token_cache["token"]


async def sync_to_feishu(positioning_result: dict, app_token: str = "", table_id: str = "") -> bool:
    token = await _get_tenant_token()
    if not token:
        return False

    if not app_token or not table_id:
        return False

    keywords = positioning_result.get("keywords", "")
    enterprise = positioning_result.get("enterprise_project", {})
    persona = positioning_result.get("persona_archivist", {})
    product = positioning_result.get("product_profiler", {})

    fields = {
        "关键词": keywords,
        "品牌核心价值": enterprise.get("brand_core_value", ""),
        "企业目标": enterprise.get("company_goals", ""),
        "业务范围": enterprise.get("business_scope", ""),
        "目标市场": enterprise.get("target_market", ""),
        "人设特征": persona.get("persona_features", ""),
        "语言风格": persona.get("language_style", ""),
        "视觉形象": persona.get("visual_identity", ""),
        "情感连接": persona.get("emotional_connection", ""),
        "核心卖点": json.dumps(product.get("core_selling_points", []), ensure_ascii=False),
        "使用场景": json.dumps(product.get("usage_scenarios", []), ensure_ascii=False),
        "差异化优势": product.get("differentiation_advantages", ""),
        "需求匹配": product.get("user_demand_matching", ""),
    }

    url = f"{settings.FEISHU_BASE_URL}/bitable/v1/apps/{app_token}/tables/{table_id}/records"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    payload = {"fields": fields}

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(url, headers=headers, json=payload)
        data = resp.json()

    return data.get("code") == 0
