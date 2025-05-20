import { CryptoProvider } from '../core/interfaces';
import { EncryptedData } from '../core/types';
import { CryptoError, LumoxErrorCode } from '../core/errors';
import { Logger, NullLogger } from '../core/logger';

/**
 * Options for configuring the WebCryptoProvider.
 */
export interface WebCryptoProviderOptions {
  /**
   * Logger instance for the provider.
   */
  logger?: Logger;
}

/**
 * Implementation of CryptoProvider using the WebCrypto API.
 * 
 * This provider uses AES-GCM for encryption and provides a standard
 * interface for key management and data encryption/decryption.
 */
export class WebCryptoProvider implements CryptoProvider {
  private subtle: SubtleCrypto;
  private logger: Logger;
  private initialized: boolean = false;
  
  /**
   * Creates a new WebCryptoProvider instance.
   * 
   * @param options - Configuration options for the provider
   * @throws {CryptoError} If WebCrypto is not available in the environment
   */
  constructor(options: WebCryptoProviderOptions = {}) {
    // Check if WebCrypto is available
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      throw new CryptoError(
        LumoxErrorCode.CRYPTO_NOT_AVAILABLE,
        'WebCrypto is not available in this environment.'
      );
    }
    
    this.subtle = crypto.subtle;
    this.logger = options.logger || new NullLogger();
  }
  
  /**
   * Initializes the provider by verifying WebCrypto functionality.
   * 
   * @returns A promise that resolves when initialization is complete
   * @throws {CryptoError} If initialization fails
   */
  async initialize(): Promise<void> {
    this.logger.debug('Initializing WebCryptoProvider');
    
    // Basic check to ensure WebCrypto is functional
    try {
      // Simple test to verify functionality
      await this.subtle.digest('SHA-256', new Uint8Array([1, 2, 3]));
      this.initialized = true;
      this.logger.info('WebCryptoProvider initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize WebCryptoProvider', error as Error);
      throw new CryptoError(
        LumoxErrorCode.CRYPTO_INITIALIZATION_FAILED,
        'WebCrypto initialization check failed',
        { cause: error as Error }
      );
    }
  }
  
  /**
   * Ensures that the provider is initialized before performing operations.
   * 
   * @throws {CryptoError} If the provider is not initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new CryptoError(
        LumoxErrorCode.CRYPTO_NOT_AVAILABLE,
        'WebCryptoProvider is not initialized. Call initialize() first.'
      );
    }
  }
  
  /**
   * Generates a new AES-GCM encryption key.
   * 
   * @returns A promise that resolves to the generated CryptoKey
   * @throws {CryptoError} If key generation fails
   */
  async generateKey(): Promise<CryptoKey> {
    this.ensureInitialized();
    
    try {
      this.logger.debug('Generating new AES-GCM key');
      const key = await this.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256
        },
        true, // extractable
        ['encrypt', 'decrypt']
      );
      
      this.logger.debug('Generated new AES-GCM key successfully');
      return key;
    } catch (error) {
      this.logger.error('Failed to generate key', error as Error);
      throw new CryptoError(
        LumoxErrorCode.CRYPTO_KEY_GENERATION_FAILED,
        `Failed to generate key: ${(error as Error).message}`,
        { cause: error as Error }
      );
    }
  }
  
  /**
   * Exports a CryptoKey to a base64 string format.
   * 
   * @param key - The CryptoKey to export
   * @returns A promise that resolves to the exported key as a base64 string
   * @throws {CryptoError} If key export fails
   */
  async exportKey(key: CryptoKey): Promise<string> {
    this.ensureInitialized();
    
    try {
      this.logger.debug('Exporting key to base64');
      const keyData = await this.subtle.exportKey('raw', key);
      const base64Key = btoa(String.fromCharCode(...new Uint8Array(keyData)));
      this.logger.debug('Key exported successfully');
      return base64Key;
    } catch (error) {
      this.logger.error('Failed to export key', error as Error);
      throw new CryptoError(
        LumoxErrorCode.CRYPTO_KEY_EXPORT_FAILED,
        `Failed to export key: ${(error as Error).message}`,
        { cause: error as Error }
      );
    }
  }
  
  /**
   * Imports a key from a base64 string format.
   * 
   * @param keyData - The key data as a base64 string
   * @returns A promise that resolves to the imported CryptoKey
   * @throws {CryptoError} If key import fails
   */
  async importKey(keyData: string): Promise<CryptoKey> {
    this.ensureInitialized();
    
    try {
      this.logger.debug('Importing key from base64');
      
      // Validate the key data format
      if (typeof keyData !== 'string' || keyData.trim() === '') {
        throw new Error('Key data must be a non-empty string');
      }
      
      // Convert base64 to Uint8Array
      let rawKey: Uint8Array;
      try {
        rawKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
      } catch (error) {
        throw new Error(`Invalid base64 format: ${(error as Error).message}`);
      }
      
      // Validate key length for AES-256
      if (rawKey.length !== 32) {
        throw new Error(`Invalid key length: expected 32 bytes for AES-256, got ${rawKey.length} bytes`);
      }
      
      const key = await this.subtle.importKey(
        'raw',
        rawKey,
        {
          name: 'AES-GCM',
          length: 256
        },
        true,
        ['encrypt', 'decrypt']
      );
      
      this.logger.debug('Key imported successfully');
      return key;
    } catch (error) {
      this.logger.error('Failed to import key', error as Error);
      throw new CryptoError(
        LumoxErrorCode.CRYPTO_KEY_IMPORT_FAILED,
        `Failed to import key: ${(error as Error).message}`,
        { cause: error as Error }
      );
    }
  }
  
  /**
   * Encrypts data using AES-GCM.
   * 
   * @param data - The data to encrypt as a string
   * @param key - The encryption key
   * @returns A promise that resolves to the encrypted data as a base64 string
   * @throws {CryptoError} If encryption fails
   */
  async encrypt(data: string, key: CryptoKey): Promise<EncryptedData> {
    this.ensureInitialized();
    
    try {
      this.logger.debug('Encrypting data with AES-GCM');
      
      // Validate encryption parameters
      if (typeof data !== 'string') {
        throw new Error('Data must be a string');
      }
      
      if (!key || !(key instanceof CryptoKey)) {
        throw new Error('Invalid crypto key');
      }
      
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
      const result = btoa(String.fromCharCode(...encryptedArray));
      this.logger.debug('Data encrypted successfully');
      return result;
    } catch (error) {
      this.logger.error('Failed to encrypt data', error as Error);
      throw new CryptoError(
        LumoxErrorCode.CRYPTO_ENCRYPTION_FAILED,
        `Failed to encrypt data: ${(error as Error).message}`,
        { cause: error as Error }
      );
    }
  }
  
  /**
   * Decrypts data using AES-GCM.
   * 
   * @param encryptedData - The encrypted data as a base64 string
   * @param key - The decryption key
   * @returns A promise that resolves to the decrypted data as a string
   * @throws {CryptoError} If decryption fails
   */
  async decrypt(encryptedData: EncryptedData, key: CryptoKey): Promise<string> {
    this.ensureInitialized();
    
    try {
      this.logger.debug('Decrypting data');
      
      // Validate decryption parameters
      if (typeof encryptedData !== 'string' || encryptedData.trim() === '') {
        throw new Error('Encrypted data must be a non-empty string');
      }
      
      if (!key || !(key instanceof CryptoKey)) {
        throw new Error('Invalid crypto key');
      }
      
      // Decode the base64 string
      let encryptedArray: Uint8Array;
      try {
        encryptedArray = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
      } catch (error) {
        throw new Error(`Invalid base64 format: ${(error as Error).message}`);
      }
      
      // Ensure the data is long enough to contain IV + encrypted content
      if (encryptedArray.length <= 12) {
        throw new Error('Encrypted data is too short to contain IV and encrypted content');
      }
      
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
      const result = new TextDecoder().decode(decryptedBuffer);
      this.logger.debug('Data decrypted successfully');
      return result;
    } catch (error) {
      this.logger.error('Failed to decrypt data', error as Error);
      throw new CryptoError(
        LumoxErrorCode.CRYPTO_DECRYPTION_FAILED,
        `Failed to decrypt data: ${(error as Error).message}`,
        { cause: error as Error }
      );
    }
  }
}
