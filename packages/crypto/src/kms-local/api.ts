import { KeyValueStore, MemoryStore } from '@web5/common';

import type { Jwk } from '../jose/jwk.js';
import type { PrimitiveApi } from '../index.js';
import type { CryptoApi } from '../types/crypto-api.js';
import type { KeyIdentifier } from '../types/identifier.js';
import type { SignParams, Signer as BaseSigner, VerifyParams } from '../types/signer.js';
import type { ComputePublicKeyParams, GenerateKeyParams as BaseGenerateKeyParams, GetKeyUriInput } from '../types/key-generator.js';

import { EcdsaAlgorithm } from './ecdsa.js';
import { AesCtrAlgorithm } from './aes-ctr.js';
import { computeJwkThumbprint } from '../jose/jwk.js';
import { KEY_URI_PREFIX_JWK } from '../types/identifier.js';

type AlgorithmConstructor = new () => any;

// Mapping from algorithm names to algorithm implementation constructors.
const supportedAlgorithms: Record<string, AlgorithmConstructor> = {
  'A128CTR' : AesCtrAlgorithm,
  'ES256'   : EcdsaAlgorithm,
  'ES256K'  : EcdsaAlgorithm,
};

// Mapping from algorithm names to `KeyGenerator` types.
type AlgorithmKeyGeneratorMap = {
  'A128CTR': PrimitiveApi.KeyGenerator<LocalKmsCrypto.GenerateKeyParams>,
  'ES256': PrimitiveApi.AsymmetricKeyGenerator<LocalKmsCrypto.GenerateKeyParams>,
  'ES256K': PrimitiveApi.AsymmetricKeyGenerator<LocalKmsCrypto.GenerateKeyParams>,
};

// Helper type to extract the correct algorithm type.
type KeyGeneratorType<T extends keyof AlgorithmKeyGeneratorMap> = AlgorithmKeyGeneratorMap[T];

export namespace LocalKmsCrypto {
  export type AlgorithmIdentifier = keyof AlgorithmKeyGeneratorMap;

  export interface GenerateKeyParams extends BaseGenerateKeyParams {
    algorithm: LocalKmsCrypto.AlgorithmIdentifier;
  }

  export interface Signer extends BaseSigner<SignParams, VerifyParams> {}
}

export type LocalKmsCryptoParams = {
  keyStore?: KeyValueStore<KeyIdentifier, Jwk>;
};

export class LocalKmsCrypto implements CryptoApi<LocalKmsCrypto.GenerateKeyParams> {
  private _algorithmInstances: Map<AlgorithmConstructor, any> = new Map();
  private _keyStore: KeyValueStore<KeyIdentifier, Jwk>;

  constructor(params?: LocalKmsCryptoParams) {
    this._keyStore = params?.keyStore ?? new MemoryStore<KeyIdentifier, Jwk>();
  }

  public async generateKey({ algorithm }: LocalKmsCrypto.GenerateKeyParams): Promise<KeyIdentifier> {
    // Get key generator implementation.
    const keyGenerator = this.getAlgorithm<KeyGeneratorType<typeof algorithm>>({ algorithm });

    // Generate the key.
    const key = await keyGenerator.generateKey({ algorithm });

    if (key.kid === undefined) {
      throw new Error('Key ID is undefined.');
    }

    // Set the key URI.
    const keyUri = `${KEY_URI_PREFIX_JWK}${key.kid}`;

    // Store the key in the key store.
    await this._keyStore.set(keyUri, key);

    return keyUri;
  }

  public async getKeyUri({ publicKey }: GetKeyUriInput): Promise<KeyIdentifier> {
    // Compute the JWK thumbprint.
    const jwkThumbprint = await computeJwkThumbprint({ jwk: publicKey });

    // Construct the key URI by appending the JWK thumbprint to the key URI prefix.
    const keyUri = `${KEY_URI_PREFIX_JWK}${jwkThumbprint}`;

    return keyUri;
  }

  public async computePublicKey({ keyUri }: ComputePublicKeyParams): Promise<Jwk> {
    // Get the private key from the key store.
    const privateKey = await this._keyStore.get(keyUri);

    if (!privateKey) {
      throw new Error(`Key not found: ${keyUri}`);
    }

    let algorithm: LocalKmsCrypto.AlgorithmIdentifier;
    if (privateKey.alg) {
      algorithm = privateKey.alg as LocalKmsCrypto.AlgorithmIdentifier;
    } else if ('crv' in privateKey && privateKey.crv) {
      algorithm = privateKey.crv as LocalKmsCrypto.AlgorithmIdentifier;
    } else {
      throw new Error('Algorithm not found.');
    }

    // Get AsymmetricKeyGenerator implementation.
    const keyGenerator = this.getAlgorithm<PrimitiveApi.AsymmetricKeyGenerator>({ algorithm });

    // Compute the public key.
    const publicKey = await keyGenerator.computePublicKey({ privateKey });

    return publicKey;
  }

  async sign({ data, keyUri }: SignParams): Promise<Uint8Array> {
    // Get the private key from the key store.
    const privateKey = await this._keyStore.get(keyUri);

    if (!privateKey) {
      throw new Error(`Key not found: ${keyUri}`);
    }

    let algorithm: LocalKmsCrypto.AlgorithmIdentifier;
    if (privateKey.alg) {
      algorithm = privateKey.alg as LocalKmsCrypto.AlgorithmIdentifier;
    } else if ('crv' in privateKey && privateKey.crv) {
      algorithm = privateKey.crv as LocalKmsCrypto.AlgorithmIdentifier;
    } else {
      throw new Error('Algorithm not found.');
    }

    // Get crypto algorithm implementation.
    const cryptoAlgorithm = this.getAlgorithm<PrimitiveApi.Signer>({ algorithm });

    // Sign the data.
    const signature = cryptoAlgorithm.sign({ data, privateKey });

    return signature;
  }

  verify({ data, publicKey, signature }: VerifyParams): Promise<boolean> {
    let algorithm: LocalKmsCrypto.AlgorithmIdentifier;
    if (publicKey.alg) {
      algorithm = publicKey.alg as LocalKmsCrypto.AlgorithmIdentifier;
    } else if ('crv' in publicKey && publicKey.crv) {
      algorithm = publicKey.crv as LocalKmsCrypto.AlgorithmIdentifier;
    } else {
      throw new Error('Algorithm not found.');
    }

    // Get Signer implementation.
    const signer = this.getAlgorithm<PrimitiveApi.Signer>({ algorithm });

    // Verify the signature.
    const isSignatureValid = signer.verify({ data, publicKey, signature });

    return isSignatureValid;
  }

  private getAlgorithm<T>({ algorithm }: { algorithm: string }): T {
    // Check if algorithm is supported.
    const AlgorithmImplementation = supportedAlgorithms[algorithm];
    if (!AlgorithmImplementation) {
      throw new Error(`Algorithm not supported: ${algorithm}`);
    }

    // Check if instance already exists for the `AlgorithmImplementation`.
    if (!this._algorithmInstances.has(AlgorithmImplementation)) {
    // Create a new instance and store it in the cache
      this._algorithmInstances.set(AlgorithmImplementation, new AlgorithmImplementation());
    }

    // Return the cached instance
    return this._algorithmInstances.get(AlgorithmImplementation) as T;
  }
}