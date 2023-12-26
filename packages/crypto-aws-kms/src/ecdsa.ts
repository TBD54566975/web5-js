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

interface EcdsaGenerateKeyParams extends KmsGenerateKeyParams {
  algorithm: 'ES256K';
}

interface EcdsaSignParams extends KmsSignParams {
  algorithm: 'ES256K';
}

export class EcdsaAlgorithm implements
    KeyGenerator<EcdsaGenerateKeyParams, KeyIdentifier>,
    Signer<KmsSignParams, KmsVerifyParams> {

  public readonly names = ['ES256K'] as const;
  public readonly curves = ['secp256k1'] as const;

  private _crypto: CryptoApi;
  private _kmsClient: KMSClient;

  constructor({ crypto, kmsClient }: {
    crypto: CryptoApi;
    kmsClient: KMSClient;
  }) {
    this._crypto = crypto;
    this._kmsClient = kmsClient;
  }

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
    const publicKey = await this._crypto.getPublicKey({ keyUri: awsKeyId });

    // Compute the key URI.
    const keyUri = await this._crypto.getKeyUri({ key: publicKey });

    // Set the key's alias in AWS KMS to the key URI.
    await createKeyAlias({ awsKeyId, alias: keyUri, kmsClient: this._kmsClient });

    return keyUri;
  }

  public async sign({ algorithm, keyUri, data }:
    EcdsaSignParams
  ): Promise<Uint8Array> {
    // Pre-hash the data to accommodate AWS KMS limitations for signature payloads. AWS KMS
    // restricts the size of the data payload to 4096 bytes for direct signing. Hashing the data
    // first ensures that the input to the signing operation is within this limit, regardless of the
    // original data size.
    let hashedData: Uint8Array;
    let signingAlgorithm: SigningAlgorithmSpec;

    switch (algorithm) {

      case 'ES256K': {
        // Pre-hash the data to accommodate AWS KMS limitations for signature payloads.s
        hashedData = await this._crypto.digest({ algorithm: 'SHA-256', data });
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
    const signature = await Secp256k1.convertDerToCompactSignature({ derSignature });

    return signature;
  }

  public async verify({ key, signature, data }:
    KmsVerifyParams
  ): Promise<boolean> {
    if (!isEcPublicJwk(key)) throw new TypeError('Invalid key type');

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