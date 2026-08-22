"""Role-based access control for responder portal."""

from __future__ import annotations

from typing import Any

ResponderRole = str  # ADMIN | NGO | MEDICAL | AUTHORITY

# Valid case status transitions
STATUS_TRANSITIONS: dict[str, set[str]] = {
    "OPEN": {"IN_PROGRESS", "ESCALATED"},
    "ESCALATED": {"IN_PROGRESS"},
    "IN_PROGRESS": {"RESOLVED"},
    "RESOLVED": {"CLOSED"},
    "CLOSED": set(),
}

ROLES_WITH_GLOBAL_AUDIT = {"ADMIN"}
ROLES_WITH_LOCATION = {"ADMIN", "NGO", "AUTHORITY"}
ROLES_WITH_EVIDENCE = {"ADMIN", "NGO", "AUTHORITY"}
ROLES_WITH_FULL_ASSESSMENT = {"ADMIN", "NGO", "MEDICAL", "AUTHORITY"}
ROLES_WITH_STATUS_CHANGE = {"ADMIN", "NGO", "AUTHORITY"}
ROLES_WITH_CASE_ACTIONS = {"ADMIN", "NGO", "AUTHORITY"}


def is_responder_role(role: str | None) -> bool:
    return role in {"ADMIN", "NGO", "MEDICAL", "AUTHORITY"}


def can_access_audit_list(role: str) -> bool:
    return role in ROLES_WITH_GLOBAL_AUDIT | {"AUTHORITY"}


def can_view_location(role: str) -> bool:
    return role in ROLES_WITH_LOCATION


def can_view_evidence(role: str) -> bool:
    return role in ROLES_WITH_EVIDENCE


def can_change_status(role: str) -> bool:
    return role in ROLES_WITH_STATUS_CHANGE


def can_perform_case_actions(role: str) -> bool:
    return role in ROLES_WITH_CASE_ACTIONS


def is_valid_transition(current: str, target: str) -> bool:
    return target in STATUS_TRANSITIONS.get(current, set())


def case_visible_to_role(case: dict[str, Any], role: str, medical_required: bool) -> bool:
    """Determine if a responder role may access this case."""
    if role == "ADMIN":
        return True
    if role == "NGO":
        return True
    if role == "MEDICAL":
        return medical_required
    if role == "AUTHORITY":
        risk = case.get("risk_level")
        status = case.get("case_status")
        return risk == "HIGH" or status == "ESCALATED"
    return False


def filter_case_for_role(case: dict[str, Any], role: str, medical_required: bool) -> dict[str, Any]:
    """Strip fields the role is not authorized to see."""
    result = dict(case)
    if not can_view_location(role):
        result.pop("latitude", None)
        result.pop("longitude", None)
        result.pop("location_accuracy_m", None)
    if role == "MEDICAL":
        # Medical role sees case shell + medical flag; hide user PII if present
        result.pop("user_id", None)
    return result
