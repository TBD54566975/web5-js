import type {
  Jwk,
  Cipher,
  Hasher,
  Signer,
  CryptoApi,
  KeyWrapper,
  SignParams,
  AesGcmParams,
  DigestParams,
  VerifyParams,
  KeyIdentifier,
  KmsSignParams,
  KmsVerifyParams,
  KmsExportKeyParams,
  KmsGetKeyUriParams,
  KmsImportKeyParams,
  KmsGetPublicKeyParams,
  InferKeyGeneratorAlgorithm,
} from '@web5/crypto';

import { CryptoAlgorithm, Sha2Algorithm } from '@web5/crypto';

import type { Web5PlatformAgent } from './types/agent.js';
import type { AgentKeyManager } from './types/key-manager.js';
import type { HkdfParams } from './prototyping/crypto/primitives/hkdf.js';
import type { Pbkdf2Params } from './prototyping/crypto/primitives/pbkdf2.js';
import type { KmsCipherParams } from './prototyping/crypto/types/params-kms.js';
import type { KeyBytesDeriver, KeyDeriver } from './prototyping/crypto/types/kdf.js';
import type { KeyExporter, KeyImporter } from './prototyping/crypto/types/key-io.js';
import type { InferKeyUnwrapAlgorithm } from './prototyping/crypto/types/key-wrapper.js';
import type { KmsUnwrapKeyParams, KmsWrapKeyParams } from './prototyping/crypto/types/params-kms.js';
import type { AsymmetricKeyConverter, KeyConverter } from './prototyping/crypto/types/key-converter.js';
import type { BytesToPrivateKeyParams, BytesToPublicKeyParams, CipherParams, DeriveKeyBytesParams, DeriveKeyParams, PrivateKeyToBytesParams, PublicKeyToBytesParams, UnwrapKeyParams, WrapKeyParams } from './prototyping/crypto/types/params-direct.js';

import { LocalKeyManager } from './local-key-manager.js';
import { HkdfAlgorithm } from './prototyping/crypto/algorithms/hkdf.js';
import { EcdsaAlgorithm } from './prototyping/crypto/algorithms/ecdsa.js';
import { EdDsaAlgorithm } from './prototyping/crypto/algorithms/eddsa.js';
import { AesKwAlgorithm } from './prototyping/crypto/algorithms/aes-kw.js';
import { Pbkdf2Algorithm } from './prototyping/crypto/algorithms/pbkdf2.js';
import { AesGcmAlgorithm } from './prototyping/crypto/algorithms/aes-gcm.js';
import { CryptoError, CryptoErrorCode } from './prototyping/crypto/crypto-error.js';
import { isKeyExporter, isKeyImporter, isKeyWrapper } from './prototyping/crypto/utils.js';

export interface CryptoApiBytesToPrivateKeyParams extends BytesToPrivateKeyParams {
  algorithm: KeyConversionAlgorithm;
}

export interface CryptoApiBytesToPublicKeyParams extends BytesToPublicKeyParams {
  algorithm: AsymmetricKeyConversionAlgorithm;
}

/**
 * The `CryptoApiCipherParams` interface defines the algorithm-specific parameters that should
 * be passed into the {@link AgentCryptoApi.encrypt | `AgentCryptoApi.encrypt()`} or
 * {@link AgentCryptoApi.decrypt | `AgentCryptoApi.decrypt()`} method.
 */
export interface CryptoApiCipherParams extends CipherParams, AesGcmParams {}

/**
 * The `CryptoApiKmsCipherParams` interface defines the algorithm-specific parameters that should
 * be passed into the {@link AgentCryptoApi.encrypt | `AgentCryptoApi.encrypt()`} or
 * {@link AgentCryptoApi.decrypt | `AgentCryptoApi.decrypt()`} method.
 */
export interface CryptoApiKmsCipherParams extends KmsCipherParams, AesGcmParams {}

/**
 * The `CryptoApiDigestParams` interface defines the algorithm-specific parameters that should
 * be passed into the {@link AgentCryptoApi.digest | `AgentCryptoApi.digest()`} method.
 */
export interface CryptoApiDigestParams extends DigestParams {
  /**
   * A string defining the name of hash function to use. The value must be one of the following:
   * - `"SHA-256"`: Generates a 256-bit digest.
   */
  algorithm: DigestAlgorithm;
}

export interface CryptoApiDeriveKeyOptions {
  'HKDF-256': Omit<HkdfParams, 'hash'> & { derivedKeyAlgorithm: CipherAlgorithm | KeyWrappingAlgorithm};
  'HKDF-384': Omit<HkdfParams, 'hash'> & { derivedKeyAlgorithm: CipherAlgorithm | KeyWrappingAlgorithm};
  'HKDF-512': Omit<HkdfParams, 'hash'> & { derivedKeyAlgorithm: CipherAlgorithm | KeyWrappingAlgorithm};
  'PBES2-HS256+A128KW': Omit<Pbkdf2Params, 'hash'> & { derivedKeyAlgorithm?: never };
  'PBES2-HS384+A192KW': Omit<Pbkdf2Params, 'hash'> & { derivedKeyAlgorithm?: never };
  'PBES2-HS512+A256KW': Omit<Pbkdf2Params, 'hash'> & { derivedKeyAlgorithm?: never };
}

export interface CryptoApiDeriveKeyBytesOptions {
  'HKDF-256': Omit<HkdfParams, 'hash'>;
  'HKDF-384': Omit<HkdfParams, 'hash'>;
  'HKDF-512': Omit<HkdfParams, 'hash'>;
  'PBES2-HS256+A128KW': Omit<Pbkdf2Params, 'hash'>;
  'PBES2-HS384+A192KW': Omit<Pbkdf2Params, 'hash'>;
  'PBES2-HS512+A256KW': Omit<Pbkdf2Params, 'hash'>;
}

/**
 * The `CryptoApiDeriveKeyParams` interface defines the algorithm-specific parameters that
 * should be passed into the {@link AgentCryptoApi.deriveKey | `AgentCryptoApi.deriveKey()`} method.
 */
export type CryptoApiDeriveKeyParams<T extends DeriveKeyAlgorithm> = DeriveKeyParams & {
  /**
   * A string defining the name of key derivation function to use. The value must be one of the
   * following:
   * - `"HKDF-256"`: HKDF with SHA-256.
   * - `"HKDF-384"`: HKDF with SHA-384.
   * - `"HKDF-512"`: HKDF with SHA-512.
   * - `"PBKDF2-HS256+A128KW"`: PBKDF2 with HMAC SHA-256 and A128KW key wrapping.
   * - `"PBKDF2-HS384+A192KW"`: PBKDF2 with HMAC SHA-384 and A192KW key wrapping.
   * - `"PBKDF2-HS512+A256KW"`: PBKDF2 with HMAC SHA-512 and A256KW key wrapping.
   */
  algorithm: T;
} & CryptoApiDeriveKeyOptions[T];

/**
 * The `CryptoApiDeriveKeyBytesParams` interface defines the algorithm-specific parameters that
 * should be passed into the {@link AgentCryptoApi.deriveKeyBytes | `AgentCryptoApi.deriveKeyBytes()`} method.
 */
export type CryptoApiDeriveKeyBytesParams<T extends DeriveKeyByteAlgorithm> = DeriveKeyBytesParams & {
  /**
   * A string defining the name of key derivation function to use. The value must be one of the
   * following:
   * - `"HKDF-256"`: HKDF with SHA-256.
   * - `"HKDF-384"`: HKDF with SHA-384.
   * - `"HKDF-512"`: HKDF with SHA-512.
   * - `"PBKDF2-HS256+A128KW"`: PBKDF2 with HMAC SHA-256 and A128KW key wrapping.
   * - `"PBKDF2-HS384+A192KW"`: PBKDF2 with HMAC SHA-384 and A192KW key wrapping.
   * - `"PBKDF2-HS512+A256KW"`: PBKDF2 with HMAC SHA-512 and A256KW key wrapping.
   */
  algorithm: T;
} & CryptoApiDeriveKeyBytesOptions[T];

export interface CryptoApiGenerateKeyParams<TKeyManager> {
  algorithm: TKeyManager extends CryptoApi
    ? InferKeyGeneratorAlgorithm<TKeyManager>
    : InferKeyGeneratorAlgorithm<LocalKeyManager>;
}

export interface CryptoApiUnwrapKeyParams<TKeyManager> extends KmsUnwrapKeyParams {
  wrappedKeyAlgorithm: TKeyManager extends CryptoApi
    ? InferKeyUnwrapAlgorithm<TKeyManager>
    : InferKeyUnwrapAlgorithm<LocalKeyManager>;
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
  'AES-GCM': {
    implementation : AesGcmAlgorithm,
    names          : ['A128GCM', 'A192GCM', 'A256GCM'],
    operations     : ['bytesToPrivateKey', 'encrypt', 'decrypt'],
  },
  'AES-KW': {
    implementation : AesKwAlgorithm,
    names          : ['A128KW', 'A192KW', 'A256KW'],
    operations     : ['bytesToPrivateKey', 'privateKeyToBytes', 'wrapKey', 'unwrapKey'],
  },
  'Ed25519': {
    implementation : EdDsaAlgorithm,
    names          : ['Ed25519'],
    operations     : ['bytesToPrivateKey', 'bytesToPublicKey', 'sign', 'verify'],
  },
  'HKDF': {
    implementation : HkdfAlgorithm,
    names          : ['HKDF-256', 'HKDF-384', 'HKDF-512'],
    operations     : ['deriveKey', 'deriveKeyBytes'],
  },
  'PBKDF2': {
    implementation : Pbkdf2Algorithm,
    names          : ['PBES2-HS256+A128KW', 'PBES2-HS384+A192KW', 'PBES2-HS512+A256KW'],
    operations     : ['deriveKey', 'deriveKeyBytes'],
  },
  'secp256k1': {
    implementation : EcdsaAlgorithm,
    names          : ['ES256K', 'secp256k1'],
    operations     : ['bytesToPrivateKey', 'bytesToPublicKey', 'sign', 'verify'],
  },
  'secp256r1': {
    implementation : EcdsaAlgorithm,
    names          : ['ES256', 'secp256r1'],
    operations     : ['bytesToPrivateKey', 'bytesToPublicKey', 'sign', 'verify'],
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

type CipherAlgorithms = {
  [K in keyof SupportedAlgorithms]: 'encrypt' extends SupportedAlgorithms[K]['operations'][number] ? K : never
}[keyof SupportedAlgorithms];

type CipherAlgorithm = typeof supportedAlgorithms[CipherAlgorithms]['names'][number];

type DeriveKeyAlgorithms = {
  [K in keyof SupportedAlgorithms]: 'deriveKey' extends SupportedAlgorithms[K]['operations'][number] ? K : never
}[keyof SupportedAlgorithms];

type DeriveKeyAlgorithm = typeof supportedAlgorithms[DeriveKeyAlgorithms]['names'][number];

type DeriveKeyBytesAlgorithms = {
  [K in keyof SupportedAlgorithms]: 'deriveKeyBytes' extends SupportedAlgorithms[K]['operations'][number] ? K : never
}[keyof SupportedAlgorithms];

type DeriveKeyByteAlgorithm = typeof supportedAlgorithms[DeriveKeyBytesAlgorithms]['names'][number];

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

type KeyWrappingAlgorithms = {
  [K in keyof SupportedAlgorithms]: 'wrapKey' extends SupportedAlgorithms[K]['operations'][number] ? K : never
}[keyof SupportedAlgorithms];

type KeyWrappingAlgorithm = typeof supportedAlgorithms[KeyWrappingAlgorithms]['names'][number];

export class AgentCryptoApi<TKeyManager extends AgentKeyManager = LocalKeyManager> implements
    CryptoApi<CryptoApiGenerateKeyParams<TKeyManager>>,
    AsymmetricKeyConverter<CryptoApiBytesToPublicKeyParams, PublicKeyToBytesParams>,
    KeyConverter<CryptoApiBytesToPrivateKeyParams, PrivateKeyToBytesParams>,
    KeyDeriver<CryptoApiDeriveKeyParams<DeriveKeyAlgorithm>, Jwk>,
    KeyBytesDeriver<CryptoApiDeriveKeyBytesParams<DeriveKeyAlgorithm>, Uint8Array>,
    KeyImporter<KmsImportKeyParams, KeyIdentifier>,
    KeyExporter<KmsExportKeyParams, Jwk>,
    KeyWrapper<KmsWrapKeyParams, KmsUnwrapKeyParams> {

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

  public async bytesToPrivateKey({ algorithm: algorithmIdentifier, privateKeyBytes }:
    CryptoApiBytesToPrivateKeyParams
  ): Promise<Jwk> {
    // Determine the algorithm name based on the given algorithm identifier.
    const algorithm = this.getAlgorithmName({ algorithm: algorithmIdentifier });

    // Get the key converter based on the algorithm name.
    const keyConverter = this.getAlgorithm({ algorithm }) as KeyConverter<CryptoApiBytesToPrivateKeyParams, PrivateKeyToBytesParams>;

    // Convert the byte array to a JWK.
    const privateKey = await keyConverter.bytesToPrivateKey({ algorithm: algorithmIdentifier, privateKeyBytes });

    return privateKey;
  }

  public async bytesToPublicKey({ algorithm: algorithmIdentifier, publicKeyBytes }:
    CryptoApiBytesToPublicKeyParams
  ): Promise<Jwk> {
    // Determine the algorithm name based on the given algorithm identifier.
    const algorithm = this.getAlgorithmName({ algorithm: algorithmIdentifier });

    // Get the key converter based on the algorithm name.
    const keyConverter = this.getAlgorithm({ algorithm }) as AsymmetricKeyConverter<CryptoApiBytesToPublicKeyParams, PublicKeyToBytesParams>;

    // Convert the byte array to a JWK.
    const publicKey = await keyConverter.bytesToPublicKey({ algorithm: algorithmIdentifier, publicKeyBytes });

    return publicKey;
  }

  public async decrypt(params: CryptoApiKmsCipherParams): Promise<Uint8Array>;
  public async decrypt(params: CryptoApiCipherParams): Promise<Uint8Array>;
  public async decrypt(params: CryptoApiCipherParams | CryptoApiKmsCipherParams): Promise<Uint8Array> {
    // If the input parameters contain a key identifier, use the key manager to decrypt the data.
    if ('keyUri' in params) {
      return await this._keyManager.decrypt(params);

    // Otherwise, use the given JWK to decrypt the data.
    } else {
      // Determine the algorithm name based on the JWK's `alg` property.
      const algorithm = this.getAlgorithmName({ key: params.key });

      // Get the cipher algorithm based on the algorithm name.
      const cipher = this.getAlgorithm({ algorithm }) as Cipher<CipherParams, CipherParams>;

      // Decrypt the data.
      return await cipher.decrypt(params);
    }
  }

  public async deriveKey<T extends DeriveKeyAlgorithm>(
    params: CryptoApiDeriveKeyParams<T>
  ): Promise<Jwk> {
    // Determine the algorithm name based on the given algorithm identifier.
    const algorithm = this.getAlgorithmName({ algorithm: params.algorithm });

    // Get the key derivation function based on the algorithm name.
    const kdf = this.getAlgorithm({ algorithm }) as KeyBytesDeriver<DeriveKeyBytesParams, Uint8Array>;

    let derivedKeyAlgorithm: CipherAlgorithm | KeyWrappingAlgorithm;

    switch (params.algorithm) {
      case 'HKDF-256':
      case 'HKDF-384':
      case 'HKDF-512': {
        derivedKeyAlgorithm = params.derivedKeyAlgorithm as CipherAlgorithm | KeyWrappingAlgorithm;
        break;
      }

      case 'PBES2-HS256+A128KW':
      case 'PBES2-HS384+A192KW':
      case 'PBES2-HS512+A256KW': {
        derivedKeyAlgorithm = params.algorithm.split(/[-+]/)[2] as 'A128KW' | 'A192KW' | 'A256KW';
        break;
      }

      default:
        throw new CryptoError(CryptoErrorCode.AlgorithmNotSupported, `The specified "algorithm" is not supported: ${params.algorithm}`);
    }

    // Determine the bit length of the derived key based on the given algorithm.
    const length = +(derivedKeyAlgorithm.match(/\d+/)?.[0] ?? -1);

    if (length === -1) {
      throw new CryptoError(CryptoErrorCode.AlgorithmNotSupported, `The derived key algorithm" is not supported: ${derivedKeyAlgorithm}`);
    }

    // Derive the byte array.
    const privateKeyBytes = await kdf.deriveKeyBytes({ ...params, length });

    return await this.bytesToPrivateKey({ algorithm: derivedKeyAlgorithm, privateKeyBytes });
  }

  public async deriveKeyBytes<T extends DeriveKeyAlgorithm>(
    params: CryptoApiDeriveKeyBytesParams<T>
  ): Promise<Uint8Array> {
    // Determine the algorithm name based on the given algorithm identifier.
    const algorithm = this.getAlgorithmName({ algorithm: params.algorithm });

    // Get the key derivation function based on the algorithm name.
    const kdf = this.getAlgorithm({ algorithm }) as KeyBytesDeriver<DeriveKeyBytesParams, Uint8Array>;

    // Derive the byte array.
    const derivedKeyBytes = await kdf.deriveKeyBytes(params);

    return derivedKeyBytes;
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
    const hasher = this.getAlgorithm({ algorithm }) as Hasher<CryptoApiDigestParams>;

    // Compute the hash.
    const hash = await hasher.digest({ algorithm, data });

    return hash;
  }

  public async encrypt(params: CryptoApiCipherParams): Promise<Uint8Array>;
  public async encrypt(params: CryptoApiKmsCipherParams): Promise<Uint8Array>;
  public async encrypt(params: CryptoApiCipherParams | CryptoApiKmsCipherParams): Promise<Uint8Array> {
    // If the input parameters contain a key identifier, use the key manager to encrypt the data.
    if ('keyUri' in params) {
      // Encrypt the data and return the ciphertext.
      return await this._keyManager.encrypt(params);

    // Otherwise, use the given JWK to encrypt the data.
    } else {
      // Determine the algorithm name based on the JWK's `alg` property.
      const algorithm = this.getAlgorithmName({ key: params.key });

      // Get the cipher algorithm based on the algorithm name.
      const cipher = this.getAlgorithm({ algorithm }) as Cipher<CipherParams, CipherParams>;

      // Encrypt the data and return the ciphertext.
      return await cipher.encrypt(params);
    }
  }

  public async exportKey({ keyUri }:
    KmsExportKeyParams
  ): Promise<Jwk> {
    // If the BearerDid's key manager supports exporting private keys, add them to the portable DID.
    if (isKeyExporter<KmsExportKeyParams, Jwk>(this._keyManager)) {
      return await this._keyManager.exportKey({ keyUri });
    } else {
      throw new Error('Key Manager does not support exporting private keys');
    }
  }

  public async generateKey(params:
    CryptoApiGenerateKeyParams<TKeyManager>
  ): Promise<KeyIdentifier> {
    return await this._keyManager.generateKey(params);
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

  public async importKey({ key }:
    KmsImportKeyParams
  ): Promise<KeyIdentifier> {
    // If the Agent's key manager supports importing private keys, import the key to the key store.
    if (isKeyImporter<KmsImportKeyParams, KeyIdentifier>(this._keyManager)) {
      return await this._keyManager.importKey({ key });
    } else {
      throw new Error('Key Manager does not support importing private keys');
    }
  }

  public async privateKeyToBytes({ privateKey }: { privateKey: Jwk; }): Promise<Uint8Array> {
    // Determine the algorithm name based on the JWK's `alg` property.
    const algorithm = this.getAlgorithmName({ key: privateKey });

    // Get the key converter based on the algorithm name.
    const keyConverter = this.getAlgorithm({ algorithm }) as KeyConverter<CryptoApiBytesToPrivateKeyParams, PrivateKeyToBytesParams>;

    // Convert the JWK to a byte array.
    const privateKeyBytes = await keyConverter.privateKeyToBytes({ privateKey });

    return privateKeyBytes;
  }

  public async publicKeyToBytes({ publicKey }: { publicKey: Jwk; }): Promise<Uint8Array> {
    // Determine the algorithm name based on the JWK's `alg` property.
    const algorithm = this.getAlgorithmName({ key: publicKey });

    // Get the key converter based on the algorithm name.
    const keyConverter = this.getAlgorithm({ algorithm }) as AsymmetricKeyConverter<CryptoApiBytesToPublicKeyParams, PublicKeyToBytesParams>;

    // Convert the JWK to a byte array.
    const publicKeyBytes = await keyConverter.publicKeyToBytes({ publicKey });

    return publicKeyBytes;
  }

  public async sign({ keyUri, data }:
    KmsSignParams
  ): Promise<Uint8Array> {
    const signature = await this._keyManager.sign({ keyUri, data });
    return signature;
  }

  public async unwrapKey(params: UnwrapKeyParams): Promise<Jwk>;
  public async unwrapKey(params: CryptoApiUnwrapKeyParams<TKeyManager>): Promise<Jwk>;
  public async unwrapKey(params:
    UnwrapKeyParams | CryptoApiUnwrapKeyParams<TKeyManager>
  ): Promise<Jwk> {
    // If the input parameters contain a key identifier, use the key manager to decrypt the key.
    if ('decryptionKeyUri' in params) {
    // If the Agent's key manager supports key wrapping, decrypt the key.
      if (isKeyWrapper<KmsWrapKeyParams, CryptoApiUnwrapKeyParams<TKeyManager>>(this._keyManager)) {
        return await this._keyManager.unwrapKey(params);
      } else {
        throw new Error('Key Manager does not support key wrapping');
      }

      // Otherwise, use the given JWK to decrypt the key.
    } else {
      // Determine the algorithm name based on the JWK's `alg` property.
      const algorithm = this.getAlgorithmName({ key: params.decryptionKey });

      // Get the key wrapping algorithm based on the algorithm name.
      const keyWrapper = this.getAlgorithm({ algorithm }) as KeyWrapper<WrapKeyParams, UnwrapKeyParams>;

      // decrypt the key and return the ciphertext.
      return await keyWrapper.unwrapKey(params);
    }
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

  public async wrapKey(params: WrapKeyParams): Promise<Uint8Array>;
  public async wrapKey(params: KmsWrapKeyParams): Promise<Uint8Array>;
  public async wrapKey(params: WrapKeyParams | KmsWrapKeyParams): Promise<Uint8Array> {
    // If the input parameters contain a key identifier, use the key manager to encrypt the key.
    if ('encryptionKeyUri' in params) {
      if (isKeyWrapper<KmsWrapKeyParams, CryptoApiUnwrapKeyParams<TKeyManager>>(this._keyManager)) {
        return await this._keyManager.wrapKey(params);
      } else {
        throw new Error('Key Manager does not support key wrapping');
      }

    // Otherwise, use the given JWK to encrypt the key.
    } else {
      // Determine the algorithm name based on the JWK's `alg` property.
      const algorithm = this.getAlgorithmName({ key: params.encryptionKey });

      // Get the key wrapping algorithm based on the algorithm name.
      const keyWrapper = this.getAlgorithm({ algorithm }) as KeyWrapper<WrapKeyParams, KmsUnwrapKeyParams>;

      // Encrypt the key and return the ciphertext.
      return await keyWrapper.wrapKey(params);
    }
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