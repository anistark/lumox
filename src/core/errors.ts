/**
 * Error codes used throughout the Lumox SDK.
 * These provide consistent error identification for client error handling.
 */
export enum LumoxErrorCode {
  // General errors (1000-1999)
  UNKNOWN_ERROR = 'LUMOX-1000',
  INVALID_PARAMETER = 'LUMOX-1001',
  NOT_IMPLEMENTED = 'LUMOX-1002',
  OPERATION_TIMEOUT = 'LUMOX-1003',
  
  // Initialization errors (2000-2999)
  INITIALIZATION_FAILED = 'LUMOX-2000',
  ALREADY_INITIALIZED = 'LUMOX-2001',
  NOT_INITIALIZED = 'LUMOX-2002',
  
  // Storage errors (3000-3999)
  STORAGE_INITIALIZATION_FAILED = 'LUMOX-3000',
  STORAGE_NOT_INITIALIZED = 'LUMOX-3001',
  STORAGE_CONNECTION_ERROR = 'LUMOX-3002',
  STORAGE_READ_ERROR = 'LUMOX-3003',
  STORAGE_WRITE_ERROR = 'LUMOX-3004',
  STORAGE_DELETE_ERROR = 'LUMOX-3005',
  STORAGE_EXPORT_ERROR = 'LUMOX-3006',
  STORAGE_IMPORT_ERROR = 'LUMOX-3007',
  STORAGE_SCHEMA_ERROR = 'LUMOX-3008',
  STORAGE_TRANSACTION_ERROR = 'LUMOX-3009',
  
  // Message errors (4000-4999)
  MESSAGE_NOT_FOUND = 'LUMOX-4000',
  MESSAGE_ALREADY_EXISTS = 'LUMOX-4001',
  MESSAGE_VALIDATION_ERROR = 'LUMOX-4002',
  MESSAGE_LIMIT_EXCEEDED = 'LUMOX-4003',
  
  // Crypto errors (5000-5999)
  CRYPTO_INITIALIZATION_FAILED = 'LUMOX-5000',
  CRYPTO_KEY_GENERATION_FAILED = 'LUMOX-5001',
  CRYPTO_ENCRYPTION_FAILED = 'LUMOX-5002',
  CRYPTO_DECRYPTION_FAILED = 'LUMOX-5003',
  CRYPTO_KEY_EXPORT_FAILED = 'LUMOX-5004',
  CRYPTO_KEY_IMPORT_FAILED = 'LUMOX-5005',
  CRYPTO_NOT_AVAILABLE = 'LUMOX-5006',
  CRYPTO_KEY_NOT_SET = 'LUMOX-5007',
  
  // Configuration errors (6000-6999)
  INVALID_CONFIGURATION = 'LUMOX-6000',
  MISSING_REQUIRED_CONFIGURATION = 'LUMOX-6001',
  
  // IPFS errors (7000-7999) - Reserved for future implementation
  IPFS_CONNECTION_ERROR = 'LUMOX-7000',
  IPFS_UPLOAD_ERROR = 'LUMOX-7001',
  IPFS_DOWNLOAD_ERROR = 'LUMOX-7002',
  IPFS_NOT_AVAILABLE = 'LUMOX-7003',
}

/**
 * Base error class for all Lumox errors.
 * Includes an error code for consistent error identification.
 */
export class LumoxError extends Error {
  /** Error code for categorization and handling */
  public readonly code: LumoxErrorCode;
  
  /** Original error that caused this error, if any */
  public readonly cause?: Error;
  
  /** Additional context that might help with debugging */
  public readonly context?: Record<string, any>;
  
  /**
   * Create a new Lumox error
   * 
   * @param code - The error code
   * @param message - Error message
   * @param options - Additional error options
   */
  constructor(
    code: LumoxErrorCode,
    message: string,
    options?: {
      cause?: Error;
      context?: Record<string, any>;
    }
  ) {
    super(message);
    this.name = 'LumoxError';
    this.code = code;
    this.cause = options?.cause;
    this.context = options?.context;
    
    // Ensure proper prototype chain for instanceof checks
    // This is needed because TypeScript subclasses built-in types
    Object.setPrototypeOf(this, LumoxError.prototype);
  }
  
  /**
   * Get a structured representation of the error
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      cause: this.cause ? 
        (this.cause instanceof LumoxError ? 
          this.cause.toJSON() : 
          { message: this.cause.message, name: this.cause.name }
        ) : undefined
    };
  }
}

/**
 * Error thrown when a storage operation fails.
 */
export class StorageError extends LumoxError {
  /**
   * Create a new storage error
   * 
   * @param code - The error code
   * @param message - Error message
   * @param options - Additional error options
   */
  constructor(
    code: LumoxErrorCode,
    message: string,
    options?: {
      cause?: Error;
      context?: Record<string, any>;
    }
  ) {
    super(code, `Storage error: ${message}`, options);
    this.name = 'StorageError';
    
    // Ensure proper prototype chain
    Object.setPrototypeOf(this, StorageError.prototype);
  }
}

/**
 * Error thrown when a cryptographic operation fails.
 */
export class CryptoError extends LumoxError {
  /**
   * Create a new crypto error
   * 
   * @param code - The error code
   * @param message - Error message
   * @param options - Additional error options
   */
  constructor(
    code: LumoxErrorCode,
    message: string,
    options?: {
      cause?: Error;
      context?: Record<string, any>;
    }
  ) {
    super(code, `Crypto error: ${message}`, options);
    this.name = 'CryptoError';
    
    // Ensure proper prototype chain
    Object.setPrototypeOf(this, CryptoError.prototype);
  }
}

/**
 * Error thrown when a validation fails.
 */
export class ValidationError extends LumoxError {
  /**
   * Create a new validation error
   * 
   * @param message - Error message
   * @param options - Additional error options
   */
  constructor(
    message: string,
    options?: {
      cause?: Error;
      context?: Record<string, any>;
    }
  ) {
    super(LumoxErrorCode.INVALID_PARAMETER, `Validation error: ${message}`, options);
    this.name = 'ValidationError';
    
    // Ensure proper prototype chain
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Error thrown when an operation is performed on an uninitialized component.
 */
export class NotInitializedError extends LumoxError {
  /**
   * Create a new not initialized error
   * 
   * @param component - The component that is not initialized
   * @param options - Additional error options
   */
  constructor(
    component: string,
    options?: {
      cause?: Error;
      context?: Record<string, any>;
    }
  ) {
    super(
      LumoxErrorCode.NOT_INITIALIZED,
      `The ${component} is not initialized. Call initialize() first.`,
      options
    );
    this.name = 'NotInitializedError';
    
    // Ensure proper prototype chain
    Object.setPrototypeOf(this, NotInitializedError.prototype);
  }
}

/**
 * Error thrown when a configuration is invalid.
 */
export class ConfigurationError extends LumoxError {
  /**
   * Create a new configuration error
   * 
   * @param message - Error message
   * @param options - Additional error options
   */
  constructor(
    message: string,
    options?: {
      cause?: Error;
      context?: Record<string, any>;
    }
  ) {
    super(LumoxErrorCode.INVALID_CONFIGURATION, `Configuration error: ${message}`, options);
    this.name = 'ConfigurationError';
    
    // Ensure proper prototype chain
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}
