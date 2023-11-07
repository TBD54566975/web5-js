import type { Web5Crypto } from '../types/web5-crypto.js';

import { BasePbkdf2Algorithm, CryptoKey, OperationError } from '../algorithms-api/index.js';
import { Pbkdf2 } from '../crypto-primitives/pbkdf2.js';

export class Pbkdf2Algorithm extends BasePbkdf2Algorithm {
  public readonly hashAlgorithms = ['SHA-256', 'SHA-384', 'SHA-512'];

  public async deriveBits(options: {
    algorithm: Web5Crypto.Pbkdf2Options,
    baseKey: Web5Crypto.CryptoKey,
    length: number
  }): Promise<Uint8Array> {
    const { algorithm, baseKey, length } = options;

    this.checkAlgorithmOptions({ algorithm, baseKey });
    // The base key must be allowed to be used for deriveBits operations.
    this.checkKeyUsages({ keyUsages: ['deriveBits'], allowedKeyUsages: baseKey.usages });
    // If the length is 0, throw.
    if (typeof length !== 'undefined' && length === 0) {
      throw new OperationError(`The value of 'length' cannot be zero.`);
    }
    // If the length is not a multiple of 8, throw.
    if (length && length % 8 !== 0) {
      throw new OperationError(`To be compatible with all browsers, 'length' must be a multiple of 8.`);
    }

    const derivedBits = Pbkdf2.deriveKey({
      hash       : algorithm.hash as 'SHA-256' | 'SHA-384' | 'SHA-512',
      iterations : algorithm.iterations,
      length     : length,
      password   : baseKey.material,
      salt       : algorithm.salt
    });

    return derivedBits;
  }

  public async importKey(options: {
    format: Web5Crypto.KeyFormat,
    keyData: Uint8Array,
    algorithm: Web5Crypto.Algorithm,
    extractable: boolean,
    keyUsages: Web5Crypto.KeyUsage[]
  }): Promise<Web5Crypto.CryptoKey> {
    const { format, keyData, algorithm, extractable, keyUsages } = options;

    this.checkImportKey({ algorithm, format, extractable, keyUsages });

    const cryptoKey = new CryptoKey(algorithm, extractable, keyData, 'secret', keyUsages);

    return cryptoKey;
  }
}