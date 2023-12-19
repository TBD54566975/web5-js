import type{ JwkOperation, Jwk } from '../jose/jwk.js';
import type { Web5Crypto } from '../types/web5-crypto.js';

import { AesCtr } from '../primitives/aes-ctr.js';
import { BaseAesCtrAlgorithm } from '../algorithms-api/aes/ctr.js';

export class AesCtrAlgorithm extends BaseAesCtrAlgorithm {
  public readonly names = ['A128CTR', 'A192CTR', 'A256CTR'] as const;

  public async decrypt(options: {
    algorithm: Web5Crypto.AesCtrOptions,
    key: Jwk,
    data: Uint8Array
  }): Promise<Uint8Array> {
    const { algorithm, key, data } = options;

    // Validate the input parameters.
    this.checkDecryptOptions(options);

    const plaintext = AesCtr.decrypt({
      counter : algorithm.counter,
      data    : data,
      key     : key,
      length  : algorithm.length
    });

    return plaintext;
  }

  public async encrypt(options: {
    algorithm: Web5Crypto.AesCtrOptions,
    key: Jwk,
    data: Uint8Array
  }): Promise<Uint8Array> {
    const { algorithm, key, data } = options;

    // Validate the input parameters.
    this.checkEncryptOptions(options);

    const ciphertext = AesCtr.encrypt({
      counter : algorithm.counter,
      data    : data,
      key     : key,
      length  : algorithm.length
    });

    return ciphertext;
  }

  public async generateKey(options: {
    algorithm: Web5Crypto.AesGenerateKeyOptions,
    keyOperations: JwkOperation[]
  }): Promise<Jwk> {
    const { algorithm, keyOperations } = options;

    // Validate the input parameters.
    this.checkGenerateKeyOptions({ algorithm, keyOperations });

    // Map algorithm name to key length.
    const algorithmNameToLength: Record<string, number> = {
      A128CTR : 128,
      A192CTR : 192,
      A256CTR : 256
    };

    const secretKey = await AesCtr.generateKey({ length: algorithmNameToLength[algorithm.name] });

    if (secretKey) {
      secretKey.alg = algorithm.name;
      if (keyOperations) secretKey.key_ops = keyOperations;
      return secretKey;
    }

    throw new Error('Operation failed: generateKey');
  }
}