/**
 * Available log levels for the logger.
 * Lower values indicate more verbose logging.
 */
export enum LogLevel {
  /** Detailed debugging information */
  DEBUG = 0,
  /** General operational information */
  INFO = 1,
  /** Warning conditions */
  WARN = 2,
  /** Error conditions */
  ERROR = 3,
  /** No logging at all */
  NONE = 4,
}

/**
 * Interface for logger implementations.
 * All logging methods in Lumox use this interface.
 */
export interface Logger {
  /**
   * Log a debug message.
   * @param message - Message to log
   * @param args - Additional arguments to log
   */
  debug(message: string, ...args: unknown[]): void;

  /**
   * Log an informational message.
   * @param message - Message to log
   * @param args - Additional arguments to log
   */
  info(message: string, ...args: unknown[]): void;

  /**
   * Log a warning message.
   * @param message - Message to log
   * @param args - Additional arguments to log
   */
  warn(message: string, ...args: unknown[]): void;

  /**
   * Log an error message.
   * @param message - Message to log
   * @param error - Optional error object
   * @param args - Additional arguments to log
   */
  error(message: string, error?: Error, ...args: unknown[]): void;
}

/**
 * Options for configuring the logger.
 */
export interface LoggerOptions {
  /** Minimum log level to display */
  level?: LogLevel;

  /** Prefix to add to all log messages */
  prefix?: string;

  /** Whether to include timestamps in log messages */
  timestamps?: boolean;
}

/**
 * Default logger implementation that logs to the console.
 *
 * This logger respects the configured log level and can format
 * messages with timestamps and prefixes.
 */
export class ConsoleLogger implements Logger {
  private level: LogLevel;
  private prefix: string;
  private includeTimestamps: boolean;

  /**
   * Create a new console logger.
   * @param options - Logger configuration options
   */
  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.prefix = options.prefix ?? 'Lumox';
    this.includeTimestamps = options.timestamps ?? true;
  }

  /**
   * Get the formatted prefix for log messages.
   * @returns Formatted prefix string
   */
  private getPrefix(): string {
    let prefix = `[${this.prefix}]`;

    if (this.includeTimestamps) {
      prefix = `${new Date().toISOString()} ${prefix}`;
    }

    return prefix;
  }

  /**
   * Log a debug message.
   * @param message - Message to log
   * @param args - Additional arguments to log
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(`${this.getPrefix()} ${message}`, ...args);
    }
  }

  /**
   * Log an informational message.
   * @param message - Message to log
   * @param args - Additional arguments to log
   */
  info(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.info(`${this.getPrefix()} ${message}`, ...args);
    }
  }

  /**
   * Log a warning message.
   * @param message - Message to log
   * @param args - Additional arguments to log
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`${this.getPrefix()} ${message}`, ...args);
    }
  }

  /**
   * Log an error message.
   * @param message - Message to log
   * @param error - Optional error object
   * @param args - Additional arguments to log
   */
  error(message: string, error?: Error, ...args: unknown[]): void {
    if (this.level <= LogLevel.ERROR) {
      if (error) {
        console.error(`${this.getPrefix()} ${message}`, error, ...args);

        // Log additional error details if in debug mode
        if (this.level === LogLevel.DEBUG && error.stack) {
          console.error(`${this.getPrefix()} Stack trace:`, error.stack);
        }
      } else {
        console.error(`${this.getPrefix()} ${message}`, ...args);
      }
    }
  }

  /**
   * Set the current log level.
   * @param level - New log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Get the current log level.
   * @returns Current log level
   */
  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * Set the prefix used in log messages.
   * @param prefix - New prefix
   */
  setPrefix(prefix: string): void {
    this.prefix = prefix;
  }

  /**
   * Enable or disable timestamps in log messages.
   * @param include - Whether to include timestamps
   */
  setTimestamps(include: boolean): void {
    this.includeTimestamps = include;
  }
}

/**
 * Logger that discards all log messages.
 *
 * This is useful for testing or when logging should be completely disabled.
 * It implements the Logger interface but doesn't perform any actual logging.
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
export class NullLogger implements Logger {
  /**
   * No-op debug logger.
   */
  debug(_message: string, ..._args: unknown[]): void {
    // No-op
  }

  /**
   * No-op info logger.
   */
  info(_message: string, ..._args: unknown[]): void {
    // No-op
  }

  /**
   * No-op warn logger.
   */
  warn(_message: string, ..._args: unknown[]): void {
    // No-op
  }

  /**
   * No-op error logger.
   */
  error(_message: string, _error?: Error, ..._args: unknown[]): void {
    // No-op
  }
}

/**
 * Creates a formatted string prefix for log messages.
 *
 * This is a utility function that can be used by custom logger implementations.
 *
 * @param prefix - The prefix to include
 * @param includeTimestamp - Whether to include a timestamp
 * @returns Formatted prefix string
 */
export function createLogPrefix(prefix: string, includeTimestamp = true): string {
  let result = `[${prefix}]`;

  if (includeTimestamp) {
    result = `${new Date().toISOString()} ${result}`;
  }

  return result;
}

/**
 * Helper function to determine if a log level is enabled.
 *
 * @param currentLevel - The current log level of the logger
 * @param targetLevel - The level to check against
 * @returns True if the target level should be logged
 */
export function isLevelEnabled(currentLevel: LogLevel, targetLevel: LogLevel): boolean {
  return currentLevel <= targetLevel;
}
