// Setup global crypto for Node.js environment
if (typeof global.crypto === 'undefined') {
  const { webcrypto } = require('crypto');
  (global as any).crypto = webcrypto;
}
