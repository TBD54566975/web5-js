import type { Jwk } from '@web5/crypto';

/**
 * `KeyConverter` interface for converting private keys between byte array and JWK formats.
 */
export interface KeyConverter<BytesToPrivateKeyInput, PrivateKeyToBytesInput> {

  /**
   * Converts a private key from a byte array to JWK format.
   *
   * @param params - The parameters for the private key conversion.
   * @param params.privateKeyBytes - The raw private key as a Uint8Array.
   *
   * @returns A Promise that resolves to the private key in JWK format.
   */
  bytesToPrivateKey(params: BytesToPrivateKeyInput): Promise<Jwk>;

  /**
   * Converts a private key from JWK format to a byte array.
   *
   * @param params - The parameters for the private key conversion.
   * @param params.privateKey - The private key in JWK format.
   *
   * @returns A Promise that resolves to the private key as a Uint8Array.
   */
  privateKeyToBytes(params: PrivateKeyToBytesInput): Promise<Uint8Array>;
}

/**
 * `AsymmetricKeyConverter` interface extends {@link KeyConverter |`KeyConverter`}, adding support
 * for public key conversions.
 */
export interface AsymmetricKeyConverter<BytesToPublicKeyInput, PublicKeyToBytesInput> {
  /**
   * Converts a public key from a byte array to JWK format.
   *
   * @param params - The parameters for the public key conversion.
   * @param params.publicKeyBytes - The raw public key as a Uint8Array.
   *
   * @returns A Promise that resolves to the public key in JWK format.
   */
  bytesToPublicKey(params: BytesToPublicKeyInput): Promise<Jwk>;

  /**
   * Converts a public key from JWK format to a byte array.
   *
   * @param params - The parameters for the public key conversion.
   * @param params.publicKey - The public key in JWK format.
   *
   * @returns A Promise that resolves to the public key as a Uint8Array.
   */
  publicKeyToBytes(params: PublicKeyToBytesInput): Promise<Uint8Array>;
}