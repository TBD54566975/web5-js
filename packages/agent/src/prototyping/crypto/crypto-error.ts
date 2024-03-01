/**
 * A custom error class for Crypto-related errors.
 */
export class CryptoError extends Error {
  /**
   * Constructs an instance of CryptoError, a custom error class for handling Crypto-related errors.
   *
   * @param code - A {@link CryptoErrorCode} representing the specific type of error encountered.
   * @param message - A human-readable description of the error.
   */
  constructor(public code: CryptoErrorCode, message: string) {
    super(message);
    this.name = 'CryptoError';

    // Ensures that instanceof works properly, the correct prototype chain when using inheritance,
    // and that V8 stack traces (like Chrome, Edge, and Node.js) are more readable and relevant.
    Object.setPrototypeOf(this, new.target.prototype);

    // Captures the stack trace in V8 engines (like Chrome, Edge, and Node.js).
    // In non-V8 environments, the stack trace will still be captured.
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CryptoError);
    }
  }
}

/**
 * An enumeration of possible Crypto error codes.
 */
export enum CryptoErrorCode {
  /** The supplied algorithm identifier is not supported by the implementation. */
  AlgorithmNotSupported = 'algorithmNotSupported',

  /** The encoding operation (either encoding or decoding) failed. */
  EncodingError = 'encodingError',

  /** The JWE supplied does not conform to valid syntax. */
  InvalidJwe = 'invalidJwe',

  /** The JWK supplied does not conform to valid syntax. */
  InvalidJwk = 'invalidJwk',

  /** The requested operation is not supported by the implementation. */
  OperationNotSupported = 'operationNotSupported',
}