import type { Web5Crypto } from '@web5/crypto';
import type { RequireOnly } from '@web5/common';

import { Web5ManagedAgent } from './agent.js';

export interface CryptoManager {
  agent: Web5ManagedAgent;

  decrypt(options: DecryptOptions): Promise<Uint8Array>;

  deriveBits(options: DeriveBitsOptions): Promise<Uint8Array>;

  encrypt(options: EncryptOptions): Promise<Uint8Array>;

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

  importKey(options: PortableKeyPair): Promise<ManagedKeyPair>;
  importKey(options: PortableKey): Promise<ManagedKey>;
  importKey(options: ImportKeyOptions): Promise<ManagedKey | ManagedKeyPair>;

  sign(options: SignOptions): Promise<Uint8Array>;

  updateKey(options: UpdateKeyOptions): Promise<boolean>;

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
   * A Uint8Array object containing the data to be decrypted
   * (also known as the ciphertext).
   */
  data: Uint8Array;

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
  algorithm: Web5Crypto.AlgorithmIdentifier | Web5Crypto.EcdhDeriveKeyOptions | Web5Crypto.Pbkdf2Options;

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
   * An Uint8Array object containing the data to be encrypted
   * (also known as the plaintext).
   */
  data: Uint8Array;

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

export type PortableKey =
  RequireOnly<
    ManagedKey,
    'algorithm' | 'extractable' | 'type' | 'usages',
    'id' | 'material' | 'state'
  >
  & { material: Uint8Array; };

export interface PortableKeyPair {
  privateKey: PortableKey;
  publicKey: PortableKey;
}

export type ImportKeyOptions =
  | PortableKey
  | PortableKeyPair

/**
 * Base interface to be implemented by key management systems.
 */
export type KeyManagementSystem = CryptoManager;

/**
 * KeyMetadata
 *
 * Implementations of KeyManagementSystem can populate this object with KMS platform
 * specific data about each key.
 *
 * This property can also be used to add various tags to the keys under management.
 */
export type KeyMetadata = {
  /**
   * Additional properties of any type.
   */
  [key: string]: any;
}

/**
 * KeyState
 *
 * The read-only `state` property of the `ManagedKey` interface indicates the
 * status of the ManagedKey.
 *
 * It can have the following string values:
 *
 *   "Enabled": The key is ready for use.
 *
 *   "Disabled": The key may not be used, but the key material is still available,
 *               and the key can be placed back into the Enabled state.
 *
 *   "PendingCreation": The key is still being created. It may not be used,
 *                      enabled, disabled, or destroyed yet.  The KMS will
 *                      automatically change the state to enabled as soon
 *                      as the key is ready.
 *
 *   "PendingDeletion": The key is scheduled for deletion. It can be placed back
 *                      into the Disabled state up until the time of deletion
 *                      using the CancelKeyDeletion() method. Once the key has
 *                      been deleted, any ciphertext encrypted with this key
 *                      is no longer recoverable. Minimum and maximum waiting
 *                      periods are defined by each KMS implementation.
 *
 *   "PendingImport": The key is still being imported. It may not be used, enabled,
 *                    disabled, or deleted yet. The KMS will automatically change
 *                    the state to Enabled once the key is ready.
 *
 *   "PendingUpdate": The key is still being updated. It may not be used, enabled,
 *                    disabled, or deleted until the update process completes.
 *                    The KMS will automatically change the state to Enabled
 *                    once the key is ready.
 */
export type KeyState = 'Enabled' | 'Disabled' | 'PendingCreation' | 'PendingDeletion' | 'PendingImport' | 'PendingUpdate';

/**
 * ManagedKey
 *
 * A ManagedKey represents a cryptographic key used by a cipher for
 * encryption or decryption or an algorithm for signing or verification.
 */
export interface ManagedKey {
  /**
   * A unique identifier for the Key, autogenerated by a KMS.
   */
  id: string;

  /**
   * An object detailing the algorithm for which the key can be used along
   * with additional algorithm-specific parameters.
   */
  algorithm: Web5Crypto.KeyAlgorithm | Web5Crypto.GenerateKeyOptions;

  /**
   * An alternate identifier used to identify the key in a KMS.
   * This property can be used to associate a DID document key ID with a ManagedKey.
   */
  alias?: string;

  /**
   * A boolean value that is `true` if the key can be exported and `false` if not.
   */
  extractable: boolean;

  /**
   * Name of a registered key management system.
   */
  kms: string;

  /**
   * Key material as a raw binary data buffer.
   */
  material?: Uint8Array;

  /**
   * Optional. Additional Key metadata.
   */
  metadata?: KeyMetadata;

  /**
   * A registered string value specifying the algorithm and any algorithm
   * specific parameters.
   * Supported algorithms vary by KMS.
   */
  spec?: string;

  /**
   * The current status of the ManagedKey.
   */
  state: KeyState;

  /**
   * The type of key.
   */
  type: Web5Crypto.KeyType;

  /**
   * Indicates which cryptographic operations are permissible to be used with this key.
   */
  usages: Web5Crypto.KeyUsage[];
}

/**
 * Represents information about a managed key.
 * Private or secret key material is NOT present.
 *
 */
export type ManagedKeyInfo = Omit<ManagedKey, 'material'>;

export type ManagedKeyOptions = Omit<ManagedKey, 'toJwk'>

/** ManagedKeyPair
 *
 * A ManagedKeyPair represents a key pair for an asymmetric cryptography algorithm,
 * also known as a public-key algorithm.
 *
 * A ManagedKeyPair object can be obtained using `generateKey()`, when the
 * selected algorithm is one of the asymmetric algorithms: ECDSA or ECDH.
 */
export interface ManagedKeyPair {
  /**
   * A ManagedKey object representing the private key. For encryption and
   * decryption algorithms, this key is used to decrypt. For signing and
   * verification algorithms it is used to sign.
   */
  privateKey: ManagedKey;

  /**
   * A ManagedKey object representing the public key. For encryption and
   * decryption algorithms, this key is used to encrypt. For signing and
   * verification algorithms it is used to verify signatures.
   */
  publicKey: ManagedKey;
}

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
  deleteKey(options: { id: K, agent?: Web5ManagedAgent, context?: string }): Promise<boolean>
  findKey(options: { id: K, agent?: Web5ManagedAgent, context?: string }): Promise<V | undefined>;
  findKey(options: { alias: K, agent?: Web5ManagedAgent, context?: string }): Promise<V | undefined>;
  getKey(options: { id: K, agent?: Web5ManagedAgent, context?: string }): Promise<V | undefined>
  importKey(options: { key: Omit<V, 'id'>, agent?: Web5ManagedAgent, context?: string }): Promise<K>
  listKeys(options?: { agent?: Web5ManagedAgent, context?: string }): Promise<V[]>
  updateKey(options: { id: K, agent?: Web5ManagedAgent, context?: string } & Partial<V>): Promise<boolean>
}

/**
 * Represents a private key.
 *
 * The `alias` is used to refer to the key material which is stored as the hex encoding of the raw byte array
 * (`privateKeyHex`).
 *
 * The `type` refers to the type of key that is represented.
 *
 * @public
 */
export interface ManagedPrivateKey {
  /**
   * A unique identifier for the Key, autogenerated by a KMS.
   */
  id: string

  /**
   * Key material as raw binary data.
   */
  material: Uint8Array;

  /**
   * The type of key.
   */
  type: Web5Crypto.PrivateKeyType;
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
   * An Uint8Array object containing the data to be signed.
   */
  data: Uint8Array;

  /**
   * An identifier of the ManagedKey to sign with.
   * You can use the id or alias property of the key.
   */
  keyRef: string;
}

/**
 * Input arguments for implementations of the CryptoManager interface
 * {@link CryptoManager.updateKey | updateKey} method.
 *
 * @public
 */
export type UpdateKeyOptions = {
  /**
   * An alternate identifier used to identify the key in a KMS.
   * This property can be used to associate a DID document key ID with a ManagedKey.
   */
  alias?: string;

  /**
   * An identifier of the ManagedKey to be used for decryption.
   * You can use the id or alias property of the key.
   */
  keyRef: string;

  /**
   * Optional. Additional Key metadata.
   */
  metadata?: KeyMetadata;
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
   * An Uint8Array object containing the data whose signature is to be verified.
   */
  data: Uint8Array;

  /**
   * An identifier of the ManagedKey to sign with.
   * You can use the id or alias property of the key.
   */
  keyRef: string;

  /**
   * A Uint8Array containing the signature to verify.
   */
  signature: Uint8Array;
}