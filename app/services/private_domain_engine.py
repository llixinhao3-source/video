import copy
import json
import logging
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

from app.config import settings
from app.services.llm import _get_text_client
from app.services.private_domain_prompts import (
    DYNAMIC_EXPERT_CHAIN_CONFIG,
    get_expert,
    get_file_chain,
)

logger = logging.getLogger(__name__)


class PrivateDomainEngine:
    def __init__(self, base_vault_path: str = ""):
        self.base_vault_path = base_vault_path or settings.obsidian_vault_path or "./obsidian_vault"

    def get_project_dir(self, project_id: str) -> str:
        path = os.path.join(self.base_vault_path, f"project_{project_id}")
        os.makedirs(path, exist_ok=True)
        return path

    def _pd_dir(self, project_id: str) -> Path:
        d = Path(self.base_vault_path) / f"project_{project_id}" / "_private_domain"
        d.mkdir(parents=True, exist_ok=True)
        return d

    def read_obsidian_file(self, project_id: str, file_name: str) -> str:
        file_path = os.path.join(self.get_project_dir(project_id), file_name)
        if not os.path.exists(file_path):
            return ""
        return Path(file_path).read_text(encoding="utf-8")

    def write_obsidian_file(self, project_id: str, file_name: str, content: str) -> str:
        file_path = os.path.join(self.get_project_dir(project_id), file_name)
        Path(file_path).write_text(content, encoding="utf-8")
        logger.info("Private domain file written: %s | %s", project_id, file_name)
        return file_path

    # ── asset persistence ──

    def _expert_json_path(self, project_id: str, expert_id: str) -> Path:
        return self._pd_dir(project_id) / f"{expert_id}.json"

    def _read_expert_store(self, project_id: str, expert_id: str) -> dict:
        p = self._expert_json_path(project_id, expert_id)
        if p.exists():
            try:
                raw = p.read_text("utf-8")
                return json.loads(raw) if raw.strip() else {}
            except (json.JSONDecodeError, OSError):
                logger.exception("Failed to read %s", p)
        return {}

    def _write_expert_store(self, project_id: str, expert_id: str, data: dict) -> None:
        p = self._expert_json_path(project_id, expert_id)
        p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    def get_merged_config(self, project_id: str, expert_id: str) -> dict:
        base = get_expert(expert_id)
        if not base:
            return {}
        store = self._read_expert_store(project_id, expert_id)
        merged = copy.deepcopy(base)
        if "form_schema" in store:
            merged["form_schema"] = store["form_schema"]
        if "asset_center_schema" in store:
            if "table_columns" in store["asset_center_schema"]:
                merged["asset_center_schema"]["table_columns"] = store["asset_center_schema"]["table_columns"]
            if "data_records" in store["asset_center_schema"]:
                merged["asset_center_schema"]["data_records"] = store["asset_center_schema"]["data_records"]
        return merged

    # ── form field CRUD ──

    def add_form_field(self, project_id: str, expert_id: str, field: dict) -> dict:
        store = self._read_expert_store(project_id, expert_id)
        base = get_expert(expert_id)
        fields = store.get("form_schema", {}).get("fields", copy.deepcopy(base["form_schema"]["fields"]))
        if "form_schema" not in store:
            store["form_schema"] = {"fields": fields}
        else:
            store["form_schema"]["fields"] = fields
        field.setdefault("required", False)
        fields.append(field)
        self._write_expert_store(project_id, expert_id, store)
        return field

    def update_form_field(self, project_id: str, expert_id: str, field_id: str, updates: dict) -> dict | None:
        store = self._read_expert_store(project_id, expert_id)
        base = get_expert(expert_id)
        fields = store.get("form_schema", {}).get("fields", copy.deepcopy(base["form_schema"]["fields"]))
        if "form_schema" not in store:
            store["form_schema"] = {"fields": fields}
        else:
            store["form_schema"]["fields"] = fields
        for f in fields:
            if f.get("field_id") == field_id:
                f.update(updates)
                self._write_expert_store(project_id, expert_id, store)
                return f
        return None

    def delete_form_field(self, project_id: str, expert_id: str, field_id: str) -> bool:
        store = self._read_expert_store(project_id, expert_id)
        base = get_expert(expert_id)
        fields = store.get("form_schema", {}).get("fields", copy.deepcopy(base["form_schema"]["fields"]))
        if "form_schema" not in store:
            store["form_schema"] = {"fields": fields}
        else:
            store["form_schema"]["fields"] = fields
        before = len(fields)
        fields[:] = [f for f in fields if f.get("field_id") != field_id]
        self._write_expert_store(project_id, expert_id, store)
        return len(fields) < before

    # ── table column CRUD ──

    def add_table_column(self, project_id: str, expert_id: str, column: dict) -> dict:
        store = self._read_expert_store(project_id, expert_id)
        base = get_expert(expert_id)
        cols = store.get("asset_center_schema", {}).get(
            "table_columns", copy.deepcopy(base["asset_center_schema"]["table_columns"])
        )
        if "asset_center_schema" not in store:
            store["asset_center_schema"] = {"table_columns": cols}
        else:
            store["asset_center_schema"]["table_columns"] = cols
        column.setdefault("required", False)
        column.setdefault("editable", True)
        cols.append(column)
        self._write_expert_store(project_id, expert_id, store)
        return column

    def update_table_column(self, project_id: str, expert_id: str, column_id: str, updates: dict) -> dict | None:
        store = self._read_expert_store(project_id, expert_id)
        base = get_expert(expert_id)
        cols = store.get("asset_center_schema", {}).get(
            "table_columns", copy.deepcopy(base["asset_center_schema"]["table_columns"])
        )
        if "asset_center_schema" not in store:
            store["asset_center_schema"] = {"table_columns": cols}
        else:
            store["asset_center_schema"]["table_columns"] = cols
        for c in cols:
            if c.get("column_id") == column_id:
                c.update(updates)
                self._write_expert_store(project_id, expert_id, store)
                return c
        return None

    def delete_table_column(self, project_id: str, expert_id: str, column_id: str) -> bool:
        store = self._read_expert_store(project_id, expert_id)
        base = get_expert(expert_id)
        cols = store.get("asset_center_schema", {}).get(
            "table_columns", copy.deepcopy(base["asset_center_schema"]["table_columns"])
        )
        if "asset_center_schema" not in store:
            store["asset_center_schema"] = {"table_columns": cols}
        else:
            store["asset_center_schema"]["table_columns"] = cols
        before = len(cols)
        cols[:] = [c for c in cols if c.get("column_id") != column_id]
        recs = store.get("asset_center_schema", {}).get(
            "data_records", copy.deepcopy(base["asset_center_schema"]["data_records"])
        )
        if "data_records" not in store.get("asset_center_schema", {}):
            store["asset_center_schema"]["data_records"] = recs
        for r in recs:
            r.pop(column_id, None)
        self._write_expert_store(project_id, expert_id, store)
        return len(cols) < before

    # ── data record CRUD ──

    def list_records(self, project_id: str, expert_id: str) -> list[dict]:
        merged = self.get_merged_config(project_id, expert_id)
        return merged.get("asset_center_schema", {}).get("data_records", [])

    def create_record(self, project_id: str, expert_id: str, record: dict) -> dict:
        store = self._read_expert_store(project_id, expert_id)
        base = get_expert(expert_id)
        recs = store.get("asset_center_schema", {}).get(
            "data_records", copy.deepcopy(base["asset_center_schema"]["data_records"])
        )
        if "asset_center_schema" not in store:
            store["asset_center_schema"] = {"data_records": recs}
        elif "data_records" not in store["asset_center_schema"]:
            store["asset_center_schema"]["data_records"] = recs
        record["id"] = f"rec_{uuid.uuid4().hex[:8]}"
        recs.append(record)
        self._write_expert_store(project_id, expert_id, store)
        return record

    def update_record(self, project_id: str, expert_id: str, record_id: str, updates: dict) -> dict | None:
        store = self._read_expert_store(project_id, expert_id)
        base = get_expert(expert_id)
        recs = store.get("asset_center_schema", {}).get(
            "data_records", copy.deepcopy(base["asset_center_schema"]["data_records"])
        )
        if "asset_center_schema" not in store:
            store["asset_center_schema"] = {"data_records": recs}
        elif "data_records" not in store["asset_center_schema"]:
            store["asset_center_schema"]["data_records"] = recs
        for r in recs:
            if r.get("id") == record_id:
                updates.pop("id", None)
                r.update(updates)
                self._write_expert_store(project_id, expert_id, store)
                return r
        return None

    def delete_record(self, project_id: str, expert_id: str, record_id: str) -> bool:
        store = self._read_expert_store(project_id, expert_id)
        base = get_expert(expert_id)
        recs = store.get("asset_center_schema", {}).get(
            "data_records", copy.deepcopy(base["asset_center_schema"]["data_records"])
        )
        if "asset_center_schema" not in store:
            store["asset_center_schema"] = {"data_records": recs}
        elif "data_records" not in store["asset_center_schema"]:
            store["asset_center_schema"]["data_records"] = recs
        before = len(recs)
        recs[:] = [r for r in recs if r.get("id") != record_id]
        self._write_expert_store(project_id, expert_id, store)
        return len(recs) < before

    # ── expert execution ──

    async def run_expert(
        self,
        project_id: str,
        agent_key: str,
        user_custom_instruction: str = "",
        domain_params: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        expert = get_expert(agent_key)
        if not expert:
            raise ValueError(f"Unknown agent_key: {agent_key}")

        system_prompt = expert["system_prompt"]
        src_file, tgt_file = get_file_chain(agent_key)
        source_content = self.read_obsidian_file(project_id, src_file)

        dp = domain_params or {}
        form_schema = expert.get("form_schema", {})
        fields = form_schema.get("fields", [])

        form_data_parts: list[str] = []
        for f in fields:
            fid = f["field_id"]
            val = dp.get(fid, "")
            if not val and f.get("options"):
                val = f["options"][0]
            form_data_parts.append(f"{f['label']}: {val}")
        form_data_str = "\n".join(form_data_parts)

        records = self.list_records(project_id, agent_key)
        columns = expert.get("asset_center_schema", {}).get("table_columns", [])
        if records and columns:
            header = " | ".join(c["title"] for c in columns)
            sep = " | ".join("---" for _ in columns)
            rows = []
            for r in records:
                cells = []
                for c in columns:
                    cells.append(str(r.get(c["column_id"], "")))
                rows.append(" | ".join(cells))
            asset_records_str = f"{header}\n{sep}\n" + "\n".join(rows)
        else:
            asset_records_str = "（暂无资产记录）"

        final_system_prompt = system_prompt.replace("{form_data}", form_data_str).replace("{asset_records}", asset_records_str)

        prompt_parts: list[str] = []
        if source_content:
            prompt_parts.append(f"以下是待处理的素材内容（来自 '{src_file}'）：\n\n{source_content}")
        remark_val = ""
        for f in fields:
            if f["type"] == "Textarea":
                remark_val = dp.get(f["field_id"], user_custom_instruction)
                if remark_val:
                    break
        if not remark_val:
            remark_val = user_custom_instruction
        if remark_val:
            prompt_parts.append(f"\n用户运营批注 / 补充指令：\n{remark_val}")
        if not prompt_parts:
            prompt_parts.append("请根据你的专业能力完成此次处理。")
        combined_input = "\n\n".join(prompt_parts)

        client = _get_text_client()
        try:
            response = await client.chat.completions.create(
                model=settings.deepseek_model,
                messages=[
                    {"role": "system", "content": final_system_prompt},
                    {"role": "user", "content": combined_input},
                ],
                temperature=0.7,
            )
            result_text = response.choices[0].message.content or ""
        except Exception:
            logger.exception("DeepSeek call failed for private domain agent %s", agent_key)
            raise

        self.write_obsidian_file(project_id, tgt_file, result_text)

        logger.info("Private domain expert %s executed: %s → %s | project=%s",
                     agent_key, src_file, tgt_file, project_id)

        return {
            "agent_key": agent_key,
            "source_file": src_file,
            "target_file": tgt_file,
            "output": result_text,
            "usage": response.usage.model_dump() if response.usage else {},
        }


engine = PrivateDomainEngine()
