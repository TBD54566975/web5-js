import { universalTypeOf } from '@web5/common';

import type { Web5Crypto } from '../../types/web5-crypto.js';

import { OperationError } from '../errors.js';
import { BaseChaChaAlgorithm } from './base.js';
import { checkRequiredProperty } from '../../utils.js';

export abstract class BaseXChaCha20Poly1305Algorithm extends BaseChaChaAlgorithm {

  public readonly name = 'XCHACHA20-POLY1305';

  public readonly keyUsages: Web5Crypto.KeyUsage[] = ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'];

  public checkAlgorithmOptions(options: {
    algorithm: Web5Crypto.XChaCha20Options,
    key: Web5Crypto.CryptoKey
  }): void {
    const { algorithm, key } = options;
    // Algorithm specified in the operation must match the algorithm implementation processing the operation.
    this.checkAlgorithmName({ algorithmName: algorithm.name });
    // The algorithm object must contain a nonce property.
    checkRequiredProperty({ property: 'nonce', inObject: algorithm });
    // The nonce must a Uint8Array.
    if (!(universalTypeOf(algorithm.nonce) === 'Uint8Array')) {
      throw new TypeError(`Algorithm 'nonce' is not of type: Uint8Array.`);
    }
    // The value of the nonce must be 24 bytes long.
    if (algorithm.nonce.byteLength !== 24) {
      throw new OperationError(`Algorithm 'nonce' must have length: 24 bytes.`);
    }
    // The options object must contain a key property.
    checkRequiredProperty({ property: 'key', inObject: options });
    // The key object must be a CryptoKey.
    this.checkCryptoKey({ key });
    // The key algorithm must match the algorithm implementation processing the operation.
    this.checkKeyAlgorithm({ keyAlgorithmName: key.algorithm.name });
    // The CryptoKey object must be a secret key.
    this.checkKeyType({ keyType: key.type, allowedKeyType: 'secret' });
  }
}