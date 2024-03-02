import type {
  Jwk,
  Hasher,
  Signer,
  SignParams,
  DigestParams,
  VerifyParams,
  GenerateKeyParams,
  GetPublicKeyParams,
  KmsGetKeyUriParams,
  AsymmetricKeyGenerator,
} from '@web5/crypto';

import { CryptoAlgorithm, Sha2Algorithm, computeJwkThumbprint } from '@web5/crypto';

import type { DsaApi } from './types/crypto-api.js';
import type { AsymmetricKeyConverter, KeyConverter } from './types/key-converter.js';
import type { BytesToPrivateKeyParams, BytesToPublicKeyParams, PrivateKeyToBytesParams, PublicKeyToBytesParams } from './types/params-direct.js';

import { EcdsaAlgorithm } from './algorithms/ecdsa.js';
import { EdDsaAlgorithm } from './algorithms/eddsa.js';
import { CryptoError, CryptoErrorCode } from './crypto-error.js';

export interface DsaBytesToPrivateKeyParams extends BytesToPrivateKeyParams {
  algorithm: KeyConversionAlgorithm;
}

export interface DsaBytesToPublicKeyParams extends BytesToPublicKeyParams {
  algorithm: AsymmetricKeyConversionAlgorithm;
}

/**
 * The `DsaDigestParams` interface defines the algorithm-specific parameters that should
 * be passed into the {@link AgentDsa.digest | `AgentDsa.digest()`} method.
 */
export interface DsaDigestParams extends DigestParams {
  /**
   * A string defining the name of hash function to use. The value must be one of the following:
   * - `"SHA-256"`: Generates a 256-bit digest.
   */
  algorithm: DigestAlgorithm;
}

export interface DsaGenerateKeyParams extends GenerateKeyParams {
  algorithm: KeyGenerationAlgorithm;
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
    operations     : ['bytesToPrivateKey', 'bytesToPublicKey', 'generateKey', 'sign', 'verify'],
  },
  'secp256k1': {
    implementation : EcdsaAlgorithm,
    names          : ['ES256K', 'secp256k1'],
    operations     : ['bytesToPrivateKey', 'bytesToPublicKey', 'generateKey', 'sign', 'verify'],
  },
  'secp256r1': {
    implementation : EcdsaAlgorithm,
    names          : ['ES256', 'secp256r1'],
    operations     : ['bytesToPrivateKey', 'bytesToPublicKey', 'generateKey', 'sign', 'verify'],
  },
  'SHA-256': {
    implementation : Sha2Algorithm,
    names          : ['SHA-256'],
    operations     : ['digest'],
  }
} as const;

/* Helper types for `supportedAlgorithms`. */
type SupportedAlgorithm = keyof typeof supportedAlgorithms;
type SupportedAlgorithms = typeof supportedAlgorithms;

/* Helper type for `supportedAlgorithms` implementations. */
type AlgorithmConstructor = typeof supportedAlgorithms[SupportedAlgorithm]['implementation'];

type DigestAlgorithms = {
  [K in keyof SupportedAlgorithms]: 'digest' extends SupportedAlgorithms[K]['operations'][number] ? K : never
}[keyof SupportedAlgorithms];

type DigestAlgorithm = typeof supportedAlgorithms[DigestAlgorithms]['names'][number];

type KeyConversionAlgorithms = {
  [K in keyof SupportedAlgorithms]: 'bytesToPrivateKey' extends SupportedAlgorithms[K]['operations'][number] ? K : never
}[keyof SupportedAlgorithms];

type KeyConversionAlgorithm = typeof supportedAlgorithms[KeyConversionAlgorithms]['names'][number];

type AsymmetricKeyConversionAlgorithms = {
  [K in keyof SupportedAlgorithms]: 'bytesToPublicKey' extends SupportedAlgorithms[K]['operations'][number] ? K : never
}[keyof SupportedAlgorithms];

type AsymmetricKeyConversionAlgorithm = typeof supportedAlgorithms[AsymmetricKeyConversionAlgorithms]['names'][number];

type KeyGenerationAlgorithms = {
  [K in keyof SupportedAlgorithms]: 'generateKey' extends SupportedAlgorithms[K]['operations'][number] ? K : never
}[keyof SupportedAlgorithms];

type KeyGenerationAlgorithm = typeof supportedAlgorithms[KeyGenerationAlgorithms]['names'][number];

export class Dsa implements DsaApi<
  DsaGenerateKeyParams, Jwk, GetPublicKeyParams, DsaDigestParams, SignParams, VerifyParams
> {

  /**
   * A private map that stores instances of cryptographic algorithm implementations. Each key in
   * this map is an `AlgorithmConstructor`, and its corresponding value is an instance of a class
   * that implements a specific cryptographic algorithm. This map is used to cache and reuse
   * instances for performance optimization, ensuring that each algorithm is instantiated only once.
   */
  private _algorithmInstances: Map<AlgorithmConstructor, InstanceType<typeof CryptoAlgorithm>> = new Map();

  public async bytesToPrivateKey({ algorithm: algorithmIdentifier, privateKeyBytes }:
    DsaBytesToPrivateKeyParams
  ): Promise<Jwk> {
    // Determine the algorithm name based on the given algorithm identifier.
    const algorithm = this.getAlgorithmName({ algorithm: algorithmIdentifier });

    // Get the key converter based on the algorithm name.
    const keyConverter = this.getAlgorithm({ algorithm }) as KeyConverter<DsaBytesToPrivateKeyParams, PrivateKeyToBytesParams>;

    // Convert the byte array to a JWK.
    const privateKey = await keyConverter.bytesToPrivateKey({ algorithm: algorithmIdentifier, privateKeyBytes });

    return privateKey;
  }

  public async bytesToPublicKey({ algorithm: algorithmIdentifier, publicKeyBytes }:
    DsaBytesToPublicKeyParams
  ): Promise<Jwk> {
    // Determine the algorithm name based on the given algorithm identifier.
    const algorithm = this.getAlgorithmName({ algorithm: algorithmIdentifier });

    // Get the key converter based on the algorithm name.
    const keyConverter = this.getAlgorithm({ algorithm }) as AsymmetricKeyConverter<DsaBytesToPublicKeyParams, PublicKeyToBytesParams>;

    // Convert the byte array to a JWK.
    const publicKey = await keyConverter.bytesToPublicKey({ algorithm: algorithmIdentifier, publicKeyBytes });

    return publicKey;
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
   * const Dsa = new AgentDsa();
   * const data = new Uint8Array([...]);
   * const digest = await Dsa.digest({ algorithm: 'SHA-256', data });
   * ```
   *
   * @param params - The parameters for the digest operation.
   * @param params.algorithm - The name of hash function to use.
   * @param params.data - The data to digest.
   *
   * @returns A Promise which will be fulfilled with the hash digest.
   */
  public async digest({ algorithm, data }:
    DsaDigestParams
  ): Promise<Uint8Array> {
    // Get the hash function implementation based on the specified `algorithm` parameter.
    const hasher = this.getAlgorithm({ algorithm }) as Hasher<DsaDigestParams>;

    // Compute the hash.
    const hash = await hasher.digest({ algorithm, data });

    return hash;
  }

  public async generateKey(params: DsaGenerateKeyParams): Promise<Jwk> {
    // Determine the algorithm name based on the given algorithm identifier.
    const algorithm = this.getAlgorithmName({ algorithm: params.algorithm });

    // Get the key generator implementation based on the algorithm.
    const keyGenerator = this.getAlgorithm({ algorithm }) as AsymmetricKeyGenerator<DsaGenerateKeyParams, Jwk, GetPublicKeyParams>;

    // Generate the key.
    const privateKey = await keyGenerator.generateKey({ algorithm: params.algorithm });

    // If the key ID is undefined, set it to the JWK thumbprint.
    privateKey.kid ??= await computeJwkThumbprint({ jwk: privateKey });

    return privateKey;
  }

  // ! TODO: Remove this once the `Dsa` interface is updated in @web5/crypto to remove KMS-specific methods.
  public async getKeyUri(_params: KmsGetKeyUriParams): Promise<string> {
    throw new Error('Method not implemented.');
  }

  public async getPublicKey({ key }:
    GetPublicKeyParams
  ): Promise<Jwk> {
    // Determine the algorithm name based on the JWK's `alg` and `crv` properties.
    const algorithm = this.getAlgorithmName({ key });

    // Get the key generator based on the algorithm name.
    const keyGenerator = this.getAlgorithm({ algorithm }) as AsymmetricKeyGenerator<DsaGenerateKeyParams, Jwk, GetPublicKeyParams>;

    // Get the public key properties from the private JWK.
    const publicKey = await keyGenerator.getPublicKey({ key });

    return publicKey;
  }

  public async privateKeyToBytes({ privateKey }: { privateKey: Jwk; }): Promise<Uint8Array> {
    // Determine the algorithm name based on the JWK's `alg` property.
    const algorithm = this.getAlgorithmName({ key: privateKey });

    // Get the key converter based on the algorithm name.
    const keyConverter = this.getAlgorithm({ algorithm }) as KeyConverter<DsaBytesToPrivateKeyParams, PrivateKeyToBytesParams>;

    // Convert the JWK to a byte array.
    const privateKeyBytes = await keyConverter.privateKeyToBytes({ privateKey });

    return privateKeyBytes;
  }

  public async publicKeyToBytes({ publicKey }: { publicKey: Jwk; }): Promise<Uint8Array> {
    // Determine the algorithm name based on the JWK's `alg` property.
    const algorithm = this.getAlgorithmName({ key: publicKey });

    // Get the key converter based on the algorithm name.
    const keyConverter = this.getAlgorithm({ algorithm }) as AsymmetricKeyConverter<DsaBytesToPublicKeyParams, PublicKeyToBytesParams>;

    // Convert the JWK to a byte array.
    const publicKeyBytes = await keyConverter.publicKeyToBytes({ publicKey });

    return publicKeyBytes;
  }

  public async sign({ key, data }:
    SignParams
  ): Promise<Uint8Array> {
    // Determine the algorithm name based on the JWK's `alg` and `crv` properties.
    const algorithm = this.getAlgorithmName({ key });

    // Get the signature algorithm based on the algorithm name.
    const signer = this.getAlgorithm({ algorithm }) as Signer<SignParams, VerifyParams>;

    // Sign the data.
    const signature = signer.sign({ data, key });

    return signature;
  }

  public async verify({ key, signature, data }:
    VerifyParams
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
   * const key = { ... }; // Public key in JWK format
   * const algorithm = this.getAlgorithmName({ key });
   * ```
   *
   * @example
   * ```ts
   * const algorithm = this.getAlgorithmName({ algorithm: 'ES256' });
   * ```
   *
   * @param params - The parameters for determining the algorithm name.
   * @param params.key - A JWK containing the `alg` or `crv` properties.
   *
   * @returns The algorithm name associated with the key.
   *
   * @throws Error if the algorithm name cannot be determined from the provided input.
   */
  private getAlgorithmName({ key }: { key: Jwk }): SupportedAlgorithm;
  private getAlgorithmName({ algorithm }: { algorithm: string }): SupportedAlgorithm;
  private getAlgorithmName({ algorithm, key }: {
    algorithm?: string;
    key?: { alg?: string, crv?: string };
  }): SupportedAlgorithm {
    const algProperty = key?.alg ?? algorithm;
    const crvProperty = key?.crv;

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
}