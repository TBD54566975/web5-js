import type { Web5Crypto } from '../types/web5-crypto.js';
import type { JwkOperation, JwkParamsOkpPrivate, JwkParamsOkpPublic, PrivateKeyJwk, PublicKeyJwk } from '../jose.js';

import { Ed25519 } from '../crypto-primitives/index.js';
import { BaseEdDsaAlgorithm } from '../algorithms-api/index.js';

export class EdDsaAlgorithm extends BaseEdDsaAlgorithm {
  public readonly names = ['EdDSA'] as const;
  public readonly curves = ['Ed25519'] as const;

  public async generateKey(options: {
    algorithm: Web5Crypto.EdDsaGenerateKeyOptions,
    keyOperations?: JwkOperation[]
  }): Promise<PrivateKeyJwk> {
    const { algorithm, keyOperations } = options;

    this.checkGenerateKeyOptions({ algorithm, keyOperations });

    let privateKey: PrivateKeyJwk | undefined;

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
    key: PrivateKeyJwk,
    data: Uint8Array
  }): Promise<Uint8Array> {
    const { key, data } = options;

    // Validate the input parameters.
    this.checkSignOptions(options);

    const curve = (key as JwkParamsOkpPrivate).crv;  // checkSignOptions verifies that the key is an OKP private key.

    switch (curve) {

      case 'Ed25519': {
        return await Ed25519.sign({ key, data });
      }
      // Default case unnecessary because checkSignOptions() validates the input parameters.
    }

    throw new Error('Operation failed: sign');
  }

  public async verify(options: {
    algorithm: Web5Crypto.EdDsaOptions;
    key: PublicKeyJwk;
    signature: Uint8Array;
    data: Uint8Array;
  }): Promise<boolean> {
    const { key, signature, data } = options;

    // Validate the input parameters.
    this.checkVerifyOptions(options);

    const curve = (key as JwkParamsOkpPublic).crv;  // checkVerifyOptions verifies that the key is an OKP public key.

    switch (curve) {

      case 'Ed25519': {
        return await Ed25519.verify({ key, signature, data });
      }
      // Default case unnecessary because checkVerifyOptions() validates the input parameters.
    }

    throw new Error('Operation failed: verify');
  }
}