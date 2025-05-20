import { ConsoleLogger, LogLevel, NullLogger } from '../src/core/logger';

describe('Logger', () => {
  describe('ConsoleLogger', () => {
    let originalConsole: typeof console;
    let mockDebug: jest.SpyInstance;
    let mockInfo: jest.SpyInstance;
    let mockWarn: jest.SpyInstance;
    let mockError: jest.SpyInstance;
    
    beforeEach(() => {
      // Save original console methods
      originalConsole = { ...console };
      
      // Create spies on console methods
      mockDebug = jest.spyOn(console, 'debug').mockImplementation();
      mockInfo = jest.spyOn(console, 'info').mockImplementation();
      mockWarn = jest.spyOn(console, 'warn').mockImplementation();
      mockError = jest.spyOn(console, 'error').mockImplementation();
    });
    
    afterEach(() => {
      // Restore original console methods
      mockDebug.mockRestore();
      mockInfo.mockRestore();
      mockWarn.mockRestore();
      mockError.mockRestore();
    });
    
    it('should respect log level', () => {
      // Create logger with INFO level
      const logger = new ConsoleLogger({ level: LogLevel.INFO });
      
      // Call all log methods
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');
      
      // Verify that only messages at or above INFO level were logged
      expect(mockDebug).not.toHaveBeenCalled();
      expect(mockInfo).toHaveBeenCalled();
      expect(mockWarn).toHaveBeenCalled();
      expect(mockError).toHaveBeenCalled();
    });
    
    it('should include prefix in log messages', () => {
      // Create logger with custom prefix
      const logger = new ConsoleLogger({ 
        level: LogLevel.DEBUG, 
        prefix: 'TestLogger',
        timestamps: false
      });
      
      // Call log method
      logger.info('Info message');
      
      // Verify that prefix was included in log message
      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining('[TestLogger]'),
        expect.anything()
      );
    });
    
    it('should include timestamps when enabled', () => {
      // Create logger with timestamps enabled
      const logger = new ConsoleLogger({ 
        level: LogLevel.DEBUG, 
        timestamps: true
      });
      
      // Call log method
      logger.info('Info message');
      
      // Verify that timestamp was included in log message
      const isoDateRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringMatching(isoDateRegex),
        expect.anything()
      );
    });
    
    it('should allow changing log level at runtime', () => {
      // Create logger with DEBUG level
      const logger = new ConsoleLogger({ level: LogLevel.DEBUG });
      
      // Call debug method, should be logged
      logger.debug('Debug message 1');
      expect(mockDebug).toHaveBeenCalledTimes(1);
      
      // Change log level to ERROR
      logger.setLevel(LogLevel.ERROR);
      
      // Call debug and info methods, should not be logged
      logger.debug('Debug message 2');
      logger.info('Info message');
      expect(mockDebug).toHaveBeenCalledTimes(1); // Still just 1 call
      expect(mockInfo).not.toHaveBeenCalled();
      
      // Call error method, should be logged
      logger.error('Error message');
      expect(mockError).toHaveBeenCalled();
    });
  });
  
  describe('NullLogger', () => {
    let mockDebug: jest.SpyInstance;
    let mockInfo: jest.SpyInstance;
    let mockWarn: jest.SpyInstance;
    let mockError: jest.SpyInstance;
    
    beforeEach(() => {
      // Create spies on console methods
      mockDebug = jest.spyOn(console, 'debug').mockImplementation();
      mockInfo = jest.spyOn(console, 'info').mockImplementation();
      mockWarn = jest.spyOn(console, 'warn').mockImplementation();
      mockError = jest.spyOn(console, 'error').mockImplementation();
    });
    
    afterEach(() => {
      // Restore original console methods
      mockDebug.mockRestore();
      mockInfo.mockRestore();
      mockWarn.mockRestore();
      mockError.mockRestore();
    });
    
    it('should not log anything', () => {
      // Create null logger
      const logger = new NullLogger();
      
      // Call all log methods
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');
      
      // Verify that no console methods were called
      expect(mockDebug).not.toHaveBeenCalled();
      expect(mockInfo).not.toHaveBeenCalled();
      expect(mockWarn).not.toHaveBeenCalled();
      expect(mockError).not.toHaveBeenCalled();
    });
  });
});
