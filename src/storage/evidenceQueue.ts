import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import { saveEncryptedEvidence, readEncryptedEvidence, deleteEvidenceFile, evidenceFileExists, readEvidenceFileAsBase64 } from './evidenceCrypto';

const QUEUE_STORAGE_KEY = 'havencart_evidence_queue';

export type EvidenceSyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
export type EvidenceType = 'TEXT' | 'PHOTO' | 'AUDIO';

export interface EvidenceQueueItem {
  evidence_id: string;
  type: EvidenceType;
  mime_type: string | null;
  original_filename: string | null;
  
  // File path and crypto metadata
  file_path: string;
  iv_hex: string;
  tag_hex: string;
  chained_hash: string;
  previous_hash: string | null;
  chain_index: number;
  
  // Association
  local_assessment_id: string | null; 
  
  // State
  sync_status: EvidenceSyncStatus;
  created_at: string;
}

/**
 * Retrieves the full evidence queue.
 */
export const getEvidenceQueue = async (): Promise<EvidenceQueueItem[]> => {
  try {
    const data = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as EvidenceQueueItem[];
  } catch (err) {
    console.error('[EvidenceQueue] Failed to read queue', err);
    return [];
  }
};

/**
 * Persists the queue back to AsyncStorage.
 */
const saveEvidenceQueue = async (queue: EvidenceQueueItem[]) => {
  await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
};

/**
 * Enqueues a new piece of evidence.
 * Encrypts the payload, hashes it, and stores it in the file system.
 */
export const enqueueEvidence = async (
  type: EvidenceType,
  base64Payload: string,
  localAssessmentId: string | null,
  mimeType: string | null = null,
  originalFilename: string | null = null
): Promise<EvidenceQueueItem> => {
  const evidenceId = uuid.v4() as string;
  
  // Encrypt and store locally
  const { filePath, ivHex, tagHex, chainedHash, previousHash, chainIndex } = await saveEncryptedEvidence(evidenceId, base64Payload);
  
  const newItem: EvidenceQueueItem = {
    evidence_id: evidenceId,
    type,
    mime_type: mimeType,
    original_filename: originalFilename,
    file_path: filePath,
    iv_hex: ivHex,
    tag_hex: tagHex,
    chained_hash: chainedHash,
    previous_hash: previousHash,
    chain_index: chainIndex,
    local_assessment_id: localAssessmentId,
    sync_status: 'PENDING',
    created_at: new Date().toISOString()
  };

  const queue = await getEvidenceQueue();
  queue.push(newItem);
  await saveEvidenceQueue(queue);
  
  return newItem;
};

/**
 * Updates the sync status of an evidence item.
 */
export const updateEvidenceStatus = async (evidenceId: string, status: EvidenceSyncStatus) => {
  const queue = await getEvidenceQueue();
  const updated = queue.map(item => 
    item.evidence_id === evidenceId ? { ...item, sync_status: status } : item
  );
  await saveEvidenceQueue(updated);
};

/**
 * Deletes evidence from the queue and removes the encrypted file.
 * Used for manual deletion before sync or cleanup.
 */
export const deleteEvidence = async (evidenceId: string) => {
  const queue = await getEvidenceQueue();
  const item = queue.find(i => i.evidence_id === evidenceId);
  
  if (item) {
    try {
      const exists = await evidenceFileExists(item.file_path);
      if (exists) {
        await deleteEvidenceFile(item.file_path);
      }
      
      const pekPath = item.file_path.replace('.enc', '.pek.enc');
      const pekExists = await evidenceFileExists(pekPath);
      if (pekExists) {
        await deleteEvidenceFile(pekPath);
      }
    } catch (err) {
      console.error('[EvidenceQueue] Failed to delete file', err);
    }
  }
  
  const filtered = queue.filter(i => i.evidence_id !== evidenceId);
  await saveEvidenceQueue(filtered);
};

/**
 * Retrieves and decrypts the evidence payload for viewing in the app.
 */
export const getDecryptedEvidencePayload = async (evidenceId: string): Promise<string | null> => {
  const queue = await getEvidenceQueue();
  const item = queue.find(i => i.evidence_id === evidenceId);
  if (!item) return null;
  
  try {
    return await readEncryptedEvidence(item.file_path, item.iv_hex, item.tag_hex);
  } catch (err) {
    console.error('[EvidenceQueue] Failed to decrypt evidence', err);
    return null;
  }
};

import { authFetch } from '../api';

/**
 * Synchronizes pending evidence to the backend.
 */
export const syncOfflineEvidence = async () => {
  const queue = await getEvidenceQueue();
  const pendingItems = queue.filter(item => item.sync_status === 'PENDING' || item.sync_status === 'FAILED');

  for (const item of pendingItems) {
    try {
      await updateEvidenceStatus(item.evidence_id, 'SYNCING');

      // Read encrypted file as base64 to send to backend
      const encryptedBase64 = await readEvidenceFileAsBase64(item.file_path);

      // The backend expects the IV and Tag inside the upload payload since they are not in PostgreSQL
      // We will create a JSON envelope containing the IV, Tag, and Ciphertext, and encode IT as Base64 to upload as the file payload.
      const uploadPayload = JSON.stringify({
        iv: item.iv_hex,
        tag: item.tag_hex,
        ciphertext: encryptedBase64
      });
      // Convert JSON envelope back to base64
      const uploadPayloadBase64 = btoa(uploadPayload);

      const requestBody = {
        evidence_id: item.evidence_id,
        type: item.type,
        mime_type: item.mime_type,
        original_filename: item.original_filename,
        encryption_algorithm: 'AES-256-GCM',
        encryption_version: '1',
        content_hash: item.chained_hash,
        previous_hash: item.previous_hash,
        chain_index: item.chain_index,
        captured_at: item.created_at,
        local_assessment_id: item.local_assessment_id,
        payload_base64: uploadPayloadBase64
      };

      const res = await authFetch('/safety/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (res.ok) {
        await updateEvidenceStatus(item.evidence_id, 'SYNCED');
      } else if (res.status >= 400 && res.status < 500) {
        await updateEvidenceStatus(item.evidence_id, 'FAILED');
      }
    } catch (err) {
      console.error('[EvidenceQueue] Failed to sync item:', item.evidence_id, err);
      // Revert to PENDING on network error
      await updateEvidenceStatus(item.evidence_id, 'PENDING');
    }
  }
};
