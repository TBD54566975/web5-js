import type { Hasher } from '../types/hasher.js';
import type { DigestParams } from '../types/params-direct.js';

import { Sha256 } from '../primitives/sha256.js';
import { CryptoAlgorithm } from './crypto-algorithm.js';

/**
 * The `Sha2DigestParams` interface defines the algorithm-specific parameters that should be
 * passed into the `digest()` method when using the SHA-2 algorithm.
 */
export interface Sha2DigestParams extends DigestParams {
  /**
   * A string defining the name of hash function to use. The value must be one of the following:
   * - `"SHA-256"`: Generates a 256-bit digest.
   */
  algorithm: 'SHA-256';
}

/**
 * The `Sha2Algorithm` class is an implementation of the {@link Hasher | `Hasher`} interface for the
 * SHA-2 family of cryptographic hash functions. The `digest` method takes the algorithm identifier
 * of the hash function and arbitrary data as input and returns the hash digest of the data.
 *
 * This class is typically accessed through implementations that extend the
 * {@link CryptoApi | `CryptoApi`} interface.
 */
export class Sha2Algorithm extends CryptoAlgorithm
  implements Hasher<Sha2DigestParams> {

  /**
   * Generates a hash digest of the provided data.
   *
   * @remarks
   * A digest is the output of the hash function. It's a fixed-size string of bytes
   * that uniquely represents the data input into the hash function. The digest is often used for
   * data integrity checks, as any alteration in the input data results in a significantly
   * different digest.
   *
   * It takes the algorithm identifier of the hash function and data to digest as input and returns
   * the digest of the data.
   *
   * @example
   * ```ts
   * const sha2 = new Sha2Algorithm();
   * const data = new TextEncoder().encode('Messsage');
   * const digest = await sha2.digest({ data });
   * ```
   *
   * @param params - The parameters for the digest operation.
   * @param params.algorithm - The name of hash function to use.
   * @param params.data - The data to digest.
   *
   * @returns A Promise which will be fulfilled with the hash digest.
   */
  public async digest({ algorithm, data }: Sha2DigestParams): Promise<Uint8Array> {
    switch (algorithm) {

      case 'SHA-256': {
        const hash = await Sha256.digest({ data });
        return hash;
      }
    }

  }
}