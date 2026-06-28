import { describe, it, expect } from 'vitest';
import { encryptText, decryptText, type EncryptedPayload } from '../../src/crypto.js';

describe('Web Crypto BYOK Utility', () => {
  it('encrypts and decrypts text with the correct password', async () => {
    const secret = 'sk-my-super-secret-key';
    const password = 'my-master-passphrase';
    
    const encrypted: EncryptedPayload = await encryptText(secret, password);
    
    expect(encrypted.data).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.salt).toBeDefined();
    expect(encrypted.data).not.toBe(secret); // Sanity check it's not plaintext
    
    const decrypted = await decryptText(encrypted, password);
    expect(decrypted).toBe(secret);
  });
  
  it('fails to decrypt with the wrong password', async () => {
    const secret = 'sk-another-secret';
    const password = 'correct-horse-battery-staple';
    
    const encrypted = await encryptText(secret, password);
    
    // Attempting to decrypt with a different password should throw a crypto OperationError
    await expect(decryptText(encrypted, 'wrong-password')).rejects.toThrow();
  });
});
