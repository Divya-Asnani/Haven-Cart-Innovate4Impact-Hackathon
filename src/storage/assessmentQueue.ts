import * as SecureStore from './secureStoreWrapper';
import uuid from 'react-native-uuid';
import { SafetyAssessmentInput, MLResult } from '../ml/inference';
import { FinalRiskResult } from '../ml/ruleEngine';
import { getAccessToken } from '../api';

const QUEUE_STORAGE_KEY = 'havencart_offline_assessment_queue';
// SecureStore on iOS has a 2048-byte limit. We must aggressively trim the queue
// to avoid overflowing the keychain. Storing ~3-5 offline assessments is safe.
const MAX_QUEUE_SIZE = 5;

export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED';

export interface PersistedAssessment {
  local_assessment_id: string;
  user_id?: string;
  session_id?: string;
  
  // Inputs
  safe_now: boolean;
  perpetrator_present: boolean;
  can_leave_safely: boolean;
  medical_help: boolean;
  contact_requested: boolean;

  // ML Outputs
  ml_risk_level: string;
  ml_confidence: number;
  
  // Final Results
  final_risk_level: string;
  decision_source: string;
  override_reason: string | null;
  model_version: string;
  
  // Timestamps
  started_at: string;
  completed_at: string;
  
  sync_status: SyncStatus;
}

/**
 * Retrieves the current offline queue.
 */
export const getAssessmentQueue = async (): Promise<PersistedAssessment[]> => {
  try {
    const data = await SecureStore.getItemAsync(QUEUE_STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as PersistedAssessment[];
  } catch (err) {
    console.error('Failed to read assessment queue', err);
    return [];
  }
};

/**
 * Persists an assessment to the offline queue.
 * Trims the queue if it exceeds MAX_QUEUE_SIZE to prevent Keychain overflow.
 */
export const enqueueAssessment = async (
  inputs: SafetyAssessmentInput,
  mlResult: MLResult,
  finalResult: FinalRiskResult,
  startedAt: string
): Promise<PersistedAssessment> => {
  const queue = await getAssessmentQueue();
  
  // Check auth to attach user_id if safely available. (We do not fetch full profile here, just existence)
  // For now, without a DB or full session state easily accessible synchronously, we'll leave session_id undefined
  // unless we decode the JWT token.
  const hasToken = await getAccessToken();

  const newAssessment: PersistedAssessment = {
    local_assessment_id: uuid.v4() as string,
    user_id: hasToken ? 'authenticated_user' : undefined, // Placeholder until JWT decode / profile integration
    
    safe_now: inputs.safe_now,
    perpetrator_present: inputs.perpetrator_present,
    can_leave_safely: inputs.can_leave_safely,
    medical_help: inputs.medical_help,
    contact_requested: inputs.contact_requested,
    
    ml_risk_level: mlResult.mlRiskLevel,
    ml_confidence: mlResult.confidence,
    
    final_risk_level: finalResult.finalRiskLevel,
    decision_source: finalResult.decisionSource,
    override_reason: finalResult.overrideReason,
    model_version: finalResult.modelVersion,
    
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    
    sync_status: 'PENDING'
  };

  queue.push(newAssessment);

  // Aggressive trimming for SecureStore size limits
  if (queue.length > MAX_QUEUE_SIZE) {
    console.warn(`[AssessmentQueue] Queue exceeded max size ${MAX_QUEUE_SIZE}. Evicting oldest.`);
    queue.shift(); // Remove oldest
  }

  await SecureStore.setItemAsync(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  
  return newAssessment;
};

/**
 * Marks an assessment as SYNCED. (To be used by the sync worker later).
 */
export const markAssessmentSynced = async (localAssessmentId: string) => {
  const queue = await getAssessmentQueue();
  const updated = queue.map(a => 
    a.local_assessment_id === localAssessmentId 
      ? { ...a, sync_status: 'SYNCED' as SyncStatus } 
      : a
  );
  
  // In a robust implementation, we might remove SYNCED items to save space
  const pendingOnly = updated.filter(a => a.sync_status !== 'SYNCED');
  await SecureStore.setItemAsync(QUEUE_STORAGE_KEY, JSON.stringify(pendingOnly));
};

/**
 * Marks an assessment as FAILED.
 */
export const markAssessmentFailed = async (localAssessmentId: string) => {
  const queue = await getAssessmentQueue();
  const updated = queue.map(a => 
    a.local_assessment_id === localAssessmentId 
      ? { ...a, sync_status: 'FAILED' as SyncStatus } 
      : a
  );
  await SecureStore.setItemAsync(QUEUE_STORAGE_KEY, JSON.stringify(updated));
};

/**
 * Sync worker. Sends PENDING/FAILED to FastAPI.
 */
export const syncOfflineAssessments = async () => {
  const queue = await getAssessmentQueue();
  const pending = queue.filter(a => a.sync_status === 'PENDING' || a.sync_status === 'FAILED');
  
  if (pending.length === 0) return;
  
  console.log(`[AssessmentQueue] SYNC START`);
  console.log(`[AssessmentQueue] number of pending assessments: ${pending.length}`);
  
  // Import dynamically to avoid circular dependencies if any
  const { authFetch, API_BASE_URL, getAccessToken } = await import('../api');
  
  const token = await getAccessToken();
  if (!token) {
    return;
  }

  for (const assessment of pending) {
    try {
      const payload = {
        local_assessment_id: assessment.local_assessment_id,
        session_id: assessment.session_id || null,
        answers: {
          safe_now: assessment.safe_now,
          perpetrator_present: assessment.perpetrator_present,
          can_leave_safely: assessment.can_leave_safely,
          medical_help: assessment.medical_help,
          contact_requested: assessment.contact_requested
        },
        ml_risk_level: assessment.ml_risk_level,
        ml_confidence: assessment.ml_confidence,
        final_risk_level: assessment.final_risk_level,
        decision_source: assessment.decision_source,
        override_reason: assessment.override_reason || null,
        model_version: assessment.model_version,
        started_at: assessment.started_at,
        completed_at: assessment.completed_at
      };

      console.log(`[AssessmentQueue] API request: POST ${API_BASE_URL}/safety/assessments for assessment ID: ${assessment.local_assessment_id}`);

      const res = await authFetch(`${API_BASE_URL}/safety/assessments`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      console.log(`[AssessmentQueue] HTTP response status: ${res.status}`);

      if (res.ok) {
        await markAssessmentSynced(assessment.local_assessment_id);
        console.log(`[AssessmentQueue] SYNC SUCCESS for ${assessment.local_assessment_id}`);
      } else if (res.status === 401) {
        console.warn(`[AssessmentQueue] Auth failed. Stopping sync.`);
        break; // Stop syncing until auth is restored
      } else if (res.status >= 400 && res.status < 500) {
        console.error(`[AssessmentQueue] SYNC FAILED. Validation error (${res.status}). Marking FAILED.`);
        await markAssessmentFailed(assessment.local_assessment_id);
      }
      // 5xx errors fall through and remain PENDING/FAILED for retry
    } catch (err: any) {
      if (err.message?.includes('Cannot reach the server') || err.message?.includes('not responding')) {
        console.log(`[AssessmentQueue] Network unavailable. Retrying later.`);
        break; // Network down, stop iterating
      }
      console.error(`[AssessmentQueue] Sync error for ${assessment.local_assessment_id}`, err);
    }
  }
};
