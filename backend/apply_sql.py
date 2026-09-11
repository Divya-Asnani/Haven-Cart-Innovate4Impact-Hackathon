import os
import psycopg2

def apply_sql():
    # Use IPv4 proxy port 6543 to avoid IPv6 timeout on Windows Node/Python
    url = "postgresql://postgres:Sanika%23123@db.rlwgwnjkdwealgtytulq.supabase.co:6543/postgres"
    
    with open('rpc_insert_fix.sql', 'r') as f:
        sql = f.read()

    print("Connecting to Supabase PostgreSQL...")
    conn = psycopg2.connect(url)
    conn.autocommit = True
    
    with conn.cursor() as cur:
        print("Executing SQL...")
        cur.execute(sql)
        
    conn.close()
    print("Success!")

if __name__ == "__main__":
    apply_sql()
