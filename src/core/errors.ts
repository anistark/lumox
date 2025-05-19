export class LumoxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LumoxError';
  }
}

export class StorageError extends LumoxError {
  constructor(message: string) {
    super(`Storage error: ${message}`);
    this.name = 'StorageError';
  }
}

export class CryptoError extends LumoxError {
  constructor(message: string) {
    super(`Crypto error: ${message}`);
    this.name = 'CryptoError';
  }
}
