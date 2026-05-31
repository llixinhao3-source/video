import logging
from datetime import datetime
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class FeishuService:
    def __init__(self):
        self._tenant_token: str = ""
        self._token_expires_at: float = 0
        self._base_url = settings.feishu_base_url

    async def _get_tenant_access_token(self) -> str:
        url = f"{self._base_url}/auth/v3/tenant_access_token/internal"
        payload = {
            "app_id": settings.feishu_app_id,
            "app_secret": settings.feishu_app_secret,
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()

        if data.get("code") != 0:
            logger.error("Failed to get tenant_access_token: %s", data)
            raise RuntimeError(f"Feishu auth failed: {data.get('msg')}")

        self._tenant_token = data["tenant_access_token"]
        self._token_expires_at = data.get("expire", 0)
        logger.info("Feishu tenant_access_token refreshed, expires in %s", self._token_expires_at)
        return self._tenant_token

    async def _ensure_token(self) -> str:
        if not self._tenant_token:
            return await self._get_tenant_access_token()
        return self._tenant_token

    async def add_record_to_base(
        self,
        app_token: str,
        table_id: str,
        data: dict[str, Any],
    ) -> dict:
        token = await self._ensure_token()
        url = f"{self._base_url}/bitable/v1/apps/{app_token}/tables/{table_id}/records"

        fields: dict[str, Any] = {
            "标题": data.get("title", ""),
            "文案": data.get("script", ""),
            "风控结果": data.get("risk_result", ""),
            "生成时间": data.get("created_at", datetime.now().isoformat()),
        }

        payload = {"fields": fields}

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            result = resp.json()

        if result.get("code") != 0:
            logger.error("Failed to add record to Feishu Base: %s", result)
            raise RuntimeError(f"Feishu add_record failed: {result.get('msg')}")

        logger.info("Record added to Feishu Base app=%s table=%s", app_token, table_id)
        return result.get("data", {})


feishu_service = FeishuService()
