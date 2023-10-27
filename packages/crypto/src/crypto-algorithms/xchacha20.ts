import { universalTypeOf } from '@web5/common';

import type { Web5Crypto } from '../types/web5-crypto.js';

import { XChaCha20 } from '../crypto-primitives/index.js';
import { BaseXChaCha20Algorithm, CryptoKey } from '../algorithms-api/index.js';

export class XChaCha20Algorithm extends BaseXChaCha20Algorithm {
  public async decrypt(options: {
    algorithm: Web5Crypto.XChaCha20Options,
    key: Web5Crypto.CryptoKey,
    data: Uint8Array
  }): Promise<Uint8Array> {
    const { algorithm, key, data } = options;

    this.checkAlgorithmOptions({ algorithm, key });
    // The secret key must be allowed to be used for 'decrypt' operations.
    this.checkKeyUsages({ keyUsages: ['decrypt'], allowedKeyUsages: key.usages });

    const plaintext = XChaCha20.decrypt({
      data  : data,
      key   : key.material,
      nonce : algorithm.nonce
    });

    return plaintext;
  }

  public async encrypt(options: {
    algorithm: Web5Crypto.XChaCha20Options,
    key: Web5Crypto.CryptoKey,
    data: Uint8Array
  }): Promise<Uint8Array> {
    const { algorithm, key, data } = options;

    this.checkAlgorithmOptions({ algorithm, key });
    // The secret key must be allowed to be used for 'encrypt' operations.
    this.checkKeyUsages({ keyUsages: ['encrypt'], allowedKeyUsages: key.usages });

    const ciphertext = XChaCha20.encrypt({
      data  : data,
      key   : key.material,
      nonce : algorithm.nonce
    });

    return ciphertext;
  }

  public async generateKey(options: {
    algorithm: Web5Crypto.ChaChaGenerateKeyOptions,
    extractable: boolean,
    keyUsages: Web5Crypto.KeyUsage[]
  }): Promise<Web5Crypto.CryptoKey> {
    const { algorithm, extractable, keyUsages } = options;

    this.checkGenerateKey({ algorithm, keyUsages });

    const secretKey = await XChaCha20.generateKey();

    if (universalTypeOf(secretKey) !== 'Uint8Array') {
      throw new Error('Operation failed to generate key.');
    }

    const secretCryptoKey = new CryptoKey(algorithm, extractable, secretKey, 'secret', this.keyUsages);

    return secretCryptoKey;
  }
}