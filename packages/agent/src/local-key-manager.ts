import type {
  Jwk,
  Cipher,
  Signer,
  KeyWrapper,
  SignParams,
  AesGcmParams,
  KeyGenerator,
  VerifyParams,
  KeyIdentifier,
  KmsSignParams,
  KmsDigestParams,
  KmsVerifyParams,
  GetPublicKeyParams,
  KmsExportKeyParams,
  KmsGetKeyUriParams,
  KmsImportKeyParams,
  KmsGenerateKeyParams,
  KmsGetPublicKeyParams,
  AsymmetricKeyGenerator,
} from '@web5/crypto';

import {
  isPrivateJwk,
  Sha2Algorithm,
  EcdsaAlgorithm,
  EdDsaAlgorithm,
  AesGcmAlgorithm,
  CryptoAlgorithm,
  KEY_URI_PREFIX_JWK,
  computeJwkThumbprint,
} from '@web5/crypto';

import type { AgentDataStore } from './store-data.js';
import type { Web5PlatformAgent } from './types/agent.js';
import type { AgentKeyManager } from './types/key-manager.js';
import type { InferType } from './prototyping/common/type-utils.js';
import type { CipherParams, UnwrapKeyParams, WrapKeyParams } from './prototyping/crypto/types/params-direct.js';
import type { KmsCipherParams, KmsUnwrapKeyParams, KmsWrapKeyParams } from './prototyping/crypto/types/params-kms.js';

import { InMemoryKeyStore } from './store-key.js';
import { AesKwAlgorithm } from './prototyping/crypto/algorithms/aes-kw.js';
import { CryptoError, CryptoErrorCode } from './prototyping/crypto/crypto-error.js';

/**
 * `supportedAlgorithms` is an object mapping algorithm names to their respective implementations
 * Each entry in this map specifies the algorithm name and its associated properties, including the
 * implementation class and any relevant names or identifiers for the algorithm. This structure
 * allows for easy retrieval and instantiation of algorithm implementations based on the algorithm
 * name or key specification. It facilitates the support of multiple algorithms within the
 * `LocalKeyManager` class.
 */
const supportedAlgorithms = {
  'AES-GCM': {
    implementation : AesGcmAlgorithm,
    names          : ['A128GCM', 'A192GCM', 'A256GCM'] as const,
  },
  'AES-KW': {
    implementation : AesKwAlgorithm,
    names          : ['A128KW', 'A192KW', 'A256KW'] as const,
  },
  'Ed25519': {
    implementation : EdDsaAlgorithm,
    names          : ['Ed25519'] as const,
  },
  'secp256k1': {
    implementation : EcdsaAlgorithm,
    names          : ['ES256K', 'secp256k1'] as const,
  },
  'secp256r1': {
    implementation : EcdsaAlgorithm,
    names          : ['ES256', 'secp256r1'] as const,
  },
  'SHA-256': {
    implementation : Sha2Algorithm,
    names          : ['SHA-256'] as const
  }
} satisfies {
  [key: string]: {
    implementation : typeof CryptoAlgorithm;
    names          : readonly string[];
  }
};

/* Helper type for `supportedAlgorithms`. */
type SupportedAlgorithm = keyof typeof supportedAlgorithms;

/* Helper type for `supportedAlgorithms` implementations. */
type AlgorithmConstructor = typeof supportedAlgorithms[SupportedAlgorithm]['implementation'];

/* Commented out but retaining in case it ends up being useful. */
// type AlgorithmNames = typeof supportedAlgorithms[SupportedAlgorithm]['names'][number];

/* Helper type for supported key generator algorithms. */
type SupportedKeyGeneratorAlgorithm =
  | 'Ed25519'                                      // Edwards Curve Digital Signature Algorithm (EdDSA)
  | 'secp256k1' | 'ES256K' | 'secp256r1' | 'ES256' // Elliptic Curve Digital Signature Algorithm (ECDSA)
  | 'A128GCM' | 'A192GCM' | 'A256GCM'              // AES GCM with a 128-bit, 192-bit, or 256-bit key
  | 'A128KW' | 'A192KW' | 'A256KW';                // AES Key Wrap with a 128-bit, 192-bit, or 256-bit key

/**
 * The `LocalKmsParams` interface specifies the parameters for initializing an instance of
 * {@link LocalKeyManager}. It allows the optional inclusion of a {@link AgentDataStore} instance
 * for key management. If not provided, a default {@link InMemoryKeyStore} instance will be used for
 * storing keys. Note that the {@link InMemoryKeyStore} is not persistent and will be cleared when
 * the application exits.
 */
export type LocalKmsParams = {
  agent?: Web5PlatformAgent;

  /**
   * An optional property to specify a custom {@link AgentDataStore} instance for key management. If
   * not provided, {@link LocalKeyManager} uses a default {@link InMemoryKeyStore} instance. This
   * store is responsible for managing cryptographic keys, allowing them to be retrieved, stored,
   * and managed during cryptographic operations.
   */
  keyStore?: AgentDataStore<Jwk>;
};

/**
 * The `LocalKmsGenerateKeyParams` interface defines the algorithm-specific parameters that
 * should be passed into the {@link LocalKeyManager.generateKey | `LocalKeyManager.generateKey()`}
 * method when generating a key in the local KMS.
 */
export interface LocalKmsGenerateKeyParams extends KmsGenerateKeyParams {
  /**
   * A string defining the type of key to generate.
   */
  algorithm: InferType<SupportedKeyGeneratorAlgorithm>
}

/**
 * The `LocalKmsUnwrapKeyParams` interface defines the algorithm-specific parameters that
 * should be passed into the {@link LocalKeyManager.wrapKey} method when wrapping a key using a
 * key stored in the local KMS to encrypt the key material.
 */
export interface LocalKmsUnwrapKeyParams extends KmsUnwrapKeyParams {
  /**
   * A string defining the type of wrapped key. The value must be one of the following:
   * - `"A128GCM"`: AES GCM using a 128-bit key.
   * - `"A192GCM"`: AES GCM using a 192-bit key.
   * - `"A256GCM"`: AES GCM using a 256-bit key.
   * - `"A128KW"`: AES Key Wrap using a 128-bit key.
   * - `"A192KW"`: AES Key Wrap using a 192-bit key.
   * - `"A256KW"`: AES Key Wrap using a 256-bit key.
   */
  wrappedKeyAlgorithm: 'A128GCM' | 'A192GCM' | 'A256GCM' | 'A128KW' | 'A192KW' | 'A256KW';
}

export class LocalKeyManager implements AgentKeyManager {
  /**
   * Holds the instance of a `Web5PlatformAgent` that represents the current execution context for
   * the `LocalKeyManager`. This agent is used to interact with other Web5 agent components. It's
   * vital to ensure this instance is set to correctly contextualize operations within the broader
   * Web5 Agent framework.
   */
  private _agent?: Web5PlatformAgent;

  /**
   * A private map that stores instances of cryptographic algorithm implementations. Each key in
   * this map is an `AlgorithmConstructor`, and its corresponding value is an instance of a class
   * that implements a specific cryptographic algorithm. This map is used to cache and reuse
   * instances for performance optimization, ensuring that each algorithm is instantiated only once.
   */
  private _algorithmInstances: Map<AlgorithmConstructor, InstanceType<typeof CryptoAlgorithm>> = new Map();

  /**
   * The `_keyStore` private variable in `LocalKeyManager` is a {@link AgentDataStore} instance used
   * for storing and managing cryptographic keys. It allows the `LocalKeyManager` class to save,
   * retrieve, and handle keys efficiently within the local Key Management System (KMS) context.
   * This variable can be configured to use different storage backends, like in-memory storage or
   * persistent storage, providing flexibility in key management according to the application's
   * requirements.
   */
  private _keyStore: AgentDataStore<Jwk>;

  constructor({ agent, keyStore }: LocalKmsParams = {}) {
    this._agent = agent;

    this._keyStore = keyStore ?? new InMemoryKeyStore();
  }

  /**
   * Retrieves the `Web5PlatformAgent` execution context.
   *
   * @returns The `Web5PlatformAgent` instance that represents the current execution context.
   * @throws Will throw an error if the `agent` instance property is undefined.
   */
  get agent(): Web5PlatformAgent {
    if (this._agent === undefined) {
      throw new Error('LocalKeyManager: Unable to determine agent execution context.');
    }

    return this._agent;
  }

  set agent(agent: Web5PlatformAgent) {
    this._agent = agent;
  }

  public async decrypt({ keyUri, ...params }:
    KmsCipherParams & AesGcmParams
  ): Promise<Uint8Array> {
    // Get the private key from the key store.
    const privateKey = await this.getPrivateKey({ keyUri });

    // Determine the algorithm name based on the JWK's `alg` property.
    const algorithm = this.getAlgorithmName({ key: privateKey });

    // Get the cipher algorithm based on the algorithm name.
    const cipher = this.getAlgorithm({ algorithm }) as Cipher<CipherParams, CipherParams>;

    // Encrypt the data.
    const ciphertext = await cipher.decrypt({ key: privateKey, ...params });

    return ciphertext;
  }

  digest(_params: KmsDigestParams): Promise<Uint8Array> {
    throw new Error('Method not implemented.');
  }

  public async encrypt({ keyUri, ...params }:
    KmsCipherParams & AesGcmParams
  ): Promise<Uint8Array> {
    // Get the private key from the key store.
    const privateKey = await this.getPrivateKey({ keyUri });

    // Determine the algorithm name based on the JWK's `alg` property.
    const algorithm = this.getAlgorithmName({ key: privateKey });

    // Get the cipher algorithm based on the algorithm name.
    const cipher = this.getAlgorithm({ algorithm }) as Cipher<CipherParams, CipherParams>;

    // Encrypt the data.
    const ciphertext = await cipher.encrypt({ key: privateKey, ...params });

    return ciphertext;
  }

  /**
   * Exports a private key identified by the provided key URI from the local KMS.
   *
   * @remarks
   * This method retrieves the key from the key store and returns it. It is primarily used
   * for extracting keys for backup or transfer purposes.
   *
   * @example
   * ```ts
   * const keyManager = new LocalKeyManager();
   * const keyUri = await keyManager.generateKey({ algorithm: 'Ed25519' });
   * const privateKey = await keyManager.exportKey({ keyUri });
   * ```
   *
   * @param params - Parameters for exporting the key.
   * @param params.keyUri - The key URI identifying the key to export.
   *
   * @returns A Promise resolving to the JWK representation of the exported key.
   */
  public async exportKey({ keyUri }:
    KmsExportKeyParams
  ): Promise<Jwk> {
    // Get the private key from the key store.
    const privateKey = await this.getPrivateKey({ keyUri });

    return privateKey;
  }

  /**
   * Generates a new cryptographic key in the local KMS with the specified algorithm and returns a
   * unique key URI which can be used to reference the key in subsequent operations.
   *
   * @example
   * ```ts
   * const keyManager = new LocalKeyManager();
   * const keyUri = await keyManager.generateKey({ algorithm: 'Ed25519' });
   * console.log(keyUri); // Outputs the key URI
   * ```
   *
   * @param params - The parameters for key generation.
   * @param params.algorithm - The algorithm to use for key generation, defined in `SupportedAlgorithm`.
   *
   * @returns A Promise that resolves to the key URI, a unique identifier for the generated key.
   */
  public async generateKey({ algorithm: algorithmIdentifier }:
    LocalKmsGenerateKeyParams
  ): Promise<KeyIdentifier> {
    // Determine the algorithm name based on the given algorithm identifier.
    const algorithm = this.getAlgorithmName({ key: { alg: algorithmIdentifier } });

    // Get the key generator implementation based on the algorithm.
    const keyGenerator = this.getAlgorithm({ algorithm }) as KeyGenerator<LocalKmsGenerateKeyParams, Jwk>;

    // Generate the key.
    const privateKey = await keyGenerator.generateKey({ algorithm: algorithmIdentifier });

    // If the key ID is undefined, set it to the JWK thumbprint.
    privateKey.kid ??= await computeJwkThumbprint({ jwk: privateKey });

    // Compute the key URI for the key.
    const keyUri = await this.getKeyUri({ key: privateKey });

    // Store the key in the key store.
    await this._keyStore.set({
      id                : keyUri,
      data              : privateKey,
      agent             : this.agent,
      preventDuplicates : false,
      useCache          : true
    });

    return keyUri;
  }

  /**
   * Computes the Key URI for a given public JWK (JSON Web Key).
   *
   * @remarks
   * This method generates a {@link https://datatracker.ietf.org/doc/html/rfc3986 | URI}
   * (Uniform Resource Identifier) for the given JWK, which uniquely identifies the key across all
   * `CryptoApi` implementations. The key URI is constructed by appending the
   * {@link https://datatracker.ietf.org/doc/html/rfc7638 | JWK thumbprint} to the prefix
   * `urn:jwk:`. The JWK thumbprint is deterministically computed from the JWK and is consistent
   * regardless of property order or optional property inclusion in the JWK. This ensures that the
   * same key material represented as a JWK will always yield the same thumbprint, and therefore,
   * the same key URI.
   *
   * @example
   * ```ts
   * const keyManager = new LocalKeyManager();
   * const keyUri = await keyManager.generateKey({ algorithm: 'Ed25519' });
   * const publicKey = await keyManager.getPublicKey({ keyUri });
   * const keyUriFromPublicKey = await keyManager.getKeyUri({ key: publicKey });
   * console.log(keyUri === keyUriFromPublicKey); // Outputs `true`
   * ```
   *
   * @param params - The parameters for getting the key URI.
   * @param params.key - The JWK for which to compute the key URI.
   *
   * @returns A Promise that resolves to the key URI as a string.
   */
  public async getKeyUri({ key }:
    KmsGetKeyUriParams
  ): Promise<KeyIdentifier> {
    // Compute the JWK thumbprint.
    const jwkThumbprint = await computeJwkThumbprint({ jwk: key });

    // Construct the key URI by appending the JWK thumbprint to the key URI prefix.
    const keyUri = `${KEY_URI_PREFIX_JWK}${jwkThumbprint}`;

    return keyUri;
  }

  /**
   * Retrieves the public key associated with a previously generated private key, identified by
   * the provided key URI.
   *
   * @example
   * ```ts
   * const keyManager = new LocalKeyManager();
   * const keyUri = await keyManager.generateKey({ algorithm: 'Ed25519' });
   * const publicKey = await keyManager.getPublicKey({ keyUri });
   * ```
   *
   * @param params - The parameters for retrieving the public key.
   * @param params.keyUri - The key URI of the private key to retrieve the public key for.
   *
   * @returns A Promise that resolves to the public key in JWK format.
   */
  public async getPublicKey({ keyUri }:
    KmsGetPublicKeyParams
  ): Promise<Jwk> {
    // Get the private key from the key store.
    const privateKey = await this.getPrivateKey({ keyUri });

    // Determine the algorithm name based on the JWK's `alg` and `crv` properties.
    const algorithm = this.getAlgorithmName({ key: privateKey });

    // Get the key generator based on the algorithm name.
    const keyGenerator = this.getAlgorithm({ algorithm }) as AsymmetricKeyGenerator<LocalKmsGenerateKeyParams, Jwk, GetPublicKeyParams>;

    // Get the public key properties from the private JWK.
    const publicKey = await keyGenerator.getPublicKey({ key: privateKey });

    return publicKey;
  }

  /**
   * Imports a private key into the local KMS.
   *
   * @remarks
   * This method stores the provided JWK in the key store, making it available for subsequent
   * cryptographic operations. It is particularly useful for initializing the KMS with pre-existing
   * keys or for restoring keys from backups.
   *
   * Note that, if defined, the `kid` (key ID) property of the JWK is used as the key URI for the
   * imported key. If the `kid` property is not provided, the key URI is computed from the JWK
   * thumbprint of the key.
   *
   * @example
   * ```ts
   * const keyManager = new LocalKeyManager();
   * const privateKey = { ... } // A private key in JWK format
   * const keyUri = await keyManager.importKey({ key: privateKey });
   * ```
   *
   * @param params - Parameters for importing the key.
   * @param params.key - The private key to import to in JWK format.
   *
   * @returns A Promise resolving to the key URI, uniquely identifying the imported key.
   */
  public async importKey({ key }:
    KmsImportKeyParams
  ): Promise<KeyIdentifier> {
    if (!isPrivateJwk(key)) throw new TypeError('Invalid key provided. Must be a private key in JWK format.');

    // Make a deep copy of the key to avoid mutating the original.
    const privateKey = structuredClone(key);

    // If the key ID is undefined, set it to the JWK thumbprint.
    privateKey.kid ??= await computeJwkThumbprint({ jwk: privateKey });

    // Compute the key URI for the key.
    const keyUri = await this.getKeyUri({ key: privateKey });

    // Store the key in the key store.
    await this._keyStore.set({
      id                : keyUri,
      data              : privateKey,
      agent             : this.agent,
      preventDuplicates : true,
      useCache          : true
    });

    return keyUri;
  }

  /**
   * Signs the provided data using the private key identified by the provided key URI.
   *
   * @remarks
   * This method uses the signature algorithm determined by the `alg` and/or `crv` properties of the
   * private key identified by the provided key URI to sign the provided data. The signature can
   * later be verified by parties with access to the corresponding public key, ensuring that the
   * data has not been tampered with and was indeed signed by the holder of the private key.
   *
   * @example
   * ```ts
   * const keyManager = new LocalKeyManager();
   * const keyUri = await keyManager.generateKey({ algorithm: 'Ed25519' });
   * const data = new TextEncoder().encode('Message to sign');
   * const signature = await keyManager.sign({ keyUri, data });
   * ```
   *
   * @param params - The parameters for the signing operation.
   * @param params.keyUri - The key URI of the private key to use for signing.
   * @param params.data - The data to sign.
   *
   * @returns A Promise resolving to the digital signature as a `Uint8Array`.
   */
  public async sign({ keyUri, data }:
    KmsSignParams
  ): Promise<Uint8Array> {
    // Get the private key from the key store.
    const privateKey = await this.getPrivateKey({ keyUri });

    // Determine the algorithm name based on the JWK's `alg` and `crv` properties.
    const algorithm = this.getAlgorithmName({ key: privateKey });

    // Get the signature algorithm based on the algorithm name.
    const signer = this.getAlgorithm({ algorithm }) as Signer<SignParams, VerifyParams>;

    // Sign the data.
    const signature = signer.sign({ data, key: privateKey });

    return signature;
  }

  public async unwrapKey({ wrappedKeyBytes, wrappedKeyAlgorithm, decryptionKeyUri }:
    LocalKmsUnwrapKeyParams
  ): Promise<Jwk> {
    // Get the private key from the key store.
    const decryptionKey = await this.getPrivateKey({ keyUri: decryptionKeyUri });

    // Determine the algorithm name based on the JWK's `alg` property.
    const algorithm = this.getAlgorithmName({ key: decryptionKey });

    // Get the key wrapping algorithm based on the algorithm name.
    const keyWrapper = this.getAlgorithm({ algorithm }) as KeyWrapper<WrapKeyParams, UnwrapKeyParams>;

    // Decrypt the key.
    const unwrappedKey = await keyWrapper.unwrapKey({ wrappedKeyBytes, wrappedKeyAlgorithm, decryptionKey });

    return unwrappedKey;
  }

  /**
   * Verifies a digital signature associated the provided data using the provided key.
   *
   * @remarks
   * This method uses the signature algorithm determined by the `alg` and/or `crv` properties of the
   * provided key to check the validity of a digital signature against the original data. It
   * confirms whether the signature was created by the holder of the corresponding private key and
   * that the data has not been tampered with.
   *
   * @example
   * ```ts
   * const keyManager = new LocalKeyManager();
   * const keyUri = await keyManager.generateKey({ algorithm: 'Ed25519' });
   * const data = new TextEncoder().encode('Message to sign');
   * const signature = await keyManager.sign({ keyUri, data });
   * const isSignatureValid = await keyManager.verify({ keyUri, data, signature });
   * ```
   *
   * @param params - The parameters for the verification operation.
   * @param params.key - The key to use for verification.
   * @param params.signature - The signature to verify.
   * @param params.data - The data to verify.
   *
   * @returns A Promise resolving to a boolean indicating whether the signature is valid.
   */
  public async verify({ key, signature, data }:
    KmsVerifyParams
  ): Promise<boolean> {
    // Determine the algorithm name based on the JWK's `alg` and `crv` properties.
    const algorithm = this.getAlgorithmName({ key });

    // Get the signature algorithm based on the algorithm name.
    const signer = this.getAlgorithm({ algorithm }) as Signer<SignParams, VerifyParams>;

    // Verify the signature.
    const isSignatureValid = signer.verify({ key, signature, data });

    return isSignatureValid;
  }

  public async wrapKey({ unwrappedKey, encryptionKeyUri }:
    KmsWrapKeyParams
  ): Promise<Uint8Array> {
    // Get the private key from the key store.
    const encryptionKey = await this.getPrivateKey({ keyUri: encryptionKeyUri });

    // Determine the algorithm name based on the JWK's `alg` property.
    const algorithm = this.getAlgorithmName({ key: encryptionKey });

    // Get the key wrapping algorithm based on the algorithm name.
    const keyWrapper = this.getAlgorithm({ algorithm }) as KeyWrapper<WrapKeyParams, UnwrapKeyParams>;

    // Encrypt the key.
    const wrappedKeyBytes = await keyWrapper.wrapKey({ unwrappedKey, encryptionKey });

    return wrappedKeyBytes;
  }

  /**
   * Retrieves an algorithm implementation instance based on the provided algorithm name.
   *
   * @remarks
   * This method checks if the requested algorithm is supported and returns a cached instance
   * if available. If an instance does not exist, it creates and caches a new one. This approach
   * optimizes performance by reusing algorithm instances across cryptographic operations.
   *
   * @example
   * ```ts
   * const signer = this.getAlgorithm({ algorithm: 'Ed25519' });
   * ```
   *
   * @param params - The parameters for retrieving the algorithm implementation.
   * @param params.algorithm - The name of the algorithm to retrieve.
   *
   * @returns An instance of the requested algorithm implementation.
   *
   * @throws Error if the requested algorithm is not supported.
   */
  private getAlgorithm({ algorithm }: {
    algorithm: SupportedAlgorithm;
  }): InstanceType<typeof CryptoAlgorithm> {
    // Check if algorithm is supported.
    const AlgorithmImplementation = supportedAlgorithms[algorithm]?.['implementation'];
    if (!AlgorithmImplementation) {
      throw new CryptoError(CryptoErrorCode.AlgorithmNotSupported, `Algorithm not supported: ${algorithm}`);
    }

    // Check if instance already exists for the `AlgorithmImplementation`.
    if (!this._algorithmInstances.has(AlgorithmImplementation)) {
      // If not, create a new instance and store it in the cache
      this._algorithmInstances.set(AlgorithmImplementation, new AlgorithmImplementation());
    }

    // Return the cached instance
    return this._algorithmInstances.get(AlgorithmImplementation)!;
  }

  /**
   * Determines the algorithm name based on the key's properties.
   *
   * @remarks
   * This method facilitates the identification of the correct algorithm for cryptographic
   * operations based on the `alg` or `crv` properties of a {@link Jwk | JWK}.
   *
   * @example
   * ```ts
   * const publicKey = { ... }; // Public key in JWK format
   * const algorithm = this.getAlgorithmName({ key: publicKey });
   * ```
   *
   * @param params - The parameters for determining the algorithm name.
   * @param params.key - A JWK containing the `alg` or `crv` properties.
   *
   * @returns The algorithm name associated with the key.
   *
   * @throws Error if the algorithm name cannot be determined from the provided input.
   */
  private getAlgorithmName({ key }: {
    key: { alg?: string, crv?: string };
  }): SupportedAlgorithm {
    const algProperty = key.alg;
    const crvProperty = key.crv;

    for (const algorithmIdentifier of Object.keys(supportedAlgorithms) as SupportedAlgorithm[]) {
      const algorithmNames = supportedAlgorithms[algorithmIdentifier].names as readonly string[];
      if (algProperty && algorithmNames.includes(algProperty)) {
        return algorithmIdentifier;
      } else if (crvProperty && algorithmNames.includes(crvProperty)) {
        return algorithmIdentifier;
      }
    }

    throw new CryptoError(CryptoErrorCode.AlgorithmNotSupported,
      `Algorithm not supported based on provided input: alg=${algProperty}, crv=${crvProperty}. ` +
      'Please check the documentation for the list of supported algorithms.'
    );
  }

  /**
   * Retrieves a private key from the key store based on the provided key URI.
   *
   * @example
   * ```ts
   * const privateKey = this.getPrivateKey({ keyUri: 'urn:jwk:...' });
   * ```
   *
   * @param params - Parameters for retrieving the private key.
   * @param params.keyUri - The key URI identifying the private key to retrieve.
   *
   * @returns A Promise resolving to the JWK representation of the private key.
   *
   * @throws Error if the key is not found in the key store.
   */
  private async getPrivateKey({ keyUri }: {
    keyUri: KeyIdentifier;
  }): Promise<Jwk> {
    // Get the private key from the key store.
    const privateKey = await this._keyStore.get({ id: keyUri, agent: this.agent, useCache: true });

    if (!privateKey) {
      throw new Error(`Key not found: ${keyUri}`);
    }

    return privateKey;
  }
}