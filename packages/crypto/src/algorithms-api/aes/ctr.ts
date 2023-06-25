import type { Web5Crypto } from '../../types-key-manager.js';

import { AesAlgorithm } from './base.js';
import { universalTypeOf } from '../../common/type-utils.js';
import { InvalidAccessError, OperationError } from '../errors.js';
import { checkRequiredProperty } from '../../utils-key-manager.js';

export abstract class AesCtrAlgorithm extends AesAlgorithm {

  public readonly name = 'AES-CTR';

  public readonly keyUsages: Web5Crypto.KeyUsage[] = ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'];

  public checkAlgorithmOptions(options: {
    algorithm: Web5Crypto.AesCtrOptions
  }): void {
    const { algorithm } = options;
    // Algorithm specified in the operation must match the algorithm implementation processing the operation.
    this.checkAlgorithmName({ algorithmName: algorithm.name });
    // The algorithm object must contain a counter property.
    checkRequiredProperty({ property: 'counter', inObject: algorithm });
    // The counter must an ArrayBuffer, DataView, or TypedArray.
    if (!(universalTypeOf(algorithm.counter) === 'ArrayBuffer' || ArrayBuffer.isView(algorithm.counter))) {
      throw new TypeError(`Algorithm 'counter' is not of type: ArrayBuffer, DataView, or TypedArray.`);
    }
    // The initial value of the counter block must be 16 bytes long (the AES block size).
    if (algorithm.counter.byteLength !== 16) {
      throw new OperationError(`Algorithm 'iv' must have length: 16 bytes.`);
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

  public override async deriveBits(): Promise<ArrayBuffer> {
    throw new InvalidAccessError(`Requested operation 'deriveBits' is not valid for ${this.name} keys.`);
  }

  public override async sign(): Promise<ArrayBuffer> {
    throw new InvalidAccessError(`Requested operation 'sign' is not valid for ${this.name} keys.`);
  }

  public override async verify(): Promise<boolean> {
    throw new InvalidAccessError(`Requested operation 'verify' is not valid for ${this.name} keys.`);
  }
}