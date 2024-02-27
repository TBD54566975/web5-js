import type { Jwk } from '@web5/crypto';

/**
 * Parameters for deriving bytes.
 */
export interface DeriveKeyBytesParams {
  /** The base key to be used for derivation as a byte array. */
  baseKeyBytes: Uint8Array;

  /**
   * The desired length of the derived key in bits.
   */
  length: number;
}

/**
 * Parameters for wrapping a key.
 */
export interface WrapKeyParams {
  /** A {@link Jwk} containing the key used to encrypt the unwrapped key. */
  encryptionKey: Jwk;

  /** A {@link Jwk} containing the private key to be wrapped. */
  unwrappedKey: Jwk;

  /** An object defining the algorithm-specific parameters for encrypting the `unwrappedKey`. */
  encryptParams?: unknown
}

/**
 * Parameters for unwrapping a key.
 */
export interface UnwrapKeyParams {
  /** A {@link Jwk} containing the key used to decrypt the unwrapped key. */
  decryptionKey: Jwk;

  /** The wrapped private key as a byte array. */
  wrappedKeyBytes: Uint8Array;

  /** The algorithm identifier of the key encrypted in `wrappedKeyBytes`. */
  wrappedKeyAlgorithm: string;

  /** An object defining the algorithm-specific parameters for decrypting the `wrappedKeyBytes`. */
  decryptParams?: unknown;
}