import { KeyValueStore, MemoryStore } from '@web5/common';

import type { Jwk } from './jose/jwk.js';
import type { Hasher } from './types/hasher.js';
import type { Signer } from './types/signer.js';
import type { CryptoApi } from './types/crypto-api.js';
import type { KeyIdentifier } from './types/identifier.js';
import type { KeyImporterExporter } from './types/key-io.js';
import type { KeyGenerator, AsymmetricKeyGenerator } from './types/key-generator.js';
import type { GetPublicKeyParams, SignParams, VerifyParams } from './types/params-direct.js';
import type {
  KmsSignParams,
  KmsDigestParams,
  KmsVerifyParams,
  KmsExportKeyParams,
  KmsGetKeyUriParams,
  KmsImportKeyParams,
  KmsGenerateKeyParams,
  KmsGetPublicKeyParams,
} from './types/params-kms.js';

import { Sha2Algorithm } from './algorithms/sha-2.js';
import { EcdsaAlgorithm } from './algorithms/ecdsa.js';
import { EdDsaAlgorithm } from './algorithms/eddsa.js';
import { CryptoAlgorithm } from './algorithms/crypto-algorithm.js';
import { computeJwkThumbprint, isPrivateJwk, KEY_URI_PREFIX_JWK } from './jose/jwk.js';

/**
 * `supportedAlgorithms` is an object mapping algorithm names to their respective implementations
 * Each entry in this map specifies the algorithm name and its associated properties, including the
 * implementation class and any relevant names or identifiers for the algorithm. This structure
 * allows for easy retrieval and instantiation of algorithm implementations based on the algorithm
 * name or key specification. It facilitates the support of multiple algorithms within the
 * `LocalKeyManager` class.
 */
const supportedAlgorithms = {
  'Ed25519': {
    implementation : EdDsaAlgorithm,
    names          : ['Ed25519'],
  },
  'secp256k1': {
    implementation : EcdsaAlgorithm,
    names          : ['ES256K', 'secp256k1'],
  },
  'secp256r1': {
    implementation : EcdsaAlgorithm,
    names          : ['ES256', 'secp256r1'],
  },
  'SHA-256': {
    implementation : Sha2Algorithm,
    names          : ['SHA-256']
  }
} satisfies {
  [key: string]: {
    implementation : typeof CryptoAlgorithm;
    names          : string[];
  }
};

/* Helper type for `supportedAlgorithms`. */
type SupportedAlgorithm = keyof typeof supportedAlgorithms;

/* Helper type for `supportedAlgorithms` implementations. */
type AlgorithmConstructor = typeof supportedAlgorithms[SupportedAlgorithm]['implementation'];

/**
 * The `LocalKeyManagerParams` interface specifies the parameters for initializing an instance of
 * `LocalKeyManager`. It allows the optional inclusion of a `KeyValueStore` instance for key
 * management. If not provided, a default `MemoryStore` instance will be used for storing keys in
 * memory. Note that the `MemoryStore` is not persistent and will be cleared when the application
 * exits.
 */
export type LocalKeyManagerParams = {
  /**
   * An optional property to specify a custom `KeyValueStore` instance for key management. If not
   * provided, {@link LocalKeyManager | `LocalKeyManager`} uses a default `MemoryStore` instance.
   * This store is responsible for managing cryptographic keys, allowing them to be retrieved,
   * stored, and managed during cryptographic operations.
   */
  keyStore?: KeyValueStore<KeyIdentifier, Jwk>;
};

/**
 * The `LocalKeyManagerDigestParams` interface defines the algorithm-specific parameters that should
 * be passed into the {@link LocalKeyManager.digest | `LocalKeyManager.digest()`} method.
 */
export interface LocalKeyManagerDigestParams extends KmsDigestParams {
  /**
   * A string defining the name of hash function to use. The value must be one of the following:
   * - `"SHA-256"`: Generates a 256-bit digest.
   */
  algorithm: 'SHA-256';
}

/**
 * The `LocalKeyManagerGenerateKeyParams` interface defines the algorithm-specific parameters that
 * should be passed into the {@link LocalKeyManager.generateKey | `LocalKeyManager.generateKey()`}
 * method when generating a key in the local KMS.
 */
export interface LocalKeyManagerGenerateKeyParams extends KmsGenerateKeyParams {
  /**
   * A string defining the type of key to generate. The value must be one of the following:
   * - `"Ed25519"`
   * - `"secp256k1"`
   */
  algorithm: 'Ed25519' | 'secp256k1' | 'secp256r1';
}

export class LocalKeyManager implements
    CryptoApi,
    KeyImporterExporter<KmsImportKeyParams, KeyIdentifier, KmsExportKeyParams> {

  /**
   * A private map that stores instances of cryptographic algorithm implementations. Each key in
   * this map is an `AlgorithmConstructor`, and its corresponding value is an instance of a class
   * that implements a specific cryptographic algorithm. This map is used to cache and reuse
   * instances for performance optimization, ensuring that each algorithm is instantiated only once.
   */
  private _algorithmInstances: Map<AlgorithmConstructor, InstanceType<typeof CryptoAlgorithm>> = new Map();

  /**
   * The `_keyStore` private variable in `LocalKeyManager` is a `KeyValueStore` instance used for
   * storing and managing cryptographic keys. It allows the `LocalKeyManager` class to save,
   * retrieve, and handle keys efficiently within the local Key Management System (KMS) context.
   * This variable can be configured to use different storage backends, like in-memory storage or
   * persistent storage, providing flexibility in key management according to the application's
   * requirements.
   */
  private _keyStore: KeyValueStore<KeyIdentifier, Jwk>;

  constructor(params?: LocalKeyManagerParams) {
    this._keyStore = params?.keyStore ?? new MemoryStore<KeyIdentifier, Jwk>();
  }

  /**
   * Generates a hash digest of the provided data.
   *
   * @remarks
   * A digest is the output of the hash function. It's a fixed-size string of bytes
   * that uniquely represents the data input into the hash function. The digest is often used for
   * data integrity checks, as any alteration in the input data results in a significantly
   * different digest.
   *
   * It takes the algorithm identifier of the hash function and data to digest as input and returns
   * the digest of the data.
   *
   * @example
   * ```ts
   * const keyManager = new LocalKeyManager();
   * const data = new Uint8Array([...]);
   * const digest = await keyManager.digest({ algorithm: 'SHA-256', data });
   * ```
   *
   * @param params - The parameters for the digest operation.
   * @param params.algorithm - The name of hash function to use.
   * @param params.data - The data to digest.
   *
   * @returns A Promise which will be fulfilled with the hash digest.
   */
  public async digest({ algorithm, data }:
    LocalKeyManagerDigestParams
  ): Promise<Uint8Array> {
    // Get the hash function implementation based on the specified `algorithm` parameter.
    const hasher = this.getAlgorithm({ algorithm }) as Hasher<KmsDigestParams>;

    // Compute the hash.
    const hash = await hasher.digest({ algorithm, data });

    return hash;
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
  public async generateKey({ algorithm }:
    LocalKeyManagerGenerateKeyParams
  ): Promise<KeyIdentifier> {
    // Get the key generator implementation based on the specified `algorithm` parameter.
    const keyGenerator = this.getAlgorithm({ algorithm }) as KeyGenerator<LocalKeyManagerGenerateKeyParams, Jwk>;

    // Generate the key.
    const key = await keyGenerator.generateKey({ algorithm });

    if (key?.kid === undefined) {
      throw new Error('Generated key is missing a required property: kid');
    }

    // Construct the key URI.
    const keyUri = `${KEY_URI_PREFIX_JWK}${key.kid}`;

    // Store the key in the key store.
    await this._keyStore.set(keyUri, key);

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
    const keyGenerator = this.getAlgorithm({ algorithm }) as AsymmetricKeyGenerator<LocalKeyManagerGenerateKeyParams, Jwk, GetPublicKeyParams>;

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
    await this._keyStore.set(keyUri, privateKey);

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
      throw new Error(`Algorithm not supported: ${algorithm}`);
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
   * Determines the name of the algorithm based on the key's properties.
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
   * @returns The name of the algorithm associated with the key.
   *
   * @throws Error if the algorithm cannot be determined from the provided input.
   */
  private getAlgorithmName({ key }: {
    key: { alg?: string, crv?: string };
  }): SupportedAlgorithm {
    const algProperty = key.alg;
    const crvProperty = key.crv;

    for (const algName in supportedAlgorithms) {
      const algorithmInfo = supportedAlgorithms[algName as SupportedAlgorithm];
      if (algProperty && algorithmInfo.names.includes(algProperty)) {
        return algName as SupportedAlgorithm;
      } else if (crvProperty && algorithmInfo.names.includes(crvProperty)) {
        return algName as SupportedAlgorithm;
      }
    }

    throw new Error(`Unable to determine algorithm based on provided input: alg=${algProperty}, crv=${crvProperty}`);
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
    const privateKey = await this._keyStore.get(keyUri);

    if (!privateKey) {
      throw new Error(`Key not found: ${keyUri}`);
    }

    return privateKey;
  }
}