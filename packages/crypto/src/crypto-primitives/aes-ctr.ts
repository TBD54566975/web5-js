import { crypto } from '@noble/hashes/crypto';

/**
 * The `AesCtr` class provides an interface for AES-CTR
 * (Advanced Encryption Standard - Counter) encryption and decryption
 * operations. The class uses the Web Crypto API for cryptographic operations.
 *
 * All methods of this class are asynchronous and return Promises. They all
 * use the ArrayBuffer type for keys and data, providing a consistent
 * interface for working with binary data.
 *
 * Example usage:
 *
 * ```ts
 * const key = await AesCtr.generateKey({ length: 128 });
 * const counter = new Uint8Array(16); // initialize a 16-byte counter
 * const message = new TextEncoder().encode('Hello, world!');
 * const ciphertext = await AesCtr.encrypt({
 *   counter,
 *   data: message,
 *   key,
 *   length: 128 // counter length in bits
 * });
 * const plaintext = await AesCtr.decrypt({
 *   counter,
 *   data: ciphertext,
 *   key,
 *   length: 128 // counter length in bits
 * });
 * console.log(new TextDecoder().decode(plaintext)); // 'Hello, world!'
 * ```
 */
export class AesCtr {
  /**
   * Decrypts the provided data using AES-CTR.
   *
   * @param options - The options for the decryption operation.
   * @param options.counter - The initial value of the counter block.
   * @param options.data - The data to decrypt.
   * @param options.key - The key to use for decryption.
   * @param options.length - The length of the counter block in bits.
   * @returns A Promise that resolves to the decrypted data as an ArrayBuffer.
   */
  public static async decrypt(options: {
    counter: BufferSource,
    data: BufferSource,
    key: ArrayBuffer,
    length: number
  }): Promise<ArrayBuffer> {
    const { counter, data, key, length } = options;

    const webCryptoKey = await this.#importKey(key);

    const ciphertext = await crypto.subtle.decrypt(
      { name: 'AES-CTR', counter, length },
      webCryptoKey,
      data
    );

    return ciphertext;
  }

  /**
   * Encrypts the provided data using AES-CTR.
   *
   * @param options - The options for the encryption operation.
   * @param options.counter - The initial value of the counter block.
   * @param options.data - The data to encrypt.
   * @param options.key - The key to use for encryption.
   * @param options.length - The length of the counter block in bits.
   * @returns A Promise that resolves to the encrypted data as an ArrayBuffer.
   */
  public static async encrypt(options: {
    counter: BufferSource,
    data: BufferSource,
    key: ArrayBuffer,
    length: number
  }): Promise<ArrayBuffer> {
    const { counter, data, key, length } = options;

    const webCryptoKey = await this.#importKey(key);

    const plaintext = await crypto.subtle.encrypt(
      { name: 'AES-CTR', counter, length },
      webCryptoKey,
      data
    );

    return plaintext;
  }

  /**
   * Generates an AES key of a given length.
   *
   * @param length - The length of the key in bits.
   * @returns A Promise that resolves to the generated key as an ArrayBuffer.
   */
  public static async generateKey(options: {
    length: number
  }): Promise<ArrayBuffer> {
    const { length } = options;

    // Generate the secret key.
    const lengthInBytes = length / 8;
    const secretKey = crypto.getRandomValues(new Uint8Array(lengthInBytes));

    return secretKey.buffer;
  }

  /**
   * A private method to import a raw key for use with the Web Crypto API.
   *
   * @param key - The raw key material.
   * @returns A Promise that resolves to a CryptoKey.
   */
  static async #importKey(key: ArrayBuffer): Promise<CryptoKey> {
    return crypto.subtle.importKey(
      'raw',
      key,
      { name: 'AES-CTR', length: key.byteLength * 8 },
      true,
      ['encrypt', 'decrypt']
    );
  }
}