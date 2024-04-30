/**
 * The `Hasher` interface provides a method for generating digests of data using hash functions.
 * It defines the core function `digest()` for processing variable-size input data to produce a
 * fixed-size output (the "digest") which uniquely represents the input data.
 *
 * This method operates asynchronously and returns a digest, often used for data integrity checks.
 * The interface can be implemented with various hash algorithms and their unique parameters.
 *
 * The interface is designed to accommodate byte array input data but can be extended to support
 * other input types as needed.
 */
export interface Hasher<DigestInput> {
  /**
   * Generates a hash digest of the provided data.
   *
   * @remarks
   * The `digest()` method of the {@link Hasher | `Hasher`} interface generates a hash digest of the
   * input data.
   *
   * A digest is the output of the hash function. It's a fixed-size string of bytes
   * that uniquely represents the data input into the hash function. The digest is often used for
   * data integrity checks, as any alteration in the input data results in a significantly
   * different digest.
   *
   * It typically takes the data to digest as input and returns the digest of the data.
   *
   * @param params - The parameters for the digest operation.
   *
   * @returns A Promise which will be fulfilled with the hash digest.
   */
  digest(params: DigestInput): Promise<Uint8Array>;
}