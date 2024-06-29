/**
 * A custom error class for DID-related errors.
 */
export class DidError extends Error {
  /**
   * Constructs an instance of DidError, a custom error class for handling DID-related errors.
   *
   * @param code - A {@link DidErrorCode} representing the specific type of error encountered.
   * @param message - A human-readable description of the error.
   */
  constructor(public code: DidErrorCode, message: string) {
    super(`${code}: ${message}`);
    this.name = 'DidError';

    // Ensures that instanceof works properly, the correct prototype chain when using inheritance,
    // and that V8 stack traces (like Chrome, Edge, and Node.js) are more readable and relevant.
    Object.setPrototypeOf(this, new.target.prototype);

    // Captures the stack trace in V8 engines (like Chrome, Edge, and Node.js).
    // In non-V8 environments, the stack trace will still be captured.
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DidError);
    }
  }
}

/**
 * An enumeration of possible DID error codes.
 */
export enum DidErrorCode {
  /** The DID supplied does not conform to valid syntax. */
  InvalidDid = 'invalidDid',

  /** The supplied method name is not supported by the DID method and/or DID resolver implementation. */
  MethodNotSupported = 'methodNotSupported',

  /** An unexpected error occurred during the requested DID operation. */
  InternalError = 'internalError',

  /** The DID document supplied does not conform to valid syntax. */
  InvalidDidDocument = 'invalidDidDocument',

  /** The byte length of a DID document does not match the expected value. */
  InvalidDidDocumentLength = 'invalidDidDocumentLength',

  /** The DID URL supplied to the dereferencing function does not conform to valid syntax. */
  InvalidDidUrl = 'invalidDidUrl',

  /** The given proof of a previous DID is invalid */
  InvalidPreviousDidProof = 'invalidPreviousDidProof',

  /** An invalid public key is detected during a DID operation. */
  InvalidPublicKey = 'invalidPublicKey',

  /** The byte length of a public key does not match the expected value. */
  InvalidPublicKeyLength = 'invalidPublicKeyLength',

  /** An invalid public key type was detected during a DID operation. */
  InvalidPublicKeyType = 'invalidPublicKeyType',

  /** Verification of a signature failed during a DID operation. */
  InvalidSignature = 'invalidSignature',

  /** The DID resolver was unable to find the DID document resulting from the resolution request. */
  NotFound = 'notFound',

  /**
   * The representation requested via the `accept` input metadata property is not supported by the
   * DID method and/or DID resolver implementation.
   */
  RepresentationNotSupported = 'representationNotSupported',

  /** The type of a public key is not supported by the DID method and/or DID resolver implementation. */
  UnsupportedPublicKeyType = 'unsupportedPublicKeyType',
}