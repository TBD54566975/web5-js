import { CryptoAlgorithm } from '@web5/crypto';

import type { Pbkdf2Params } from '../primitives/pbkdf2.js';
import type { KeyBytesDeriver } from '../types/key-deriver.js';
import type { DeriveKeyBytesParams } from '../types/params-direct.js';

import { Pbkdf2 } from '../primitives/pbkdf2.js';

/**
 * The `Pbkdf2DeriveKeyBytesParams` interface defines the algorithm-specific parameters that
 * should be passed into the `deriveKeyBytes()` method when using the PBKDF2 algorithm.
 */
export interface Pbkdf2DeriveKeyBytesParams extends DeriveKeyBytesParams {
  /** Specifies the algorithm variant for PBKDF2 key derivation.
   * The value determines the hash function that will be used and must be one of the following:
   * - `"PBKDF2-HS256+A128KW"`: PBKDF2 with HMAC SHA-256 and A128KW key wrapping.
   * - `"PBKDF2-HS384+A192KW"`: PBKDF2 with HMAC SHA-384 and A192KW key wrapping.
   * - `"PBKDF2-HS512+A256KW"`: PBKDF2 with HMAC SHA-512 and A256KW key wrapping.
   */
  algorithm: 'PBES2-HS256+A128KW' | 'PBES2-HS384+A192KW' | 'PBES2-HS512+A256KW';
}

export class Pbkdf2Algorithm extends CryptoAlgorithm
  implements KeyBytesDeriver<Pbkdf2DeriveKeyBytesParams, Uint8Array> {

  public async deriveKeyBytes({ algorithm, ...params }:
    Pbkdf2DeriveKeyBytesParams & Omit<Pbkdf2Params, 'hash'>
  ): Promise<Uint8Array> {
    // Extract the hash function component of the `algorithm` parameter.
    const [, hashFunction] = algorithm.split(/[-+]/);

    // Map from JOSE algorithm name to "SHA" hash function identifier.
    const hash = {
      'HS256' : 'SHA-256' as const,
      'HS384' : 'SHA-384' as const,
      'HS512' : 'SHA-512' as const
    }[hashFunction]!;

    // Derive a cryptographic byte array using PBKDF2.
    const derivedKeyBytes = await Pbkdf2.deriveKeyBytes({ ...params, hash });

    return derivedKeyBytes;
  }
}