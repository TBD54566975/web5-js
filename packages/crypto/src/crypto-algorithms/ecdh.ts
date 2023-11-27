import type { Web5Crypto } from '../types/web5-crypto.js';
import type {
  JwkOperation,
  PrivateKeyJwk,
  JwkParamsEcPrivate,
  JwkParamsOkpPrivate,
} from '../jose.js';

import { Secp256k1, X25519 } from '../crypto-primitives/index.js';
import { BaseEcdhAlgorithm, OperationError } from '../algorithms-api/index.js';

export class EcdhAlgorithm extends BaseEcdhAlgorithm {
  public readonly names = ['ECDH'] as const;
  public readonly curves = ['secp256k1', 'X25519'] as const;

  public async deriveBits(options: {
    algorithm: Web5Crypto.EcdhDeriveKeyOptions,
    baseKey: PrivateKeyJwk,
    length?: number
  }): Promise<Uint8Array> {
    const { algorithm, baseKey, length } = options;

    // Validate the input parameters.
    this.checkDeriveBitsOptions({ algorithm, baseKey });

    let sharedSecret: Uint8Array;
    const curve = (baseKey as JwkParamsEcPrivate | JwkParamsOkpPrivate).crv;  // checkDeriveBitsOptions verifies that the base key is of type EC or OKP.

    switch (curve) {

      case 'secp256k1': {
        sharedSecret = await Secp256k1.sharedSecret({
          privateKeyA : baseKey,
          publicKeyB  : algorithm.publicKey
        });
        break;
      }

      case 'X25519': {
        sharedSecret = await X25519.sharedSecret({
          privateKeyA : baseKey,
          publicKeyB  : algorithm.publicKey
        });
        break;
      }

      default: {
        throw new TypeError(`Out of range: '${curve}'. Must be one of '${this.curves.join(', ')}'`);
      }
    }

    // If 'length' is not specified, return the full derived secret.
    if (length === undefined)
      return sharedSecret;

    // If the length is not a multiple of 8, throw.
    if (length && length % 8 !== 0) {
      throw new OperationError(`To be compatible with all browsers, 'length' must be a multiple of 8.`);
    }

    // Convert length from bits to bytes.
    const lengthInBytes = length / 8;

    // If length (converted to bytes) is larger than the derived secret, throw.
    if (sharedSecret.byteLength < lengthInBytes) {
      throw new OperationError(`Requested 'length' exceeds the byte length of the derived secret.`);
    }

    // Otherwise, either return the secret or a truncated slice.
    return lengthInBytes === sharedSecret.byteLength ?
      sharedSecret :
      sharedSecret.slice(0, lengthInBytes);
  }

  public async generateKey(options: {
    algorithm: Web5Crypto.EcGenerateKeyOptions,
    keyOperations?: JwkOperation[]
  }): Promise<PrivateKeyJwk> {
    const { algorithm, keyOperations } = options;

    // Validate the input parameters.
    this.checkGenerateKeyOptions({ algorithm, keyOperations });

    let privateKey: PrivateKeyJwk | undefined;

    switch (algorithm.curve) {

      case 'secp256k1': {
        privateKey = await Secp256k1.generateKey();
        break;
      }

      case 'X25519': {
        privateKey = await X25519.generateKey();
        break;
      }
      // Default case not needed because checkGenerateKeyOptions() already validates the specified curve is supported.
    }

    if (privateKey) {
      if (keyOperations) privateKey.key_ops = keyOperations;
      return privateKey;
    }

    throw new Error('Operation failed: generateKey');
  }
}