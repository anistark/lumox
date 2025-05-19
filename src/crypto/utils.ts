import { CryptoError } from '../core/errors';

/**
 * Generates a random string of specified length 
 * (useful for nonces, salts, etc.)
 */
export function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hashes data using SHA-256
 */
export async function sha256(data: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encodedData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    throw new CryptoError(`SHA-256 hashing failed: ${(error as Error).message}`);
  }
}

/**
 * Converts a string to a Uint8Array using UTF-8 encoding
 */
export function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Converts a Uint8Array to a string using UTF-8 encoding
 */
export function uint8ArrayToString(array: Uint8Array): string {
  return new TextDecoder().decode(array);
}

/**
 * Converts a base64 string to a Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Converts a Uint8Array to a base64 string
 */
export function uint8ArrayToBase64(array: Uint8Array): string {
  let binaryString = '';
  for (let i = 0; i < array.byteLength; i++) {
    binaryString += String.fromCharCode(array[i]);
  }
  return btoa(binaryString);
}

/**
 * Creates a key derivation function using PBKDF2
 * This is useful for deriving encryption keys from passwords
 */
export async function deriveKeyFromPassword(
  password: string, 
  salt: string, 
  iterations: number = 100000
): Promise<CryptoKey> {
  try {
    // Convert password and salt to byte arrays
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);
    const saltBytes = encoder.encode(salt);
    
    // Import the password as a key
    const baseKey = await crypto.subtle.importKey(
      'raw',
      passwordBytes,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    // Derive an AES-GCM key using PBKDF2
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations,
        hash: 'SHA-256'
      },
      baseKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
  } catch (error) {
    throw new CryptoError(`Key derivation failed: ${(error as Error).message}`);
  }
}

/**
 * Generates a cryptographically secure random key
 * for use with symmetric encryption
 */
export async function generateSymmetricKey(): Promise<CryptoKey> {
  try {
    return crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
  } catch (error) {
    throw new CryptoError(`Failed to generate symmetric key: ${(error as Error).message}`);
  }
}

/**
 * Generate a key pair for asymmetric encryption
 */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  try {
    return crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true,
      ['deriveKey']
    );
  } catch (error) {
    throw new CryptoError(`Failed to generate key pair: ${(error as Error).message}`);
  }
}

/**
 * Derive a shared secret from a private key and a public key
 * Useful for implementing end-to-end encryption
 */
export async function deriveSharedSecret(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<CryptoKey> {
  try {
    return crypto.subtle.deriveKey(
      {
        name: 'ECDH',
        public: publicKey
      },
      privateKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
  } catch (error) {
    throw new CryptoError(`Failed to derive shared secret: ${(error as Error).message}`);
  }
}

/**
 * Export a CryptoKey to JWK format
 */
export async function exportKeyToJwk(key: CryptoKey): Promise<JsonWebKey> {
  try {
    return crypto.subtle.exportKey('jwk', key);
  } catch (error) {
    throw new CryptoError(`Failed to export key to JWK: ${(error as Error).message}`);
  }
}

/**
 * Import a key from JWK format
 */
export async function importKeyFromJwk(
  jwk: JsonWebKey,
  algorithm: string,
  keyUsages: KeyUsage[]
): Promise<CryptoKey> {
  try {
    const alg = jwk.alg || algorithm;
    
    if (alg === 'ECDH') {
      return crypto.subtle.importKey(
        'jwk',
        jwk,
        {
          name: 'ECDH',
          namedCurve: jwk.crv || 'P-256'
        },
        true,
        keyUsages
      );
    } else if (alg === 'AES-GCM') {
      return crypto.subtle.importKey(
        'jwk',
        jwk,
        {
          name: 'AES-GCM',
          length: (jwk.k?.length || 32) * 8
        },
        true,
        keyUsages
      );
    } else {
      throw new Error(`Unsupported algorithm: ${alg}`);
    }
  } catch (error) {
    throw new CryptoError(`Failed to import key from JWK: ${(error as Error).message}`);
  }
}

/**
 * Creates a key from a signature or seed
 * This is useful for deriving deterministic keys from wallet signatures
 */
export async function keyFromSignature(signature: string): Promise<CryptoKey> {
  try {
    // First hash the signature to ensure proper length and format
    const hash = await sha256(signature);
    const signatureBytes = stringToUint8Array(hash);
    
    // Import as raw key
    return crypto.subtle.importKey(
      'raw',
      signatureBytes,
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
  } catch (error) {
    throw new CryptoError(`Failed to create key from signature: ${(error as Error).message}`);
  }
}
