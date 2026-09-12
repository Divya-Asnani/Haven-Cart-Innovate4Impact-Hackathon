import * as SecureStore from './secureStoreWrapper';
import forge from 'node-forge';

const RESPONDER_KEY_PREFIX = 'responder_private_key_v';
const CURRENT_VERSION_STORAGE = 'responder_key_current_version';

/**
 * Gets the current local key version, defaults to 0 if none.
 */
export const getCurrentKeyVersion = async (): Promise<number> => {
  const v = await SecureStore.getItemAsync(CURRENT_VERSION_STORAGE);
  return v ? parseInt(v, 10) : 0;
};

/**
 * Clears all stored responder private keys and current key version from SecureStore.
 */
export const clearResponderKeys = async () => {
  try {
    const currentVersion = await getCurrentKeyVersion();
    for (let v = 1; v <= currentVersion + 5; v++) {
      await SecureStore.deleteItemAsync(`${RESPONDER_KEY_PREFIX}${v}`).catch(() => {});
    }
    await SecureStore.deleteItemAsync(CURRENT_VERSION_STORAGE).catch(() => {});
  } catch (err) {
    console.error('Failed to clear responder keys', err);
  }
};

/**
 * Generates an RSA-2048 keypair for the responder.
 * Stores the private key securely and returns the public key PEM and the new version.
 */
export const generateAndStoreResponderKeyPair = async (): Promise<{ publicKeyPem: string, version: number }> => {
  return new Promise(async (resolve, reject) => {
    try {
      const currentVersion = await getCurrentKeyVersion();
      const newVersion = currentVersion + 1;

      // Note: In React Native, forge.pki.rsa.generateKeyPair runs synchronously blocking the UI thread if no web workers exist.
      // However, for small 2048 keys or in background, it's acceptable. For production RN, this might require a native module.
      forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 }, async (err, keypair) => {
        if (err) return reject(err);

        const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);
        const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);

        // Store private key with versioning
        const keyStorageName = `${RESPONDER_KEY_PREFIX}${newVersion}`;
        await SecureStore.setItemAsync(keyStorageName, privateKeyPem);
        await SecureStore.setItemAsync(CURRENT_VERSION_STORAGE, newVersion.toString());
        await SecureStore.setItemAsync(`responder_public_key_v${newVersion}`, publicKeyPem);

        resolve({ publicKeyPem, version: newVersion });
      });
    } catch (e) {
      reject(e);
    }
  });
};

export const alignResponderKeyVersion = async (localVersion: number, serverVersion: number): Promise<void> => {
  if (localVersion === serverVersion) return;

  const privateKeyPem = await SecureStore.getItemAsync(`${RESPONDER_KEY_PREFIX}${localVersion}`);
  const publicKeyPem = await SecureStore.getItemAsync(`responder_public_key_v${localVersion}`);
  if (!privateKeyPem || !publicKeyPem) {
    throw new Error(`Local responder key version ${localVersion} is not available.`);
  }

  await SecureStore.setItemAsync(`${RESPONDER_KEY_PREFIX}${serverVersion}`, privateKeyPem);
  await SecureStore.setItemAsync(`responder_public_key_v${serverVersion}`, publicKeyPem);
  await SecureStore.setItemAsync(CURRENT_VERSION_STORAGE, serverVersion.toString());
};

/**
 * Retrieves the stored public key PEM for a specific version.
 */
export const getResponderPublicKey = async (version?: number): Promise<string | null> => {
  const v = version || await getCurrentKeyVersion();
  if (v === 0) return null;
  return await SecureStore.getItemAsync(`responder_public_key_v${v}`);
};

/**
 * Retrieves the private key for a specific version.
 */
export const getResponderPrivateKey = async (version: number): Promise<forge.pki.rsa.PrivateKey> => {
  const keyStorageName = `${RESPONDER_KEY_PREFIX}${version}`;
  const pem = await SecureStore.getItemAsync(keyStorageName);
  if (!pem) {
    throw new Error(`Private key for version ${version} not found in SecureStore`);
  }
  return forge.pki.privateKeyFromPem(pem);
};

/**
 * Generates a random 256-bit (32-byte) Per-Evidence Key (PEK).
 */
export const generatePEK = (): string => {
  const bytes = forge.random.getBytesSync(32);
  return forge.util.bytesToHex(bytes);
};

/**
 * Wraps (encrypts) the PEK using a Responder's RSA Public Key (RSA-OAEP).
 * Returns the hex representation of the wrapped key.
 */
export const wrapPEKForResponder = (pekHex: string, responderPublicKeyPem: string): string => {
  const publicKey = forge.pki.publicKeyFromPem(responderPublicKeyPem);
  const pekBytes = forge.util.hexToBytes(pekHex);
  
  // Encrypt with RSA-OAEP
  const encrypted = publicKey.encrypt(pekBytes, 'RSA-OAEP', {
    md: forge.md.sha256.create(),
    mgf1: {
      md: forge.md.sha1.create()
    }
  });
  
  return forge.util.bytesToHex(encrypted);
};

/**
 * Unwraps (decrypts) the PEK using the local Responder Private Key.
 */
export const unwrapPEKForResponder = async (wrappedPEKHex: string, version: number): Promise<string> => {
  const privateKey = await getResponderPrivateKey(version);

  const encryptedBytes = forge.util.hexToBytes(wrappedPEKHex);
  
  const decrypted = privateKey.decrypt(encryptedBytes, 'RSA-OAEP', {
    md: forge.md.sha256.create(),
    mgf1: {
      md: forge.md.sha1.create()
    }
  });
  
  return forge.util.bytesToHex(decrypted);
};
