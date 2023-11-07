import type { Web5Crypto } from '../../types/web5-crypto.js';

import { InvalidAccessError, OperationError } from '../errors.js';
import { CryptoAlgorithm } from '../crypto-algorithm.js';
import { checkRequiredProperty, checkValidProperty } from '../../utils.js';
import { universalTypeOf } from '@web5/common';

export abstract class BasePbkdf2Algorithm extends CryptoAlgorithm {

  public readonly name: string = 'PBKDF2';

  public readonly abstract hashAlgorithms: string[];

  public readonly keyUsages: Web5Crypto.KeyUsage[] = ['deriveBits', 'deriveKey'];

  public checkAlgorithmOptions(options: {
    algorithm: Web5Crypto.Pbkdf2Options,
    baseKey: Web5Crypto.CryptoKey
  }): void {
    const { algorithm, baseKey } = options;
    // Algorithm specified in the operation must match the algorithm implementation processing the operation.
    this.checkAlgorithmName({ algorithmName: algorithm.name });
    // The algorithm object must contain a hash property.
    checkRequiredProperty({ property: 'hash', inObject: algorithm });
    // The hash algorithm specified must be supported by the algorithm implementation processing the operation.
    checkValidProperty({ property: algorithm.hash, allowedProperties: this.hashAlgorithms });
    // The algorithm object must contain a iterations property.
    checkRequiredProperty({ property: 'iterations', inObject: algorithm });
    // The iterations value must a number.
    if (!(universalTypeOf(algorithm.iterations) === 'Number')) {
      throw new TypeError(`Algorithm 'iterations' is not of type: Number.`);
    }
    // The iterations value must be greater than 0.
    if (algorithm.iterations < 1) {
      throw new OperationError(`Algorithm 'iterations' must be > 0.`);
    }
    // The algorithm object must contain a salt property.
    checkRequiredProperty({ property: 'salt', inObject: algorithm });
    // The salt must a Uint8Array.
    if (!(universalTypeOf(algorithm.salt) === 'Uint8Array')) {
      throw new TypeError(`Algorithm 'salt' is not of type: Uint8Array.`);
    }
    // The options object must contain a baseKey property.
    checkRequiredProperty({ property: 'baseKey', inObject: options });
    // The baseKey object must be a CryptoKey.
    this.checkCryptoKey({ key: baseKey });
    // The baseKey algorithm must match the algorithm implementation processing the operation.
    this.checkKeyAlgorithm({ keyAlgorithmName: baseKey.algorithm.name });
  }

  public checkImportKey(options: {
    algorithm: Web5Crypto.Algorithm,
    format: Web5Crypto.KeyFormat,
    extractable: boolean,
    keyUsages: Web5Crypto.KeyUsage[]
  }): void {
    const { algorithm, format, extractable, keyUsages } = options;
    // Algorithm specified in the operation must match the algorithm implementation processing the operation.
    this.checkAlgorithmName({ algorithmName: algorithm.name });
    // The format specified must be 'raw'.
    if (format !== 'raw') {
      throw new SyntaxError(`Format '${format}' not supported. Only 'raw' is supported.`);
    }
    // The extractable value specified must be false.
    if (extractable !== false) {
      throw new SyntaxError(`Extractable '${extractable}' not supported. Only 'false' is supported.`);
    }
    // The key usages specified must be permitted by the algorithm implementation processing the operation.
    this.checkKeyUsages({ keyUsages, allowedKeyUsages: this.keyUsages });
  }

  public override async decrypt(): Promise<Uint8Array> {
    throw new InvalidAccessError(`Requested operation 'decrypt' is not valid for ${this.name} keys.`);
  }

  public override async encrypt(): Promise<Uint8Array> {
    throw new InvalidAccessError(`Requested operation 'encrypt' is not valid for ${this.name} keys.`);
  }

  public override async generateKey(): Promise<Web5Crypto.CryptoKey> {
    throw new InvalidAccessError(`Requested operation 'generateKey' is not valid for ${this.name} keys.`);
  }

  public override async sign(): Promise<Uint8Array> {
    throw new InvalidAccessError(`Requested operation 'sign' is not valid for ${this.name} keys.`);
  }

  public override async verify(): Promise<boolean> {
    throw new InvalidAccessError(`Requested operation 'verify' is not valid for ${this.name} keys.`);
  }
}