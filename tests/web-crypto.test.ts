import { WebCryptoProvider } from '../src/crypto/web-crypto';
import { CryptoProvider } from '../src/core/interfaces';

describe('WebCryptoProvider', () => {
  let crypto: CryptoProvider;
  
  beforeEach(() => {
    crypto = new WebCryptoProvider();
  });
  
  it('should initialize successfully', async () => {
    await expect(crypto.initialize()).resolves.not.toThrow();
  });
  
  it('should generate a key', async () => {
    const key = await crypto.generateKey();
    
    expect(key).toBeDefined();
    expect(key.type).toBe('secret');
    expect(key.algorithm.name).toBe('AES-GCM');
  });
  
  it('should export and import a key', async () => {
    // Arrange
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
});
