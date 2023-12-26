import type {
  Jwk,
  CryptoApi,
  KeyIdentifier,
  KmsSignParams,
  KmsDigestParams,
  KmsVerifyParams,
  KmsGetKeyUriParams,
  KmsGenerateKeyParams,
  KmsGetPublicKeyParams,
} from '@web5/crypto';

import { computeJwkThumbprint, KEY_URI_PREFIX_JWK, Sha2Algorithm } from '@web5/crypto';
import {
  KeySpec,
  KMSClient,
  GetPublicKeyCommand,
} from '@aws-sdk/client-kms';

import { EcdsaAlgorithm } from './ecdsa.js';
import { convertSpkiToPublicKey, getKeySpec } from './utils.js';

const supportedAlgorithms = {
  'ES256K': {
    implementation : EcdsaAlgorithm,
    keySpec        : KeySpec.ECC_SECG_P256K1,
    names          : ['ES256K', 'secp256k1']
  },
  'SHA-256': {
    implementation : Sha2Algorithm,
    keySpec        : undefined,
    names          : ['SHA-256']
  }
} satisfies {
  [key: string]: {
    implementation : InstanceType<any>;
    keySpec        : KeySpec | undefined;
    names          : string[];
  }
};

/* Helper type for `supportedAlgorithms`. */
type SupportedAlgorithm = keyof typeof supportedAlgorithms;

/* Helper type for `supportedAlgorithms` implementations. */
type AlgorithmConstructor = typeof supportedAlgorithms[SupportedAlgorithm]['implementation'];

export interface AwsKmsGenerateKeyParams extends KmsGenerateKeyParams {
  algorithm: 'ES256K';
}

interface AwsKmsDigestParams extends KmsDigestParams {
  algorithm: 'SHA-256';
}

export type AwsKmsCryptoParams = {
  kmsClient?: KMSClient;
};

export class AwsKmsCrypto implements CryptoApi<AwsKmsGenerateKeyParams> {
  private _algorithmInstances: Map<AlgorithmConstructor, any> = new Map();
  private _kmsClient: KMSClient;

  constructor(params?: AwsKmsCryptoParams) {
    this._kmsClient = params?.kmsClient ?? new KMSClient();
  }

  public async digest({ algorithm, data }:
    AwsKmsDigestParams
  ): Promise<Uint8Array> {
    // Get the hash function implementation based on the specified `algorithm` parameter.
    const hasher = this.getAlgorithm({ algorithm });

    // Compute the hash.
    const hash = await hasher.digest({ algorithm, data });

    return hash;
  }

  /**
   * Generates a new cryptographic key in AWS KMS with the specified algorithm and returns a unique
   * key URI which can be used to reference the key in subsequent operations.
   *
   * @remarks
   * This method initiates the creation of a customer-managed key in AWS KMS, using the specified
   * algorithm parameters. The generated key is an AWS KMS key, identified by an AWS-assigned
   * {@link https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#key-id-key-id | key ID}
   * (UUID V4 format) and a
   * {@link https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#key-id-key-ARN | key ARN}
   * (Amazon Resource Name). The method returns a key URI that uniquely
   * identifies the key and can be used in subsequent cryptographic operations.
   *
   * @param params - The parameters for key generation.
   * @param params.algorithm - The algorithm to use for key generation, defined in `SupportedAlgorithm`.
   *
   * @returns A Promise that resolves to the key URI, a unique identifier for the generated key.
   *
   * @example
   * ```ts
   * const cryptoApi = new AwsKmsCrypto();
   * const keyUri = await cryptoApi.generateKey({ algorithm: 'ES256K' });
   * console.log(keyUri); // Outputs the key URI
   * ```
   */
  public async generateKey({ algorithm }:
    AwsKmsGenerateKeyParams
  ): Promise<KeyIdentifier> {
    // Get the key generator based on the specified `algorithm` parameter.
    const keyGenerator = this.getAlgorithm({ algorithm });

    // Generate a new customer managed key with AWS KMS and get the key URI.
    const keyUri = await keyGenerator.generateKey({ algorithm });

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
   * const crypto = new AwsKmsCrypto();
   * const keyUri = await crypto.generateKey({ algorithm: 'ES256K' });
   * const publicKey = await crypto.getPublicKey({ keyUri });
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
    /** If the key URI is a JWK URI, prepend the AWS-required "alias/" prefix and replace the URN
     * namespace separator with hyphens to accomodate AWS KMS key alias character restrictions. */
    const awsKeyId = keyUri.replace('urn:jwk:', 'alias/urn-jwk-');

    // Send the request to retrieve the public key to AWS KMS.
    const response = await this._kmsClient.send(
      new GetPublicKeyCommand({
        KeyId: awsKeyId
      })
    );

    if (!response.PublicKey) {
      throw new Error('Error occurred during public key retrieval: Public key was not returned');
    }

    // Convert the public key from SPKI (DER-encoded X.509) to JWK format.
    const publicKey = convertSpkiToPublicKey({ spki: response.PublicKey });

    // Set the algorithm property based on the key specification.
    publicKey.alg = this.getAlgorithmName({ keySpec: response.KeySpec });

    // Compute the JWK thumbprint and set as the key ID.
    publicKey.kid = await computeJwkThumbprint({ jwk: publicKey });

    return publicKey;
  }

  public async sign({ keyUri, data }:
    KmsSignParams
  ): Promise<Uint8Array> {
    // If the keyUri is a JWK URI, prepend the AWS-required "alias/" prefix and replace the URN
    // namespace separator with hyphens to accomodate AWS KMS key alias character restrictions.
    keyUri = keyUri.replace('urn:jwk:', 'alias/urn-jwk-');

    // Retrieve the key specification for the key from AWS KMS.
    const keySpec = await getKeySpec({ keyUri, kmsClient: this._kmsClient });

    // Get the algorithm name based on the key specification.
    const algorithm = this.getAlgorithmName({ keySpec });

    // Get the signature algorithm based on the algorithm name.
    const signer = this.getAlgorithm({ algorithm });

    // Sign the data.
    const signature = await signer.sign({ algorithm, keyUri, data });

    return signature;
  }

  public async verify({ key, signature, data }:
    KmsVerifyParams
  ): Promise<boolean> {
    // Get the algorithm name based on the JWK's properties.
    const algorithm = this.getAlgorithmName({ key });

    // Get the signature algorithm based on the algorithm name.
    const signer = this.getAlgorithm({ algorithm });

    // Verify the signature.
    const isSignatureValid = signer.verify({ key, signature, data });

    return isSignatureValid;
  }

  private getAlgorithm({ algorithm }: {
    algorithm: SupportedAlgorithm;
  }) {
    // Check if algorithm is supported.
    const AlgorithmImplementation = supportedAlgorithms[algorithm]?.['implementation'];
    if (!AlgorithmImplementation) {
      throw new Error(`Algorithm not supported: ${algorithm}`);
    }

    // Check if instance already exists for the `AlgorithmImplementation`.
    if (!this._algorithmInstances.has(AlgorithmImplementation)) {
    // If not, create a new instance and store it in the cache
      this._algorithmInstances.set(AlgorithmImplementation, new AlgorithmImplementation({
        crypto    : this,
        kmsClient : this._kmsClient
      }));
    }

    // Return the cached instance
    return this._algorithmInstances.get(AlgorithmImplementation);
  }

  private getAlgorithmName({ key, keySpec }: {
    key?: { alg?: string, crv?: string };
    keySpec?: KeySpec;
  }): SupportedAlgorithm {
    const algProperty = key?.alg;
    const crvProperty = key?.crv;

    for (const algName in supportedAlgorithms) {
      const algorithmInfo = supportedAlgorithms[algName as SupportedAlgorithm];
      if (keySpec && algorithmInfo.keySpec === keySpec) {
        return algName as SupportedAlgorithm;
      } else if (algProperty && algorithmInfo.names.includes(algProperty)) {
        return algName as SupportedAlgorithm;
      } else if (crvProperty && algorithmInfo.names.includes(crvProperty)) {
        return algName as SupportedAlgorithm;
      }
    }

    throw new Error(`Unable to determine algorithm based on provided input: keySpec=${keySpec}, alg=${algProperty}, crv=${crvProperty}`);
  }
}