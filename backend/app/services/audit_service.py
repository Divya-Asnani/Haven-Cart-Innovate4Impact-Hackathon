"""Append-only audit logging for responder actions."""

from __future__ import annotations

from typing import Any

from app.database.supabase_client import supabase


def write_audit_log(
    *,
    case_id: str | None,
    actor_id: str,
    action: str,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    """Create an audit log entry. Never stores secrets or evidence content."""
    safe_metadata = metadata or {}
    forbidden_keys = {"password", "token", "jwt", "secret", "key", "content", "encryption_key"}
    cleaned = {
        k: v
        for k, v in safe_metadata.items()
        if k.lower() not in forbidden_keys
    }

    row = {
        "case_id": case_id,
        "actor_id": actor_id,
        "action": action,
        "metadata": cleaned,
    }
    res = supabase.table("audit_logs").insert(row).execute()
    return res.data[0] if res.data else None
