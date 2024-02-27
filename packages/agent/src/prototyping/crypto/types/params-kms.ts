import type { Jwk, KeyIdentifier } from '@web5/crypto';

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