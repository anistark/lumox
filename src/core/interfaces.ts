import { EncryptedMessage, MessageId, UserId, EncryptedData } from './types.js';

export interface StorageProvider {
  initialize(): Promise<void>;
  close(): Promise<void>;
  
  // Message operations
  saveMessage(message: EncryptedMessage): Promise<MessageId>;
  getMessage(id: MessageId): Promise<EncryptedMessage | null>;
  getMessagesBetweenUsers(user1Id: UserId, user2Id: UserId, limit?: number, offset?: number): Promise<EncryptedMessage[]>;
  deleteMessage(id: MessageId): Promise<boolean>;
  
  // Bulk operations
  saveMessages(messages: EncryptedMessage[]): Promise<MessageId[]>;
  
  // Database operations
  export(): Promise<Uint8Array>;
  import(data: Uint8Array, overwrite?: boolean): Promise<void>;
}

export interface CryptoProvider {
  initialize(): Promise<void>;
  
  // Key management
  generateKey(): Promise<CryptoKey>;
  exportKey(key: CryptoKey): Promise<string>;
  importKey(keyData: string): Promise<CryptoKey>;
  
  // Encryption/Decryption
  encrypt(data: string, key: CryptoKey): Promise<EncryptedData>;
  decrypt(encryptedData: EncryptedData, key: CryptoKey): Promise<string>;
}
