/**
 * Web5 logger level.
 */
export enum Web5LogLevel {
  Debug = 'debug',
  Silent = 'silent',
}

/**
 * Web5 logger interface.
 */
export interface Web5LoggerInterface {

  /**
   * Sets the log verbose level.
   */
  setLogLevel(logLevel: Web5LogLevel): void;

  /**
   * Same as `info()`.
   * Logs an informational message.
   */
  log (message: string): void;

  /**
   * Logs an informational message.
   */
  info(message: string): void;

  /**
   * Logs an error message.
   */
  error(message: string): void;
}

/**
 * A Web5 logger implementation.
 */
class Web5Logger implements Web5LoggerInterface {
  private logLevel: Web5LogLevel = Web5LogLevel.Silent; // Default to silent/no-op log level

  setLogLevel(logLevel: Web5LogLevel): void {
    this.logLevel = logLevel;
  }

  public log(message: string): void {
    this.info(message);
  }

  public info(message: string): void {
    if (this.logLevel === Web5LogLevel.Silent) { return; }

    console.info(message);
  }

  public error(message: string): void {
    if (this.logLevel === Web5LogLevel.Silent) { return; }

    console.error(message);
  }
}

// Export a singleton logger instance
export const logger = new Web5Logger();

// Attach logger to the global window object in browser environment for easy access to the logger instance.
// e.g. can call `web5logger.setLogLevel('debug');` directly in browser console.
if (typeof window !== 'undefined') {
  (window as any).web5logger = logger; // Makes `web5Logger` accessible globally in browser
}