import { Convert } from '@web5/common';
import { crypto } from '@noble/hashes/crypto';

import type { Jwk } from '../jose/jwk.js';

import { computeJwkThumbprint, isOctPrivateJwk } from '../jose/jwk.js';

/**
 * The `AesCtr` class provides a comprehensive set of utilities for cryptographic operations
 * using the Advanced Encryption Standard (AES) in Counter (CTR) mode. This class includes
 * methods for key generation, encryption, decryption, and conversions between raw byte arrays
 * and JSON Web Key (JWK) formats. It is designed to support AES-CTR, a symmetric key algorithm
 * that is widely used in various cryptographic applications for its efficiency and security.
 *
 * AES-CTR mode operates as a stream cipher using a block cipher (AES) and is well-suited for
 * scenarios where parallel processing is beneficial or where the same key is required to
 * encrypt multiple data blocks. The class adheres to standard cryptographic practices, ensuring
 * compatibility and security in its implementations.
 *
 * Key Features:
 * - Key Generation: Generate AES symmetric keys in JWK format.
 * - Key Conversion: Transform keys between raw byte arrays and JWK formats.
 * - Encryption: Encrypt data using AES-CTR with the provided symmetric key.
 * - Decryption: Decrypt data encrypted with AES-CTR using the corresponding symmetric key.
 *
 * The methods in this class are asynchronous, returning Promises to accommodate various
 * JavaScript environments.
 *
 * Usage Examples:
 *
 * ```ts
 * // Key Generation
 * const length = 256; // Length of the key in bits (e.g., 128, 192, 256)
 * const privateKey = await AesCtr.generateKey({ length });
 *
 * // Encryption
 * const data = new TextEncoder().encode('Hello, world!');
 * const counter = new Uint8Array(16); // 16-byte (128-bit) counter block
 * const encryptedData = await AesCtr.encrypt({
 *   data,
 *   counter,
 *   key: privateKey,
 *   length: 128 // Length of the counter block in bits
 * });
 *
 * // Decryption
 * const decryptedData = await AesCtr.decrypt({
 *   data: encryptedData,
 *   counter,
 *   key: privateKey,
 *   length: 128 // Length of the counter block in bits
 * });
 *
 * // Key Conversion
 * const privateKeyBytes = await AesCtr.privateKeyToBytes({ privateKey });
 * ```
 */
export class AesCtr {
  /**
   * Converts a raw private key in bytes to its corresponding JSON Web Key (JWK) format.
   *
   * This method takes a symmetric key represented as a byte array (Uint8Array) and
   * converts it into a JWK object for use with AES (Advanced Encryption Standard)
   * in Counter (CTR) mode. The conversion process involves encoding the key into
   * base64url format and setting the appropriate JWK parameters.
   *
   * The resulting JWK object includes the following properties:
   * - `kty`: Key Type, set to 'oct' for Octet Sequence (representing a symmetric key).
   * - `k`: The symmetric key, base64url-encoded.
   * - `kid`: Key ID, generated based on the JWK thumbprint.
   *
   * Example usage:
   *
   * ```ts
   * const privateKeyBytes = new Uint8Array([...]); // Replace with actual symmetric key bytes
   * const privateKey = await AesCtr.bytesToPrivateKey({ privateKeyBytes });
   * ```
   *
   * @param options - The options for the symmetric key conversion.
   * @param options.privateKeyBytes - The raw symmetric key as a Uint8Array.
   *
   * @returns A Promise that resolves to the symmetric key in JWK format.
   */
  public static async bytesToPrivateKey(options: {
    privateKeyBytes: Uint8Array
  }): Promise<Jwk> {
    const { privateKeyBytes } = options;

    // Construct the private key in JWK format.
    const privateKey: Jwk = {
      k   : Convert.uint8Array(privateKeyBytes).toBase64Url(),
      kty : 'oct'
    };

    // Compute the JWK thumbprint and set as the key ID.
    privateKey.kid = await computeJwkThumbprint({ jwk: privateKey });

    return privateKey;
  }

  /**
   * Decrypts the provided data using AES in Counter (CTR) mode.
   *
   * This method performs AES-CTR decryption on the given encrypted data using the specified key.
   * Similar to the encryption process, it requires an initial counter block and the length
   * of the counter block, along with the encrypted data and the decryption key. The method
   * returns the decrypted data as a Uint8Array.
   *
   * Example usage:
   *
   * ```ts
   * const encryptedData = new Uint8Array([...]); // Encrypted data
   * const counter = new Uint8Array(16); // 16-byte (128-bit) counter block used during encryption
   * const key = { ... }; // A PrivateKeyJwk object representing the same AES key used for encryption
   * const decryptedData = await AesCtr.decrypt({
   *   data: encryptedData,
   *   counter,
   *   key,
   *   length: 128 // Length of the counter block in bits
   * });
   * ```
   *
   * @param options - The options for the decryption operation.
   * @param options.counter - The initial value of the counter block.
   * @param options.data - The encrypted data to decrypt, represented as a Uint8Array.
   * @param options.key - The key to use for decryption, represented in JWK format.
   * @param options.length - The length of the counter block in bits.
   *
   * @returns A Promise that resolves to the decrypted data as a Uint8Array.
   */
  public static async decrypt(options: {
    counter: Uint8Array,
    data: Uint8Array,
    key: Jwk,
    length: number
  }): Promise<Uint8Array> {
    const { counter, data, key, length } = options;

    const webCryptoKey = await this.importKey(key);

    const plaintextBuffer = await crypto.subtle.decrypt(
      { name: 'AES-CTR', counter, length },
      webCryptoKey,
      data
    );

    // Convert from ArrayBuffer to Uint8Array.
    const plaintext = new Uint8Array(plaintextBuffer);

    return plaintext;
  }

  /**
   * Encrypts the provided data using AES in Counter (CTR) mode.
   *
   * This method performs AES-CTR encryption on the given data using the specified key.
   * It requires the initial counter block and the length of the counter block, alongside
   * the data and key. The method is designed to work asynchronously and returns the
   * encrypted data as a Uint8Array.
   *
   * Example usage:
   *
   * ```ts
   * const data = new TextEncoder().encode('Hello, world!');
   * const counter = new Uint8Array(16); // 16-byte (128-bit) counter block
   * const key = { ... }; // A PrivateKeyJwk object representing an AES key
   * const encryptedData = await AesCtr.encrypt({
   *   data,
   *   counter,
   *   key,
   *   length: 128 // Length of the counter block in bits
   * });
   * ```
   *
   * @param options - The options for the encryption operation.
   * @param options.counter - The initial value of the counter block.
   * @param options.data - The data to encrypt, represented as a Uint8Array.
   * @param options.key - The key to use for encryption, represented in JWK format.
   * @param options.length - The length of the counter block in bits.
   *
   * @returns A Promise that resolves to the encrypted data as a Uint8Array.
   */
  public static async encrypt(options: {
    counter: Uint8Array,
    data: Uint8Array,
    key: Jwk,
    length: number
  }): Promise<Uint8Array> {
    const { counter, data, key, length } = options;

    const webCryptoKey = await this.importKey(key);

    const ciphertextBuffer = await crypto.subtle.encrypt(
      { name: 'AES-CTR', counter, length },
      webCryptoKey,
      data
    );

    // Convert from ArrayBuffer to Uint8Array.
    const ciphertext = new Uint8Array(ciphertextBuffer);

    return ciphertext;
  }

  /**
   * Generates a symmetric key for AES in Counter (CTR) mode in JSON Web Key (JWK) format.
   *
   * This method creates a new symmetric key of a specified length suitable for use with
   * AES-CTR encryption. It uses cryptographically secure random number generation to
   * ensure the uniqueness and security of the key. The generated key adheres to the JWK
   * format, making it compatible with common cryptographic standards and easy to use in
   * various cryptographic processes.
   *
   * The generated key includes the following components:
   * - `kty`: Key Type, set to 'oct' for Octet Sequence.
   * - `k`: The symmetric key component, base64url-encoded.
   * - `kid`: Key ID, generated based on the JWK thumbprint.
   *
   * Example usage:
   *
   * ```ts
   * const length = 256; // Length of the key in bits (e.g., 128, 192, 256)
   * const privateKey = await AesCtr.generateKey({ length });
   * ```
   *
   * @param options - The options for the key generation.
   * @param options.length - The length of the key in bits. Common lengths are 128, 192, and 256 bits.
   *
   * @returns A Promise that resolves to the generated symmetric key in JWK format.
   */
  public static async generateKey(options: {
    length: number
  }): Promise<Jwk> {
    const { length } = options;

    // Generate a random private key.
    const lengthInBytes = length / 8;
    const privateKeyBytes = crypto.getRandomValues(new Uint8Array(lengthInBytes));

    // Convert private key from bytes to JWK format.
    const privateKey = await AesCtr.bytesToPrivateKey({ privateKeyBytes });

    // Compute the JWK thumbprint and set as the key ID.
    privateKey.kid = await computeJwkThumbprint({ jwk: privateKey });

    return privateKey;
  }

  /**
   * Converts a private key from JSON Web Key (JWK) format to a raw byte array (Uint8Array).
   *
   * This method takes a symmetric key in JWK format and extracts its raw byte representation.
   * It decodes the 'k' parameter of the JWK value, which represents the symmetric key in base64url
   * encoding, into a byte array.
   *
   * Example usage:
   *
   * ```ts
   * const privateKey = { ... }; // A symmetric key in JWK format
   * const privateKeyBytes = await AesCtr.privateKeyToBytes({ privateKey });
   * ```
   *
   * @param options - The options for the symmetric key conversion.
   * @param options.privateKey - The symmetric key in JWK format.
   *
   * @returns A Promise that resolves to the symmetric key as a Uint8Array.
   */
  public static async privateKeyToBytes(options: {
    privateKey: Jwk
  }): Promise<Uint8Array> {
    const { privateKey } = options;

    // Verify the provided JWK represents a valid oct private key.
    if (!isOctPrivateJwk(privateKey)) {
      throw new Error(`AesCtr: The provided key is not a valid oct private key.`);
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
  private static async importKey(key: Jwk): Promise<CryptoKey> {
    return crypto.subtle.importKey(
      'jwk', // format
      key, // keyData
      { name: 'AES-CTR' }, // algorithm
      true, // extractable
      ['encrypt', 'decrypt'] // usages
    );
  }
}