"""Secure evidence access via backend-controlled signed URLs."""

from __future__ import annotations

import os
from typing import Any

from fastapi import HTTPException

from app.database.supabase_client import supabase

EVIDENCE_BUCKET = os.getenv("EVIDENCE_BUCKET", "evidence")
SIGNED_URL_EXPIRY = int(os.getenv("EVIDENCE_SIGNED_URL_EXPIRY", "300"))


def list_evidence_for_case(case_id: str) -> list[dict[str, Any]]:
    res = (
        supabase.table("evidence_items")
        .select(
            "id, case_id, evidence_type, mime_type, original_filename, "
            "encryption_algorithm, encryption_version, content_hash, "
            "chain_index, upload_status, captured_at, uploaded_at, created_at, storage_path"
        )
        .eq("case_id", case_id)
        .order("created_at")
        .execute()
    )
    items = []
    for row in res.data or []:
        item = {k: v for k, v in row.items() if k != "storage_path"}
        item["preview_available"] = _can_preview(row)
        items.append(item)
    return items


def _can_preview(row: dict) -> bool:
    if row.get("encryption_algorithm"):
        return False
    if row.get("upload_status") not in (None, "UPLOADED", "COMPLETE", "uploaded"):
        return False
    return bool(row.get("storage_path"))


def get_evidence_access(evidence_id: str, case_id: str) -> dict[str, Any]:
    res = (
        supabase.table("evidence_items")
        .select("*")
        .eq("id", evidence_id)
        .eq("case_id", case_id)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Evidence not found")

    row = res.data[0]
    if row.get("encryption_algorithm"):
        return {
            "id": row["id"],
            "evidence_type": row["evidence_type"],
            "preview_available": False,
            "message": "Evidence is encrypted and cannot be previewed through the portal.",
        }

    storage_path = row.get("storage_path")
    if not storage_path:
        raise HTTPException(status_code=404, detail="Evidence storage path unavailable")

    try:
        signed = supabase.storage.from_(EVIDENCE_BUCKET).create_signed_url(
            storage_path, SIGNED_URL_EXPIRY
        )
        url = signed.get("signedURL") or signed.get("signedUrl")
        if not url:
            raise HTTPException(
                status_code=503,
                detail="Evidence preview is unavailable. Storage bucket may not be configured.",
            )
        return {
            "id": row["id"],
            "evidence_type": row["evidence_type"],
            "mime_type": row.get("mime_type"),
            "preview_available": True,
            "signed_url": url,
            "expires_in": SIGNED_URL_EXPIRY,
        }
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Evidence preview is unavailable. Verify Supabase Storage bucket configuration.",
        )
