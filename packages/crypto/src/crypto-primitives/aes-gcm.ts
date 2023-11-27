import { Convert } from '@web5/common';
import { crypto } from '@noble/hashes/crypto';

import type { PrivateKeyJwk } from '../jose.js';

import { Jose } from '../jose.js';

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
  public static async bytesToPrivateKey(options: {
    privateKeyBytes: Uint8Array
  }): Promise<PrivateKeyJwk> {
    const { privateKeyBytes } = options;

    // Construct the private key in JWK format.
    const privateKey: PrivateKeyJwk = {
      k   : Convert.uint8Array(privateKeyBytes).toBase64Url(),
      kty : 'oct',
    };

    // Compute the JWK thumbprint and set as the key ID.
    privateKey.kid = await Jose.jwkThumbprint({ key: privateKey });

    return privateKey;
  }

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
    key: PrivateKeyJwk,
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
    key: PrivateKeyJwk,
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
  }): Promise<PrivateKeyJwk> {
    const { length } = options;

    // Generate the secret key.
    const lengthInBytes = length / 8;
    const privateKeyBytes = crypto.getRandomValues(new Uint8Array(lengthInBytes));

    // Convert private key from bytes to JWK format.
    const privateKey = await AesGcm.bytesToPrivateKey({ privateKeyBytes });

    // Compute the JWK thumbprint and set as the key ID.
    privateKey.kid = await Jose.jwkThumbprint({ key: privateKey });

    return privateKey;
  }

  public static async privateKeyToBytes(options: {
    privateKey: PrivateKeyJwk
  }): Promise<Uint8Array> {
    const { privateKey } = options;

    // Verify the provided JWK represents a valid oct private key.
    if (!Jose.isOctPrivateKeyJwk(privateKey)) {
      throw new Error(`AesGcm: The provided key is not a valid oct private key.`);
    }

    // Decode the provided private key to bytes.
    const privateKeyBytes = Convert.base64Url(privateKey.k).toUint8Array();

    return privateKeyBytes;
  }

  /**
   * A private method to import a key in JWK format for use with the Web Crypto API.
   *
   * @param key - The key in JWK format.
   * @returns A Promise that resolves to a CryptoKey.
   */
  private static async importKey(key: PrivateKeyJwk): Promise<CryptoKey> {
    return crypto.subtle.importKey(
      'jwk', // format
      key, // keyData
      { name: 'AES-GCM' }, // algorithm
      true, // extractable
      ['encrypt', 'decrypt'] // usages
    );
  }
}