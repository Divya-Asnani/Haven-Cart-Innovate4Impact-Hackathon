import * as SecureStore from './secureStoreWrapper';
import * as FileSystem from 'expo-file-system';
import forge from 'node-forge';
import 'react-native-get-random-values'; // Polyfill crypto.getRandomValues if needed

const VAULT_KEY_STORAGE = 'havencart_vault_key';
const LAST_HASH_STORAGE = 'havencart_last_evidence_hash';

// Directories for evidence storage
export const EVIDENCE_DIR = `${(FileSystem as any).documentDirectory}evidence/`;

/**
 * Ensures the evidence directory exists on the file system.
 */
export const initEvidenceDir = async () => {
  const dirInfo = await FileSystem.getInfoAsync(EVIDENCE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(EVIDENCE_DIR, { intermediates: true });
  }
};

/**
 * Gets or creates the master AES-256 vault key from SecureStore.
 */
export const getOrCreateVaultKey = async (): Promise<string> => {
  let keyHex = await SecureStore.getItemAsync(VAULT_KEY_STORAGE);
  if (!keyHex) {
    // Generate a new 256-bit (32-byte) key
    const keyBytes = forge.random.getBytesSync(32);
    keyHex = forge.util.bytesToHex(keyBytes);
    await SecureStore.setItemAsync(VAULT_KEY_STORAGE, keyHex);
  }
  return keyHex;
};

/**
 * Gets the last hash in the chain, or a genesis hash if none exists.
 */
export const getLastHash = async (): Promise<{ hash: string, index: number }> => {
  let data = await SecureStore.getItemAsync(LAST_HASH_STORAGE);
  if (!data) {
    // Genesis hash
    const md = forge.md.sha256.create();
    md.update('havencart-evidence-genesis');
    const hash = md.digest().toHex();
    const result = { hash, index: 0 };
    await SecureStore.setItemAsync(LAST_HASH_STORAGE, JSON.stringify(result));
    return result;
  }
  return JSON.parse(data);
};

/**
 * Encrypts a payload (string) using AES-256-GCM with a specified key.
 * If no key is provided, uses the Master Vault Key (for legacy or PEK wrapping).
 */
export const encryptPayload = async (plaintext: string, explicitKeyHex?: string) => {
  const keyHex = explicitKeyHex || await getOrCreateVaultKey();
  const keyBytes = forge.util.hexToBytes(keyHex);
  
  // 12-byte IV for GCM
  const ivBytes = forge.random.getBytesSync(12);
  
  const cipher = forge.cipher.createCipher('AES-GCM', keyBytes);
  cipher.start({
    iv: ivBytes,
    additionalData: 'haven-evidence',
    tagLength: 128
  });
  
  cipher.update(forge.util.createBuffer(plaintext, 'utf8'));
  cipher.finish();
  
  return {
    encryptedHex: cipher.output.toHex(),
    ivHex: forge.util.bytesToHex(ivBytes),
    tagHex: cipher.mode.tag.toHex()
  };
};

/**
 * Decrypts a payload using AES-256-GCM.
 * If no key is provided, uses the Master Vault Key.
 */
export const decryptPayload = async (encryptedHex: string, ivHex: string, tagHex: string, explicitKeyHex?: string): Promise<string> => {
  const keyHex = explicitKeyHex || await getOrCreateVaultKey();
  const keyBytes = forge.util.hexToBytes(keyHex);
  const ivBytes = forge.util.hexToBytes(ivHex);
  const tagBytes = forge.util.hexToBytes(tagHex);
  
  const decipher = forge.cipher.createDecipher('AES-GCM', keyBytes);
  decipher.start({
    iv: ivBytes,
    additionalData: 'haven-evidence',
    tagLength: 128,
    tag: forge.util.createBuffer(tagBytes)
  });
  
  decipher.update(forge.util.createBuffer(forge.util.hexToBytes(encryptedHex)));
  const pass = decipher.finish();
  
  if (!pass) {
    throw new Error('Decryption failed. Data may be corrupted or tampered with.');
  }
  
  return decipher.output.toString();
};

/**
 * Computes the SHA-256 hash of the current evidence, chained with the previous hash.
 */
export const computeChainedHash = async (evidenceId: string, encryptedPayload: string) => {
  const { hash: prevHash, index: prevIndex } = await getLastHash();
  const md = forge.md.sha256.create();
  
  md.update(prevHash);
  md.update(evidenceId);
  md.update(encryptedPayload);
  
  const newHash = md.digest().toHex();
  const newIndex = prevIndex + 1;
  await SecureStore.setItemAsync(LAST_HASH_STORAGE, JSON.stringify({ hash: newHash, index: newIndex }));
  
  return { newHash, prevHash, newIndex };
};

/**
 * Saves encrypted evidence to FileSystem and returns the file path and cryptographic metadata.
 */
export const saveEncryptedEvidence = async (evidenceId: string, base64Payload: string) => {
  await initEvidenceDir();
  
  // 1. Generate PEK (Per-Evidence Key) - 256 bit
  const pekBytes = forge.random.getBytesSync(32);
  const pekHex = forge.util.bytesToHex(pekBytes);
  
  // 2. Encrypt payload using PEK
  const { encryptedHex, ivHex, tagHex } = await encryptPayload(base64Payload, pekHex);
  
  // 3. Wrap PEK using Master Vault Key
  const wrappedPEK = await encryptPayload(pekHex);
  
  // 4. Compute chained hash (over the PEK-encrypted ciphertext, preserving schema)
  const { newHash: chainedHash, prevHash, newIndex: chainIndex } = await computeChainedHash(evidenceId, encryptedHex);
  
  // 5. Save to file system safely
  const filePath = `${EVIDENCE_DIR}${evidenceId}.enc`;
  const pekPath = `${EVIDENCE_DIR}${evidenceId}.pek.enc`;
  
  try {
    // Write wrapped PEK first
    await FileSystem.writeAsStringAsync(pekPath, JSON.stringify(wrappedPEK), { encoding: 'utf8' });
    // Write encrypted payload
    await FileSystem.writeAsStringAsync(filePath, encryptedHex, { encoding: 'utf8' });
  } catch (err) {
    // Failure safety: do not leave partial evidence
    try {
      await FileSystem.deleteAsync(pekPath, { idempotent: true });
      await FileSystem.deleteAsync(filePath, { idempotent: true });
    } catch (cleanupErr) {
      console.error('Failed to cleanup partial evidence files', cleanupErr);
    }
    throw err;
  }
  
  return {
    filePath,
    ivHex,
    tagHex,
    chainedHash,
    previousHash: prevHash,
    chainIndex
  };
};

/**
 * Reads and decrypts evidence from FileSystem.
 */
export const readEncryptedEvidence = async (filePath: string, ivHex: string, tagHex: string): Promise<string> => {
  const encryptedHex = await FileSystem.readAsStringAsync(filePath, { encoding: 'utf8' });
  
  // Determine if this is NEW (envelope) or LEGACY evidence
  const pekPath = filePath.replace('.enc', '.pek.enc');
  const pekInfo = await FileSystem.getInfoAsync(pekPath);
  
  let pekHex: string | undefined = undefined;
  
  if (pekInfo.exists) {
    // Recover PEK using Master Vault Key
    const pekDataStr = await FileSystem.readAsStringAsync(pekPath, { encoding: 'utf8' });
    const wrappedPEK = JSON.parse(pekDataStr);
    pekHex = await decryptPayload(wrappedPEK.encryptedHex, wrappedPEK.ivHex, wrappedPEK.tagHex);
  }
  
  // Decrypt payload (will use pekHex if new, or fallback to Master Vault Key if legacy)
  return await decryptPayload(encryptedHex, ivHex, tagHex, pekHex);
};

/**
 * Recovers the plaintext Per-Evidence Key (PEK) for sharing.
 * Returns null if this is legacy evidence without a PEK.
 */
export const recoverPEK = async (evidenceId: string): Promise<string | null> => {
  const pekPath = `${EVIDENCE_DIR}${evidenceId}.pek.enc`;
  const pekInfo = await FileSystem.getInfoAsync(pekPath);
  if (!pekInfo.exists) return null;
  
  const pekDataStr = await FileSystem.readAsStringAsync(pekPath, { encoding: 'utf8' });
  const wrappedPEK = JSON.parse(pekDataStr);
  return await decryptPayload(wrappedPEK.encryptedHex, wrappedPEK.ivHex, wrappedPEK.tagHex);
};
