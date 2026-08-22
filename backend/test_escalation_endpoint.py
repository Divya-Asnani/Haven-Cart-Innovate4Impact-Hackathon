import asyncio
import os
import uuid
from dotenv import load_dotenv

# Set env before imports
load_dotenv()

from app.api.escalation import escalate_assessment

async def run():
    # We need a new assessment to test
    from supabase import create_client
    supabase = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_KEY'])
    user_id = '38a22f53-cbbc-41df-b8e5-7d0941651b95'
    assessment_id = str(uuid.uuid4())
    
    # Insert new assessment
    supabase.rpc('insert_safety_assessment', {
        'p_assessment_id': assessment_id, 
        'p_user_id': user_id, 
        'p_session_id': None, 
        'p_answers': {'safe_now': False, 'perpetrator_present': True, 'can_leave_safely': False, 'medical_help': False, 'contact_requested': True}, 
        'p_ml_risk_level': 'HIGH', 
        'p_ml_confidence': 0.99, 
        'p_final_risk_level': 'HIGH', 
        'p_decision_source': 'ML', 
        'p_override_reason': None, 
        'p_model_version': '1.0', 
        'p_started_at': '2026-08-22T00:00:00Z', 
        'p_completed_at': '2026-08-22T00:01:00Z'
    }).execute()
    
    print("Running escalate_assessment...")
    res = await escalate_assessment(local_assessment_id=assessment_id, user_id=user_id)
    print("Result:", res)

asyncio.run(run())
