import { universalTypeOf } from '@web5/common';

import type { Web5Crypto } from '../../types/web5-crypto.js';

import { checkRequiredProperty } from '../../utils.js';
import { CryptoAlgorithm } from '../crypto-algorithm.js';
import { InvalidAccessError, OperationError } from '../errors.js';

export abstract class BaseAesAlgorithm extends CryptoAlgorithm {

  public checkGenerateKey(options: {
    algorithm: Web5Crypto.AesGenerateKeyOptions,
    keyUsages: Web5Crypto.KeyUsage[]
  }): void {
    const { algorithm, keyUsages } = options;
    // Algorithm specified in the operation must match the algorithm implementation processing the operation.
    this.checkAlgorithmName({ algorithmName: algorithm.name });
    // The algorithm object must contain a length property.
    checkRequiredProperty({ property: 'length', inObject: algorithm });
    // The length specified must be a number.
    if (universalTypeOf(algorithm.length) !== 'Number') {
      throw new TypeError(`Algorithm 'length' is not of type: Number.`);
    }
    // The length specified must be one of the allowed bit lengths for AES.
    if (![128, 192, 256].includes(algorithm.length)) {
      throw new OperationError(`Algorithm 'length' must be 128, 192, or 256.`);
    }
    // The key usages specified must be permitted by the algorithm implementation processing the operation.
    this.checkKeyUsages({ keyUsages, allowedKeyUsages: this.keyUsages });
  }

  public abstract generateKey(options: {
    algorithm: Web5Crypto.AesGenerateKeyOptions,
    extractable: boolean,
    keyUsages: Web5Crypto.KeyUsage[]
  }): Promise<Web5Crypto.CryptoKey>;

  public override async deriveBits(): Promise<Uint8Array> {
    throw new InvalidAccessError(`Requested operation 'deriveBits' is not valid for ${this.name} keys.`);
  }

  public override async sign(): Promise<Uint8Array> {
    throw new InvalidAccessError(`Requested operation 'sign' is not valid for ${this.name} keys.`);
  }

  public override async verify(): Promise<boolean> {
    throw new InvalidAccessError(`Requested operation 'verify' is not valid for ${this.name} keys.`);
  }
}