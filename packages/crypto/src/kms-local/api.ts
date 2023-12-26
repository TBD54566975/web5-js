import { KeyValueStore, MemoryStore } from '@web5/common';

import type { Jwk } from '../jose/jwk.js';
import type { Signer } from '../types/signer.js';
import type { CryptoApi } from '../types/crypto-api.js';
import type { KeyIdentifier } from '../types/identifier.js';
import type { KeyImporterExporter } from '../types/key-io.js';
import type { AsymmetricKeyGenerator } from '../types/key-generator.js';
import type { GetPublicKeyParams, SignParams, VerifyParams } from '../types/params-direct.js';
import type {
  KmsSignParams,
  KmsDigestParams,
  KmsVerifyParams,
  KmsExportKeyParams,
  KmsGetKeyUriParams,
  KmsImportKeyParams,
  KmsGenerateKeyParams,
  KmsGetPublicKeyParams,
} from '../types/params-kms.js';

import { Sha2Algorithm } from './sha-2.js';
import { EcdsaAlgorithm } from './ecdsa.js';
import { EdDsaAlgorithm } from './eddsa.js';
import { computeJwkThumbprint, KEY_URI_PREFIX_JWK } from '../jose/jwk.js';

const supportedAlgorithms = {
  'Ed25519': {
    implementation : EdDsaAlgorithm,
    names          : ['Ed25519', 'Ed25519'],
  },
  'ES256K': {
    implementation : EcdsaAlgorithm,
    names          : ['ES256K', 'secp256k1'],
  },
  'SHA-256': {
    implementation : Sha2Algorithm,
    names          : ['SHA-256']
  }
} satisfies {
  [key: string]: {
    implementation : InstanceType<any>;
    names          : string[];
  }
};

/* Helper type for `supportedAlgorithms`. */
type SupportedAlgorithm = keyof typeof supportedAlgorithms;

/* Helper type for `supportedAlgorithms` implementations. */
type AlgorithmConstructor = typeof supportedAlgorithms[SupportedAlgorithm]['implementation'];

interface LocalKmsDigestParams extends KmsDigestParams {
  algorithm: 'SHA-256';
}

interface LocalKmsGenerateKeyParams extends KmsGenerateKeyParams {
  algorithm: 'Ed25519' | 'ES256K';
}

export type LocalKmsCryptoParams = {
  keyStore?: KeyValueStore<KeyIdentifier, Jwk>;
};

export class LocalKmsCrypto implements
    CryptoApi,
    KeyImporterExporter<KmsImportKeyParams, KeyIdentifier, KmsExportKeyParams> {

  private _algorithmInstances: Map<AlgorithmConstructor, any> = new Map();
  private _keyStore: KeyValueStore<KeyIdentifier, Jwk>;

  constructor(params?: LocalKmsCryptoParams) {
    this._keyStore = params?.keyStore ?? new MemoryStore<KeyIdentifier, Jwk>();
  }

  public async digest({ algorithm, data }:
    LocalKmsDigestParams
  ): Promise<Uint8Array> {
    // Get the hash function implementation based on the specified `algorithm` parameter.
    const hasher = this.getAlgorithm({ algorithm });

    // Compute the hash.
    const hash = await hasher.digest({ algorithm, data });

    return hash;
  }

  public async exportKey({ keyUri }:
    KmsExportKeyParams
  ): Promise<Jwk> {
    // Get the private key from the key store.
    const privateKey = await this.getPrivateKey({ keyUri });

    return privateKey;
  }

  public async generateKey({ algorithm }:
    LocalKmsGenerateKeyParams
  ): Promise<KeyIdentifier> {
    // Get the key generator implementation based on the specified `algorithm` parameter.
    const keyGenerator = this.getKeyGenerator({ algorithm });

    // Generate the key.
    const key = await keyGenerator.generateKey({ algorithm });

    if (key.kid === undefined) {
      throw new Error('Key ID is undefined.');
    }

    // Construct the key URI.
    const keyUri = `${KEY_URI_PREFIX_JWK}${key.kid}`;

    // Store the key in the key store.
    await this._keyStore.set(keyUri, key);

    return keyUri;
  }

  public async getKeyUri({ key }:
    KmsGetKeyUriParams
  ): Promise<KeyIdentifier> {
    // Compute the JWK thumbprint.
    const jwkThumbprint = await computeJwkThumbprint({ jwk: key });

    // Construct the key URI by appending the JWK thumbprint to the key URI prefix.
    const keyUri = `${KEY_URI_PREFIX_JWK}${jwkThumbprint}`;

    return keyUri;
  }

  public async getPublicKey({ keyUri }:
    KmsGetPublicKeyParams
  ): Promise<Jwk> {
    // Get the private key from the key store.
    const privateKey = await this.getPrivateKey({ keyUri });

    // Get the key generator implementation based on the JWK's properties.
    const keyGenerator = this.getKeyGenerator({ key: privateKey });

    // Get the public key properties from the private JWK.
    const publicKey = await keyGenerator.getPublicKey({ key: privateKey });

    return publicKey;
  }

  public async importKey({ key }:
    KmsImportKeyParams
  ): Promise<KeyIdentifier> {
    // Compute the key URI for the key.
    const keyUri = await this.getKeyUri({ key });

    // Store the key in the key store.
    await this._keyStore.set(keyUri, key);

    return keyUri;
  }

  public async sign({ keyUri, data }:
    KmsSignParams
  ): Promise<Uint8Array> {
    // Get the private key from the key store.
    const privateKey = await this.getPrivateKey({ keyUri });

    // Get the signature algorithm based on the JWK's properties.
    const signer = this.getSigner({ key: privateKey });

    // Sign the data.
    const signature = signer.sign({ data, key: privateKey });

    return signature;
  }

  public async verify({ key, signature, data }:
    KmsVerifyParams
  ): Promise<boolean> {
    // Get the signature algorithm based on the JWK's properties.
    const signer = this.getSigner({ key });

    // Verify the signature.
    const isSignatureValid = signer.verify({ key, signature, data });

    return isSignatureValid;
  }

  private getAlgorithm({ algorithm }: {
    algorithm: SupportedAlgorithm;
  }) {
    // Check if algorithm is supported.
    const AlgorithmImplementation = supportedAlgorithms[algorithm]['implementation'];
    if (!AlgorithmImplementation) {
      throw new Error(`Algorithm not supported: ${algorithm}`);
    }

    // Check if instance already exists for the `AlgorithmImplementation`.
    if (!this._algorithmInstances.has(AlgorithmImplementation)) {
    // If not, create a new instance and store it in the cache
      this._algorithmInstances.set(AlgorithmImplementation, new AlgorithmImplementation());
    }

    // Return the cached instance
    return this._algorithmInstances.get(AlgorithmImplementation);
  }

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

  private getKeyGenerator({ algorithm, key = {} }: {
    algorithm?: SupportedAlgorithm;
    key?: { alg?: string, crv?: string };
  }): AsymmetricKeyGenerator<KmsGenerateKeyParams, Jwk, GetPublicKeyParams> {
    // If `algorithm` is not specified, attempt to determine based on the JWK's `alg` and `crv` properties.
    algorithm ??= this.getAlgorithmName({ key });

    // If the algorithm could not be determined, throw an error.
    if (!algorithm) {
      throw new Error('Unable to determine algorithm based on provided input.');
    }

    // Get the key generator implementation.
    const keyGenerator = this.getAlgorithm({ algorithm });

    return keyGenerator;
  }

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

  private getSigner({ key }: {
    key: Jwk;
  }): Signer<SignParams, VerifyParams> {
    // Attempt to determine the algorithm based on the JWK's `alg` and `crv` properties.
    let algorithm = this.getAlgorithmName({ key });

    // If the algorithm could not be determined, throw an error.
    if (!algorithm) {
      throw new Error('Unable to determine algorithm based on provided input.');
    }

    // Get the signer implementation.
    const signer = this.getAlgorithm({ algorithm });

    return signer;
  }
}