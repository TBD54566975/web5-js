/**
 * `KeyCompressor` interface for converting public keys between compressed and uncompressed form.
 */
export interface KeyCompressor {

  /**
   * Converts a public key to its compressed form.
   *
   * @param params - The parameters for the public key compression.
   * @param params.publicKeyBytes - The public key as a Uint8Array.
   *
   * @returns A Promise that resolves to the compressed public key as a Uint8Array.
   */
  compressPublicKey(params: { publicKeyBytes: Uint8Array }): Promise<Uint8Array>;

  /**
   * Converts a public key to its uncompressed form.
   *
   * @param params - The parameters for the public key decompression.
   * @param params.publicKeyBytes - The public key as a Uint8Array.
   *
   * @returns A Promise that resolves to the uncompressed public key as a Uint8Array.
   */
  decompressPublicKey(params: { publicKeyBytes: Uint8Array }): Promise<Uint8Array>;
}