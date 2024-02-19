import { EdDsaAlgorithm, type CryptoApi, type Hasher, type InferKeyGeneratorAlgorithm, type Jwk, type KeyIdentifier, type KeyImporterExporter, type KmsDigestParams, type KmsExportKeyParams, type KmsGetKeyUriParams, type KmsGetPublicKeyParams, type KmsImportKeyParams, type KmsSignParams, type KmsVerifyParams, EcdsaAlgorithm, Sha2Algorithm, CryptoAlgorithm, Signer, SignParams, VerifyParams } from '@web5/crypto';

import type { Web5PlatformAgent } from './types/agent.js';
import type { KeyManager } from './types/key-manager.js';

import { LocalKeyManager } from './local-key-manager.js';

/**
 * The `CryptoApiDigestParams` interface defines the algorithm-specific parameters that should
 * be passed into the {@link AgentCryptoApi.digest | `AgentCryptoApi.digest()`} method.
 */
export interface CryptoApiDigestParams extends KmsDigestParams {
  /**
   * A string defining the name of hash function to use. The value must be one of the following:
   * - `"SHA-256"`: Generates a 256-bit digest.
   */
  algorithm: 'SHA-256';
}

export interface CryptoApiGenerateKeyParams<TKeyManager> {
  algorithm: TKeyManager extends CryptoApi
    ? InferKeyGeneratorAlgorithm<TKeyManager>
    : InferKeyGeneratorAlgorithm<LocalKeyManager>;
}

export type CryptoApiParams<TKeyManager> = {
  agent?: Web5PlatformAgent;
  keyManager?: TKeyManager;
}

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

export class AgentCryptoApi<TKeyManager extends KeyManager = LocalKeyManager> implements
    CryptoApi<CryptoApiGenerateKeyParams<TKeyManager>>,
    KeyImporterExporter<KmsImportKeyParams, KeyIdentifier, KmsExportKeyParams> {

  /**
   * Holds the instance of a `Web5PlatformAgent` that represents the current execution context for
   * the `AgentCryptoApi`. This agent is used to interact with other Web5 agent components. It's
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

  private _keyManager: TKeyManager;

  constructor({ agent, keyManager }: CryptoApiParams<TKeyManager> = {}) {
    this._agent = agent;

    // If `keyManager` is not given, use a LocalKeyManager that stores keys in memory.
    this._keyManager = (keyManager ?? new LocalKeyManager({ agent })) as TKeyManager;
  }

  /**
   * Retrieves the `Web5PlatformAgent` execution context.
   *
   * @returns The `Web5PlatformAgent` instance that represents the current execution context.
   * @throws Will throw an error if the `agent` instance property is undefined.
   */
  get agent(): Web5PlatformAgent {
    if (this._agent === undefined) {
      throw new Error('AgentCryptoApi: Unable to determine agent execution context.');
    }

    return this._agent;
  }

  set agent(agent: Web5PlatformAgent) {
    this._agent = agent;
    this._keyManager.agent = agent;
  }

  /**
   * Generates a hash digest of the provided data.
   *
   * @remarks
   * A digest is the output of the hash function. It's a fixed-size string of bytes that uniquely
   * represents the data input into the hash function. The digest is often used for data integrity
   * checks, as any alteration in the input data results in a significantly different digest.
   *
   * It takes the algorithm identifier of the hash function and data to digest as input and returns
   * the digest of the data.
   *
   * @example
   * ```ts
   * const cryptoApi = new AgentCryptoApi();
   * const data = new Uint8Array([...]);
   * const digest = await cryptoApi.digest({ algorithm: 'SHA-256', data });
   * ```
   *
   * @param params - The parameters for the digest operation.
   * @param params.algorithm - The name of hash function to use.
   * @param params.data - The data to digest.
   *
   * @returns A Promise which will be fulfilled with the hash digest.
   */
  public async digest({ algorithm, data }:
    CryptoApiDigestParams
  ): Promise<Uint8Array> {
    // Get the hash function implementation based on the specified `algorithm` parameter.
    const hasher = this.getAlgorithm({ algorithm }) as Hasher<KmsDigestParams>;

    // Compute the hash.
    const hash = await hasher.digest({ algorithm, data });

    return hash;
  }

  public async exportKey({ keyUri }:
    KmsExportKeyParams
  ): Promise<Jwk> {
    // If the BearerDid's key manager supports exporting private keys, add them to the portable DID.
    if ('exportKey' in this._keyManager && typeof this._keyManager.exportKey === 'function') {
      const privateKey = await this._keyManager.exportKey({ keyUri }) as Jwk;
      return privateKey;
    } else {
      throw new Error('Key Manager does not support exporting private keys');
    }
  }

  public async getKeyUri({ key }:
    KmsGetKeyUriParams
  ): Promise<KeyIdentifier> {
    const keyUri = await this._keyManager.getKeyUri({ key });
    return keyUri;
  }

  public async getPublicKey({ keyUri }:
    KmsGetPublicKeyParams
  ): Promise<Jwk> {
    const publicKey = await this._keyManager.getPublicKey({ keyUri });
    return publicKey;
  }

  public async generateKey(params:
    CryptoApiGenerateKeyParams<TKeyManager>
  ): Promise<KeyIdentifier> {
    return await this._keyManager.generateKey(params);
  }

  public async importKey({ key }:
    KmsImportKeyParams
  ): Promise<KeyIdentifier> {
    // If the Agent's key manager supports importing private keys, import the key to the key store.
    if ('importKey' in this._keyManager && typeof this._keyManager.importKey === 'function') {
      const keyUri = await this._keyManager.importKey({ key }) as KeyIdentifier;
      return keyUri;
    } else {
      throw new Error('Key Manager does not support importing private keys');
    }
  }

  public async sign({ keyUri, data }:
    KmsSignParams
  ): Promise<Uint8Array> {
    const signature = await this._keyManager.sign({ keyUri, data });
    return signature;
  }

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
}