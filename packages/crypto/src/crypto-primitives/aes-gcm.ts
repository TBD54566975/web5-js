import { crypto } from '@noble/hashes/crypto';

/**
 * The `AesGcm` class provides an interface for AES-GCM
 * (Advanced Encryption Standard - Galois/Counter Mode) encryption and
 * decryption operations. The class uses the Web Crypto API for
 * cryptographic operations.
 *
 * All methods of this class are asynchronous and return Promises. They all
 * use the Uint8Array type for keys and data, providing a consistent
 * interface for working with binary data.
 *
 * Example usage:
 *
 * ```ts
 * const key = await AesGcm.generateKey({ length: 128 });
 * const iv = new Uint8Array(12); // generate a 12-byte initialization vector
 * const message = new TextEncoder().encode('Hello, world!');
 * const ciphertext = await AesGcm.encrypt({
 *   data: message,
 *   iv,
 *   key,
 *   tagLength: 128
 * });
 * const plaintext = await AesGcm.decrypt({
 *   data: ciphertext,
 *   iv,
 *   key,
 *   tagLength: 128
 * });
 * console.log(new TextDecoder().decode(plaintext)); // 'Hello, world!'
 * ```
 */
export class AesGcm {
  /**
   * Decrypts the provided data using AES-GCM.
   *
   * @param options - The options for the decryption operation.
   * @param options.additionalData - Data that will be authenticated along with the encrypted data.
   * @param options.data - The data to decrypt.
   * @param options.iv - A unique initialization vector.
   * @param options.key - The key to use for decryption.
   * @param options.tagLength - This size of the authentication tag generated in bits.
   * @returns A Promise that resolves to the decrypted data as a Uint8Array.
   */
  public static async decrypt(options: {
    additionalData?: Uint8Array,
    data: Uint8Array,
    iv: Uint8Array,
    key: Uint8Array,
    tagLength?: number
  }): Promise<Uint8Array> {
    const { additionalData, data, iv, key, tagLength } = options;

    const webCryptoKey = await this.importKey(key);

    // Web browsers throw an error if additionalData is undefined.
    const algorithm = (additionalData === undefined)
      ? { name: 'AES-GCM', iv, tagLength }
      : { name: 'AES-GCM', additionalData, iv, tagLength };

    const plaintextBuffer = await crypto.subtle.decrypt(algorithm, webCryptoKey, data);

    // Convert from ArrayBuffer to Uint8Array.
    const plaintext = new Uint8Array(plaintextBuffer);

    return plaintext;
  }

  /**
   * Encrypts the provided data using AES-GCM.
   *
   * @param options - The options for the encryption operation.
   * @param options.additionalData - Data that will be authenticated along with the encrypted data.
   * @param options.data - The data to decrypt.
   * @param options.iv - A unique initialization vector.
   * @param options.key - The key to use for decryption.
   * @param options.tagLength - This size of the authentication tag generated in bits.
   * @returns A Promise that resolves to the encrypted data as a Uint8Array.
   */
  public static async encrypt(options: {
    additionalData?: Uint8Array,
    data: Uint8Array,
    iv: Uint8Array,
    key: Uint8Array,
    tagLength?: number
  }): Promise<Uint8Array> {
    const { additionalData, data, iv, key, tagLength } = options;

    const webCryptoKey = await this.importKey(key);

    // Web browsers throw an error if additionalData is undefined.
    const algorithm = (additionalData === undefined)
      ? { name: 'AES-GCM', iv, tagLength }
      : { name: 'AES-GCM', additionalData, iv, tagLength };

    const ciphertextBuffer = await crypto.subtle.encrypt(algorithm, webCryptoKey, data);

    // Convert from ArrayBuffer to Uint8Array.
    const ciphertext = new Uint8Array(ciphertextBuffer);

    return ciphertext;
  }

  /**
   * Generates an AES key of a given length.
   *
   * @param length - The length of the key in bits.
   * @returns A Promise that resolves to the generated key as a Uint8Array.
   */
  public static async generateKey(options: {
    length: number
  }): Promise<Uint8Array> {
    const { length } = options;

    // Generate the secret key.
    const lengthInBytes = length / 8;
    const secretKey = crypto.getRandomValues(new Uint8Array(lengthInBytes));

    return secretKey;
  }

  /**
   * A private method to import a raw key for use with the Web Crypto API.
   *
   * @param key - The raw key material.
   * @returns A Promise that resolves to a CryptoKey.
   */
  private static async importKey(key: Uint8Array): Promise<CryptoKey> {
    return crypto.subtle.importKey(
      'raw',
      key.buffer,
      { name: 'AES-GCM', length: key.byteLength * 8 },
      true,
      ['encrypt', 'decrypt']
    );
  }
}