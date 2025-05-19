import { CryptoProvider, StorageProvider } from './core/interfaces.js';
import { EncryptedMessage, Message, MessageId, UserId } from './core/types.js';

export interface LumoxConfig {
  storage: StorageProvider;
  crypto: CryptoProvider;
}

export class LumoxClient {
  private storage: StorageProvider;
  private crypto: CryptoProvider;
  private encryptionKey?: CryptoKey;
  
  constructor(config: LumoxConfig) {
    this.storage = config.storage;
    this.crypto = config.crypto;
  }
  
  async initialize(): Promise<void> {
    await this.storage.initialize();
    await this.crypto.initialize();
  }
  
  async setEncryptionKey(key: CryptoKey): Promise<void> {
    this.encryptionKey = key;
  }
  
  async generateEncryptionKey(): Promise<CryptoKey> {
    const key = await this.crypto.generateKey();
    this.encryptionKey = key;
    return key;
  }
  
  async exportEncryptionKey(): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not set. Call setEncryptionKey or generateEncryptionKey first.');
    }
    
    return this.crypto.exportKey(this.encryptionKey);
  }
  
  async importEncryptionKey(keyData: string): Promise<void> {
    const key = await this.crypto.importKey(keyData);
    this.encryptionKey = key;
  }
  
  async sendMessage(senderId: UserId, receiverId: UserId, content: string, metadata?: Record<string, any>): Promise<MessageId> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not set. Call setEncryptionKey or generateEncryptionKey first.');
    }
    
    const timestamp = Date.now();
    const id = `${senderId}-${receiverId}-${timestamp}-${Math.random().toString(36).substring(2, 10)}`;
    
    const encryptedContent = await this.crypto.encrypt(content, this.encryptionKey);
    
    const encryptedMessage: EncryptedMessage = {
      id,
      senderId,
      receiverId,
      encryptedContent,
      timestamp,
      metadata
    };
    
    return this.storage.saveMessage(encryptedMessage);
  }
  
  async getMessages(user1Id: UserId, user2Id: UserId, limit?: number, offset?: number): Promise<Message[]> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not set. Call setEncryptionKey or generateEncryptionKey first.');
    }
    
    const encryptedMessages = await this.storage.getMessagesBetweenUsers(user1Id, user2Id, limit, offset);
    
    return Promise.all(encryptedMessages.map(async (encryptedMessage) => {
      const content = await this.crypto.decrypt(encryptedMessage.encryptedContent, this.encryptionKey!);
      
      return {
        id: encryptedMessage.id,
        senderId: encryptedMessage.senderId,
        receiverId: encryptedMessage.receiverId,
        content,
        timestamp: encryptedMessage.timestamp,
        metadata: encryptedMessage.metadata
      };
    }));
  }
  
  async exportData(): Promise<Uint8Array> {
    return this.storage.export();
  }
  
  async importData(data: Uint8Array, overwrite: boolean = false): Promise<void> {
    await this.storage.import(data, overwrite);
  }
  
  async close(): Promise<void> {
    await this.storage.close();
  }
}
