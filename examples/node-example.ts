import { LumoxClient, SqliteStorageProvider, WebCryptoProvider } from '../src';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  try {
    console.log('Initializing SQL.js...');

    // Dynamic import for SQL.js
    const initSqlJs = (await import('sql.js')).default;

    // Find the wasm file path
    const wasmPath = resolve(__dirname, '../node_modules/sql.js/dist/sql-wasm.wasm');

    // Check if the wasm file exists
    if (!fs.existsSync(wasmPath)) {
      console.error(`SQL.js WASM file not found at ${wasmPath}`);
      console.error('Make sure sql.js is installed correctly.');
      return;
    }

    console.log(`Found SQL.js WASM at ${wasmPath}`);

    // Initialize SQL.js with the correct wasm path
    const SQL = await initSqlJs({
      locateFile: () => wasmPath,
    });

    console.log('Creating storage provider...');
    const storage = new SqliteStorageProvider({ sqlInstance: SQL });

    console.log('Creating crypto provider...');
    const crypto = new WebCryptoProvider();

    console.log('Creating Lumox client...');
    const lumox = new LumoxClient({
      storage,
      crypto,
    });

    console.log('Initializing Lumox client...');
    await lumox.initialize();

    console.log('Generating encryption key...');
    await lumox.generateEncryptionKey();

    console.log('Exporting encryption key...');
    const exportedKey = await lumox.exportEncryptionKey();
    console.log(`Encryption key: ${exportedKey}`);

    console.log('Sending message...');
    const senderId = 'alice';
    const receiverId = 'bob';
    const content = 'Hello, this is a test message!';

    const messageId = await lumox.sendMessage(senderId, receiverId, content);
    console.log(`Message sent with ID: ${messageId}`);

    console.log('Retrieving messages...');
    const messages = await lumox.getMessages(senderId, receiverId);

    console.log(`Retrieved ${messages.length} messages:`);
    for (const message of messages) {
      console.log(`  From: ${message.senderId}`);
      console.log(`  To: ${message.receiverId}`);
      console.log(`  Content: ${message.content}`);
      console.log(`  Timestamp: ${new Date(message.timestamp).toISOString()}`);
      console.log('---');
    }

    console.log('Exporting database...');
    const exportData = await lumox.exportData();
    console.log(`Exported ${exportData.byteLength} bytes of data`);

    console.log('Closing Lumox client...');
    await lumox.close();

    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
  }
}

main();
