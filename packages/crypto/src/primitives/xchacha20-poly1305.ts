import { Convert } from '@web5/common';
import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { getWebcryptoSubtle } from '@noble/ciphers/webcrypto/utils';

import type { Jwk } from '../jose/jwk.js';

import { computeJwkThumbprint, isOctPrivateJwk } from '../jose/jwk.js';

/**
 * Constant defining the length of the authentication tag in bytes for XChaCha20-Poly1305.
 *
 * @remarks
 * The `POLY1305_TAG_LENGTH` is set to 16 bytes (128 bits), which is the standard size for the
 * Poly1305 authentication tag in XChaCha20-Poly1305 encryption. This tag length ensures
 * a strong level of security for message authentication, verifying the integrity and
 * authenticity of the data during decryption.
 */
export const POLY1305_TAG_LENGTH = 16;

/**
 * The `XChaCha20Poly1305` class provides a suite of utilities for cryptographic operations
 * using the XChaCha20-Poly1305 algorithm, a combination of the XChaCha20 stream cipher and the
 * Poly1305 message authentication code (MAC). This class encompasses methods for key generation,
 * encryption, decryption, and conversions between raw byte arrays and JSON Web Key (JWK) formats.
 *
 * XChaCha20-Poly1305 is renowned for its high security and efficiency, especially in scenarios
 * involving large data volumes or where data integrity and confidentiality are paramount. The
 * extended nonce size of XChaCha20 reduces the risks of nonce reuse, while Poly1305 provides
 * a strong MAC ensuring data integrity.
 *
 * Key Features:
 * - Key Generation: Generate XChaCha20-Poly1305 symmetric keys in JWK format.
 * - Key Conversion: Transform keys between raw byte arrays and JWK formats.
 * - Encryption: Encrypt data using XChaCha20-Poly1305, returning both ciphertext and MAC tag.
 * - Decryption: Decrypt data and verify integrity using the XChaCha20-Poly1305 algorithm.
 *
 * The methods in this class are asynchronous, returning Promises to accommodate various
 * JavaScript environments.
 *
 * @example
 * ```ts
 * // Key Generation
 * const privateKey = await XChaCha20Poly1305.generateKey();
 *
 * // Encryption
 * const data = new TextEncoder().encode('Messsage');
 * const nonce = utils.randomBytes(24); // 24-byte nonce
 * const additionalData = new TextEncoder().encode('Associated data');
 * const { ciphertext, tag } = await XChaCha20Poly1305.encrypt({
 *   data,
 *   nonce,
 *   additionalData,
 *   key: privateKey
 * });
 *
 * // Decryption
 * const decryptedData = await XChaCha20Poly1305.decrypt({
 *   data: ciphertext,
 *   nonce,
 *   tag,
 *   additionalData,
 *   key: privateKey
 * });
 *
 * // Key Conversion
 * const privateKeyBytes = await XChaCha20Poly1305.privateKeyToBytes({ privateKey });
 * ```
 */
export class XChaCha20Poly1305 {
  /**
   * Converts a raw private key in bytes to its corresponding JSON Web Key (JWK) format.
   *
   * @remarks
   * This method takes a symmetric key represented as a byte array (Uint8Array) and converts it into
   * a JWK object for use with the XChaCha20-Poly1305 algorithm. The process involves encoding the
   * key into base64url format and setting the appropriate JWK parameters.
   *
   * The resulting JWK object includes the following properties:
   * - `kty`: Key Type, set to 'oct' for Octet Sequence (representing a symmetric key).
   * - `k`: The symmetric key, base64url-encoded.
   * - `kid`: Key ID, generated based on the JWK thumbprint.
   *
   * @example
   * ```ts
   * const privateKeyBytes = new Uint8Array([...]); // Replace with actual symmetric key bytes
   * const privateKey = await XChaCha20Poly1305.bytesToPrivateKey({ privateKeyBytes });
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
   * Decrypts the provided data using XChaCha20-Poly1305.
   *
   * @remarks
   * This method performs XChaCha20-Poly1305 decryption on the given encrypted data using the
   * specified key, nonce, and authentication tag. It supports optional additional authenticated
   * data (AAD) for enhanced security. The nonce must be 24 bytes long, consistent with XChaCha20's
   * specifications.
   *
   * @example
   * ```ts
   * const encryptedData = new Uint8Array([...]); // Encrypted data
   * const nonce = new Uint8Array(24); // 24-byte nonce
   * const additionalData = new Uint8Array([...]); // Optional AAD
   * const key = { ... }; // A Jwk object representing the XChaCha20-Poly1305 key
   * const decryptedData = await XChaCha20Poly1305.decrypt({
   *   data: encryptedData,
   *   nonce,
   *   additionalData,
   *   key
   * });
   * ```
   *
   * @param params - The parameters for the decryption operation.
   * @param params.data - The encrypted data to decrypt including the authentication tag,
   *                      represented as a Uint8Array.
   * @param params.key - The key to use for decryption, represented in JWK format.
   * @param params.nonce - The nonce used during the encryption process.
   * @param params.additionalData - Optional additional authenticated data.
   *
   * @returns A Promise that resolves to the decrypted data as a Uint8Array.
   */
  public static async decrypt({ data, key, nonce, additionalData }: {
    additionalData?: Uint8Array;
    data: Uint8Array;
    key: Jwk;
    nonce: Uint8Array;
  }): Promise<Uint8Array> {
    // Convert the private key from JWK format to bytes.
    const privateKeyBytes = await XChaCha20Poly1305.privateKeyToBytes({ privateKey: key });

    const xc20p = xchacha20poly1305(privateKeyBytes, nonce, additionalData);
    const plaintext = xc20p.decrypt(data);

    return plaintext;
  }

  /**
   * Encrypts the provided data using XChaCha20-Poly1305.
   *
   * @remarks
   * This method performs XChaCha20-Poly1305 encryption on the given data using the specified key
   * and nonce. It supports optional additional authenticated data (AAD) for enhanced security. The
   * nonce must be 24 bytes long, as per XChaCha20's specifications. The method returns the
   * encrypted data along with an authentication tag as a Uint8Array, ensuring both confidentiality
   * and integrity of the data.
   *
   * @example
   * ```ts
   * const data = new TextEncoder().encode('Messsage');
   * const nonce = utils.randomBytes(24); // 24-byte nonce
   * const additionalData = new TextEncoder().encode('Associated data'); // Optional AAD
   * const key = { ... }; // A Jwk object representing an XChaCha20-Poly1305 key
   * const encryptedData = await XChaCha20Poly1305.encrypt({
   *   data,
   *   nonce,
   *   additionalData,
   *   key
   * });
   * ```
   *
   * @param params - The parameters for the encryption operation.
   * @param params.data - The data to encrypt, represented as a Uint8Array.
   * @param params.key - The key to use for encryption, represented in JWK format.
   * @param params.nonce - A 24-byte nonce for the encryption process.
   * @param params.additionalData - Optional additional authenticated data.
   *
   * @returns A Promise that resolves to a byte array containing the encrypted data and the
   *          authentication tag.
   */
  public static async encrypt({ data, key, nonce, additionalData}: {
    additionalData?: Uint8Array;
    data: Uint8Array;
    key: Jwk;
    nonce: Uint8Array;
  }): Promise<Uint8Array> {
    // Convert the private key from JWK format to bytes.
    const privateKeyBytes = await XChaCha20Poly1305.privateKeyToBytes({ privateKey: key });

    const xc20p = xchacha20poly1305(privateKeyBytes, nonce, additionalData);
    const ciphertext = xc20p.encrypt(data);

    return ciphertext;
  }

  /**
   * Generates a symmetric key for XChaCha20-Poly1305 in JSON Web Key (JWK) format.
   *
   * @remarks
   * This method creates a new symmetric key suitable for use with the XChaCha20-Poly1305 algorithm.
   * The key is generated using cryptographically secure random number generation to ensure its
   * uniqueness and security. The XChaCha20-Poly1305 algorithm requires a 256-bit key (32 bytes),
   * and this method adheres to that specification.
   *
   * Key components included in the JWK:
   * - `kty`: Key Type, set to 'oct' for Octet Sequence.
   * - `k`: The symmetric key component, base64url-encoded.
   * - `kid`: Key ID, generated based on the JWK thumbprint.
   *
   * @example
   * ```ts
   * const privateKey = await XChaCha20Poly1305.generateKey();
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
   * This method takes a symmetric key in JWK format and extracts its raw byte representation.
   * It decodes the 'k' parameter of the JWK value, which represents the symmetric key in base64url
   * encoding, into a byte array.
   *
   * @example
   * ```ts
   * const privateKey = { ... }; // A symmetric key in JWK format
   * const privateKeyBytes = await XChaCha20Poly1305.privateKeyToBytes({ privateKey });
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
      throw new Error(`XChaCha20Poly1305: The provided key is not a valid oct private key.`);
    }

    // Decode the provided private key to bytes.
    const privateKeyBytes = Convert.base64Url(privateKey.k).toUint8Array();

    return privateKeyBytes;
  }
}