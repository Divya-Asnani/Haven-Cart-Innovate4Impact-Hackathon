"""Safety case helpers — medical flag, formatting, authorization checks."""

from __future__ import annotations

from typing import Any

from app.database.supabase_client import supabase
from app.services.rbac import case_visible_to_role


def format_case_id(case_uuid: str) -> str:
    short = case_uuid.replace("-", "")[:4].upper()
    return f"SV-{short}"


def get_medical_required(assessment_id: str | None) -> bool:
    if not assessment_id:
        return False
    res = (
        supabase.table("safety_assessment_answers")
        .select("answer_value")
        .eq("assessment_id", assessment_id)
        .eq("question_key", "medical_help")
        .limit(1)
        .execute()
    )
    if not res.data:
        return False
    return bool(res.data[0].get("answer_value"))


def get_medical_flags_for_cases(cases: list[dict]) -> dict[str, bool]:
    """Batch lookup medical_help for multiple cases."""
    assessment_ids = [c["assessment_id"] for c in cases if c.get("assessment_id")]
    if not assessment_ids:
        return {}

    res = (
        supabase.table("safety_assessment_answers")
        .select("assessment_id, answer_value")
        .in_("assessment_id", assessment_ids)
        .eq("question_key", "medical_help")
        .execute()
    )
    flags: dict[str, bool] = {}
    for row in res.data or []:
        flags[row["assessment_id"]] = bool(row.get("answer_value"))
    return flags


def enrich_case_row(case: dict, medical_required: bool | None = None) -> dict[str, Any]:
    med = medical_required if medical_required is not None else get_medical_required(
        case.get("assessment_id")
    )
    return {
        **case,
        "display_id": format_case_id(case["id"]),
        "medical_required": med,
    }


def fetch_case_or_404(case_id: str) -> dict:
    res = supabase.table("safety_cases").select("*").eq("id", case_id).limit(1).execute()
    if not res.data:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Case not found")
    return res.data[0]


def authorize_case_access(case: dict, role: str) -> None:
    from fastapi import HTTPException

    medical = get_medical_required(case.get("assessment_id"))
    if not case_visible_to_role(case, role, medical):
        raise HTTPException(status_code=403, detail="You do not have permission to view this case")


QUESTION_LABELS = {
    "safe_now": "Are you safe now?",
    "perpetrator_present": "Is another person involved/present?",
    "can_leave_safely": "Can you leave safely?",
    "medical_help": "Is medical help required?",
    "contact_requested": "Is contact/support requested?",
}
