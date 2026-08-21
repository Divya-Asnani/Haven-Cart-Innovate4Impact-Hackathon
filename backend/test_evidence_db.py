import os
import sys
from dotenv import load_dotenv
import asyncio
from supabase import create_client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Missing Supabase credentials")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def run_tests():
    print("Testing Supabase Database connection for evidence_items...")
    
    try:
        # Just check if table exists by doing a select limit 1
        res = supabase.table("evidence_items").select("*").limit(1).execute()
        print(f"Table evidence_items exists. Current rows (limit 1): {res.data}")
    except Exception as e:
        print(f"Failed to query evidence_items: {e}")
        
    try:
        # Check buckets
        res = supabase.storage.get_bucket("evidence")
        print(f"Bucket 'evidence' exists: {res.name}, public: {res.public}")
    except Exception as e:
        print(f"Failed to get bucket: {e}")

if __name__ == "__main__":
    run_tests()
