import { StorageProvider } from '../core/interfaces';
import { EncryptedMessage, MessageId, UserId } from '../core/types';
import { StorageError } from '../core/errors';
import { createInitialTables, SCHEMA_VERSION } from './schema.js';

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
}

export class SqliteStorageProvider implements StorageProvider {
  private db: any | null = null;
  private SQL: any | null = null;
  private options: SqliteStorageOptions;
  private initialized = false;
  
  constructor(options: SqliteStorageOptions = {}) {
    this.options = options;
  }
  
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    try {
      // If SQL instance is provided, use it
      if (this.options.sqlInstance) {
        this.SQL = this.options.sqlInstance;
      } else {
        // Dynamically import SQL.js
        const SqlJs = await import('sql.js');
        this.SQL = await SqlJs.default();
      }
      
      // Create or open database
      if (this.options.initialData) {
        this.db = new this.SQL.Database(this.options.initialData);
      } else {
        this.db = new this.SQL.Database();
      }
      
      // Initialize schema
      createInitialTables(this.db);
      
      // Setup browser persistence if filename is provided and in browser environment
      if (typeof window !== 'undefined' && this.options.filename) {
        // We'll implement this later with absurd-sql
        // This is a placeholder for browser persistence
      }
      
      this.initialized = true;
    } catch (error) {
      throw new StorageError(`Failed to initialize SQLite storage: ${(error as Error).message}`);
    }
  }
  
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.initialized = false;
  }
  
  async saveMessage(message: EncryptedMessage): Promise<MessageId> {
    this.ensureInitialized();
    
    try {
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
      
      return message.id;
    } catch (error) {
      throw new StorageError(`Failed to save message: ${(error as Error).message}`);
    }
  }
  
  async getMessage(id: MessageId): Promise<EncryptedMessage | null> {
    this.ensureInitialized();
    
    try {
      const stmt = this.db.prepare(`
        SELECT id, sender_id, receiver_id, encrypted_content, timestamp, metadata
        FROM messages
        WHERE id = ?
      `);
      
      stmt.bind([id]);
      
      const row = stmt.getAsObject();
      stmt.free();
      
      if (!row.id) {
        return null;
      }
      
      return {
        id: row.id,
        senderId: row.sender_id,
        receiverId: row.receiver_id,
        encryptedContent: row.encrypted_content,
        timestamp: row.timestamp,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      };
    } catch (error) {
      throw new StorageError(`Failed to get message: ${(error as Error).message}`);
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
      
      return messages;
    } catch (error) {
      throw new StorageError(`Failed to get messages between users: ${(error as Error).message}`);
    }
  }

  async deleteMessage(id: MessageId): Promise<boolean> {
    this.ensureInitialized();
    
    try {
      const stmt = this.db.prepare('DELETE FROM messages WHERE id = ?');
      stmt.run([id]);
      stmt.free();
      
      return true;
    } catch (error) {
      throw new StorageError(`Failed to delete message: ${(error as Error).message}`);
    }
  }
  
  async saveMessages(messages: EncryptedMessage[]): Promise<MessageId[]> {
    this.ensureInitialized();
    
    try {
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
      
      return ids;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw new StorageError(`Failed to save messages: ${(error as Error).message}`);
    }
  }
  
  async export(): Promise<Uint8Array> {
    this.ensureInitialized();
    
    try {
      return this.db.export();
    } catch (error) {
      throw new StorageError(`Failed to export database: ${(error as Error).message}`);
    }
  }
  
  async import(data: Uint8Array, overwrite: boolean = false): Promise<void> {
    if (overwrite) {
      // Close existing database if open
      if (this.db) {
        this.db.close();
      }
      
      // Create new database with imported data
      this.db = new this.SQL.Database(data);
      return;
    }
    
    // For non-overwrite, we need to implement merge logic
    throw new StorageError('Merge import not implemented yet. Use overwrite=true.');
  }
  
  private ensureInitialized(): void {
    if (!this.initialized || !this.db) {
      throw new StorageError('SQLite storage is not initialized. Call initialize() first.');
    }
  }
}
