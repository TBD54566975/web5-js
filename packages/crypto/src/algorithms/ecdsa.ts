import type { Jwk } from '../jose/jwk.js';
import type { Signer } from '../types/signer.js';
import type { AsymmetricKeyGenerator } from '../types/key-generator.js';
import type { ComputePublicKeyParams, GenerateKeyParams, GetPublicKeyParams, SignParams, VerifyParams } from '../types/params-direct.js';

import { Secp256k1 } from '../primitives/secp256k1.js';
import { isEcPrivateJwk, isEcPublicJwk } from '../jose/jwk.js';
import { CryptoAlgorithm } from './crypto-algorithm.js';

/**
 * The `EcdsaGenerateKeyParams` interface defines the algorithm-specific parameters that should be
 * passed into the `generateKey()` method when using the ECDSA algorithm.
 */
export interface EcdsaGenerateKeyParams extends GenerateKeyParams {
  /**
   * A string defining the type of key to generate. The value must be one of the following:
   * - `"ES256K"`: ECDSA using the secp256k1 curve and SHA-256.
   */
  algorithm: 'ES256K';
}

export class EcdsaAlgorithm extends CryptoAlgorithm
  implements AsymmetricKeyGenerator<EcdsaGenerateKeyParams, Jwk, GetPublicKeyParams>,
             Signer<SignParams, VerifyParams> {

  public async computePublicKey({ key }:
    ComputePublicKeyParams
  ): Promise<Jwk> {
    if (!isEcPrivateJwk(key)) throw new TypeError('Invalid key provided. Must be an elliptic curve (EC) private key.');

    switch (key.crv) {

      case 'secp256k1': {
        const publicKey = await Secp256k1.computePublicKey({ key });
        publicKey.alg = 'ES256K';
        return publicKey;
      }

      default: {
        throw new Error(`Unsupported curve: ${key.crv}`);
      }
    }
  }

  public async generateKey({ algorithm }:
    EcdsaGenerateKeyParams
  ): Promise<Jwk> {
    switch (algorithm) {

      case 'ES256K': {
        const privateKey = await Secp256k1.generateKey();
        privateKey.alg = algorithm;
        return privateKey;
      }
    }
  }

  public async getPublicKey({ key }:
    GetPublicKeyParams
  ): Promise<Jwk> {
    if (!isEcPrivateJwk(key)) throw new TypeError('Invalid key provided. Must be an elliptic curve (EC) private key.');

    switch (key.crv) {

      case 'secp256k1': {
        const publicKey = await Secp256k1.getPublicKey({ key });
        publicKey.alg = 'ES256K';
        return publicKey;
      }

      default: {
        throw new Error(`Unsupported curve: ${key.crv}`);
      }
    }
  }

  public async sign({ key, data }:
    SignParams
  ): Promise<Uint8Array> {
    if (!isEcPrivateJwk(key)) throw new TypeError('Invalid key provided. Must be an elliptic curve (EC) private key.');

    switch (key.crv) {

      case 'secp256k1': {
        return await Secp256k1.sign({ key, data });
      }

      default: {
        throw new Error(`Unsupported curve: ${key.crv}`);
      }
    }
  }

  public async verify({ key, signature, data }:
    VerifyParams
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