import { Convert } from '@web5/common';

import type { Web5Crypto } from '../types/web5-crypto.js';
import type { Jwk, JwkParamsOctPrivate } from '../jose/jwk.js';

import { Pbkdf2 } from '../primitives/pbkdf2.js';
import { OperationError } from '../algorithms-api/errors.js';
import { BasePbkdf2Algorithm } from '../algorithms-api/pbkdf/pbkdf2.js';

export class Pbkdf2Algorithm extends BasePbkdf2Algorithm {
  public readonly names = ['PBKDF2'] as const;
  public readonly hashAlgorithms = ['SHA-256', 'SHA-384', 'SHA-512'] as const;

  public async deriveBits(options: {
    algorithm: Web5Crypto.Pbkdf2Options,
    baseKey: Jwk,
    length: number
  }): Promise<Uint8Array> {
    const { algorithm, baseKey, length } = options;

    // Check the `algorithm` and `baseKey` values for PBKDF2 requirements.
    this.checkAlgorithmOptions({ algorithm, baseKey });

    // If specified, the base key's `key_ops` must include the 'deriveBits' operation.
    if (baseKey.key_ops) {
      this.checkKeyOperations({ keyOperations: ['deriveBits'], allowedKeyOperations: baseKey.key_ops });
    }

    // If the length is 0, throw.
    if (typeof length !== 'undefined' && length === 0) {
      throw new OperationError(`The value of 'length' cannot be zero.`);
    }

    // If the length is not a multiple of 8, throw.
    if (length && length % 8 !== 0) {
      throw new OperationError(`To be compatible with all browsers, 'length' must be a multiple of 8.`);
    }

    // Convert the base key to bytes.
    const baseKeyBytes = Convert.base64Url((baseKey as JwkParamsOctPrivate).k).toUint8Array();

    const derivedBits = Pbkdf2.deriveKey({
      hash       : algorithm.hash as 'SHA-256' | 'SHA-384' | 'SHA-512',
      iterations : algorithm.iterations,
      length     : length,
      password   : baseKeyBytes,
      salt       : algorithm.salt
    });

    return derivedBits;
  }
}