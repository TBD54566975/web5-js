import type { RequireOnly } from '@tbd54566975/common';

import type { Web5Crypto } from './web5-crypto.js';
import type { KeyMetadata, ManagedKey, ManagedKeyPair } from './crypto-key.js';

export interface CryptoManager {
  decrypt(options: DecryptOptions): Promise<ArrayBuffer>;

  deriveBits(options: DeriveBitsOptions): Promise<ArrayBuffer>;

  encrypt(options: EncryptOptions): Promise<ArrayBuffer>;

  /**
   * Generate a new ManagedKey within a CryptoManager implementation.
   */
  generateKey<T extends GenerateKeyOptionTypes>(options: GenerateKeyOptions<T>): Promise<GenerateKeyType<T>>;

  /**
   * Retrieves detailed information about a ManagedKey or ManagedKeyPair object.
   *
   * @param options - The options for retrieving the key.
   * @param options.keyRef - The reference identifier for the key. Can specify the id or alias property of the key.
   * @returns A promise that resolves to either a ManagedKey or ManagedKeyPair object.
   */
  getKey(options: { keyRef: string }): Promise<ManagedKey | ManagedKeyPair | undefined>;

  importKey(options: ImportableKeyPair): Promise<ManagedKeyPair>;
  importKey(options: ImportableKey): Promise<ManagedKey>;
  importKey(options: ImportKeyOptions): Promise<ManagedKey | ManagedKeyPair>;

  sign(options: SignOptions): Promise<ArrayBuffer>;

  verify(options: VerifyOptions): Promise<boolean>;
}

/**
 * Input arguments for implementations of the CryptoManager interface
 * {@link CryptoManager.encrypt | encrypt} method.
 *
 * @public
 */
export type DecryptOptions = {
  /**
   * An object defining the cipher algorithm to use and its parameters.
   */
  algorithm: Web5Crypto.AlgorithmIdentifier | Web5Crypto.AesCtrOptions | Web5Crypto.AesGcmOptions;

  /**
   * An ArrayBuffer, a TypedArray, or a DataView object containing the data
   * to be decrypted (also known as the ciphertext).
   */
  data: BufferSource;

  /**
   * An identifier of the ManagedKey to be used for decryption.
   * You can use the id or alias property of the key.
   */
  keyRef: string;
}

/**
 * Input arguments for implementations of the CryptoManager interface
 * {@link CryptoManager.deriveBits | deriveBits} method.
 *
 * @public
 */
export type DeriveBitsOptions = {

  /**
   * An object defining the derivation algorithm to use and its parameters.
   */
  algorithm: Web5Crypto.AlgorithmIdentifier | Web5Crypto.EcdhDeriveKeyOptions;

  /**
   * An identifier of the ManagedKey that will be the input to the
   * derivation algorithm.
   *
   * If the algorithm is ECDH, this identifier will refer to an ECDH key pair.
   * For PBKDF2, it might be a password.
   * For HDKF, it might be the shared secret output of an ECDH key agreement operation.
   */
  baseKeyRef: string;

  /**
   * A number representing the number of bits to derive. To be compatible with
   * all browsers, the number should be a multiple of 8.
   */
  length?: number;
}

/**
 * Input arguments for implementations of the CryptoManager interface
 * {@link CryptoManager.encrypt | encrypt} method.
 *
 * @public
 */
export type EncryptOptions = {
  /**
   * An object defining the cipher algorithm to use and its parameters.
   */
  algorithm: Web5Crypto.AlgorithmIdentifier | Web5Crypto.AesCtrOptions | Web5Crypto.AesGcmOptions;

  /**
   * An ArrayBuffer, a TypedArray, or a DataView object containing the data
   * to be encrypted (also known as the plaintext).
   */
  data: BufferSource;

  /**
   * An identifier of the ManagedKey to be used for encryption.
   * You can use the id or alias property of the key.
   */
  keyRef: string;
}

export type GenerateKeyOptions<T extends GenerateKeyOptionTypes> = {
  algorithm: T;
  alias?: string;
  extractable?: boolean;
  keyUsages: Web5Crypto.KeyUsage[];
  metadata?: KeyMetadata;
};

export type GenerateKeyOptionTypes =
  | Web5Crypto.AlgorithmIdentifier
  // | RsaHashedGenerateKeyOptions
  | Web5Crypto.AesGenerateKeyOptions
  | Web5Crypto.EcdsaGenerateKeyOptions
  | Web5Crypto.EdDsaGenerateKeyOptions
  // | HmacGenerateKeyOptions
  // | Pbkdf2Params;

export type GenerateKeyType<T> = T extends Web5Crypto.EcGenerateKeyOptions ? ManagedKeyPair :
  T extends Web5Crypto.AesGenerateKeyOptions /*| HmacGenerateKeyOptions | Pbkdf2Params*/ ? ManagedKey :
  T extends Web5Crypto.AlgorithmIdentifier ? ManagedKey | ManagedKeyPair :
  never;

export type ImportableKey =
  RequireOnly<
    ManagedKey,
    'algorithm' | 'extractable' | 'kms' | 'type' | 'usages',
    'id' | 'material' | 'state'
  >
  & { material: BufferSource; };

export interface ImportableKeyPair {
  privateKey: ImportableKey;
  publicKey: ImportableKey;
}

export type ImportKeyOptions =
  | ImportableKey
  | ImportableKeyPair

/**
 * Base interface to be implemented by key management systems.
 */
export type KeyManagementSystem = CryptoManager;

/**
 * ManagedKeyStore
 *
 * This interface should be implemented to provide platform specific
 * implementations that are usable by KeyManager and implementations
 * of KeyManagementSystem.
 *
 * Implementations of this class can be used to store:
 *   ManagedKey and ManagedKeyPair
 * or:
 *   ManagedPrivateKey
 * objects.
 *
 * @public
 */
export interface ManagedKeyStore<K, V> {
  deleteKey(options: { id: K }): Promise<boolean>
  getKey(options: { id: K }): Promise<V | undefined>
  importKey(options: { key: Omit<V, 'id'> }): Promise<boolean | K>
  listKeys(options: unknown): Promise<V[]>
}

/**
 * Input arguments for implementations of the CryptoManager interface {@link CryptoManager.sign | sign} method.
 *
 * @public
 */
export type SignOptions = {
  /**
   * An object that specifies the signature algorithm to use and its parameters.
   */
  algorithm: Web5Crypto.AlgorithmIdentifier | Web5Crypto.EcdsaOptions | Web5Crypto.EdDsaOptions;

  /**
   * An ArrayBuffer, a TypedArray, or a DataView object containing the data to be signed.
   */
  data: BufferSource;

  /**
   * An identifier of the ManagedKey to sign with.
   * You can use the id or alias property of the key.
   */
  keyRef: string;
}

/**
 * Input arguments for implementations of the CryptoManager interface
 * {@link CryptoManager.verify | verify} method.
 *
 * @public
 */
export type VerifyOptions = {
  /**
   * An object that specifies the algorithm to use and its parameters.
   */
  algorithm: Web5Crypto.AlgorithmIdentifier | Web5Crypto.EcdsaOptions | Web5Crypto.EdDsaOptions;

  /**
   * An ArrayBuffer, a TypedArray, or a DataView object containing the data
   * whose signature is to be verified.
   */
  data: BufferSource;

  /**
   * An identifier of the ManagedKey to sign with.
   * You can use the id or alias property of the key.
   */
  keyRef: string;

  /**
   * A ArrayBuffer containing the signature to verify.
   */
  signature: ArrayBuffer;
}