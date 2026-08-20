import * as SecureStore from './secureStoreWrapper';
import * as FileSystem from 'expo-file-system';
import forge from 'node-forge';
import 'react-native-get-random-values'; // Polyfill crypto.getRandomValues if needed

const VAULT_KEY_STORAGE = 'havencart_vault_key';
const LAST_HASH_STORAGE = 'havencart_last_evidence_hash';

// Directories for evidence storage
export const EVIDENCE_DIR = `${FileSystem.documentDirectory}evidence/`;

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
 * Encrypts a payload (string) using AES-256-GCM.
 * @returns { encryptedHex, ivHex, tagHex }
 */
export const encryptPayload = async (plaintext: string) => {
  const keyHex = await getOrCreateVaultKey();
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
 */
export const decryptPayload = async (encryptedHex: string, ivHex: string, tagHex: string): Promise<string> => {
  const keyHex = await getOrCreateVaultKey();
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
  
  // Encrypt payload
  const { encryptedHex, ivHex, tagHex } = await encryptPayload(base64Payload);
  
  // Compute chained hash
  const { newHash: chainedHash, prevHash, newIndex: chainIndex } = await computeChainedHash(evidenceId, encryptedHex);
  
  // Save to file system
  const filePath = `${EVIDENCE_DIR}${evidenceId}.enc`;
  await FileSystem.writeAsStringAsync(filePath, encryptedHex, { encoding: FileSystem.EncodingType.UTF8 });
  
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
  const encryptedHex = await FileSystem.readAsStringAsync(filePath, { encoding: FileSystem.EncodingType.UTF8 });
  return await decryptPayload(encryptedHex, ivHex, tagHex);
};
