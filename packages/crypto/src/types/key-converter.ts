import type { Jwk } from '../jose/jwk.js';

/**
 * `KeyConverter` interface for converting private keys between byte array and JWK formats.
 */
export interface KeyConverter {

  /**
   * Converts a private key from a byte array to JWK format.
   *
   * @param params - The parameters for the private key conversion.
   * @param params.privateKeyBytes - The raw private key as a Uint8Array.
   *
   * @returns A Promise that resolves to the private key in JWK format.
   */
  bytesToPrivateKey(params: { privateKeyBytes: Uint8Array }): Promise<Jwk>;

  /**
   * Converts a private key from JWK format to a byte array.
   *
   * @param params - The parameters for the private key conversion.
   * @param params.privateKey - The private key in JWK format.
   *
   * @returns A Promise that resolves to the private key as a Uint8Array.
   */
  privateKeyToBytes(params: { privateKey: Jwk }): Promise<Uint8Array>;
}

/**
 * `AsymmetricKeyConverter` interface extends {@link KeyConverter |`KeyConverter`}, adding support
 * for public key conversions.
 */
export interface AsymmetricKeyConverter extends KeyConverter {
  /**
   * Converts a public key from a byte array to JWK format.
   *
   * @param params - The parameters for the public key conversion.
   * @param params.publicKeyBytes - The raw public key as a Uint8Array.
   *
   * @returns A Promise that resolves to the public key in JWK format.
   */
  bytesToPublicKey(params: { publicKeyBytes: Uint8Array }): Promise<Jwk>;

  /**
   * Converts a public key from JWK format to a byte array.
   *
   * @param params - The parameters for the public key conversion.
   * @param params.publicKey - The public key in JWK format.
   *
   * @returns A Promise that resolves to the public key as a Uint8Array.
   */
  publicKeyToBytes(params: { publicKey: Jwk }): Promise<Uint8Array>;
}