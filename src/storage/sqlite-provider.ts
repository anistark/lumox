import { StorageProvider } from '../core/interfaces';
import { EncryptedMessage, MessageId, UserId } from '../core/types';
import { LumoxErrorCode, NotInitializedError, StorageError } from '../core/errors';
import { createInitialTables, SCHEMA_VERSION } from './schema';
import { Logger, NullLogger } from '../core/logger';

// We'll declare the initSqlJs function to be imported dynamically
declare function initSqlJs(): Promise<any>;

export interface SqliteStorageOptions {
  /**
   * If provided, will use this instance of SQL.js instead of loading a new one
   */
  sqlInstance?: any;
  
  /**
   * Database filename for persistent storage in browser environments
   * This is only used with absurd-sql in browser environments
   */
  filename?: string;
  
  /**
   * Initial database content as Uint8Array
   */
  initialData?: Uint8Array;
  
  /**
   * Logger instance for the provider
   */
  logger?: Logger;
}

export class SqliteStorageProvider implements StorageProvider {
  private db: any | null = null;
  private SQL: any | null = null;
  private options: SqliteStorageOptions;
  private initialized = false;
  private logger: Logger;
  
  constructor(options: SqliteStorageOptions = {}) {
    this.options = options;
    this.logger = options.logger || new NullLogger();
  }
  
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('SqliteStorageProvider already initialized');
      return;
    }
    
    try {
      this.logger.debug('Initializing SqliteStorageProvider');
      
      // If SQL instance is provided, use it
      if (this.options.sqlInstance) {
        this.logger.debug('Using provided SQL.js instance');
        this.SQL = this.options.sqlInstance;
      } else {
        // Dynamically import SQL.js
        this.logger.debug('Dynamically importing SQL.js');
        try {
          const SqlJs = await import('sql.js');
          this.SQL = await SqlJs.default();
        } catch (error) {
          throw new Error(`Failed to import SQL.js: ${(error as Error).message}`);
        }
      }
      
      // Create or open database
      if (this.options.initialData) {
        this.logger.debug(`Creating database from ${this.options.initialData.byteLength} bytes of initial data`);
        this.db = new this.SQL.Database(this.options.initialData);
      } else {
        this.logger.debug('Creating new empty database');
        this.db = new this.SQL.Database();
      }
      
      // Initialize schema
      this.logger.debug('Initializing database schema');
      createInitialTables(this.db);
      
      // Check schema version
      const result = this.db.exec("SELECT version FROM schema_version");
      const version = result[0].values[0][0];
      this.logger.debug(`Database schema version: ${version}`);
      
      if (version !== SCHEMA_VERSION) {
        this.logger.warn(`Schema version mismatch: database is ${version}, code expects ${SCHEMA_VERSION}`);
        // Future: implement schema migration
      }
      
      // Setup browser persistence if filename is provided and in browser environment
      if (typeof window !== 'undefined' && this.options.filename) {
        this.logger.debug(`Setting up browser persistence with filename: ${this.options.filename}`);
        // We'll implement this later with absurd-sql
        // This is a placeholder for browser persistence
      }
      
      this.initialized = true;
      this.logger.info('SqliteStorageProvider initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize SQLite storage', error as Error);
      throw new StorageError(
        LumoxErrorCode.STORAGE_INITIALIZATION_FAILED,
        `Failed to initialize SQLite storage: ${(error as Error).message}`,
        { cause: error as Error }
      );
    }
  }
  
  async close(): Promise<void> {
    if (!this.db) {
      this.logger.warn('Attempted to close a database that is not open');
      return;
    }
    
    try {
      this.logger.debug('Closing database');
      this.db.close();
      this.db = null;
      this.initialized = false;
      this.logger.info('Database closed successfully');
    } catch (error) {
      this.logger.error('Failed to close database', error as Error);
      throw new StorageError(
        LumoxErrorCode.STORAGE_CONNECTION_ERROR,
        `Failed to close database: ${(error as Error).message}`,
        { cause: error as Error }
      );
    }
  }
  
  async saveMessage(message: EncryptedMessage): Promise<MessageId> {
    this.ensureInitialized();
    
    try {
      this.logger.debug(`Saving message with ID: ${message.id}`);
      
      const stmt = this.db.prepare(`
        INSERT INTO messages (id, sender_id, receiver_id, encrypted_content, timestamp, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run([
        message.id,
        message.senderId,
        message.receiverId,
        message.encryptedContent,
        message.timestamp,
        message.metadata ? JSON.stringify(message.metadata) : null
      ]);
      
      stmt.free();
      
      this.logger.debug(`Message saved successfully: ${message.id}`);
      return message.id;
    } catch (error) {
      this.logger.error(`Failed to save message: ${message.id}`, error as Error);
      throw new StorageError(
        LumoxErrorCode.STORAGE_WRITE_ERROR,
        `Failed to save message: ${(error as Error).message}`,
        { cause: error as Error, context: { messageId: message.id } }
      );
    }
  }
  
  async getMessage(id: MessageId): Promise<EncryptedMessage | null> {
    this.ensureInitialized();
    
    try {
      this.logger.debug(`Getting message with ID: ${id}`);
      
      const stmt = this.db.prepare(`
        SELECT id, sender_id, receiver_id, encrypted_content, timestamp, metadata
        FROM messages
        WHERE id = ?
      `);
      
      stmt.bind([id]);
      
      const row = stmt.getAsObject();
      stmt.free();
      
      if (!row.id) {
        this.logger.debug(`Message not found: ${id}`);
        return null;
      }
      
      const message: EncryptedMessage = {
        id: row.id,
        senderId: row.sender_id,
        receiverId: row.receiver_id,
        encryptedContent: row.encrypted_content,
        timestamp: row.timestamp,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      };
      
      this.logger.debug(`Message retrieved: ${id}`);
      return message;
    } catch (error) {
      this.logger.error(`Failed to get message: ${id}`, error as Error);
      throw new StorageError(
        LumoxErrorCode.STORAGE_READ_ERROR,
        `Failed to get message: ${(error as Error).message}`,
        { cause: error as Error, context: { messageId: id } }
      );
    }
  }
  
  async getMessagesBetweenUsers(
    user1Id: UserId,
    user2Id: UserId,
    limit: number = 50,
    offset: number = 0
  ): Promise<EncryptedMessage[]> {
    this.ensureInitialized();
    
    try {
      this.logger.debug(`Getting messages between users: ${user1Id} and ${user2Id} (limit: ${limit}, offset: ${offset})`);
      
      const stmt = this.db.prepare(`
        SELECT id, sender_id, receiver_id, encrypted_content, timestamp, metadata
        FROM messages
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
      `);
      
      stmt.bind([user1Id, user2Id, user2Id, user1Id, limit, offset]);
      
      const messages: EncryptedMessage[] = [];
      
      while (stmt.step()) {
        const row = stmt.getAsObject();
        messages.push({
          id: row.id,
          senderId: row.sender_id,
          receiverId: row.receiver_id,
          encryptedContent: row.encrypted_content,
          timestamp: row.timestamp,
          metadata: row.metadata ? JSON.parse(row.metadata) : undefined
        });
      }
      
      stmt.free();
      
      this.logger.debug(`Retrieved ${messages.length} messages between users: ${user1Id} and ${user2Id}`);
      return messages;
    } catch (error) {
      this.logger.error(`Failed to get messages between users: ${user1Id} and ${user2Id}`, error as Error);
      throw new StorageError(
        LumoxErrorCode.STORAGE_READ_ERROR,
        `Failed to get messages between users: ${(error as Error).message}`,
        { cause: error as Error, context: { user1Id, user2Id, limit, offset } }
      );
    }
  }

  async deleteMessage(id: MessageId): Promise<boolean> {
    this.ensureInitialized();
    
    try {
      this.logger.debug(`Deleting message: ${id}`);
      
      const stmt = this.db.prepare('DELETE FROM messages WHERE id = ?');
      stmt.run([id]);
      stmt.free();
      
      this.logger.debug(`Message deleted: ${id}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete message: ${id}`, error as Error);
      throw new StorageError(
        LumoxErrorCode.STORAGE_DELETE_ERROR,
        `Failed to delete message: ${(error as Error).message}`,
        { cause: error as Error, context: { messageId: id } }
      );
    }
  }
  
  async saveMessages(messages: EncryptedMessage[]): Promise<MessageId[]> {
    this.ensureInitialized();
    
    try {
      this.logger.debug(`Saving batch of ${messages.length} messages`);
      
      this.db.exec('BEGIN TRANSACTION');
      
      const stmt = this.db.prepare(`
        INSERT INTO messages (id, sender_id, receiver_id, encrypted_content, timestamp, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const ids: MessageId[] = [];
      
      for (const message of messages) {
        stmt.run([
          message.id,
          message.senderId,
          message.receiverId,
          message.encryptedContent,
          message.timestamp,
          message.metadata ? JSON.stringify(message.metadata) : null
        ]);
        
        ids.push(message.id);
      }
      
      stmt.free();
      this.db.exec('COMMIT');
      
      this.logger.debug(`Batch of ${messages.length} messages saved successfully`);
      return ids;
    } catch (error) {
      this.logger.error(`Failed to save batch of ${messages.length} messages`, error as Error);
      
      try {
        this.db.exec('ROLLBACK');
        this.logger.debug('Transaction rolled back');
      } catch (rollbackError) {
        this.logger.error('Failed to rollback transaction', rollbackError as Error);
      }
      
      throw new StorageError(
        LumoxErrorCode.STORAGE_TRANSACTION_ERROR,
        `Failed to save messages: ${(error as Error).message}`,
        { cause: error as Error, context: { messageCount: messages.length } }
      );
    }
  }
  
  async export(): Promise<Uint8Array> {
    this.ensureInitialized();
    
    try {
      this.logger.debug('Exporting database');
      const data = this.db.export();
      this.logger.debug(`Database exported: ${data.byteLength} bytes`);
      return data;
    } catch (error) {
      this.logger.error('Failed to export database', error as Error);
      throw new StorageError(
        LumoxErrorCode.STORAGE_EXPORT_ERROR,
        `Failed to export database: ${(error as Error).message}`,
        { cause: error as Error }
      );
    }
  }
  
  async import(data: Uint8Array, overwrite: boolean = false): Promise<void> {
    try {
      this.logger.debug(`Importing database: ${data.byteLength} bytes, overwrite=${overwrite}`);
      
      if (overwrite) {
        // Close existing database if open
        if (this.db) {
          this.logger.debug('Closing existing database before import with overwrite');
          this.db.close();
        }
        
        // Create new database with imported data
        this.logger.debug('Creating new database from imported data');
        this.db = new this.SQL.Database(data);
        
        // Check schema version
        const result = this.db.exec("SELECT version FROM schema_version");
        const version = result[0].values[0][0];
        this.logger.debug(`Imported database schema version: ${version}`);
        
        if (version !== SCHEMA_VERSION) {
          this.logger.warn(`Schema version mismatch in imported database: database is ${version}, code expects ${SCHEMA_VERSION}`);
          // Future: implement schema migration
        }
        
        this.logger.info('Database imported successfully with overwrite');
      } else {
        // For non-overwrite, we need to implement merge logic
        this.logger.error('Merge import not implemented yet');
        throw new Error('Merge import not implemented yet. Use overwrite=true.');
      }
    } catch (error) {
      this.logger.error('Failed to import database', error as Error);
      throw new StorageError(
        LumoxErrorCode.STORAGE_IMPORT_ERROR,
        `Failed to import database: ${(error as Error).message}`,
        { cause: error as Error, context: { dataSize: data.byteLength, overwrite } }
      );
    }
  }
  
  private ensureInitialized(): void {
    if (!this.initialized || !this.db) {
      throw new NotInitializedError('SqliteStorageProvider');
    }
  }
}
