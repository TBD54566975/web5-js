import { universalTypeOf } from '@web5/common';

import type { Web5Crypto } from '../../types/web5-crypto.js';
import type { JwkOperation, PrivateKeyJwk } from '../../../src/jose.js';

import { BaseAesAlgorithm } from './base.js';
import { OperationError } from '../errors.js';
import { checkRequiredProperty } from '../../utils.js';

export abstract class BaseAesCtrAlgorithm extends BaseAesAlgorithm {

  public readonly keyOperations: JwkOperation[] = ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'];

  public checkAlgorithmOptions(options: {
    algorithm: Web5Crypto.AesCtrOptions
  }): void {
    const { algorithm } = options;

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
  }

  public checkDecryptOptions(options: {
    algorithm: Web5Crypto.AesCtrOptions,
    key: PrivateKeyJwk,
    data: Uint8Array
  }): void {
    const { algorithm, key, data } = options;

    // Validate the algorithm input parameters.
    this.checkAlgorithmOptions({ algorithm });

    // Validate the secret key.
    this.checkSecretKey({ key });

    // If specified, the secret key must be allowed to be used for 'decrypt' operations.
    if (key.key_ops) {
      this.checkKeyOperations({ keyOperations: ['decrypt'], allowedKeyOperations: key.key_ops });
    }

    // The data must be a Uint8Array.
    if (universalTypeOf(data) !== 'Uint8Array') {
      throw new TypeError('The data must be of type Uint8Array.');
    }
  }

  public checkEncryptOptions(options: {
    algorithm: Web5Crypto.AesCtrOptions,
    key: PrivateKeyJwk,
    data: Uint8Array
  }): void {
    const { algorithm, key, data } = options;

    // Validate the algorithm and key input parameters.
    this.checkAlgorithmOptions({ algorithm });

    // Validate the secret key.
    this.checkSecretKey({ key });

    // If specified, the secret key must be allowed to be used for 'encrypt' operations.
    if (key.key_ops) {
      this.checkKeyOperations({ keyOperations: ['encrypt'], allowedKeyOperations: key.key_ops });
    }

    // The data must be a Uint8Array.
    if (universalTypeOf(data) !== 'Uint8Array') {
      throw new TypeError('The data must be of type Uint8Array.');
    }
  }
}