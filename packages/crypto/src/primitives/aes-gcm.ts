import { Convert } from '@web5/common';
import { crypto } from '@noble/hashes/crypto';

import type { Jwk } from '../jose/jwk.js';

import { computeJwkThumbprint, isOctPrivateJwk } from '../jose/jwk.js';

/**
 * The `AesGcm` class provides a comprehensive set of utilities for cryptographic operations
 * using the Advanced Encryption Standard (AES) in Galois/Counter Mode (GCM). This class includes
 * methods for key generation, encryption, decryption, and conversions between raw byte arrays
 * and JSON Web Key (JWK) formats. It is designed to support AES-GCM, a symmetric key algorithm
 * that is widely used for its efficiency, security, and provision of authenticated encryption.
 *
 * AES-GCM is particularly favored for scenarios that require both confidentiality and integrity
 * of data. It integrates the counter mode of encryption with the Galois mode of authentication,
 * offering high performance and parallel processing capabilities.
 *
 * Key Features:
 * - Key Generation: Generate AES symmetric keys in JWK format.
 * - Key Conversion: Transform keys between raw byte arrays and JWK formats.
 * - Encryption: Encrypt data using AES-GCM with the provided symmetric key.
 * - Decryption: Decrypt data encrypted with AES-GCM using the corresponding symmetric key.
 *
 * The methods in this class are asynchronous, returning Promises to accommodate various
 * JavaScript environments.
 *
 * @example
 * ```ts
 * // Key Generation
 * const length = 256; // Length of the key in bits (e.g., 128, 192, 256)
 * const privateKey = await AesGcm.generateKey({ length });
 *
 * // Encryption
 * const data = new TextEncoder().encode('Hello, world!');
 * const iv = new Uint8Array(12); // 12-byte initialization vector
 * const encryptedData = await AesGcm.encrypt({
 *   data,
 *   iv,
 *   key: privateKey,
 *   tagLength: 128 // Length of the authentication tag in bits
 * });
 *
 * // Decryption
 * const decryptedData = await AesGcm.decrypt({
 *   data: encryptedData,
 *   iv,
 *   key: privateKey,
 *   tagLength: 128 // Length of the authentication tag in bits
 * });
 *
 * // Key Conversion
 * const privateKeyBytes = await AesGcm.privateKeyToBytes({ privateKey });
 * ```
 */
export class AesGcm {
  /**
 * Converts a raw private key in bytes to its corresponding JSON Web Key (JWK) format.
 *
 * This method accepts a symmetric key represented as a byte array (Uint8Array) and
 * converts it into a JWK object for use with AES-GCM (Advanced Encryption Standard -
 * Galois/Counter Mode). The conversion process involves encoding the key into
 * base64url format and setting the appropriate JWK parameters.
 *
 * The resulting JWK object includes the following properties:
 * - `kty`: Key Type, set to 'oct' for Octet Sequence (representing a symmetric key).
 * - `k`: The symmetric key, base64url-encoded.
 * - `kid`: Key ID, generated based on the JWK thumbprint.
 *
 * @example
 * ```ts
 * const privateKeyBytes = new Uint8Array([...]); // Replace with actual symmetric key bytes
 * const privateKey = await AesGcm.bytesToPrivateKey({ privateKeyBytes });
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
   * Decrypts the provided data using AES-GCM.
   *
   * This method performs AES-GCM decryption on the given encrypted data using the specified key.
   * It requires an initialization vector (IV), the encrypted data along with the decryption key,
   * and optionally, additional authenticated data (AAD). The method returns the decrypted data as a
   * Uint8Array. The optional `tagLength` parameter specifies the size in bits of the authentication
   * tag used when encrypting the data. If not specified, the default tag length of 128 bits is
   * used.
   *
   * @example
   * ```ts
   * const encryptedData = new Uint8Array([...]); // Encrypted data
   * const iv = new Uint8Array([...]); // Initialization vector used during encryption
   * const additionalData = new Uint8Array([...]); // Optional additional authenticated data
   * const key = { ... }; // A PrivateKeyJwk object representing the AES key
   * const decryptedData = await AesGcm.decrypt({
   *   data: encryptedData,
   *   iv,
   *   additionalData,
   *   key,
   *   tagLength: 128 // Optional tag length in bits
   * });
   * ```
   *
   * @param options - The options for the decryption operation.
   * @param options.data - The encrypted data to decrypt, represented as a Uint8Array.
   * @param options.iv - The initialization vector, represented as a Uint8Array.
   * @param options.additionalData - Optional additional authenticated data.
   * @param options.key - The key to use for decryption, represented in JWK format.
   * @param options.tagLength - The length of the authentication tag in bits.
   *
   * @returns A Promise that resolves to the decrypted data as a Uint8Array.
   */
  public static async decrypt(options: {
    additionalData?: Uint8Array,
    data: Uint8Array,
    iv: Uint8Array,
    key: Jwk,
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
   * This method performs AES-GCM encryption on the given data using the specified key.
   * It requires an initialization vector (IV), the encrypted data along with the decryption key,
   * and optionally, additional authenticated data (AAD). The method returns the encrypted data as a
   * Uint8Array. The optional `tagLength` parameter specifies the size in bits of the authentication
   * tag generated in the encryption operation and used for authentication in the corresponding
   * decryption. If not specified, the default tag length of 128 bits is used.
   *
   * @example
   * ```ts
   * const data = new TextEncoder().encode('Hello, world!');
   * const iv = new Uint8Array([...]); // Initialization vector
   * const additionalData = new Uint8Array([...]); // Optional additional authenticated data
   * const key = { ... }; // A PrivateKeyJwk object representing an AES key
   * const encryptedData = await AesGcm.encrypt({
   *   data,
   *   iv,
   *   additionalData,
   *   key,
   *   tagLength: 128 // Optional tag length in bits
   * });
   * ```
   *
   * @param options - The options for the encryption operation.
   * @param options.data - The data to encrypt, represented as a Uint8Array.
   * @param options.iv - The initialization vector, represented as a Uint8Array.
   * @param options.additionalData - Optional additional authenticated data.
   * @param options.key - The key to use for encryption, represented in JWK format.
   * @param options.tagLength - The length of the authentication tag in bits.
   *
   * @returns A Promise that resolves to the encrypted data as a Uint8Array.
   */
  public static async encrypt(options: {
    additionalData?: Uint8Array,
    data: Uint8Array,
    iv: Uint8Array,
    key: Jwk,
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
   * Generates a symmetric key for AES in Galois/Counter Mode (GCM) in JSON Web Key (JWK) format.
   *
   * This method creates a new symmetric key of a specified length suitable for use with
   * AES-GCM encryption. It leverages cryptographically secure random number generation
   * to ensure the uniqueness and security of the key. The generated key adheres to the JWK
   * format, facilitating compatibility with common cryptographic standards and ease of use
   * in various cryptographic applications.
   *
   * The generated key includes these components:
   * - `kty`: Key Type, set to 'oct' for Octet Sequence, indicating a symmetric key.
   * - `k`: The symmetric key component, base64url-encoded.
   * - `kid`: Key ID, generated based on the JWK thumbprint, providing a unique identifier.
   *
   * @example
   * ```ts
   * const length = 256; // Length of the key in bits (e.g., 128, 192, 256)
   * const privateKey = await AesGcm.generateKey({ length });
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

    // Generate the secret key.
    const lengthInBytes = length / 8;
    const privateKeyBytes = crypto.getRandomValues(new Uint8Array(lengthInBytes));

    // Convert private key from bytes to JWK format.
    const privateKey = await AesGcm.bytesToPrivateKey({ privateKeyBytes });

    // Compute the JWK thumbprint and set as the key ID.
    privateKey.kid = await computeJwkThumbprint({ jwk: privateKey });

    return privateKey;
  }

  /**
   * Converts a private key from JSON Web Key (JWK) format to a raw byte array (Uint8Array).
   *
   * This method takes a symmetric key in JWK format and extracts its raw byte representation.
   * It focuses on the 'k' parameter of the JWK, which represents the symmetric key component
   * in base64url encoding. The method decodes this value into a byte array, providing
   * the symmetric key in its raw binary form.
   *
   * @example
   * ```ts
   * const privateKey = { ... }; // A symmetric key in JWK format
   * const privateKeyBytes = await AesGcm.privateKeyToBytes({ privateKey });
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
  private static async importKey(key: Jwk): Promise<CryptoKey> {
    return crypto.subtle.importKey(
      'jwk', // format
      key, // keyData
      { name: 'AES-GCM' }, // algorithm
      true, // extractable
      ['encrypt', 'decrypt'] // usages
    );
  }
}