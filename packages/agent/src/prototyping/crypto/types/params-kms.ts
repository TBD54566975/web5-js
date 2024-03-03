import type { Jwk, KeyIdentifier } from '@web5/crypto';

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

/**
 * Parameters for KMS-based derivation of a cryptographic key from a given base key.
 *
 * Intended for use with a Key Management System.
 */
export interface KmsDeriveKeyParams {
  /** Identifier for the base key used in derivation in the KMS. */
  baseKeyUri: KeyIdentifier;

  /** An object defining the algorithm-specific parameters for the derived key. */
  derivedKeyParams: unknown
}

/**
 * Parameters for KMS-based derivation of a byte array from a given base key.
 *
 * Intended for use with a Key Management System.
 */
export interface KmsDeriveKeyBytesParams {
  /** Identifier for the base key used in derivation in the KMS. */
  baseKeyUri: KeyIdentifier;

  /** The desired length of the derived key in bits. */
  length: number;
}

/**
 * Parameters for unwrapping a key using a KMS. Intended for use with a Key Management System.
 */
export interface KmsUnwrapKeyParams {
  /** Identifier for the private key in the KMS used for decrypting the wrapped key. */
  decryptionKeyUri: KeyIdentifier;

  /** The wrapped private key as a byte array. */
  wrappedKeyBytes: Uint8Array;

  /** The algorithm identifier of the key encrypted in `wrappedKeyBytes`. */
  wrappedKeyAlgorithm: string;

  /** An object defining the algorithm-specific parameters for decrypting the `wrappedKeyBytes`. */
  decryptParams?: unknown;
}

/**
 * Parameters for wrapping a key using a KMS. Intended for use with a Key Management System.
 */
export interface KmsWrapKeyParams {
  /** Identifier for the private key in the KMS used for encrypting the unwrapped key. */
  encryptionKeyUri: KeyIdentifier;

  /** A {@link Jwk} containing the private key to be wrapped. */
  unwrappedKey: Jwk;

  /** An object defining the algorithm-specific parameters for encrypting the `unwrappedKey`. */
  encryptParams?: unknown
}