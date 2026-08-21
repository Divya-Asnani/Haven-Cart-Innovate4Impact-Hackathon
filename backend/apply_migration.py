import os
import sys
from dotenv import load_dotenv
import psycopg2

load_dotenv()

# We need to construct the connection string from env
# Assuming SUPABASE_URL and SUPABASE_KEY are in .env, but we need the DB connection string.
# We'll hardcode the DB connection string from apply_sql.js, but with IPv4 specifically if possible, 
# or just let psycopg2 try it.
db_url = "postgresql://postgres:Sanika%23123@db.rlwgwnjkdwealgtytulq.supabase.co:5432/postgres"

def run_migration():
    print("Connecting to DB to apply audit_logs.sql...")
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        with open("audit_logs.sql", "r") as f:
            sql = f.read()
            
        print("Executing SQL...")
        cur.execute(sql)
        conn.commit()
        
        cur.close()
        conn.close()
        print("Migration deployed successfully.")
        return True
    except Exception as e:
        print(f"Failed to apply migration: {e}")
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
