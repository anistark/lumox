import { CryptoProvider, StorageProvider } from './core/interfaces';
import { EncryptedMessage, Message, MessageId, UserId } from './core/types';
import { CryptoError, LumoxError, LumoxErrorCode, NotInitializedError } from './core/errors';
import { ConsoleLogger, Logger, LogLevel } from './core/logger';

export interface LumoxConfig {
  storage: StorageProvider;
  crypto: CryptoProvider;
  logger?: Logger;
}

export class LumoxClient {
  private storage: StorageProvider;
  private crypto: CryptoProvider;
  private encryptionKey?: CryptoKey;
  private logger: Logger;
  private initialized: boolean = false;

  constructor(config: LumoxConfig) {
    this.storage = config.storage;
    this.crypto = config.crypto;
    this.logger = config.logger || new ConsoleLogger({ level: LogLevel.INFO });
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Lumox client');
      await this.storage.initialize();
      await this.crypto.initialize();
      this.initialized = true;
      this.logger.info('Lumox client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Lumox client', error as Error);
      throw new LumoxError(
        LumoxErrorCode.INITIALIZATION_FAILED,
        'Failed to initialize Lumox client',
        { cause: error as Error }
      );
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new NotInitializedError('LumoxClient');
    }
  }

  async setEncryptionKey(key: CryptoKey): Promise<void> {
    this.ensureInitialized();
    this.encryptionKey = key;
    this.logger.debug('Encryption key set');
  }

  async generateEncryptionKey(): Promise<CryptoKey> {
    this.ensureInitialized();

    try {
      this.logger.debug('Generating new encryption key');
      const key = await this.crypto.generateKey();
      this.encryptionKey = key;
      this.logger.info('New encryption key generated');
      return key;
    } catch (error) {
      this.logger.error('Failed to generate encryption key', error as Error);
      throw new CryptoError(
        LumoxErrorCode.CRYPTO_KEY_GENERATION_FAILED,
        'Failed to generate encryption key',
        { cause: error as Error }
      );
    }
  }

  async exportEncryptionKey(): Promise<string> {
    this.ensureInitialized();

    if (!this.encryptionKey) {
      throw new CryptoError(
        LumoxErrorCode.CRYPTO_KEY_NOT_SET,
        'Encryption key not set. Call setEncryptionKey or generateEncryptionKey first.'
      );
    }

    try {
      this.logger.debug('Exporting encryption key');
      return this.crypto.exportKey(this.encryptionKey);
    } catch (error) {
      this.logger.error('Failed to export encryption key', error as Error);
      throw new CryptoError(
        LumoxErrorCode.CRYPTO_KEY_EXPORT_FAILED,
        'Failed to export encryption key',
        { cause: error as Error }
      );
    }
  }

  async importEncryptionKey(keyData: string): Promise<void> {
    this.ensureInitialized();

    try {
      this.logger.debug('Importing encryption key');
      const key = await this.crypto.importKey(keyData);
      this.encryptionKey = key;
      this.logger.info('Encryption key imported successfully');
    } catch (error) {
      this.logger.error('Failed to import encryption key', error as Error);
      throw new CryptoError(
        LumoxErrorCode.CRYPTO_KEY_IMPORT_FAILED,
        'Failed to import encryption key',
        { cause: error as Error }
      );
    }
  }

  async sendMessage(
    senderId: UserId,
    receiverId: UserId,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<MessageId> {
    this.ensureInitialized();

    if (!this.encryptionKey) {
      throw new CryptoError(
        LumoxErrorCode.CRYPTO_KEY_NOT_SET,
        'Encryption key not set. Call setEncryptionKey or generateEncryptionKey first.'
      );
    }

    try {
      const timestamp = Date.now();
      const id = `${senderId}-${receiverId}-${timestamp}-${Math.random().toString(36).substring(2, 10)}`;

      this.logger.debug(`Encrypting message from ${senderId} to ${receiverId}`);
      const encryptedContent = await this.crypto.encrypt(content, this.encryptionKey);

      const encryptedMessage: EncryptedMessage = {
        id,
        senderId,
        receiverId,
        encryptedContent,
        timestamp,
        metadata,
      };

      this.logger.debug(`Saving encrypted message with ID ${id}`);
      const messageId = await this.storage.saveMessage(encryptedMessage);
      this.logger.info(`Message sent successfully with ID ${messageId}`);

      return messageId;
    } catch (error) {
      this.logger.error(`Failed to send message from ${senderId} to ${receiverId}`, error as Error);

      if (error instanceof LumoxError) {
        throw error;
      }

      // Determine the appropriate error code
      let errorCode = LumoxErrorCode.UNKNOWN_ERROR;

      if (error instanceof CryptoError) {
        errorCode = LumoxErrorCode.CRYPTO_ENCRYPTION_FAILED;
      } else {
        errorCode = LumoxErrorCode.STORAGE_WRITE_ERROR;
      }

      throw new LumoxError(errorCode, `Failed to send message: ${(error as Error).message}`, {
        cause: error as Error,
        context: { senderId, receiverId },
      });
    }
  }

  async getMessages(
    user1Id: UserId,
    user2Id: UserId,
    limit?: number,
    offset?: number
  ): Promise<Message[]> {
    this.ensureInitialized();

    if (!this.encryptionKey) {
      throw new CryptoError(
        LumoxErrorCode.CRYPTO_KEY_NOT_SET,
        'Encryption key not set. Call setEncryptionKey or generateEncryptionKey first.'
      );
    }

    try {
      this.logger.debug(`Retrieving messages between ${user1Id} and ${user2Id}`);
      const encryptedMessages = await this.storage.getMessagesBetweenUsers(
        user1Id,
        user2Id,
        limit,
        offset
      );

      this.logger.debug(`Decrypting ${encryptedMessages.length} messages`);
      const messages = await Promise.all(
        encryptedMessages.map(async (encryptedMessage) => {
          try {
            const content = await this.crypto.decrypt(
              encryptedMessage.encryptedContent,
              this.encryptionKey!
            );

            return {
              id: encryptedMessage.id,
              senderId: encryptedMessage.senderId,
              receiverId: encryptedMessage.receiverId,
              content,
              timestamp: encryptedMessage.timestamp,
              metadata: encryptedMessage.metadata,
            };
          } catch (error) {
            this.logger.error(`Failed to decrypt message ${encryptedMessage.id}`, error as Error);

            // Return a message with an error indicator instead of failing the entire batch
            return {
              id: encryptedMessage.id,
              senderId: encryptedMessage.senderId,
              receiverId: encryptedMessage.receiverId,
              content: '[Decryption Error]',
              timestamp: encryptedMessage.timestamp,
              metadata: {
                ...encryptedMessage.metadata,
                decryptionError: true,
                errorMessage: (error as Error).message,
              },
            };
          }
        })
      );

      this.logger.info(`Retrieved and decrypted ${messages.length} messages`);
      return messages;
    } catch (error) {
      this.logger.error(`Failed to get messages between ${user1Id} and ${user2Id}`, error as Error);

      if (error instanceof LumoxError) {
        throw error;
      }

      throw new LumoxError(
        LumoxErrorCode.STORAGE_READ_ERROR,
        `Failed to get messages: ${(error as Error).message}`,
        { cause: error as Error, context: { user1Id, user2Id, limit, offset } }
      );
    }
  }

  async exportData(): Promise<Uint8Array> {
    this.ensureInitialized();

    try {
      this.logger.debug('Exporting database data');
      const data = await this.storage.export();
      this.logger.info(`Exported ${data.byteLength} bytes of data`);
      return data;
    } catch (error) {
      this.logger.error('Failed to export data', error as Error);

      throw new LumoxError(
        LumoxErrorCode.STORAGE_EXPORT_ERROR,
        `Failed to export data: ${(error as Error).message}`,
        { cause: error as Error }
      );
    }
  }

  async importData(data: Uint8Array, overwrite: boolean = false): Promise<void> {
    this.ensureInitialized();

    try {
      this.logger.debug(`Importing ${data.byteLength} bytes of data, overwrite=${overwrite}`);
      await this.storage.import(data, overwrite);
      this.logger.info('Data imported successfully');
    } catch (error) {
      this.logger.error('Failed to import data', error as Error);

      throw new LumoxError(
        LumoxErrorCode.STORAGE_IMPORT_ERROR,
        `Failed to import data: ${(error as Error).message}`,
        { cause: error as Error, context: { dataSize: data.byteLength, overwrite } }
      );
    }
  }

  async close(): Promise<void> {
    if (!this.initialized) {
      this.logger.warn('Attempted to close uninitialized client, ignoring');
      return;
    }

    try {
      this.logger.debug('Closing Lumox client');
      await this.storage.close();
      this.initialized = false;
      this.logger.info('Lumox client closed successfully');
    } catch (error) {
      this.logger.error('Failed to close Lumox client', error as Error);

      throw new LumoxError(
        LumoxErrorCode.UNKNOWN_ERROR,
        `Failed to close client: ${(error as Error).message}`,
        { cause: error as Error }
      );
    }
  }

  /**
   * Get the current logger instance.
   */
  getLogger(): Logger {
    return this.logger;
  }

  /**
   * Set a new logger for the client.
   * @param logger - New logger instance
   */
  setLogger(logger: Logger): void {
    this.logger = logger;
  }
}
