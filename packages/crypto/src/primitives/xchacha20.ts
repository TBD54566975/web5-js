import { Convert } from '@web5/common';
import { xchacha20 } from '@noble/ciphers/chacha';
import { getWebcryptoSubtle } from '@noble/ciphers/webcrypto/utils';

import type { Jwk } from '../jose/jwk.js';

import { computeJwkThumbprint, isOctPrivateJwk } from '../jose/jwk.js';

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
 * @example
 * ```ts
 * // Key Generation
 * const privateKey = await XChaCha20.generateKey();
 *
 * // Encryption
 * const data = new TextEncoder().encode('Messsage');
 * const nonce = utils.randomBytes(24); // 24-byte nonce for XChaCha20
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
   * @remarks
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
   * @example
   * ```ts
   * const privateKeyBytes = new Uint8Array([...]); // Replace with actual symmetric key bytes
   * const privateKey = await XChaCha20.bytesToPrivateKey({ privateKeyBytes });
   * ```
   *
   * @param params - The parameters for the symmetric key conversion.
   * @param params.privateKeyBytes - The raw symmetric key as a Uint8Array.
   *
   * @returns A Promise that resolves to the symmetric key in JWK format.
   */
  public static async bytesToPrivateKey({ privateKeyBytes }: {
    privateKeyBytes: Uint8Array;
  }): Promise<Jwk> {
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
   * Decrypts the provided data using XChaCha20.
   *
   * @remarks
   * This method performs XChaCha20 decryption on the given encrypted data using the specified key
   * and nonce. The nonce should be the same as used in the encryption process and must be 24 bytes
   * long. The method returns the decrypted data as a Uint8Array.
   *
   * @example
   * ```ts
   * const encryptedData = new Uint8Array([...]); // Encrypted data
   * const nonce = new Uint8Array(24); // 24-byte nonce used during encryption
   * const key = { ... }; // A Jwk object representing the XChaCha20 key
   * const decryptedData = await XChaCha20.decrypt({
   *   data: encryptedData,
   *   nonce,
   *   key
   * });
   * ```
   *
   * @param params - The parameters for the decryption operation.
   * @param params.data - The encrypted data to decrypt, represented as a Uint8Array.
   * @param params.key - The key to use for decryption, represented in JWK format.
   * @param params.nonce - The nonce used during the encryption process.
   *
   * @returns A Promise that resolves to the decrypted data as a Uint8Array.
   */
  public static async decrypt({ data, key, nonce }: {
    data: Uint8Array;
    key: Jwk;
    nonce: Uint8Array;
  }): Promise<Uint8Array> {
    // Convert the private key from JWK format to bytes.
    const privateKeyBytes = await XChaCha20.privateKeyToBytes({ privateKey: key });

    const ciphertext = xchacha20(privateKeyBytes, nonce, data);

    return ciphertext;
  }

  /**
   * Encrypts the provided data using XChaCha20.
   *
   * @remarks
   * This method performs XChaCha20 encryption on the given data using the specified key and nonce.
   * The nonce must be 24 bytes long, ensuring a high level of security through a vast nonce space,
   * reducing the risks associated with nonce reuse. The method returns the encrypted data as a
   * Uint8Array.
   *
   * @example
   * ```ts
   * const data = new TextEncoder().encode('Messsage');
   * const nonce = utils.randomBytes(24); // 24-byte nonce for XChaCha20
   * const key = { ... }; // A Jwk object representing an XChaCha20 key
   * const encryptedData = await XChaCha20.encrypt({
   *   data,
   *   nonce,
   *   key
   * });
   * ```
   *
   * @param params - The parameters for the encryption operation.
   * @param params.data - The data to encrypt, represented as a Uint8Array.
   * @param params.key - The key to use for encryption, represented in JWK format.
   * @param params.nonce - A 24-byte nonce for the encryption process.
   *
   * @returns A Promise that resolves to the encrypted data as a Uint8Array.
   */
  public static async encrypt({ data, key, nonce }: {
    data: Uint8Array;
    key: Jwk;
    nonce: Uint8Array;
  }): Promise<Uint8Array> {
    // Convert the private key from JWK format to bytes.
    const privateKeyBytes = await XChaCha20.privateKeyToBytes({ privateKey: key });

    const plaintext = xchacha20(privateKeyBytes, nonce, data);

    return plaintext;
  }

  /**
   * Generates a symmetric key for XChaCha20 in JSON Web Key (JWK) format.
   *
   * @remarks
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
   * @example
   * ```ts
   * const privateKey = await XChaCha20.generateKey();
   * ```
   *
   * @returns A Promise that resolves to the generated symmetric key in JWK format.
   */
  public static async generateKey(): Promise<Jwk> {
    // Get the Web Crypto API interface.
    const webCrypto = getWebcryptoSubtle();

    // Generate a random private key.
    // See https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues#usage_notes for
    // an explanation for why Web Crypto generateKey() is used instead of getRandomValues().
    const webCryptoKey = await webCrypto.generateKey( { name: 'AES-CTR', length: 256 }, true, ['encrypt']);

    // Export the private key in JWK format.
    const { alg, ext, key_ops, ...privateKey } = await webCrypto.exportKey('jwk', webCryptoKey);

    // Compute the JWK thumbprint and set as the key ID.
    privateKey.kid = await computeJwkThumbprint({ jwk: privateKey });

    return privateKey;
  }

  /**
   * Converts a private key from JSON Web Key (JWK) format to a raw byte array (Uint8Array).
   *
   * @remarks
   * This method takes a symmetric key in JWK format and extracts its raw byte representation.
   * It decodes the 'k' parameter of the JWK value, which represents the symmetric key in base64url
   * encoding, into a byte array.
   *
   * @example
   * ```ts
   * const privateKey = { ... }; // A symmetric key in JWK format
   * const privateKeyBytes = await XChaCha20.privateKeyToBytes({ privateKey });
   * ```
   *
   * @param params - The parameters for the symmetric key conversion.
   * @param params.privateKey - The symmetric key in JWK format.
   *
   * @returns A Promise that resolves to the symmetric key as a Uint8Array.
   */
  public static async privateKeyToBytes({ privateKey }: {
    privateKey: Jwk;
  }): Promise<Uint8Array> {
    // Verify the provided JWK represents a valid oct private key.
    if (!isOctPrivateJwk(privateKey)) {
      throw new Error(`XChaCha20: The provided key is not a valid oct private key.`);
    }

    // Decode the provided private key to bytes.
    const privateKeyBytes = Convert.base64Url(privateKey.k).toUint8Array();

    return privateKeyBytes;
  }
}