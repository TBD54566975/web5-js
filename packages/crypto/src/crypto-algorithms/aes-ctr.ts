import { universalTypeOf } from '@web5/common';

import type { Web5Crypto } from '../types/web5-crypto.js';

import { AesCtr } from '../crypto-primitives/index.js';
import { BaseAesCtrAlgorithm, CryptoKey } from '../algorithms-api/index.js';

export class AesCtrAlgorithm extends BaseAesCtrAlgorithm {
  public async decrypt(options: {
    algorithm: Web5Crypto.AesCtrOptions,
    key: Web5Crypto.CryptoKey,
    data: Uint8Array
  }): Promise<Uint8Array> {
    const { algorithm, key, data } = options;

    this.checkAlgorithmOptions({ algorithm, key });
    // The secret key must be allowed to be used for 'decrypt' operations.
    this.checkKeyUsages({ keyUsages: ['decrypt'], allowedKeyUsages: key.usages });

    const plaintext = AesCtr.decrypt({
      counter : algorithm.counter,
      data    : data,
      key     : key.material,
      length  : algorithm.length
    });

    return plaintext;
  }

  public async encrypt(options: {
    algorithm: Web5Crypto.AesCtrOptions,
    key: Web5Crypto.CryptoKey,
    data: Uint8Array
  }): Promise<Uint8Array> {
    const { algorithm, key, data } = options;

    this.checkAlgorithmOptions({ algorithm, key });
    // The secret key must be allowed to be used for 'encrypt' operations.
    this.checkKeyUsages({ keyUsages: ['encrypt'], allowedKeyUsages: key.usages });

    const ciphertext = AesCtr.encrypt({
      counter : algorithm.counter,
      data    : data,
      key     : key.material,
      length  : algorithm.length
    });

    return ciphertext;
  }

  public async generateKey(options: {
    algorithm: Web5Crypto.AesGenerateKeyOptions,
    extractable: boolean,
    keyUsages: Web5Crypto.KeyUsage[]
  }): Promise<Web5Crypto.CryptoKey> {
    const { algorithm, extractable, keyUsages } = options;

    this.checkGenerateKey({ algorithm, keyUsages });

    const secretKey = await AesCtr.generateKey({ length: algorithm.length });

    if (universalTypeOf(secretKey) !== 'Uint8Array') {
      throw new Error('Operation failed to generate key.');
    }

    const secretCryptoKey = new CryptoKey(algorithm, extractable, secretKey, 'secret', this.keyUsages);

    return secretCryptoKey;
  }
}