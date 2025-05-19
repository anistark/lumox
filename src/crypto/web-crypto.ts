import { CryptoProvider } from '../core/interfaces';
import { EncryptedData } from '../core/types';
import { CryptoError } from '../core/errors';

export class WebCryptoProvider implements CryptoProvider {
  private subtle: SubtleCrypto;
  
  constructor() {
    // Check if WebCrypto is available
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      throw new CryptoError('WebCrypto is not available in this environment.');
    }
    
    this.subtle = crypto.subtle;
  }
  
  async initialize(): Promise<void> {
    // No initialization needed for WebCrypto
  }
  
  async generateKey(): Promise<CryptoKey> {
    try {
      return this.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256
        },
        true, // extractable
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      throw new CryptoError(`Failed to generate key: ${(error as Error).message}`);
    }
  }
  
  async exportKey(key: CryptoKey): Promise<string> {
    try {
      const keyData = await this.subtle.exportKey('raw', key);
      return btoa(String.fromCharCode(...new Uint8Array(keyData)));
    } catch (error) {
      throw new CryptoError(`Failed to export key: ${(error as Error).message}`);
    }
  }
  
  async importKey(keyData: string): Promise<CryptoKey> {
    try {
      const rawKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
      
      return this.subtle.importKey(
        'raw',
        rawKey,
        {
          name: 'AES-GCM',
          length: 256
        },
        true,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      throw new CryptoError(`Failed to import key: ${(error as Error).message}`);
    }
  }
  
  async encrypt(data: string, key: CryptoKey): Promise<EncryptedData> {
    try {
      // Generate a random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encode the data as UTF-8
      const encodedData = new TextEncoder().encode(data);
      
      // Encrypt the data
      const encryptedBuffer = await this.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv
        },
        key,
        encodedData
      );
      
      // Combine IV and encrypted data
      const encryptedArray = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      encryptedArray.set(iv);
      encryptedArray.set(new Uint8Array(encryptedBuffer), iv.length);
      
      // Convert to base64 string for storage
      return btoa(String.fromCharCode(...encryptedArray));
    } catch (error) {
      throw new CryptoError(`Failed to encrypt data: ${(error as Error).message}`);
    }
  }
  
  async decrypt(encryptedData: EncryptedData, key: CryptoKey): Promise<string> {
    try {
      // Decode the base64 string
      const encryptedArray = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
      
      // Extract the IV (first 12 bytes)
      const iv = encryptedArray.slice(0, 12);
      
      // Extract the encrypted data (everything after the IV)
      const encryptedBuffer = encryptedArray.slice(12);
      
      // Decrypt the data
      const decryptedBuffer = await this.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv
        },
        key,
        encryptedBuffer
      );
      
      // Decode the data from UTF-8
      return new TextDecoder().decode(decryptedBuffer);
    } catch (error) {
      throw new CryptoError(`Failed to decrypt data: ${(error as Error).message}`);
    }
  }
}
