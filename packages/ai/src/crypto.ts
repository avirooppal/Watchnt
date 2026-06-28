/**
 * Web Crypto AES-GCM utilities for BYOK encryption.
 * We derive a key from a user passphrase using PBKDF2.
 */

const SALT_SIZE = 16;
const IV_SIZE = 12;
const ITERATIONS = 100000;
const HASH = 'SHA-256';
const ALG = 'AES-GCM';

/**
 * Encrypted payload containing everything needed to decrypt (except the password).
 */
export interface EncryptedPayload {
  salt: string; // Base64
  iv: string;   // Base64
  data: string; // Base64
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derives a CryptoKey from a password string and a salt.
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: HASH
    },
    keyMaterial,
    { name: ALG, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a plaintext string using a password.
 */
export async function encryptText(plaintext: string, password: string): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_SIZE));
  const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));
  
  const key = await deriveKey(password, salt);
  const enc = new TextEncoder();
  
  const encryptedContent = await crypto.subtle.encrypt(
    {
      name: ALG,
      iv
    },
    key,
    enc.encode(plaintext)
  );
  
  return {
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    data: bufferToBase64(encryptedContent)
  };
}

/**
 * Decrypts a payload back to a plaintext string using the password.
 */
export async function decryptText(payload: EncryptedPayload, password: string): Promise<string> {
  const salt = new Uint8Array(base64ToBuffer(payload.salt));
  const iv = new Uint8Array(base64ToBuffer(payload.iv));
  const encryptedData = base64ToBuffer(payload.data);
  
  const key = await deriveKey(password, salt);
  
  const decryptedContent = await crypto.subtle.decrypt(
    {
      name: ALG,
      iv
    },
    key,
    encryptedData
  );
  
  const dec = new TextDecoder();
  return dec.decode(decryptedContent);
}
