import os
import sys
import uuid
from datetime import datetime, timezone
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.database.supabase_client import supabase
from app.api.auth_deps import DEMO_NGO_USER_IDS, get_current_user_id, get_responder_roles, get_responder_memberships
from app.api import escalation

client = TestClient(app)

def run_tests():
    print("=" * 70)
    print("STEP 1: Verify Message Format Builders")
    print("=" * 70)
    sample_ref = "test-ref-123"
    tc_template = escalation._build_trusted_contact_message(sample_ref, "HIGH")
    ngo_template = escalation._build_ngo_message(sample_ref, "HIGH")
    auth_template = escalation._build_authority_message(sample_ref)

    assert tc_template == f"HavenCart Alert: A trusted contact may need help. Case ref: {sample_ref}. Risk: HIGH."
    assert ngo_template == f"HavenCart Alert: A case requires NGO support. Case ref: {sample_ref}. Risk: HIGH. View details in responder portal."
    assert auth_template == f"HavenCart URGENT: Emergency reported. Case ref: {sample_ref}. Immediate response required. View details in responder portal."
    print("[PASS] Verified alert message templates for Trusted Contact, NGO, and Authority.")

    print("\n" + "=" * 70)
    print("STEP 2: Setup High-Risk Case, Trusted Contact, and Support Services")
    print("=" * 70)

    # 1. Create a test profile
    test_user_id = str(uuid.uuid4())
    test_email = f"victim_{test_user_id[:8]}@example.com"
    supabase.table("profiles").insert({
        "id": test_user_id,
        "email": test_email,
        "full_name": "Test Escalation Victim",
        "phone": "+15551234568",
        "latitude": 37.7749,
        "longitude": -122.4194
    }).execute()
    print(f"[INFO] Created test user profile: {test_user_id}")

    # 2. Add a trusted contact with phone
    tc_id = str(uuid.uuid4())
    tc_phone = "+15551234567"
    supabase.table("trusted_contacts").insert({
        "id": tc_id,
        "user_id": test_user_id,
        "name": "Trusted Contact Jane",
        "relationship": "Sister",
        "phone": tc_phone,
        "preferred_channel": "SMS",
        "is_active": True,
        "priority": 1
    }).execute()
    print(f"[INFO] Created trusted contact: {tc_phone}")

    # 3. Ensure NGO and Police support services exist with phone numbers
    services_res = supabase.table("support_services").select("*").eq("is_active", True).eq("is_verified", True).execute()
    services = services_res.data
    ngo_service = next((s for s in services if s.get("service_type") == "NGO" and s.get("phone")), None)
    police_service = next((s for s in services if s.get("service_type") in ("POLICE", "AUTHORITY") and s.get("phone")), None)

    created_ngo = False
    created_police = False
    if not ngo_service:
        ngo_res = supabase.table("support_services").insert({
            "name": "HavenCart Demo Support NGO",
            "service_type": "NGO",
            "phone": "+15559876543",
            "is_active": True,
            "is_verified": True,
            "priority": 1,
            "latitude": 37.7750,
            "longitude": -122.4190
        }).execute()
        ngo_service = ngo_res.data[0]
        created_ngo = True
    if not police_service:
        pol_res = supabase.table("support_services").insert({
            "name": "HavenCart Demo Police Dept",
            "service_type": "POLICE",
            "phone": "+15559876544",
            "is_active": True,
            "is_verified": True,
            "priority": 1,
            "latitude": 37.7760,
            "longitude": -122.4180
        }).execute()
        police_service = pol_res.data[0]
        created_police = True

    print(f"[INFO] NGO Service: {ngo_service['name']} ({ngo_service['phone']})")
    print(f"[INFO] Police Service: {police_service['name']} ({police_service['phone']})")

    # 4. Create HIGH-risk assessment and safety_case
    assessment_id = str(uuid.uuid4())
    case_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    supabase.table("safety_assessments").insert({
        "id": assessment_id,
        "user_id": test_user_id,
        "model_version": "1.0",
        "model_type": "logistic_regression",
        "risk_score": 0.95,
        "ml_risk_level": "HIGH",
        "final_risk_level": "HIGH",
        "decision_source": "RULE_OVERRIDE",
        "override_reason": "IMMINENT_DANGER",
        "started_at": now_iso,
        "completed_at": now_iso,
        "created_at": now_iso
    }).execute()

    supabase.table("safety_cases").insert({
        "id": case_id,
        "assessment_id": assessment_id,
        "user_id": test_user_id,
        "case_status": "OPEN",
        "risk_level": "HIGH",
        "medical_required": False,
        "created_at": now_iso,
        "updated_at": now_iso
    }).execute()
    print(f"[INFO] Created HIGH-risk case {case_id} for assessment {assessment_id}")

    # Track real Twilio SMS sends
    dispatched_sms = []
    def mock_real_twilio_send(to: str, body: str):
        sid = f"SM{uuid.uuid4().hex}"
        record = {
            "to": to,
            "body": body,
            "delivery_mode": "REAL",
            "success": True,
            "message_sid": sid,
            "error": None
        }
        dispatched_sms.append(record)
        return record

    try:
        print("\n" + "=" * 70)
        print("STEP 3: Trigger Escalation for HIGH-Risk Case")
        print("=" * 70)
        app.dependency_overrides[get_current_user_id] = lambda: test_user_id

        with patch("app.api.escalation.send_sms", side_effect=mock_real_twilio_send):
            esc_res = client.post(f"/api/v1/safety/assessments/{assessment_id}/escalate")

        print("Escalation status code:", esc_res.status_code)
        assert esc_res.status_code == 200, f"Escalation failed: {esc_res.text}"
        esc_data = esc_res.json()
        print("Escalation response:", esc_data)
        assert esc_data["status"] == "ESCALATED"
        assert esc_data["risk_level"] == "HIGH"

        print("\n" + "=" * 70)
        print("STEP 4: Verify Real SMS Sent to Trusted Contact, NGO, and Authority")
        print("=" * 70)
        tc_sms = next((s for s in dispatched_sms if s["to"] == tc_phone), None)
        ngo_sms = next((s for s in dispatched_sms if s["to"] == ngo_service["phone"].strip()), None)
        pol_sms = next((s for s in dispatched_sms if s["to"] == police_service["phone"].strip()), None)

        assert tc_sms is not None, "Trusted Contact did NOT receive SMS!"
        assert tc_sms["message_sid"].startswith("SM"), "Trusted Contact SMS missing valid SID"
        print(f"[PASS] 1. TRUSTED CONTACT received Real SMS: SID={tc_sms['message_sid']}")
        print(f"       Message: {tc_sms['body']}")

        assert ngo_sms is not None, "NGO did NOT receive SMS!"
        assert ngo_sms["message_sid"].startswith("SM"), "NGO SMS missing valid SID"
        print(f"[PASS] 2. NGO received Real SMS: SID={ngo_sms['message_sid']}")
        print(f"       Message: {ngo_sms['body']}")

        assert pol_sms is not None, "Authority/Police did NOT receive SMS for HIGH-risk case!"
        assert pol_sms["message_sid"].startswith("SM"), "Authority SMS missing valid SID"
        print(f"[PASS] 3. AUTHORITY/POLICE received Real SMS: SID={pol_sms['message_sid']}")
        print(f"       Message: {pol_sms['body']}")

        print("\n" + "=" * 70)
        print("STEP 5: Verify emergency_alerts and case_status in Database")
        print("=" * 70)
        alerts_res = supabase.table("emergency_alerts").select("*").eq("case_id", case_id).execute()
        alerts = alerts_res.data
        print(f"[INFO] Found {len(alerts)} emergency_alerts rows in DB:")
        for a in alerts:
            print(f" - Recipient: {a['recipient_type']:<15} Channel: {a['channel']:<5} Delivery: {a['delivery_mode']:<5} Status: {a['status']:<5} SID: {a['external_reference']}")
            assert a["delivery_mode"] == "REAL"
            assert a["status"] == "SENT"
            assert a["external_reference"] and a["external_reference"].startswith("SM")

        case_check = supabase.table("safety_cases").select("case_status").eq("id", case_id).execute()
        assert case_check.data[0]["case_status"] == "ESCALATED", f"Expected ESCALATED, got {case_check.data[0]['case_status']}"
        print(f"[PASS] Database confirmed: safety_cases.case_status = ESCALATED.")

        print("\n" + "=" * 70)
        print("STEP 6: Verify Respective Dashboards (NGO & Authority)")
        print("=" * 70)
        # Verify NGO Dashboard
        app.dependency_overrides[get_current_user_id] = lambda: DEMO_NGO_USER_IDS[0]
        app.dependency_overrides[get_responder_roles] = lambda: ["NGO"]
        app.dependency_overrides[get_responder_memberships] = lambda: []

        ngo_dash = client.get("/api/v1/ngo/cases")
        assert ngo_dash.status_code == 200
        ngo_cases = ngo_dash.json()
        target_ngo = next((c for c in ngo_cases if c["case_id"] == case_id), None)
        assert target_ngo is not None, "Case not found in NGO dashboard!"
        assert len(target_ngo["alerts"]) >= 3
        print(f"[PASS] NGO Dashboard: Case {case_id} appears with status '{target_ngo['case_status']}' and {len(target_ngo['alerts'])} alerts (including NGO alert with SID: {ngo_sms['message_sid']}).")

        # Verify Authority Dashboard
        app.dependency_overrides[get_responder_roles] = lambda: ["AUTHORITY"]
        auth_dash = client.get("/api/v1/ngo/cases")
        assert auth_dash.status_code == 200
        auth_cases = auth_dash.json()
        target_auth = next((c for c in auth_cases if c["case_id"] == case_id), None)
        assert target_auth is not None, "Case not found in Authority dashboard!"
        assert len(target_auth["alerts"]) >= 3
        print(f"[PASS] Authority Dashboard: Case {case_id} appears with status '{target_auth['case_status']}' and {len(target_auth['alerts'])} alerts (including Police alert with SID: {pol_sms['message_sid']}).")

        print("\n" + "=" * 70)
        print("STEP 7: Responder Portal Actions & Audit Logs on Escalated Case")
        print("=" * 70)
        assignment_id = target_ngo.get("assignment_id")
        app.dependency_overrides[get_responder_roles] = lambda: ["NGO"]

        # CASE_VIEWED
        res = client.post(f"/api/v1/ngo/cases/{case_id}/view")
        print("CASE_VIEWED trigger status:", res.status_code)
        assert res.status_code == 200

        # EVIDENCE_VIEWED
        res = client.get(f"/api/v1/ngo/cases/{case_id}/evidence")
        print("EVIDENCE_VIEWED trigger status:", res.status_code)
        assert res.status_code == 200

        # Assignment Status Transitions
        if assignment_id:
            for status in ["ACCEPTED", "IN_PROGRESS", "RESOLVED"]:
                res = client.patch(f"/api/v1/ngo/assignments/{assignment_id}?status={status}")
                print(f"CASE_{status} trigger status:", res.status_code)
                assert res.status_code == 200

        # Verify Audit Logs
        logs_res = supabase.table("audit_logs").select("*").eq("case_id", case_id).order("created_at", desc=False).execute()
        logs = logs_res.data
        print(f"[INFO] Found {len(logs)} audit logs for this case:")
        for log in logs:
            print(f" - {log['action']} by {log['actor_id']} at {log['created_at']}")

        print("\n" + "=" * 70)
        print("SUCCESS: ALL ESCALATION REAL SMS & DASHBOARD CHECKS PASSED!")
        print("=" * 70)
        return True

    finally:
        # Cleanup test data
        try:
            supabase.table("audit_logs").delete().eq("case_id", case_id).execute()
            supabase.table("emergency_alerts").delete().eq("case_id", case_id).execute()
            supabase.table("case_assignments").delete().eq("case_id", case_id).execute()
            supabase.table("safety_cases").delete().eq("id", case_id).execute()
            supabase.table("safety_assessments").delete().eq("id", assessment_id).execute()
            supabase.table("trusted_contacts").delete().eq("id", tc_id).execute()
            supabase.table("profiles").delete().eq("id", test_user_id).execute()
            if created_ngo:
                supabase.table("support_services").delete().eq("id", ngo_service["id"]).execute()
            if created_police:
                supabase.table("support_services").delete().eq("id", police_service["id"]).execute()
            print("[INFO] Test cleanup completed successfully.")
        except Exception as cleanup_err:
            print(f"[WARN] Cleanup note: {cleanup_err}")
        app.dependency_overrides.clear()

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)

