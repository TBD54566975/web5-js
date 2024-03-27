import type { Jwk } from '@web5/crypto';


export interface BytesToPrivateKeyParams {
  algorithm: AlgorithmIdentifier;
  privateKeyBytes: Uint8Array;
}

export interface BytesToPublicKeyParams {
  algorithm: AlgorithmIdentifier;
  publicKeyBytes: Uint8Array;
}

/**
 * Parameters for encryption and decryption operations.
 *
 * Intended for use with a Key Management System.
 */
export interface CipherParams {
  /** A {@link Jwk} containing the key to be used for encryption or decryption. */
  key: Jwk;

  /** Data to be encrypted or decrypted. */
  data: Uint8Array;

  /** Additional algorithm-specific parameters for encryption or decryption. */
  [key: string]: unknown;
}

/**
 * Parameters for derivation of cryptographic keys.
 */
export interface DeriveKeyParams {
  /** The algorithm identifier. */
  algorithm: AlgorithmIdentifier;

  /** The base key to be used for derivation as a byte array. */
  baseKeyBytes: Uint8Array;

  /** The algorithm identifier for the derived key. */
  derivedKeyAlgorithm?: AlgorithmIdentifier;

  /** Additional algorithm-specific parameters for key derivation. */
  [key: string]: unknown;
}

/**
 * Parameters for derivation of cryptographic byte arrays.
 */
export interface DeriveKeyBytesParams {
  /** The base key to be used for derivation as a byte array. */
  baseKeyBytes: Uint8Array;

  /** The desired length of the derived key in bits. */
  length: number;
}

export interface PrivateKeyToBytesParams {
  privateKey: Jwk;
}

export interface PublicKeyToBytesParams {
  publicKey: Jwk;
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