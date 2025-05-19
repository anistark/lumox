export const SCHEMA_VERSION = 1;

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  encrypted_content TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON messages(sender_id, receiver_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_sender ON messages(receiver_id, sender_id, timestamp DESC);
`;

export const createInitialTables = (db: any): void => {
  db.exec(SCHEMA);
  
  // Check if schema_version table is empty
  const result = db.exec("SELECT COUNT(*) FROM schema_version");
  const count = result[0].values[0][0];
  
  if (count === 0) {
    // Insert initial schema version
    db.exec(`INSERT INTO schema_version (version) VALUES (${SCHEMA_VERSION})`);
  }
};
