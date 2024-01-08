import type { EnclosedEncryptParams, EnclosedDecryptParams } from './params-enclosed.js';

/**
 * The `Cipher` interface provides methods for encrypting and decrypting data.
 *
 * It defines two core functions: `encrypt()` for converting plaintext to ciphertext using specific
 * algorithm parameters, and `decrypt()` for the reverse process, turning ciphertext back into
 * plaintext. These methods operate asynchronously and return promises that resolve to the processed
 * data, whether encrypted or decrypted.
 *
 * The interface is designed to be flexible, accommodating various encryption algorithms and their
 * unique parameters. It defaults to using {@link EnclosedEncryptParams | `EnclosedEncryptParams`}
 * and {@link EnclosedDecryptParams | `EnclosedDecryptParams`}, which are intended to be used with
 * a closure that captures the key and algorithm-specific parameters so that arbitrary data can be
 * encrypted and decrypted without exposing the key or parameters to the caller. However, the
 * interface can be extended to support other parameter types, such as {@link EncryptParams |
 * `EncryptParams`} and {@link DecryptParams | `DecryptParams`}, which are intended to be used when
 * the key and algorithm-specific parameters are known to the caller.
 */
export interface Cipher<
  EncryptInput = EnclosedEncryptParams,
  DecryptInput = EnclosedDecryptParams
> {
  /**
   * Encrypts the provided data.
   *
   * @remarks
   * The `encrypt()` method of the {@link Cipher |`Cipher`} interface encrypts data.
   *
   * It typically takes the data to encrypt (also known as "plaintext") and algorithm-specific
   * parameters as input and returns the encrypted data (also known as "ciphertext").
   *
   * @param params - The parameters for the encryption operation.
   *
   * @returns A Promise which will be fulfilled with the encrypted data.
   */
  encrypt(params: EncryptInput): Promise<Uint8Array>;

  /**
   * Decrypts the provided data.
   *
   * @remarks
   * The `decrypt()` method of the {@link Cipher |`Cipher`} interface decrypts encrypted data.
   *
   * It typically takes the data to decrypt (also known as "ciphertext") and algorithm-specific
   * parameters as input and returns the decrypted data (also known as "plaintext").
   *
   * @param params - The parameters for the decryption operation.
   *
   * @returns A Promise which will be fulfilled with the decrypted data.
   */
  decrypt(params: DecryptInput): Promise<Uint8Array>;
}