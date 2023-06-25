import type { Web5Crypto } from '../types-key-manager.js';

import { Aes } from '../crypto-primitives/index.js';
import { universalTypeOf } from '../common/type-utils.js';
import { AesCtrAlgorithm, CryptoKey } from '../algorithms-api/index.js';

export class DefaultAesCtrAlgorithm extends AesCtrAlgorithm {
  public async generateKey(options: {
    algorithm: Web5Crypto.AesGenerateKeyOptions,
    extractable: boolean,
    keyUsages: Web5Crypto.KeyUsage[]
  }): Promise<Web5Crypto.CryptoKey> {
    const { algorithm, extractable, keyUsages } = options;

    this.checkGenerateKey({ algorithm, keyUsages });

    // Convert length from bits to bytes.
    const lengthInBytes = algorithm.length / 8;
    const secretKey = await Aes.generateKey(lengthInBytes);

    if (universalTypeOf(secretKey) !== 'ArrayBuffer') {
      throw new Error('Operation failed to generate key.');
    }

    const secretCryptoKey = new CryptoKey(algorithm, extractable, secretKey, 'secret', this.keyUsages);

    return secretCryptoKey;
  }
}