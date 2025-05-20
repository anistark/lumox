import {
  LumoxClient,
  SqliteStorageProvider,
  WebCryptoProvider,
  LumoxError,
  LumoxErrorCode,
  ConsoleLogger,
  LogLevel,
  isStorageError,
  isCryptoError,
  getUserFriendlyErrorMessage,
  formatError,
} from '../src/index';

async function exampleWithTryCatch() {
  console.log('=== Example with Try/Catch ===');

  // Create a logger with debug level for detailed output
  const logger = new ConsoleLogger({
    level: LogLevel.DEBUG,
    prefix: 'ErrorExample',
    timestamps: true,
  });

  try {
    // Initialize the client
    const client = new LumoxClient({
      storage: new SqliteStorageProvider({ logger }),
      crypto: new WebCryptoProvider({ logger }),
      logger,
    });

    // This will succeed
    logger.info('Initializing client');
    await client.initialize();

    // This will succeed
    logger.info('Generating encryption key');
    await client.generateEncryptionKey();

    // This will fail - sending a message with invalid parameters
    logger.info('Attempting to send a message with invalid parameters');
    await client.sendMessage('', 'bob', 'This will fail');
  } catch (error) {
    // Handle the error based on its type
    if (error instanceof LumoxError) {
      console.error(`Caught Lumox error: ${formatError(error)}`);

      // Show user-friendly message
      const friendlyMessage = getUserFriendlyErrorMessage(error.code);
      console.log(`User-friendly message: ${friendlyMessage}`);

      // Handle specific error categories
      if (isStorageError(error)) {
        console.log('This is a storage-related error');
      } else if (isCryptoError(error)) {
        console.log('This is a crypto-related error');
      }

      // Log additional context if available
      if (error.context) {
        console.log('Error context:', error.context);
      }

      // Log the stack trace in development environments
      console.debug('Stack trace:', error.stack);
    } else {
      console.error('Caught unexpected error:', error);
    }
  }
}

async function demonstrateErrorCodes() {
  console.log('\n=== Demonstrating Various Error Scenarios ===');

  const logger = new ConsoleLogger({
    level: LogLevel.INFO,
    prefix: 'ErrorDemo',
  });

  // Scenario 1: Crypto not available
  try {
    console.log('\nScenario 1: Using WebCryptoProvider in an environment without WebCrypto');
    // This would fail in an environment without WebCrypto, but we'll just simulate it
    throw new LumoxError(
      LumoxErrorCode.CRYPTO_NOT_AVAILABLE,
      'WebCrypto is not available in this environment'
    );
  } catch (error) {
    console.error('Error:', formatError(error));
  }

  // Scenario 2: Using client before initialization
  try {
    console.log('\nScenario 2: Using client before initialization');

    const client = new LumoxClient({
      storage: new SqliteStorageProvider(),
      crypto: new WebCryptoProvider(),
      logger,
    });

    // This should fail because client is not initialized
    await client.sendMessage('alice', 'bob', 'Hello!');
  } catch (error) {
    console.error('Error:', formatError(error));
  }

  // Scenario 3: Using client without setting encryption key
  try {
    console.log('\nScenario 3: Using client without setting encryption key');

    const client = new LumoxClient({
      storage: new SqliteStorageProvider(),
      crypto: new WebCryptoProvider(),
      logger,
    });

    await client.initialize();

    // This should fail because encryption key is not set
    await client.sendMessage('alice', 'bob', 'Hello!');
  } catch (error) {
    console.error('Error:', formatError(error));
  }

  console.log('\nDemonstration complete');
}

async function main() {
  await exampleWithTryCatch();
  await demonstrateErrorCodes();
}

main().catch((error) => {
  console.error('Unhandled error in main:', error);
  process.exit(1);
});
