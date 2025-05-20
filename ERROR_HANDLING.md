# Lumox Error Handling and Logging

Lumox provides a comprehensive error handling and logging system that helps developers identify, troubleshoot, and gracefully handle errors that may occur during application operation.

## Error System

### Error Codes

Lumox uses a consistent error code system to help identify specific error types. All error codes are prefixed with `LUMOX-` followed by a numeric identifier to categorize the error.

| Error Code | Description |
|------------|-------------|
| **General Errors (1000-1999)** | |
| `LUMOX-1000` | Unknown error |
| `LUMOX-1001` | Invalid parameter |
| `LUMOX-1002` | Not implemented |
| `LUMOX-1003` | Operation timeout |
| **Initialization Errors (2000-2999)** | |
| `LUMOX-2000` | Initialization failed |
| `LUMOX-2001` | Already initialized |
| `LUMOX-2002` | Not initialized |
| **Storage Errors (3000-3999)** | |
| `LUMOX-3000` | Storage initialization failed |
| `LUMOX-3001` | Storage not initialized |
| `LUMOX-3002` | Storage connection error |
| `LUMOX-3003` | Storage read error |
| `LUMOX-3004` | Storage write error |
| `LUMOX-3005` | Storage delete error |
| `LUMOX-3006` | Storage export error |
| `LUMOX-3007` | Storage import error |
| `LUMOX-3008` | Storage schema error |
| `LUMOX-3009` | Storage transaction error |
| **Message Errors (4000-4999)** | |
| `LUMOX-4000` | Message not found |
| `LUMOX-4001` | Message already exists |
| `LUMOX-4002` | Message validation error |
| `LUMOX-4003` | Message limit exceeded |
| **Crypto Errors (5000-5999)** | |
| `LUMOX-5000` | Crypto initialization failed |
| `LUMOX-5001` | Crypto key generation failed |
| `LUMOX-5002` | Crypto encryption failed |
| `LUMOX-5003` | Crypto decryption failed |
| `LUMOX-5004` | Crypto key export failed |
| `LUMOX-5005` | Crypto key import failed |
| `LUMOX-5006` | Crypto not available |
| `LUMOX-5007` | Crypto key not set |
| **Configuration Errors (6000-6999)** | |
| `LUMOX-6000` | Invalid configuration |
| `LUMOX-6001` | Missing required configuration |
| **IPFS Errors (7000-7999)** | |
| `LUMOX-7000` | IPFS connection error |
| `LUMOX-7001` | IPFS upload error |
| `LUMOX-7002` | IPFS download error |
| `LUMOX-7003` | IPFS not available |

### Error Classes

Lumox provides a hierarchy of error classes to help categorize and handle errors appropriately:

- `LumoxError`: Base error class for all Lumox errors
- `StorageError`: Errors related to storage operations
- `CryptoError`: Errors related to cryptographic operations
- `ValidationError`: Errors related to data validation
- `NotInitializedError`: Errors when operations are performed on uninitialized components
- `ConfigurationError`: Errors related to invalid configuration

### Error Handling Example

```ts
import { LumoxClient, SqliteStorageProvider, WebCryptoProvider } from 'lumox';
import { LumoxError, LumoxErrorCode } from 'lumox/core/errors';

async function example() {
  try {
    const lumox = new LumoxClient({
      storage: new SqliteStorageProvider(),
      crypto: new WebCryptoProvider()
    });
    
    await lumox.initialize();
    await lumox.generateEncryptionKey();
    
    // Rest of your code...
  } catch (error) {
    if (error instanceof LumoxError) {
      // Handle specific error types
      switch (error.code) {
        case LumoxErrorCode.STORAGE_INITIALIZATION_FAILED:
          console.error('Failed to initialize storage:', error.message);
          // Attempt recovery or notify user
          break;
          
        case LumoxErrorCode.CRYPTO_NOT_AVAILABLE:
          console.error('Cryptography is not available in this environment');
          // Show user-friendly message
          break;
          
        default:
          console.error(`Lumox error (${error.code}):`, error.message);
      }
      
      // Log additional context if available
      if (error.context) {
        console.debug('Error context:', error.context);
      }
      
      // Log the original error that caused this error
      if (error.cause) {
        console.debug('Original error:', error.cause);
      }
    } else {
      // Handle non-Lumox errors
      console.error('Unexpected error:', error);
    }
  }
}
```

## Logging System

Lumox includes a configurable logging system that helps with debugging and monitoring. You can set the log level and provide custom log handlers to integrate with your application's logging infrastructure.

### Log Levels

The logging system supports the following log levels, from most to least verbose:

- `DEBUG`: Detailed information for debugging
- `INFO`: General information about normal operation
- `WARN`: Warnings that don't prevent normal operation but may indicate issues
- `ERROR`: Errors that prevent specific operations from completing
- `NONE`: No logging (disables all logs)

### Using the Logger

```ts
import { LumoxClient, SqliteStorageProvider, WebCryptoProvider } from 'lumox';
import { ConsoleLogger, LogLevel } from 'lumox/core/logger';

async function example() {
  // Create a logger with custom configuration
  const logger = new ConsoleLogger({
    level: LogLevel.DEBUG,       // Set log level
    prefix: 'MyApp',             // Custom prefix for log messages
    timestamps: true             // Include timestamps in log messages
  });
  
  // Initialize Lumox with the logger
  const lumox = new LumoxClient({
    storage: new SqliteStorageProvider({ logger }),
    crypto: new WebCryptoProvider({ logger }),
    logger: logger
  });
  
  // The logger is automatically used throughout Lumox operations
  await lumox.initialize();
  
  // You can also use the logger directly
  logger.info('Custom message from application');
  
  // Change log level at runtime
  logger.setLevel(LogLevel.INFO);
}
```

### Custom Logger Implementation

You can implement your own logger by implementing the `Logger` interface:

```ts
import { Logger } from 'lumox/core/logger';

class MyCustomLogger implements Logger {
  debug(message: string, ...args: any[]): void {
    // Custom implementation
  }
  
  info(message: string, ...args: any[]): void {
    // Custom implementation
  }
  
  warn(message: string, ...args: any[]): void {
    // Custom implementation
  }
  
  error(message: string, error?: Error, ...args: any[]): void {
    // Custom implementation
  }
}

// Then use it with Lumox
const lumox = new LumoxClient({
  storage: new SqliteStorageProvider(),
  crypto: new WebCryptoProvider(),
  logger: new MyCustomLogger()
});
```

This allows integration with logging frameworks like Winston, Pino, or browser developer tools.
