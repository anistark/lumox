import { StorageProvider } from '../core/interfaces';
import { EncryptedMessage, MessageId, MessageMetadata, UserId } from '../core/types';
import { LumoxErrorCode, NotInitializedError, StorageError } from '../core/errors';
import { createInitialTables, SCHEMA_VERSION } from './schema';
import { Logger, NullLogger } from '../core/logger';

/**
 * Interface representing the SQL.js module
 */
export interface SQLite {
  Database: SQLiteDatabase;
}

/**
 * Interface representing the SQL.js Database constructor
 */
export interface SQLiteDatabase {
  new (data?: Uint8Array): SQLiteInstance;
}

/**
 * Interface representing a SQL.js database instance
 */
export interface SQLiteInstance {
  exec(sql: string): SQLiteResult[];
  prepare(sql: string): SQLiteStatement;
  close(): void;
  export(): Uint8Array;
}

/**
 * Interface representing a SQL.js prepared statement
 */
export interface SQLiteStatement {
  bind(params: unknown[]): void;
  step(): boolean;
  get(): unknown[];
  getAsObject(): Record<string, unknown>;
  free(): void;
  run(params?: unknown[]): void;
}

/**
 * Interface representing the result of a SQL.js exec operation
 */
export interface SQLiteResult {
  columns: string[];
  values: unknown[][];
}

// Import is dynamically loaded in initialize()
// import initSqlJs from 'sql.js';

/**
 * Options for configuring the SqliteStorageProvider
 */
export interface SqliteStorageOptions {
  /**
   * If provided, will use this instance of SQL.js instead of loading a new one
   */
  sqlInstance?: SQLite;

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

/**
 * StorageProvider implementation using SQLite through sql.js
 */
export class SqliteStorageProvider implements StorageProvider {
  private db: SQLiteInstance | null = null;
  private SQL: SQLite | null = null;
  private options: SqliteStorageOptions;
  private initialized = false;
  private logger: Logger;

  /**
   * Creates a new SqliteStorageProvider instance
   * @param options - Configuration options for the provider
   */
  constructor(options: SqliteStorageOptions = {}) {
    this.options = options;
    this.logger = options.logger || new NullLogger();
  }

  /**
   * Initializes the storage provider by setting up the SQLite database
   * @returns A promise that resolves when initialization is complete
   * @throws {StorageError} If initialization fails
   */
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
          this.SQL = await (SqlJs.default as unknown as () => Promise<SQLite>)();
        } catch (error) {
          throw new Error(`Failed to import SQL.js: ${(error as Error).message}`);
        }
      }

      // Create or open database
      if (this.options.initialData) {
        this.logger.debug(
          `Creating database from ${this.options.initialData.byteLength} bytes of initial data`
        );
        this.db = new this.SQL.Database(this.options.initialData);
      } else {
        this.logger.debug('Creating new empty database');
        this.db = new this.SQL.Database();
      }

      // Initialize schema
      this.logger.debug('Initializing database schema');
      createInitialTables(this.db);

      // Check schema version
      const result = this.db.exec('SELECT version FROM schema_version');
      const version = result[0].values[0][0] as number;
      this.logger.debug(`Database schema version: ${version}`);

      if (version !== SCHEMA_VERSION) {
        this.logger.warn(
          `Schema version mismatch: database is ${version}, code expects ${SCHEMA_VERSION}`
        );
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

  /**
   * Closes the database connection and releases resources
   * @returns A promise that resolves when the database is closed
   * @throws {StorageError} If closing the database fails
   */
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

  /**
   * Saves a message to the database
   * @param message - The encrypted message to save
   * @returns A promise that resolves to the message ID
   * @throws {NotInitializedError} If the provider is not initialized
   * @throws {StorageError} If saving the message fails
   */
  async saveMessage(message: EncryptedMessage): Promise<MessageId> {
    this.ensureInitialized();

    try {
      this.logger.debug(`Saving message with ID: ${message.id}`);

      // At this point, this.db cannot be null because ensureInitialized would have thrown an error
      const db = this.db!;
      const stmt = db.prepare(`
        INSERT INTO messages (id, sender_id, receiver_id, encrypted_content, timestamp, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
        message.id,
        message.senderId,
        message.receiverId,
        message.encryptedContent,
        message.timestamp,
        message.metadata ? JSON.stringify(message.metadata) : null,
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

  /**
   * Retrieves a message by its ID
   * @param id - The ID of the message to retrieve
   * @returns A promise that resolves to the message or null if not found
   * @throws {NotInitializedError} If the provider is not initialized
   * @throws {StorageError} If retrieving the message fails
   */
  async getMessage(id: MessageId): Promise<EncryptedMessage | null> {
    this.ensureInitialized();

    try {
      this.logger.debug(`Getting message with ID: ${id}`);

      // At this point, this.db cannot be null because ensureInitialized would have thrown an error
      const db = this.db!;
      const stmt = db.prepare(`
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
        id: row.id as string,
        senderId: row.sender_id as string,
        receiverId: row.receiver_id as string,
        encryptedContent: row.encrypted_content as string,
        timestamp: row.timestamp as number,
        metadata: row.metadata
          ? (JSON.parse(row.metadata as string) as MessageMetadata)
          : undefined,
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

  /**
   * Retrieves messages exchanged between two users
   * @param user1Id - First user ID
   * @param user2Id - Second user ID
   * @param limit - Maximum number of messages to retrieve
   * @param offset - Number of messages to skip
   * @returns A promise that resolves to an array of messages
   * @throws {NotInitializedError} If the provider is not initialized
   * @throws {StorageError} If retrieving the messages fails
   */
  async getMessagesBetweenUsers(
    user1Id: UserId,
    user2Id: UserId,
    limit: number = 50,
    offset: number = 0
  ): Promise<EncryptedMessage[]> {
    this.ensureInitialized();

    try {
      this.logger.debug(
        `Getting messages between users: ${user1Id} and ${user2Id} (limit: ${limit}, offset: ${offset})`
      );

      // At this point, this.db cannot be null because ensureInitialized would have thrown an error
      const db = this.db!;
      const stmt = db.prepare(`
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
          id: row.id as string,
          senderId: row.sender_id as string,
          receiverId: row.receiver_id as string,
          encryptedContent: row.encrypted_content as string,
          timestamp: row.timestamp as number,
          metadata: row.metadata
            ? (JSON.parse(row.metadata as string) as MessageMetadata)
            : undefined,
        });
      }

      stmt.free();

      this.logger.debug(
        `Retrieved ${messages.length} messages between users: ${user1Id} and ${user2Id}`
      );
      return messages;
    } catch (error) {
      this.logger.error(
        `Failed to get messages between users: ${user1Id} and ${user2Id}`,
        error as Error
      );
      throw new StorageError(
        LumoxErrorCode.STORAGE_READ_ERROR,
        `Failed to get messages between users: ${(error as Error).message}`,
        { cause: error as Error, context: { user1Id, user2Id, limit, offset } }
      );
    }
  }

  /**
   * Deletes a message by its ID
   * @param id - The ID of the message to delete
   * @returns A promise that resolves to true if the message was deleted
   * @throws {NotInitializedError} If the provider is not initialized
   * @throws {StorageError} If deleting the message fails
   */
  async deleteMessage(id: MessageId): Promise<boolean> {
    this.ensureInitialized();

    try {
      this.logger.debug(`Deleting message: ${id}`);

      // At this point, this.db cannot be null because ensureInitialized would have thrown an error
      const db = this.db!;
      const stmt = db.prepare('DELETE FROM messages WHERE id = ?');
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

  /**
   * Saves multiple messages in a single transaction
   * @param messages - Array of encrypted messages to save
   * @returns A promise that resolves to an array of message IDs
   * @throws {NotInitializedError} If the provider is not initialized
   * @throws {StorageError} If saving the messages fails
   */
  async saveMessages(messages: EncryptedMessage[]): Promise<MessageId[]> {
    this.ensureInitialized();

    try {
      this.logger.debug(`Saving batch of ${messages.length} messages`);

      // At this point, this.db cannot be null because ensureInitialized would have thrown an error
      const db = this.db!;
      db.exec('BEGIN TRANSACTION');

      const stmt = db.prepare(`
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
          message.metadata ? JSON.stringify(message.metadata) : null,
        ]);

        ids.push(message.id);
      }

      stmt.free();
      db.exec('COMMIT');

      this.logger.debug(`Batch of ${messages.length} messages saved successfully`);
      return ids;
    } catch (error) {
      this.logger.error(`Failed to save batch of ${messages.length} messages`, error as Error);

      try {
        // This could still be null if the error occurred before ensureInitialized completed
        if (this.db) {
          this.db.exec('ROLLBACK');
          this.logger.debug('Transaction rolled back');
        }
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

  /**
   * Exports the database as a binary array
   * @returns A promise that resolves to the database data as a Uint8Array
   * @throws {NotInitializedError} If the provider is not initialized
   * @throws {StorageError} If exporting the database fails
   */
  async export(): Promise<Uint8Array> {
    this.ensureInitialized();

    try {
      this.logger.debug('Exporting database');

      // At this point, this.db cannot be null because ensureInitialized would have thrown an error
      const db = this.db!;
      const data = db.export();
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

  /**
   * Ensures that the provider is initialized
   * @throws {NotInitializedError} If the provider is not initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.db) {
      throw new NotInitializedError('SqliteStorageProvider');
    }
  }

  /**
   * Imports database data, optionally overwriting the existing database
   * @param data - The database data to import
   * @param overwrite - Whether to overwrite the existing database
   * @returns A promise that resolves when the import is complete
   * @throws {StorageError} If importing the database fails
   */
  async import(data: Uint8Array, overwrite: boolean = false): Promise<void> {
    try {
      this.logger.debug(`Importing database: ${data.byteLength} bytes, overwrite=${overwrite}`);

      if (!this.SQL) {
        throw new Error('SQL.js is not initialized. Call initialize() first.');
      }

      const sql = this.SQL; // Local non-null reference

      if (overwrite) {
        // Close existing database if open
        if (this.db) {
          this.logger.debug('Closing existing database before import with overwrite');
          this.db.close();
          this.db = null;
        }

        // Create new database with imported data
        this.logger.debug('Creating new database from imported data');
        this.db = new sql.Database(data);

        // Check schema version
        const result = this.db.exec('SELECT version FROM schema_version');
        const version = result[0].values[0][0] as number;
        this.logger.debug(`Imported database schema version: ${version}`);

        if (version !== SCHEMA_VERSION) {
          this.logger.warn(
            `Schema version mismatch in imported database: database is ${version}, code expects ${SCHEMA_VERSION}`
          );
          // Future: implement schema migration
        }

        this.logger.info('Database imported successfully with overwrite');
        this.initialized = true;
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
}
