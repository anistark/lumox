// Use import instead of require
import { TextEncoder, TextDecoder } from 'util';

// Define a proper type for the global object
interface Global {
  TextEncoder: typeof TextEncoder;
  TextDecoder: typeof TextDecoder;
}

// Use proper type casting
(global as unknown as Global).TextEncoder = TextEncoder;
(global as unknown as Global).TextDecoder = TextDecoder;

// This helps with Jest compatibility in ESM mode
// Mock crypto for Node.js environment in tests
if (!global.crypto) {
  global.crypto = {
    getRandomValues: function(buffer: Uint8Array): Uint8Array {
      return Buffer.from(buffer.map(() => Math.floor(Math.random() * 256)));
    },
    subtle: {
      digest: jest.fn(),
      encrypt: jest.fn(),
      decrypt: jest.fn(),
      generateKey: jest.fn(),
      exportKey: jest.fn(),
      importKey: jest.fn(),
    },
  } as unknown as Crypto;
}
