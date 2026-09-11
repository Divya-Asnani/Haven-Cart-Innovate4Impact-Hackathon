import asyncio
import os
import sys

from app.database.supabase_client import supabase

async def fix_roles():
    print("Fixing responder roles in the database...")
    
    # User IDs from the prompt
    medical_user_id = '06665f39-3b12-496f-a744-b9b444dc8854'
    ngo_user_id = '1b159d59-7019-49ff-b7bd-ea80e7554af3'
    
    # 1. Get role IDs
    roles_res = supabase.table('roles').select('id, role_code').execute()
    roles = {r['role_code']: r['id'] for r in roles_res.data}
    
    medical_role_id = roles.get('MEDICAL')
    ngo_role_id = roles.get('NGO')
    
    if not medical_role_id or not ngo_role_id:
        print("Could not find MEDICAL or NGO roles.")
        sys.exit(1)
        
    print(f"MEDICAL Role ID: {medical_role_id}")
    print(f"NGO Role ID: {ngo_role_id}")

    # 2. Delete existing roles for these users
    supabase.table('user_roles').delete().in_('user_id', [medical_user_id, ngo_user_id]).execute()
    
    # 3. Insert correct roles
    payload = [
        {"user_id": medical_user_id, "role_id": medical_role_id, "is_active": True},
        {"user_id": ngo_user_id, "role_id": ngo_role_id, "is_active": True}
    ]
    res = supabase.table('user_roles').insert(payload).execute()
    
    print(f"Successfully inserted {len(res.data)} corrected user_roles.")

if __name__ == "__main__":
    asyncio.run(fix_roles())
