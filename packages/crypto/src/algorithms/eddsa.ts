import type { Jwk } from '../jose/jwk.js';
import type { Signer } from '../types/signer.js';
import type { AsymmetricKeyGenerator } from '../types/key-generator.js';
import type {
  SignParams,
  VerifyParams,
  GenerateKeyParams,
  GetPublicKeyParams,
  ComputePublicKeyParams,
} from '../types/params-direct.js';

import { Ed25519 } from '../primitives/ed25519.js';
import { CryptoAlgorithm } from './crypto-algorithm.js';
import { isOkpPrivateJwk, isOkpPublicJwk } from '../jose/jwk.js';

/**
 * The `EdDsaGenerateKeyParams` interface defines the algorithm-specific parameters that should be
 * passed into the `generateKey()` method when using the EdDSA algorithm.
 */
export interface EdDsaGenerateKeyParams extends GenerateKeyParams {
  /**
   * A string defining the type of key to generate. The value must be one of the following:
   * - `"Ed25519"`: EdDSA using the Ed25519 curve.
   */
  algorithm: 'Ed25519';
}

export class EdDsaAlgorithm extends CryptoAlgorithm
  implements AsymmetricKeyGenerator<EdDsaGenerateKeyParams, Jwk, GetPublicKeyParams>,
             Signer<SignParams, VerifyParams> {

  public async computePublicKey({ key }:
    ComputePublicKeyParams
  ): Promise<Jwk> {
    if (!isOkpPrivateJwk(key)) throw new TypeError('Invalid key provided. Must be an octet key pair (OKP) private key.');

    switch (key.crv) {

      case 'Ed25519': {
        const publicKey = await Ed25519.computePublicKey({ key });
        publicKey.alg = 'EdDSA';
        return publicKey;
      }

      default: {
        throw new Error(`Unsupported curve: ${key.crv}`);
      }
    }
  }

  async generateKey({ algorithm }:
    EdDsaGenerateKeyParams
  ): Promise<Jwk> {
    switch (algorithm) {

      case 'Ed25519': {
        const privateKey = await Ed25519.generateKey();
        privateKey.alg = 'EdDSA';
        return privateKey;
      }
    }
  }

  public async getPublicKey({ key }:
    GetPublicKeyParams
  ): Promise<Jwk> {
    if (!isOkpPrivateJwk(key)) throw new TypeError('Invalid key provided. Must be an octet key pair (OKP) private key.');

    switch (key.crv) {

      case 'Ed25519': {
        const publicKey = await Ed25519.getPublicKey({ key });
        publicKey.alg = 'EdDSA';
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
    if (!isOkpPrivateJwk(key)) throw new TypeError('Invalid key provided. Must be an octet key pair (OKP) private key.');

    switch (key.crv) {

      case 'Ed25519': {
        return await Ed25519.sign({ key, data });
      }

      default: {
        throw new Error(`Unsupported curve: ${key.crv}`);
      }
    }
  }

  public async verify({ key, signature, data }:
    VerifyParams
  ): Promise<boolean> {
    if (!isOkpPublicJwk(key)) throw new TypeError('Invalid key provided. Must be an octet key pair (OKP) public key.');

    switch (key.crv) {

      case 'Ed25519': {
        return await Ed25519.verify({ key, signature, data });
      }

      default: {
        throw new Error(`Unsupported curve: ${key.crv}`);
      }
    }
  }
}