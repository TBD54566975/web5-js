import { Convert } from '@web5/common';
import { xchacha20 } from '@noble/ciphers/chacha';

import type { PrivateKeyJwk } from '../jose.js';

import { Jose } from '../jose.js';

/**
 * The `XChaCha20` class provides a comprehensive suite of utilities for cryptographic operations
 * using the XChaCha20 symmetric encryption algorithm. This class includes methods for key
 * generation, encryption, decryption, and conversions between raw byte arrays and JSON Web Key
 * (JWK) formats. XChaCha20 is an extended nonce variant of ChaCha20, a stream cipher designed for
 * high-speed encryption with substantial security margins.
 *
 * The XChaCha20 algorithm is particularly well-suited for encrypting large volumes of data or
 * data streams, especially where random access is required. The class adheres to standard
 * cryptographic practices, ensuring robustness and security in its implementations.
 *
 * Key Features:
 * - Key Generation: Generate XChaCha20 symmetric keys in JWK format.
 * - Key Conversion: Transform keys between raw byte arrays and JWK formats.
 * - Encryption: Encrypt data using XChaCha20 with the provided symmetric key.
 * - Decryption: Decrypt data encrypted with XChaCha20 using the corresponding symmetric key.
 *
 * The methods in this class are asynchronous, returning Promises to accommodate various
 * JavaScript environments.
 *
 * Usage Examples:
 *
 * ```ts
 * // Key Generation
 * const privateKey = await XChaCha20.generateKey();
 *
 * // Encryption
 * const data = new TextEncoder().encode('Hello, world!');
 * const nonce = crypto.getRandomValues(new Uint8Array(24)); // 24-byte nonce for XChaCha20
 * const encryptedData = await XChaCha20.encrypt({
 *   data,
 *   nonce,
 *   key: privateKey
 * });
 *
 * // Decryption
 * const decryptedData = await XChaCha20.decrypt({
 *   data: encryptedData,
 *   nonce,
 *   key: privateKey
 * });
 *
 * // Key Conversion
 * const privateKeyBytes = await XChaCha20.privateKeyToBytes({ privateKey });
 * ```
 */
export class XChaCha20 {
  /**
   * Converts a raw private key in bytes to its corresponding JSON Web Key (JWK) format.
   *
   * This method takes a symmetric key represented as a byte array (Uint8Array) and
   * converts it into a JWK object for use with the XChaCha20 symmetric encryption algorithm. The
   * conversion process involves encoding the key into base64url format and setting the appropriate
   * JWK parameters.
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
   * const privateKey = await XChaCha20.bytesToPrivateKey({ privateKeyBytes });
   * ```
   *
   * @param options - The options for the symmetric key conversion.
   * @param options.privateKeyBytes - The raw symmetric key as a Uint8Array.
   *
   * @returns A Promise that resolves to the symmetric key in JWK format.
   */
  public static async bytesToPrivateKey(options: {
    privateKeyBytes: Uint8Array
  }): Promise<PrivateKeyJwk> {
    const { privateKeyBytes } = options;

    // Construct the private key in JWK format.
    const privateKey: PrivateKeyJwk = {
      k   : Convert.uint8Array(privateKeyBytes).toBase64Url(),
      kty : 'oct'
    };

    // Compute the JWK thumbprint and set as the key ID.
    privateKey.kid = await Jose.jwkThumbprint({ key: privateKey });

    return privateKey;
  }

  /**
   * Decrypts the provided data using XChaCha20.
   *
   * This method performs XChaCha20 decryption on the given encrypted data using the specified key
   * and nonce. The nonce should be the same as used in the encryption process and must be 24 bytes
   * long. The method returns the decrypted data as a Uint8Array.
   *
   * Example usage:
   *
   * ```ts
   * const encryptedData = new Uint8Array([...]); // Encrypted data
   * const nonce = new Uint8Array(24); // 24-byte nonce used during encryption
   * const key = { ... }; // A PrivateKeyJwk object representing the XChaCha20 key
   * const decryptedData = await XChaCha20.decrypt({
   *   data: encryptedData,
   *   nonce,
   *   key
   * });
   * ```
   *
   * @param options - The options for the decryption operation.
   * @param options.data - The encrypted data to decrypt, represented as a Uint8Array.
   * @param options.key - The key to use for decryption, represented in JWK format.
   * @param options.nonce - The nonce used during the encryption process.
   *
   * @returns A Promise that resolves to the decrypted data as a Uint8Array.
   */
  public static async decrypt(options: {
    data: Uint8Array,
    key: PrivateKeyJwk,
    nonce: Uint8Array
  }): Promise<Uint8Array> {
    const { data, key, nonce } = options;

    // Convert the private key from JWK format to bytes.
    const privateKeyBytes = await XChaCha20.privateKeyToBytes({ privateKey: key });

    const ciphertext = xchacha20(privateKeyBytes, nonce, data);

    return ciphertext;
  }

  /**
   * Encrypts the provided data using XChaCha20.
   *
   * This method performs XChaCha20 encryption on the given data using the specified key and nonce.
   * The nonce must be 24 bytes long, ensuring a high level of security through a vast nonce space,
   * reducing the risks associated with nonce reuse. The method returns the encrypted data as a
   * Uint8Array.
   *
   * Example usage:
   *
   * ```ts
   * const data = new TextEncoder().encode('Hello, world!');
   * const nonce = crypto.getRandomValues(new Uint8Array(24)); // 24-byte nonce for XChaCha20
   * const key = { ... }; // A PrivateKeyJwk object representing an XChaCha20 key
   * const encryptedData = await XChaCha20.encrypt({
   *   data,
   *   nonce,
   *   key
   * });
   * ```
   *
   * @param options - The options for the encryption operation.
   * @param options.data - The data to encrypt, represented as a Uint8Array.
   * @param options.key - The key to use for encryption, represented in JWK format.
   * @param options.nonce - A 24-byte nonce for the encryption process.
   *
   * @returns A Promise that resolves to the encrypted data as a Uint8Array.
   */
  public static async encrypt(options: {
    data: Uint8Array,
    key: PrivateKeyJwk,
    nonce: Uint8Array
  }): Promise<Uint8Array> {
    const { data, key, nonce } = options;

    // Convert the private key from JWK format to bytes.
    const privateKeyBytes = await XChaCha20.privateKeyToBytes({ privateKey: key });

    const plaintext = xchacha20(privateKeyBytes, nonce, data);

    return plaintext;
  }

  /**
   * Generates a symmetric key for XChaCha20 in JSON Web Key (JWK) format.
   *
   * This method creates a new symmetric key suitable for use with the XChaCha20 encryption
   * algorithm. The key is generated using cryptographically secure random number generation
   * to ensure its uniqueness and security. The XChaCha20 algorithm requires a 256-bit key
   * (32 bytes), and this method adheres to that specification.
   *
   * Key components included in the JWK:
   * - `kty`: Key Type, set to 'oct' for Octet Sequence.
   * - `k`: The symmetric key component, base64url-encoded.
   * - `kid`: Key ID, generated based on the JWK thumbprint.
   *
   * Example usage:
   *
   * ```ts
   * const privateKey = await XChaCha20.generateKey();
   * ```
   *
   * @returns A Promise that resolves to the generated symmetric key in JWK format.
   */
  public static async generateKey(): Promise<PrivateKeyJwk> {
    // Generate a random private key.
    const privateKeyBytes = crypto.getRandomValues(new Uint8Array(32));

    // Convert private key from bytes to JWK format.
    const privateKey = await XChaCha20.bytesToPrivateKey({ privateKeyBytes });

    // Compute the JWK thumbprint and set as the key ID.
    privateKey.kid = await Jose.jwkThumbprint({ key: privateKey });

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
   * const privateKeyBytes = await XChaCha20.privateKeyToBytes({ privateKey });
   * ```
   *
   * @param options - The options for the symmetric key conversion.
   * @param options.privateKey - The symmetric key in JWK format.
   *
   * @returns A Promise that resolves to the symmetric key as a Uint8Array.
   */
  public static async privateKeyToBytes(options: {
    privateKey: PrivateKeyJwk
  }): Promise<Uint8Array> {
    const { privateKey } = options;

    // Verify the provided JWK represents a valid oct private key.
    if (!Jose.isOctPrivateKeyJwk(privateKey)) {
      throw new Error(`XChaCha20: The provided key is not a valid oct private key.`);
    }

    // Decode the provided private key to bytes.
    const privateKeyBytes = Convert.base64Url(privateKey.k).toUint8Array();

    return privateKeyBytes;
  }
}