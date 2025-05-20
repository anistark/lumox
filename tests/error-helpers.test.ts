import { 
  LumoxError, 
  LumoxErrorCode, 
  CryptoError, 
  StorageError 
} from '../src/core/errors';
import { 
  isLumoxErrorCode, 
  isErrorCategory, 
  isStorageError, 
  isCryptoError, 
  isInitializationError, 
  isNotInitializedError, 
  unwrapError, 
  formatError, 
  getUserFriendlyErrorMessage 
} from '../src/core/error-helpers';

describe('Error Helpers', () => {
  describe('isLumoxErrorCode', () => {
    it('should identify errors with specific code', () => {
      const error = new LumoxError(LumoxErrorCode.STORAGE_READ_ERROR, 'Test error');
      
      expect(isLumoxErrorCode(error, LumoxErrorCode.STORAGE_READ_ERROR)).toBe(true);
      expect(isLumoxErrorCode(error, LumoxErrorCode.STORAGE_WRITE_ERROR)).toBe(false);
      expect(isLumoxErrorCode(new Error('Test error'), LumoxErrorCode.STORAGE_READ_ERROR)).toBe(false);
    });
  });
  
  describe('isErrorCategory', () => {
    it('should identify errors in specific categories', () => {
      const storageError = new StorageError(LumoxErrorCode.STORAGE_READ_ERROR, 'Test error');
      const cryptoError = new CryptoError(LumoxErrorCode.CRYPTO_ENCRYPTION_FAILED, 'Test error');
      
      expect(isErrorCategory(storageError, 'LUMOX-3')).toBe(true);
      expect(isErrorCategory(cryptoError, 'LUMOX-3')).toBe(false);
      expect(isErrorCategory(cryptoError, 'LUMOX-5')).toBe(true);
      expect(isErrorCategory(new Error('Test error'), 'LUMOX-3')).toBe(false);
    });
  });
  
  describe('isStorageError', () => {
    it('should identify storage errors', () => {
      const storageError = new StorageError(LumoxErrorCode.STORAGE_READ_ERROR, 'Test error');
      const cryptoError = new CryptoError(LumoxErrorCode.CRYPTO_ENCRYPTION_FAILED, 'Test error');
      
      expect(isStorageError(storageError)).toBe(true);
      expect(isStorageError(cryptoError)).toBe(false);
      expect(isStorageError(new Error('Test error'))).toBe(false);
    });
  });
  
  describe('isCryptoError', () => {
    it('should identify crypto errors', () => {
      const storageError = new StorageError(LumoxErrorCode.STORAGE_READ_ERROR, 'Test error');
      const cryptoError = new CryptoError(LumoxErrorCode.CRYPTO_ENCRYPTION_FAILED, 'Test error');
      
      expect(isCryptoError(storageError)).toBe(false);
      expect(isCryptoError(cryptoError)).toBe(true);
      expect(isCryptoError(new Error('Test error'))).toBe(false);
    });
  });
  
  describe('isInitializationError', () => {
    it('should identify initialization errors', () => {
      const initError = new LumoxError(LumoxErrorCode.INITIALIZATION_FAILED, 'Test error');
      const cryptoError = new CryptoError(LumoxErrorCode.CRYPTO_ENCRYPTION_FAILED, 'Test error');
      
      expect(isInitializationError(initError)).toBe(true);
      expect(isInitializationError(cryptoError)).toBe(false);
      expect(isInitializationError(new Error('Test error'))).toBe(false);
    });
  });
  
  describe('isNotInitializedError', () => {
    it('should identify not initialized errors', () => {
      const notInitError = new LumoxError(LumoxErrorCode.NOT_INITIALIZED, 'Test error');
      const cryptoError = new CryptoError(LumoxErrorCode.CRYPTO_ENCRYPTION_FAILED, 'Test error');
      
      expect(isNotInitializedError(notInitError)).toBe(true);
      expect(isNotInitializedError(cryptoError)).toBe(false);
      expect(isNotInitializedError(new Error('Test error'))).toBe(false);
    });
  });
  
  describe('unwrapError', () => {
    it('should unwrap nested errors', () => {
      const originalError = new Error('Original error');
      const cryptoError = new CryptoError(
        LumoxErrorCode.CRYPTO_ENCRYPTION_FAILED, 
        'Crypto error', 
        { cause: originalError }
      );
      const lumoxError = new LumoxError(
        LumoxErrorCode.UNKNOWN_ERROR, 
        'Lumox error', 
        { cause: cryptoError }
      );
      
      expect(unwrapError(lumoxError)).toBe(originalError);
      expect(unwrapError(cryptoError)).toBe(originalError);
      expect(unwrapError(originalError)).toBe(originalError);
      expect(unwrapError('not an error')).toBe('not an error');
    });
  });
  
  describe('formatError', () => {
    it('should format errors appropriately', () => {
      const lumoxError = new LumoxError(LumoxErrorCode.STORAGE_READ_ERROR, 'Failed to read file');
      const standardError = new Error('Standard error');
      
      expect(formatError(lumoxError)).toBe('LUMOX-3003: Failed to read file');
      expect(formatError(standardError)).toBe('Standard error');
      expect(formatError('string error')).toBe('string error');
      expect(formatError(123)).toBe('123');
    });
  });
  
  describe('getUserFriendlyErrorMessage', () => {
    it('should return user-friendly messages for error codes', () => {
      expect(getUserFriendlyErrorMessage(LumoxErrorCode.STORAGE_READ_ERROR))
        .toBe('Failed to read data from storage.');
      expect(getUserFriendlyErrorMessage(LumoxErrorCode.CRYPTO_KEY_NOT_SET))
        .toBe('Encryption key is not set.');
      expect(getUserFriendlyErrorMessage(LumoxErrorCode.INITIALIZATION_FAILED))
        .toBe('Failed to initialize the system.');
      expect(getUserFriendlyErrorMessage('UNKNOWN_CODE' as LumoxErrorCode))
        .toBe('An error occurred.');
    });
  });
});
