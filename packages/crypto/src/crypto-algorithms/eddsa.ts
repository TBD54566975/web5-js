import type { Web5Crypto } from '../types/web5-crypto.js';
import type { Jwk, JwkOperation, JwkParamsOkpPrivate, JwkParamsOkpPublic } from '../jose/jwk.js';

import { Ed25519 } from '../primitives/ed25519.js';
import { BaseEdDsaAlgorithm } from '../algorithms-api/ec/eddsa.js';

export class EdDsaAlgorithm extends BaseEdDsaAlgorithm {
  public readonly names = ['EdDSA'] as const;
  public readonly curves = ['Ed25519'] as const;

  public async generateKey(options: {
    algorithm: Web5Crypto.EdDsaGenerateKeyOptions,
    keyOperations?: JwkOperation[]
  }): Promise<Jwk> {
    const { algorithm, keyOperations } = options;

    // Validate the input parameters.
    this.checkGenerateKeyOptions({ algorithm, keyOperations });

    let privateKey: Jwk | undefined;

    switch (algorithm.curve) {

      case 'Ed25519': {
        privateKey = await Ed25519.generateKey();
        privateKey.alg = 'EdDSA';
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
    algorithm: Web5Crypto.EdDsaOptions,
    key: Jwk,
    data: Uint8Array
  }): Promise<Uint8Array> {
    const { key, data } = options;

    // Validate the input parameters.
    this.checkSignOptions(options);

    const curve = (key as JwkParamsOkpPrivate).crv;  // checkSignOptions verifies that the key is an OKP private key.

    switch (curve) {

      case 'Ed25519': {
        return await Ed25519.sign({ privateKey: key, data });
      }
      // Default case unnecessary because checkSignOptions() validates the input parameters.
    }

    throw new Error('Operation failed: sign');
  }

  public async verify(options: {
    algorithm: Web5Crypto.EdDsaOptions;
    key: Jwk;
    signature: Uint8Array;
    data: Uint8Array;
  }): Promise<boolean> {
    const { key, signature, data } = options;

    // Validate the input parameters.
    this.checkVerifyOptions(options);

    const curve = (key as JwkParamsOkpPublic).crv;  // checkVerifyOptions verifies that the key is an OKP public key.

    switch (curve) {

      case 'Ed25519': {
        return await Ed25519.verify({ publicKey: key, signature, data });
      }
      // Default case unnecessary because checkVerifyOptions() validates the input parameters.
    }

    throw new Error('Operation failed: verify');
  }
}