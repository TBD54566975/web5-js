import { sha256 } from '@noble/hashes/sha256';

/**
 * The `Sha256` class provides an interface for generating SHA-256 hash digests.
 *
 * This class utilizes the '@noble/hashes/sha256' function to generate hash digests
 * of the provided data. The SHA-256 algorithm is widely used in cryptographic
 * applications to produce a fixed-size 256-bit (32-byte) hash.
 *
 * The methods of this class are asynchronous and return Promises. They use the Uint8Array
 * type for input data and the resulting digest, ensuring a consistent interface
 * for binary data processing.
 *
 * @example
 * ```ts
 * const data = new Uint8Array([...]);
 * const hash = await Sha256.digest({ data });
 * ```
 */
export class Sha256 {
  /**
   * Generates a SHA-256 hash digest for the given data.
   *
   * @remarks
   * This method produces a hash digest using the SHA-256 algorithm. The resultant digest
   * is deterministic, meaning the same data will always produce the same hash, but
   * is computationally infeasible to regenerate the original data from the hash.
   *
   * @example
   * ```ts
   * const data = new Uint8Array([...]);
   * const hash = await Sha256.digest({ data });
   * ```
   *
   * @param params - The parameters for the hashing operation.
   * @param params.data - The data to hash, represented as a Uint8Array.
   *
   * @returns A Promise that resolves to the SHA-256 hash digest of the provided data as a Uint8Array.
   */
  public static async digest({ data }: {
    data: Uint8Array;
  }): Promise<Uint8Array> {
    const hash = sha256(data);

    return hash;
  }
}