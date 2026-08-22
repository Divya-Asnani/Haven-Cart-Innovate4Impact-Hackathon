import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_KEY'])

user_id = '38a22f53-cbbc-41df-b8e5-7d0941651b95'
case_id = 'caff6b40-9b87-480b-a3c7-3ee77907ce13'

# Check support services
services_res = supabase.table("support_services").select("*").eq("is_active", True).eq("is_verified", True).execute()
services = services_res.data
print("Found services:", len(services))

# Mock logic from escalation.py
has_location = False  # The user has no location in profiles
ranked_services = []
for s in services:
    dist = None
    ranked_services.append((s, dist))

if has_location:
    ranked_services.sort(key=lambda x: (x[1] if x[1] is not None else float('inf'), x[0].get('priority', 100)))
else:
    ranked_services.sort(key=lambda x: (x[0].get('priority', 100), x[0].get('name', '')))

top_services = ranked_services[:3]
print("Top services:", [s[0]['name'] for s in top_services])

assignments_to_insert = []
for s_tuple in top_services:
    s = s_tuple[0]
    assignments_to_insert.append({
        "case_id": case_id,
        "support_service_id": s["id"],
        "assignment_status": "ASSIGNED"
    })

print("Assignments to insert:", assignments_to_insert)

try:
    if assignments_to_insert:
        res = supabase.table("case_assignments").insert(assignments_to_insert).execute()
        print("Insert Result:", res)
except Exception as e:
    print("Error:", e)
