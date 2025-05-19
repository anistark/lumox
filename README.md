# Lumox

A TypeScript SDK for local-first encrypted chat storage with optional IPFS backup capabilities.

[![npm version](https://img.shields.io/npm/v/lumox.svg)](https://www.npmjs.com/package/lumox)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Features

- **Local-First Storage**: Encrypted chat data stored locally using SQLite compiled to WebAssembly
- **Strong Encryption**: End-to-end encryption using the WebCrypto API
- **Cross-Platform**: Works in browsers, Node.js, and React Native
- **Modular Design**: Easily integrate specific components or use the full SDK

## Installation

```bash
# Using npm
npm install lumox

# Using yarn
yarn add lumox

# Using pnpm
pnpm add lumox
```

## Quick Start

```ts
import { LumoxClient, SqliteStorageProvider, WebCryptoProvider } from 'lumox';
import initSqlJs from 'sql.js';

async function main() {
  // Initialize SQL.js
  const SQL = await initSqlJs();
  
  // Create storage and crypto providers
  const storage = new SqliteStorageProvider({ sqlInstance: SQL });
  const crypto = new WebCryptoProvider();
  
  // Initialize Lumox client
  const lumox = new LumoxClient({ storage, crypto });
  await lumox.initialize();
  
  // Generate encryption key
  await lumox.generateEncryptionKey();
  
  // Send an encrypted message
  const messageId = await lumox.sendMessage('alice', 'bob', 'Hello, encrypted world!');
  console.log(`Message sent with ID: ${messageId}`);
  
  // Retrieve and decrypt messages
  const messages = await lumox.getMessages('alice', 'bob');
  console.log('Messages:', messages);
  
  // Export database for backup
  const dbExport = await lumox.exportData();
  console.log(`Exported ${dbExport.byteLength} bytes of data`);
  
  // Clean up
  await lumox.close();
}

main().catch(console.error);
```

## API Reference

### LumoxClient

The main client for interacting with the Lumox system.

```ts
const lumox = new LumoxClient({
  storage: storageProvider,
  crypto: cryptoProvider
});
```

#### Methods

- **initialize()**: Initialize the client components
- **generateEncryptionKey()**: Create a new encryption key
- **exportEncryptionKey()**: Export the current encryption key as a string
- **importEncryptionKey(keyData)**: Import an encryption key
- **sendMessage(senderId, receiverId, content, metadata?)**: Send an encrypted message
- **getMessages(user1Id, user2Id, limit?, offset?)**: Retrieve and decrypt messages
- **exportData()**: Export the database as a Uint8Array
- **importData(data, overwrite?)**: Import database data
- **close()**: Clean up resources

### StorageProvider

Interface for storage implementations.

```ts
// Default SQLite implementation
const storage = new SqliteStorageProvider({
  sqlInstance: SQL,
  // Optional: filename for persistent storage in browsers
  filename: '/sql/chat.db',
  // Optional: initial data to load
  initialData: existingDbData
});
```

### CryptoProvider

Interface for encryption implementations.

```ts
// Default WebCrypto implementation
const crypto = new WebCryptoProvider();
```

## Advanced Usage

### Persistence in Browser

For persistent storage in browsers, you can use the optional `absurd-sql` integration:

```ts
import { SQLiteFS } from 'absurd-sql';
import IndexedDBBackend from 'absurd-sql/dist/indexeddb-backend';

// Set up absurd-sql for persistence
const sqlFS = new SQLiteFS(SQL.FS, new IndexedDBBackend());
SQL.register_for_idb(sqlFS);
SQL.FS.mkdir('/sql');
SQL.FS.mount(sqlFS, {}, '/sql');

// Create storage with persistence
const storage = new SqliteStorageProvider({
  sqlInstance: SQL,
  filename: '/sql/chat.db'
});
```

### Importing and Exporting

Export and import database for backup or migration:

```ts
// Export database
const dbData = await lumox.exportData();

// Save to a file in Node.js
await fs.promises.writeFile('backup.sqlite', Buffer.from(dbData));

// Later, import the database
const importData = await fs.promises.readFile('backup.sqlite');
await lumox.importData(new Uint8Array(importData.buffer), true);
```

## Roadmap

### v1.0 (Current)
- Local storage using SQLite-WASM
- End-to-end encryption with WebCrypto

### v1.5 (Planned)
- Identity integration for key derivation
- Support for Web3 wallets (Ethereum, Solana)
- DID integration

### v2.0 (Future)
- IPFS backup capabilities
- Conflict resolution for multi-device sync
- Enhanced privacy features

## Development

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build

# Run tests
pnpm test

# Run example
pnpm example
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the [MIT License](./License).

## Acknowledgments

- SQL.js for SQLite compilation to WebAssembly
- The WebCrypto API team for browser encryption capabilities
- IPFS project for decentralized storage concepts

---

Built with ❤️ for secure, local-first communications.
