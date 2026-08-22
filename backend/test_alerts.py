import os
import uuid
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_KEY'])

user_id = '38a22f53-cbbc-41df-b8e5-7d0941651b95'
case_id = 'caff6b40-9b87-480b-a3c7-3ee77907ce13'

services = supabase.table("support_services").select("*").eq("is_active", True).eq("is_verified", True).execute().data
contacts = supabase.table("trusted_contacts").select("*").eq("is_active", True).execute().data

print("Services count:", len(services))
print("Contacts count:", len(contacts))

alerts_to_insert = []
for s in services[:3]:
    alerts_to_insert.append({
        "id": str(uuid.uuid4()),
        "case_id": case_id,
        "support_service_id": s["id"],
        "recipient_type": s["service_type"],
        "channel": "API",
        "delivery_mode": "MOCK",
        "status": "SENT"
    })
    
for c in contacts:
    alerts_to_insert.append({
        "id": str(uuid.uuid4()),
        "case_id": case_id,
        "trusted_contact_id": c["id"],
        "recipient_type": "TRUSTED_CONTACT",
        "channel": c.get("preferred_channel", "SMS"),
        "delivery_mode": "MOCK",
        "status": "SENT"
    })

print("Alerts to insert:", alerts_to_insert)

try:
    if alerts_to_insert:
        res = supabase.table("emergency_alerts").insert(alerts_to_insert).execute()
        print("Alerts Insert Result:", res)
except Exception as e:
    print("Alerts Error:", type(e), e)
