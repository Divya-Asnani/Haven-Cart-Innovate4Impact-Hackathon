import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

supabase: Client = create_client(url, key)

res = supabase.table("support_services").select("*").execute()
print("Support Services:", len(res.data))

res2 = supabase.table("trusted_contacts").select("*").execute()
print("Trusted Contacts:", len(res2.data))
