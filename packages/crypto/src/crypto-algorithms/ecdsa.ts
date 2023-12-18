import type { Web5Crypto } from '../types/web5-crypto.js';
import type { Jwk, JwkOperation, JwkParamsEcPrivate, JwkParamsEcPublic } from '../jose/jwk.js';

import { Secp256k1 } from '../crypto-primitives/index.js';
import { BaseEcdsaAlgorithm } from '../algorithms-api/index.js';

export class EcdsaAlgorithm extends BaseEcdsaAlgorithm {
  public readonly names = ['ES256K'] as const;
  public readonly curves = ['secp256k1'] as const;

  public async generateKey(options: {
    algorithm: Web5Crypto.EcdsaGenerateKeyOptions,
    keyOperations?: JwkOperation[]
  }): Promise<Jwk> {
    const { algorithm, keyOperations } = options;

    // Validate the input parameters.
    this.checkGenerateKeyOptions({ algorithm, keyOperations });

    let privateKey: Jwk | undefined;

    switch (algorithm.curve) {

      case 'secp256k1': {
        privateKey = await Secp256k1.generateKey();
        privateKey.alg = 'ES256K';
        break;
      }
      // Default case unnecessary because checkGenerateKeyOptions() validates the input parameters.
    }

    if (privateKey) {
      if (keyOperations) privateKey.key_ops = keyOperations;
      return privateKey;
    }

    throw new Error('Operation failed: generateKey');
  }

  public async sign(options: {
    algorithm: Web5Crypto.EcdsaOptions,
    key: Jwk,
    data: Uint8Array
  }): Promise<Uint8Array> {
    const { key, data } = options;

    // Validate the input parameters.
    this.checkSignOptions(options);

    const curve = (key as JwkParamsEcPrivate).crv;  // checkSignOptions verifies that the key is an EC private key.

    switch (curve) {

      case 'secp256k1': {
        return await Secp256k1.sign({ key, data });
      }
      // Default case unnecessary because checkSignOptions() validates the input parameters.
    }

    throw new Error('Operation failed: sign');
  }

  public async verify(options: {
    algorithm: Web5Crypto.EcdsaOptions;
    key: Jwk;
    signature: Uint8Array;
    data: Uint8Array;
  }): Promise<boolean> {
    const { key, signature, data } = options;

    // Validate the input parameters.
    this.checkVerifyOptions(options);

    const curve = (key as JwkParamsEcPublic).crv;  // checkVerifyOptions verifies that the key is an EC public key.

    switch (curve) {

      case 'secp256k1': {
        return await Secp256k1.verify({ key, signature, data });
      }
      // Default case unnecessary because checkVerifyOptions() validates the input parameters.
    }

    throw new Error('Operation failed: verify');
  }
}