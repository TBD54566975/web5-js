import { universalTypeOf } from '@web5/common';

import type { Web5Crypto } from '../../types/web5-crypto.js';

import { BaseAesAlgorithm } from './base.js';
import { OperationError } from '../errors.js';
import { checkRequiredProperty } from '../../utils.js';

export abstract class BaseAesCtrAlgorithm extends BaseAesAlgorithm {

  public readonly name = 'AES-CTR';

  public readonly keyUsages: Web5Crypto.KeyUsage[] = ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'];

  public checkAlgorithmOptions(options: {
    algorithm: Web5Crypto.AesCtrOptions,
    key: Web5Crypto.CryptoKey
  }): void {
    const { algorithm, key } = options;
    // Algorithm specified in the operation must match the algorithm implementation processing the operation.
    this.checkAlgorithmName({ algorithmName: algorithm.name });
    // The algorithm object must contain a counter property.
    checkRequiredProperty({ property: 'counter', inObject: algorithm });
    // The counter must a Uint8Array.
    if (!(universalTypeOf(algorithm.counter) === 'Uint8Array')) {
      throw new TypeError(`Algorithm 'counter' is not of type: Uint8Array.`);
    }
    // The initial value of the counter block must be 16 bytes long (the AES block size).
    if (algorithm.counter.byteLength !== 16) {
      throw new OperationError(`Algorithm 'counter' must have length: 16 bytes.`);
    }
    // The algorithm object must contain a length property.
    checkRequiredProperty({ property: 'length', inObject: algorithm });
    // The length specified must be a number.
    if (universalTypeOf(algorithm.length) !== 'Number') {
      throw new TypeError(`Algorithm 'length' is not of type: Number.`);
    }
    // The length specified must be between 1 and 128.
    if ((algorithm.length < 1 || algorithm.length > 128)) {
      throw new OperationError(`Algorithm 'length' should be in the range: 1 to 128.`);
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