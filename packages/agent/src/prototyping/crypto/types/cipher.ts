import type { KeyIdentifier } from '@web5/crypto';

export type InferCipherAlgorithm<T> = T extends {
  /**
   * The `encrypt` method signature from which the algorithm type is inferred.
   * This is an internal implementation detail and not part of the public API.
   */
  encrypt(params: infer P): any;
}
? P extends {
    /**
     * The `algorithm` property within the parameters of `encrypt`.
     * This internal element is used to infer the algorithm type.
     */
    algorithm: infer A
  }
  ? A
  : never
: never;

/**
 * Parameters for KMS-based encryption and decryption operations.
 *
 * Intended for use with a Key Management System.
 */
export interface KmsCipherParams {
  /** Identifier for the private key in the KMS. */
  keyUri: KeyIdentifier;

  /** Data to be encrypted or decrypted. */
  data: Uint8Array;
}