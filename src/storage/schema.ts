import { SQLiteInstance } from './sqlite-provider';

export const SCHEMA_VERSION = 1;

/**
 * Creates the initial tables in the database.
 * @param db - The SQLite database instance
 */
export function createInitialTables(db: SQLiteInstance): void {
  // Create schema_version table
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER NOT NULL
    )
  `);

  // Check if schema_version has a row
  const result = db.exec('SELECT COUNT(*) FROM schema_version');
  const count = result[0].values[0][0] as number;

  if (count === 0) {
    // Insert schema version
    db.exec(`INSERT INTO schema_version (version) VALUES (${SCHEMA_VERSION})`);
  }

  // Create messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      encrypted_content TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      metadata TEXT
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON messages(sender_id, receiver_id)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)
  `);
}
