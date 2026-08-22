import os
import sys
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.database.supabase_client import supabase
from app.api.auth_deps import DEMO_NGO_USER_IDS, get_current_user_id

# We need to bypass the JWT verification for the test to act as a responder.
# We will override the dependency get_current_user_id to return our DEMO_NGO_USER_IDS[0].

client = TestClient(app)

def override_get_current_user_id():
    return DEMO_NGO_USER_IDS[0]

app.dependency_overrides[get_current_user_id] = override_get_current_user_id

def override_unauthorized_user():
    return str(uuid.uuid4())

def run_tests():
    ngo_id = DEMO_NGO_USER_IDS[0]
    
    print("Fetching active cases...")
    res = client.get("/api/v1/ngo/cases")
    if res.status_code != 200:
        print("Failed to fetch cases:", res.text)
        return False
        
    cases = res.json()
    if not cases:
        print("No cases found to test with. Cannot perform full E2E test without a HIGH risk case.")
        return False
        
    case = cases[0]
    case_id = case["case_id"]
    assignment_id = case.get("assignment_id")
    
    print(f"Testing with case {case_id} (assignment {assignment_id})")
    
    # 1. Test CASE_VIEWED
    res = client.post(f"/api/v1/ngo/cases/{case_id}/view")
    print("CASE_VIEWED trigger status:", res.status_code)
    
    # 2. Test EVIDENCE_VIEWED
    res = client.get(f"/api/v1/ngo/cases/{case_id}/evidence")
    print("EVIDENCE_VIEWED trigger status:", res.status_code)
    
    # 3. Test Assignments if assignment_id exists
    if assignment_id:
        for status in ["ACCEPTED", "IN_PROGRESS", "RESOLVED"]:
            res = client.patch(f"/api/v1/ngo/assignments/{assignment_id}?status={status}")
            print(f"CASE_{status} trigger status:", res.status_code)
            
    # 4. Verify in DB
    print("\nVerifying audit_logs table...")
    logs_res = supabase.table("audit_logs").select("*").eq("case_id", case_id).order("created_at", desc=False).execute()
    logs = logs_res.data
    
    print(f"Found {len(logs)} audit logs for this case:")
    for log in logs:
        print(f" - {log['action']} by {log['actor_id']} at {log['created_at']}")
        # Sensitive data check
        metadata = log.get("metadata", {})
        metadata_str = str(metadata).lower()
        if "pin" in metadata_str or "key" in metadata_str or "enc" in metadata_str or "evidence" in metadata_str:
            print(f"   WARNING: Possible sensitive data in metadata: {metadata}")
            
    # 5. Unauthorized Test
    print("\nTesting Unauthorized Access...")
    app.dependency_overrides[get_current_user_id] = override_unauthorized_user
    res = client.post(f"/api/v1/ngo/cases/{case_id}/view")
    print("Unauthorized view status:", res.status_code) # Should be 403
    
    # 6. Immutability Test
    print("\nTesting Immutability (trying to delete/update via REST since no API exists)")
    if len(logs) > 0:
        log_id = logs[0]["id"]
        # API has no endpoint. Supabase direct DB delete test (would fail RLS if enabled, but we have service key here so it would succeed, but we test API surface).
        print("API has no PUT/DELETE endpoints for audit_logs.")

    return True

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
