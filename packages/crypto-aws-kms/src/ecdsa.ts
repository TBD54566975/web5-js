import type {
  Signer,
  CryptoApi,
  KeyGenerator,
  KeyIdentifier,
  KmsSignParams,
  KmsVerifyParams,
  KmsGenerateKeyParams,
} from '@web5/crypto';

import { isEcPublicJwk, Secp256k1 } from '@web5/crypto';
import {
  KeySpec,
  KMSClient,
  MessageType,
  SignCommand,
  KeyUsageType,
  CreateKeyCommand,
  SigningAlgorithmSpec,
} from '@aws-sdk/client-kms';

import { createKeyAlias } from './utils.js';

/**
 * The `EcdsaGenerateKeyParams` interface defines the algorithm-specific parameters that should be
 * passed into the {@link EcdsaAlgorithm.generateKey | `EcdsaAlgorithm.generateKey()`} method when
 * using the ECDSA algorithm.
 */
export interface EcdsaGenerateKeyParams extends KmsGenerateKeyParams {
  /**
   * A string defining the type of key to generate. The value must be one of the following:
   * - `"ES256K"`: ECDSA using the secp256k1 curve and SHA-256.
   */
  algorithm: 'ES256K';
}

/**
 * The `EcdsaSignParams` interface defines the algorithm-specific parameters that should be passed
 * into the {@link EcdsaAlgorithm.sign | `EcdsaAlgorithm.sign()`} method when using
 * the ECDSA algorithm.
 */
export interface EcdsaSignParams extends KmsSignParams {
  /**
   * Specifies the algorithm used for the signing operation. The value must be one of the following:
   * - `"ES256K"`: ECDSA using the secp256k1 curve and SHA-256.
   */
  algorithm: 'ES256K';
}

export class EcdsaAlgorithm implements
    KeyGenerator<EcdsaGenerateKeyParams, KeyIdentifier>,
    Signer<KmsSignParams, KmsVerifyParams> {

  /**
   * The `_keyManager` private variable in the `EcdsaAlgorithm` class holds a reference to an
   * `AwsKeyManager` instance, which is an implementation of the `CryptoApi` interface. This
   * instance is used for performing various cryptographic operations, such as computing hash
   * digests and retrieving public keys. By having this reference, `EcdsaAlgorithm` focus on
   * ECDSA-specific logic while delegating other cryptographic tasks to `AwsKeyManager`.
   *
   * @remarks
   * The type is `CrytpoApi` instead of `AwsKeyManager` to avoid a circular dependency.
   */
  private _keyManager: CryptoApi;

  /**
   * A private instance of `KMSClient` from the AWS SDK. This client is used for all interactions
   * with AWS Key Management Service (KMS), such as generating keys, signing data, and retrieving
   * public keys. If a custom `KMSClient` is not provided in the constructor, a default instance is
   * created and used.
   */
  private _kmsClient: KMSClient;

  /**
   *
   * @param params - An object containing the parameters to use when instantiating the algorithm.
   * @param params.keyManager - An instance of `AwsKeyManager`.
   * @param params.kmsClient - An instance of `KMSClient` from the AWS SDK.
   */
  constructor({ keyManager, kmsClient }: {
    keyManager: CryptoApi;
    kmsClient: KMSClient;
  }) {
    this._keyManager = keyManager;
    this._kmsClient = kmsClient;
  }

  /**
   * Generates a new cryptographic key in AWS KMS with the specified algorithm and returns a unique
   * key URI which can be used to reference the key in subsequent operations.
   *
   * @example
   * ```ts
   * const ecdsa = new EcdsaAlgorithm({ keyManager, kmsClient });
   * const keyUri = await ecdsa.generateKey({ algorithm: 'ES256K' });
   * console.log(keyUri); // Outputs the key URI
   * ```
   *
   * @param params - The parameters for key generation.
   * @param params.algorithm - The algorithm to use for key generation, defined in `SupportedAlgorithm`.
   *
   * @returns A Promise that resolves to the key URI, a unique identifier for the generated key.
   */
  public async generateKey({ algorithm }:
    EcdsaGenerateKeyParams
  ): Promise<KeyIdentifier> {
    let keySpec: KeySpec;
    let keyUsage: KeyUsageType;

    switch (algorithm) {

      case 'ES256K': {
        keySpec = KeySpec.ECC_SECG_P256K1;
        keyUsage = KeyUsageType.SIGN_VERIFY;
      }
    }

    // Send the request to generate a new customer managed key to AWS KMS.
    const response = await this._kmsClient.send(
      new CreateKeyCommand({
        KeySpec  : keySpec,
        KeyUsage : keyUsage
      })
    );

    if (!response.KeyMetadata?.KeyId) {
      throw new Error('Expected key metadata was not returned: KeyId');
    }

    // Get the AWS key identifier from the response (UUID v4 xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).
    const awsKeyId = response.KeyMetadata.KeyId;

    // Retrieve the public key from AWS KMS.
    const publicKey = await this._keyManager.getPublicKey({ keyUri: awsKeyId });

    // Compute the key URI.
    const keyUri = await this._keyManager.getKeyUri({ key: publicKey });

    // Set the key's alias in AWS KMS to the key URI.
    await createKeyAlias({ awsKeyId, alias: keyUri, kmsClient: this._kmsClient });

    return keyUri;
  }

  /**
   * Generates an ECDSA signature of given data using the private key identified by the provided
   * key URI.
   *
   * @remarks
   * This method uses the signature algorithm determined by the given `algorithm` to sign the
   * provided data. The `algorithm` is used to avoid another round trip to AWS KMS to determine the
   * `KeySpec` since it was already retrieved in {@link AwsKeyManager.sign | `AwsKeyManager.sign()`}.
   *
   * The signature can later be verified by parties with access to the corresponding
   * public key, ensuring that the data has not been tampered with and was indeed signed by the
   * holder of the private key.
   *
   * Note: Data is pre-hashed before signing to accommodate AWS KMS limitations for signature
   * payloads. AWS KMS restricts the size of the data payload to 4096 bytes for direct signing.
   * Hashing the data first ensures that the input to the signing operation is within this limit,
   * regardless of the original data size.
   *
   * Note: The signature returned is normalized to low-S to prevent signature malleability. This
   * ensures that the signature can be verified by other libraries that enforce strict verification.
   * More information on signature malleability can be found
   * {@link @web5/crypto#Secp256k1.adjustSignatureToLowS | here}.
   *
   * @example
   * ```ts
   * const ecdsa = new EcdsaAlgorithm({ keyManager, kmsClient });
   * const data = new TextEncoder().encode('Message to sign');
   * const signature = await ecdsa.sign({
   *   algorithm: 'ES256K',
   *   keyUri: 'urn:jwk:...',
   *   data
   * });
   * ```
   *
   * @param params - The parameters for the signing operation.
   * @param params.algorithm - The algorithm to use for signing.
   * @param params.keyUri - The key URI of the private key to use for signing.
   * @param params.data - The data to sign.
   *
   * @returns A Promise resolving to the digital signature as a `Uint8Array`.
   */
  public async sign({ algorithm, keyUri, data }:
    EcdsaSignParams
  ): Promise<Uint8Array> {
    // Pre-hash the data to accommodate AWS KMS limitations for signature payloads.
    let hashedData: Uint8Array;
    let signingAlgorithm: SigningAlgorithmSpec;

    switch (algorithm) {

      case 'ES256K': {
        // Pre-hash the data to accommodate AWS KMS limitations for signature payloads.s
        hashedData = await this._keyManager.digest({ algorithm: 'SHA-256', data });
        signingAlgorithm = SigningAlgorithmSpec.ECDSA_SHA_256;
        break;
      }

      default: {
        throw new Error(`Unsupported signature algorithm: ${algorithm}`);
      }
    }

    // Send the request to sign the data to AWS KMS.
    const response = await this._kmsClient.send(
      new SignCommand({
        KeyId            : keyUri,
        Message          : hashedData,
        MessageType      : MessageType.DIGEST,
        SigningAlgorithm : signingAlgorithm
      })
    );

    if (!response.Signature) {
      throw new Error('Expected response property was not returned: Signature');
    }

    // Get the ASN.1 DER encoded ECDSA signature returned by AWS KMS.
    const derSignature = response.Signature;

    // Convert the DER encoded signature to a compact R+S signature.
    let signature = await Secp256k1.convertDerToCompactSignature({ derSignature });

    // Ensure the signature is in low-S, normalized form to prevent signature malleability.
    signature = await Secp256k1.adjustSignatureToLowS({ signature });

    return signature;
  }

  /**
   * Verifies an ECDSA signature associated with the provided data using the provided key.
   *
   * @remarks
   * This method uses the signature algorithm determined by the `alg` and/or `crv` properties of the
   * provided key to check the validity of a digital signature against the original data. It
   * confirms whether the signature was created by the holder of the corresponding private key and
   * that the data has not been tampered with.
   *
   * @example
   * ```ts
   * const ecdsa = new EcdsaAlgorithm({ keyManager, kmsClient });
   * const publicKey = { ... }; // Public key in JWK format corresponding to the private key that signed the data
   * const signature = new Uint8Array([...]); // Signature to verify
   * const isValid = await ecdsa.verify({
   *   key: publicKey,
   *   signature,
   *   data
   * });
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
    if (!isEcPublicJwk(key)) throw new TypeError('Invalid key provided. Must be an elliptic curve (EC) public key.');

    switch (key.crv) {

      case 'secp256k1': {
        return await Secp256k1.verify({ key, signature, data });
      }

      default: {
        throw new Error(`Unsupported curve: ${key.crv}`);
      }
    }
  }
}