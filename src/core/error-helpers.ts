import { LumoxError, LumoxErrorCode } from './errors';

/**
 * Determines if an error is a specific Lumox error code
 *
 * @param error - The error to check
 * @param code - The error code to check against
 * @returns True if the error is a LumoxError with the specified code
 */
export function isLumoxErrorCode(error: unknown, code: LumoxErrorCode): boolean {
  return error instanceof LumoxError && error.code === code;
}

/**
 * Determines if an error is in a specific category based on its code prefix
 *
 * @param error - The error to check
 * @param codePrefix - The prefix of the error code (e.g., 'LUMOX-1' for general errors, 'LUMOX-3' for storage errors)
 * @returns True if the error is a LumoxError with a code that starts with the specified prefix
 */
export function isErrorCategory(error: unknown, codePrefix: string): boolean {
  return error instanceof LumoxError && error.code.startsWith(codePrefix);
}

/**
 * Determines if an error is a storage-related error
 *
 * @param error - The error to check
 * @returns True if the error is a storage-related error
 */
export function isStorageError(error: unknown): boolean {
  return isErrorCategory(error, 'LUMOX-3');
}

/**
 * Determines if an error is a crypto-related error
 *
 * @param error - The error to check
 * @returns True if the error is a crypto-related error
 */
export function isCryptoError(error: unknown): boolean {
  return isErrorCategory(error, 'LUMOX-5');
}

/**
 * Determines if an error is related to initialization
 *
 * @param error - The error to check
 * @returns True if the error is related to initialization
 */
export function isInitializationError(error: unknown): boolean {
  return isErrorCategory(error, 'LUMOX-2');
}

/**
 * Determines if an error indicates that an operation was performed on an uninitialized component
 *
 * @param error - The error to check
 * @returns True if the error indicates that the component was not initialized
 */
export function isNotInitializedError(error: unknown): boolean {
  return isLumoxErrorCode(error, LumoxErrorCode.NOT_INITIALIZED);
}

/**
 * Safely unwraps the original error from a LumoxError chain
 *
 * @param error - The error to unwrap
 * @returns The original error that caused the error chain, or the input error if no cause is found
 */
export function unwrapError(error: unknown): unknown {
  if (error instanceof LumoxError && error.cause) {
    return unwrapError(error.cause);
  }

  return error;
}

/**
 * Formats an error for display, including its code and message
 *
 * @param error - The error to format
 * @returns A formatted string representation of the error
 */
export function formatError(error: unknown): string {
  if (error instanceof LumoxError) {
    return `${error.code}: ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

/**
 * Gets a user-friendly message for a specific error code
 *
 * @param code - The error code
 * @returns A user-friendly message for the error code
 */
export function getUserFriendlyErrorMessage(code: LumoxErrorCode): string {
  switch (code) {
    // General errors
    case LumoxErrorCode.UNKNOWN_ERROR:
      return 'An unexpected error occurred.';
    case LumoxErrorCode.INVALID_PARAMETER:
      return 'One or more parameters are invalid.';
    case LumoxErrorCode.NOT_IMPLEMENTED:
      return 'This feature is not yet implemented.';
    case LumoxErrorCode.OPERATION_TIMEOUT:
      return 'The operation timed out.';

    // Initialization errors
    case LumoxErrorCode.INITIALIZATION_FAILED:
      return 'Failed to initialize the system.';
    case LumoxErrorCode.ALREADY_INITIALIZED:
      return 'The system is already initialized.';
    case LumoxErrorCode.NOT_INITIALIZED:
      return 'The system is not initialized.';

    // Storage errors
    case LumoxErrorCode.STORAGE_INITIALIZATION_FAILED:
      return 'Failed to initialize the storage system.';
    case LumoxErrorCode.STORAGE_NOT_INITIALIZED:
      return 'The storage system is not initialized.';
    case LumoxErrorCode.STORAGE_CONNECTION_ERROR:
      return 'Failed to connect to the storage system.';
    case LumoxErrorCode.STORAGE_READ_ERROR:
      return 'Failed to read data from storage.';
    case LumoxErrorCode.STORAGE_WRITE_ERROR:
      return 'Failed to write data to storage.';
    case LumoxErrorCode.STORAGE_DELETE_ERROR:
      return 'Failed to delete data from storage.';
    case LumoxErrorCode.STORAGE_EXPORT_ERROR:
      return 'Failed to export data from storage.';
    case LumoxErrorCode.STORAGE_IMPORT_ERROR:
      return 'Failed to import data to storage.';
    case LumoxErrorCode.STORAGE_SCHEMA_ERROR:
      return 'Storage schema error.';
    case LumoxErrorCode.STORAGE_TRANSACTION_ERROR:
      return 'Storage transaction failed.';

    // Message errors
    case LumoxErrorCode.MESSAGE_NOT_FOUND:
      return 'The requested message was not found.';
    case LumoxErrorCode.MESSAGE_ALREADY_EXISTS:
      return 'A message with this ID already exists.';
    case LumoxErrorCode.MESSAGE_VALIDATION_ERROR:
      return 'The message failed validation.';
    case LumoxErrorCode.MESSAGE_LIMIT_EXCEEDED:
      return 'Message limit exceeded.';

    // Crypto errors
    case LumoxErrorCode.CRYPTO_INITIALIZATION_FAILED:
      return 'Failed to initialize the crypto system.';
    case LumoxErrorCode.CRYPTO_KEY_GENERATION_FAILED:
      return 'Failed to generate encryption key.';
    case LumoxErrorCode.CRYPTO_ENCRYPTION_FAILED:
      return 'Failed to encrypt data.';
    case LumoxErrorCode.CRYPTO_DECRYPTION_FAILED:
      return 'Failed to decrypt data.';
    case LumoxErrorCode.CRYPTO_KEY_EXPORT_FAILED:
      return 'Failed to export the encryption key.';
    case LumoxErrorCode.CRYPTO_KEY_IMPORT_FAILED:
      return 'Failed to import the encryption key.';
    case LumoxErrorCode.CRYPTO_NOT_AVAILABLE:
      return 'Cryptography is not available in this environment.';
    case LumoxErrorCode.CRYPTO_KEY_NOT_SET:
      return 'Encryption key is not set.';

    // Configuration errors
    case LumoxErrorCode.INVALID_CONFIGURATION:
      return 'The configuration is invalid.';
    case LumoxErrorCode.MISSING_REQUIRED_CONFIGURATION:
      return 'Required configuration is missing.';

    // IPFS errors
    case LumoxErrorCode.IPFS_CONNECTION_ERROR:
      return 'Failed to connect to IPFS.';
    case LumoxErrorCode.IPFS_UPLOAD_ERROR:
      return 'Failed to upload to IPFS.';
    case LumoxErrorCode.IPFS_DOWNLOAD_ERROR:
      return 'Failed to download from IPFS.';
    case LumoxErrorCode.IPFS_NOT_AVAILABLE:
      return 'IPFS is not available.';

    default:
      return 'An error occurred.';
  }
}
