import { WebCryptoProvider } from '../src/crypto/web-crypto';
import { CryptoProvider } from '../src/core/interfaces';
import { CryptoError, LumoxErrorCode } from '../src/core/errors';
import { ConsoleLogger, LogLevel } from '../src/core/logger';
import { jest } from '@jest/globals';

// Define a global fail function that might be used in tests
function fail(message: string): never {
  throw new Error(message);
}

describe('WebCryptoProvider', () => {
  let crypto: CryptoProvider;

  beforeEach(() => {
    // Use a logger with minimal output for tests
    const logger = new ConsoleLogger({ level: LogLevel.NONE });
    crypto = new WebCryptoProvider({ logger });
  });

  it('should initialize successfully', async () => {
    await expect(crypto.initialize()).resolves.not.toThrow();
  });

  it('should generate a key', async () => {
    await crypto.initialize();
    const key = await crypto.generateKey();

    expect(key).toBeDefined();
    expect(key.type).toBe('secret');
    expect(key.algorithm.name).toBe('AES-GCM');
  });

  it('should export and import a key', async () => {
    // Arrange
    await crypto.initialize();
    const key = await crypto.generateKey();

    // Act
    const exportedKey = await crypto.exportKey(key);
    const importedKey = await crypto.importKey(exportedKey);

    // Assert
    expect(exportedKey).toBeDefined();
    expect(typeof exportedKey).toBe('string');
    expect(importedKey).toBeDefined();
    expect(importedKey.type).toBe('secret');
  });

  it('should encrypt and decrypt data', async () => {
    // Arrange
    await crypto.initialize();
    const key = await crypto.generateKey();
    const originalText = 'Hello, Lumox!';

    // Act
    const encryptedData = await crypto.encrypt(originalText, key);
    const decryptedText = await crypto.decrypt(encryptedData, key);

    // Assert
    expect(encryptedData).toBeDefined();
    expect(typeof encryptedData).toBe('string');
    expect(decryptedText).toBe(originalText);
  });

  it('should throw CryptoError with CRYPTO_KEY_IMPORT_FAILED code when importing invalid key', async () => {
    // Arrange
    await crypto.initialize();
    const invalidKeyData = 'not-a-valid-key';

    // Act & Assert
    await expect(crypto.importKey(invalidKeyData)).rejects.toThrow(CryptoError);

    try {
      await crypto.importKey(invalidKeyData);
    } catch (error) {
      expect(error).toBeInstanceOf(CryptoError);
      expect((error as CryptoError).code).toBe(LumoxErrorCode.CRYPTO_KEY_IMPORT_FAILED);
    }
  });

  it('should throw CryptoError with CRYPTO_DECRYPTION_FAILED code when decrypting invalid data', async () => {
    // Arrange
    await crypto.initialize();
    const key = await crypto.generateKey();
    const invalidData = 'not-valid-encrypted-data';

    // Act & Assert
    await expect(crypto.decrypt(invalidData, key)).rejects.toThrow(CryptoError);

    try {
      await crypto.decrypt(invalidData, key);
    } catch (error) {
      expect(error).toBeInstanceOf(CryptoError);
      expect((error as CryptoError).code).toBe(LumoxErrorCode.CRYPTO_DECRYPTION_FAILED);
    }
  });

  it('should provide additional context in errors', async () => {
    // Arrange
    await crypto.initialize();
    const key = await crypto.generateKey();
    const invalidData = 'not-valid-encrypted-data';

    // Act & Assert
    try {
      await crypto.decrypt(invalidData, key);
      fail('Expected decrypt to throw an error');
    } catch (error) {
      expect(error).toBeInstanceOf(CryptoError);
      expect((error as CryptoError).message).toContain('Failed to decrypt data');
      expect((error as CryptoError).cause).toBeDefined();
    }
  });
});
