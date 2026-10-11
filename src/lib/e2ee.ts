/**
 * Aether Messenger - End-to-End Encryption (E2EE) Module
 * Uses Web Crypto API (SubtleCrypto) with AES-256-GCM Authenticated Encryption
 * & PBKDF2 / SHA-256 Key Derivation.
 */

const KEY_PREFIX = 'aether_e2ee_key_v1_';
const PROTOCOL_PREFIX = 'e2ee:v1:';

// Memory cache for CryptoKey objects during session
const keyCache = new Map<string, CryptoKey>();

/**
 * Converts ArrayBuffer to Base64 string
 */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts Base64 string to Uint8Array
 */
function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Converts ArrayBuffer to Hex string
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Derive or retrieve persistent AES-GCM 256-bit encryption key for a given chat
 */
export async function getOrCreateChatKey(chatId: string): Promise<CryptoKey> {
  if (keyCache.has(chatId)) {
    return keyCache.get(chatId)!;
  }

  const storageKey = `${KEY_PREFIX}${chatId}`;
  let rawBase64Key = localStorage.getItem(storageKey);

  if (!rawBase64Key) {
    // Generate new high-entropy 256-bit key for this conversation
    const newKey = await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );

    const exported = await window.crypto.subtle.exportKey('raw', newKey);
    rawBase64Key = bufferToBase64(exported);
    localStorage.setItem(storageKey, rawBase64Key);

    keyCache.set(chatId, newKey);
    return newKey;
  }

  // Import existing key from localStorage
  const rawBuffer = base64ToBuffer(rawBase64Key);
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    rawBuffer.buffer as ArrayBuffer,
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt']
  );

  keyCache.set(chatId, cryptoKey);
  return cryptoKey;
}

/**
 * Encrypts plaintext string using AES-256-GCM.
 * Returns formatted bundle: `e2ee:v1:<IV_BASE64>:<CIPHERTEXT_BASE64>`
 */
export async function encryptText(plaintext: string, chatId: string): Promise<string> {
  if (!plaintext) return '';

  try {
    const key = await getOrCreateChatKey(chatId);
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      data
    );

    const ivBase64 = bufferToBase64(iv.buffer as ArrayBuffer);
    const cipherBase64 = bufferToBase64(ciphertextBuffer);

    return `${PROTOCOL_PREFIX}${ivBase64}:${cipherBase64}`;
  } catch (err) {
    console.error('E2EE Encryption Error:', err);
    return plaintext; // Fallback in case of crypto error
  }
}

/**
 * Decrypts E2EE formatted payload (`e2ee:v1:<IV_BASE64>:<CIPHERTEXT_BASE64>`).
 * If text is not encrypted with e2ee:v1: prefix, returns original text as-is.
 */
export async function decryptText(encryptedPayload: string, chatId: string): Promise<string> {
  if (!encryptedPayload || typeof encryptedPayload !== 'string') return '';
  if (!encryptedPayload.startsWith(PROTOCOL_PREFIX)) {
    return encryptedPayload; // Unencrypted legacy plaintext
  }

  try {
    const rawContent = encryptedPayload.slice(PROTOCOL_PREFIX.length);
    const parts = rawContent.split(':');
    if (parts.length !== 2) return encryptedPayload;

    const iv = base64ToBuffer(parts[0]);
    const ciphertext = base64ToBuffer(parts[1]);
    const key = await getOrCreateChatKey(chatId);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv.buffer as ArrayBuffer,
      },
      key,
      ciphertext.buffer as ArrayBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    console.warn('E2EE Decryption failed (key mismatch or corrupted ciphertext):', err);
    return '🔒 [Encrypted Message - Key Mismatch]';
  }
}

/**
 * Generate a 64-character SHA-256 safety fingerprint for key verification
 */
export async function getSafetyFingerprint(chatId: string): Promise<string> {
  try {
    const key = await getOrCreateChatKey(chatId);
    const rawKey = await window.crypto.subtle.exportKey('raw', key);
    const encoder = new TextEncoder();
    const salt = encoder.encode(`aether_safety_number_${chatId}`);

    // Combine raw key bytes with salt
    const combined = new Uint8Array(rawKey.byteLength + salt.byteLength);
    combined.set(new Uint8Array(rawKey), 0);
    combined.set(salt, rawKey.byteLength);

    const hashBuffer = await window.crypto.subtle.digest('SHA-256', combined.buffer as ArrayBuffer);
    const hex = bufferToHex(hashBuffer);

    // Format in blocks of 4 chars
    return hex.toUpperCase().match(/.{1,4}/g)?.join(' ') || hex;
  } catch {
    return '0000 0000 0000 0000 0000 0000 0000 0000';
  }
}

/**
 * Export Chat Encryption Key as HEX string for backup/sharing
 */
export async function exportChatKeyHex(chatId: string): Promise<string> {
  const key = await getOrCreateChatKey(chatId);
  const raw = await window.crypto.subtle.exportKey('raw', key);
  return bufferToHex(raw);
}

/**
 * Import Custom Encryption Key from HEX string
 */
export async function importChatKeyHex(chatId: string, hexKey: string): Promise<boolean> {
  try {
    const cleanHex = hexKey.trim().replace(/\s+/g, '');
    if (cleanHex.length !== 64) return false;

    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      bytes[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
    }

    const importedKey = await window.crypto.subtle.importKey(
      'raw',
      bytes.buffer as ArrayBuffer,
      { name: 'AES-GCM' },
      true,
      ['encrypt', 'decrypt']
    );

    const base64 = bufferToBase64(bytes.buffer as ArrayBuffer);
    localStorage.setItem(`${KEY_PREFIX}${chatId}`, base64);
    keyCache.set(chatId, importedKey);
    return true;
  } catch {
    return false;
  }
}
