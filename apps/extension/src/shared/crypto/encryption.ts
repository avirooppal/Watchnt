export class WebCryptoHelper {
  private static readonly ALGO = 'AES-GCM';
  
  static async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      { name: this.ALGO, length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  static async encrypt(data: string, key: CryptoKey): Promise<{ cipherText: ArrayBuffer, iv: Uint8Array }> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);
    const cipherText = await crypto.subtle.encrypt(
      { name: this.ALGO, iv },
      key,
      encodedData
    );
    return { cipherText, iv };
  }

  static async decrypt(cipherText: ArrayBuffer, key: CryptoKey, iv: Uint8Array): Promise<string> {
    const decryptedData = await crypto.subtle.decrypt(
      { name: this.ALGO, iv },
      key,
      cipherText
    );
    return new TextDecoder().decode(decryptedData);
  }
}
