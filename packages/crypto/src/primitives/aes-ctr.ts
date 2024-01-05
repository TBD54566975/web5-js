import { Convert } from '@web5/common';
import { getWebcryptoSubtle } from '@noble/ciphers/webcrypto/utils';

import type { Jwk } from '../jose/jwk.js';

import { computeJwkThumbprint, isOctPrivateJwk } from '../jose/jwk.js';

/**
 * Constant defining the AES block size in bits.
 *
 * @remarks
 * In AES Counter (CTR) mode, the counter length must match the block size of the AES algorithm,
 * which is 128 bits. NIST publication 800-38A, which provides guidelines for block cipher modes of
 * operation, specifies this requirement. Maintaining a counter length of 128 bits is essential for
 * the correct operation and security of AES-CTR.
 *
 * This implementation does not support counter lengths that are different from the value defined by
 * this constant.
 *
 * @see {@link https://doi.org/10.6028/NIST.SP.800-38A | NIST SP 800-38A}
 */
const AES_BLOCK_SIZE = 128;

/**
 * Constant defining the AES key length values in bits.
 *
 * @remarks
 * NIST publication FIPS 197 states:
 * > The AES algorithm is capable of using cryptographic keys of 128, 192, and 256 bits to encrypt
 * > and decrypt data in blocks of 128 bits.
 *
 * This implementation does not support key lengths that are different from the three values
 * defined by this constant.
 *
 * @see {@link https://doi.org/10.6028/NIST.FIPS.197-upd1 | NIST FIPS 197}
 */
const AES_KEY_LENGTHS = [128, 192, 256] as const;

/**
 * Constant defining the maximum length of the counter in bits.
 *
 * @remarks
 * The rightmost bits of the counter block are used as the actual counter value, while the leftmost
 * bits are used as the nonce. The maximum length of the counter is 128 bits, which is the same as
 * the AES block size.
 */
const COUNTER_MAX_LENGTH = AES_BLOCK_SIZE;

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
 * @example
 * ```ts
 * // Key Generation
 * const length = 256; // Length of the key in bits (e.g., 128, 192, 256)
 * const privateKey = await AesCtr.generateKey({ length });
 *
 * // Encryption
 * const data = new TextEncoder().encode('Messsage');
 * const counter = new Uint8Array(16); // 16-byte (128-bit) counter block
 * const encryptedData = await AesCtr.encrypt({
 *   data,
 *   counter,
 *   key: privateKey,
 *   length: 64 // Length of the counter in bits
 * });
 *
 * // Decryption
 * const decryptedData = await AesCtr.decrypt({
 *   data: encryptedData,
 *   counter,
 *   key: privateKey,
 *   length: 64 // Length of the counter in bits
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
   * @remarks
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
   * @example
   * ```ts
   * const privateKeyBytes = new Uint8Array([...]); // Replace with actual symmetric key bytes
   * const privateKey = await AesCtr.bytesToPrivateKey({ privateKeyBytes });
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
   * Decrypts the provided data using AES in Counter (CTR) mode.
   *
   * @remarks
   * This method performs AES-CTR decryption on the given encrypted data using the specified key.
   * Similar to the encryption process, it requires an initial counter block and the length
   * of the counter block, along with the encrypted data and the decryption key. The method
   * returns the decrypted data as a Uint8Array.
   *
   * @example
   * ```ts
   * const encryptedData = new Uint8Array([...]); // Encrypted data
   * const counter = new Uint8Array(16); // 16-byte (128-bit) counter block used during encryption
   * const key = { ... }; // A Jwk object representing the same AES key used for encryption
   * const decryptedData = await AesCtr.decrypt({
   *   data: encryptedData,
   *   counter,
   *   key,
   *   length: 64 // Length of the counter in bits
   * });
   * ```
   *
   * @param params - The parameters for the decryption operation.
   * @param params.key - The key to use for decryption, represented in JWK format.
   * @param params.data - The encrypted data to decrypt, as a Uint8Array.
   * @param params.counter - The initial value of the counter block.
   * @param params.length - The number of bits in the counter block that are used for the actual counter.
   *
   * @returns A Promise that resolves to the decrypted data as a Uint8Array.
   */
  public static async decrypt({ key, data, counter, length }: {
    key: Jwk;
    data: Uint8Array;
    counter: Uint8Array;
    length: number;
  }): Promise<Uint8Array> {
    // Validate the initial counter block length matches the AES block size.
    if (counter.byteLength !== AES_BLOCK_SIZE / 8) {
      throw new TypeError(`The counter must be ${AES_BLOCK_SIZE} bits in length`);
    }

    // Validate the length of the counter.
    if (length === 0 || length > COUNTER_MAX_LENGTH) {
      throw new TypeError(`The 'length' property must be in the range 1 to ${COUNTER_MAX_LENGTH}`);
    }

    // Get the Web Crypto API interface.
    const webCrypto = getWebcryptoSubtle();

    // Import the JWK into the Web Crypto API to use for the decrypt operation.
    const webCryptoKey = await webCrypto.importKey('jwk', key, { name: 'AES-CTR' }, true, ['decrypt']);

    // Decrypt the data.
    const plaintextBuffer = await webCrypto.decrypt(
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
   * @remarks
   * This method performs AES-CTR encryption on the given data using the specified key.
   * It requires the initial counter block and the length of the counter block, alongside
   * the data and key. The method is designed to work asynchronously and returns the
   * encrypted data as a Uint8Array.
   *
   * @example
   * ```ts
   * const data = new TextEncoder().encode('Messsage');
   * const counter = new Uint8Array(16); // 16-byte (128-bit) counter block
   * const key = { ... }; // A Jwk object representing an AES key
   * const encryptedData = await AesCtr.encrypt({
   *   data,
   *   counter,
   *   key,
   *   length: 64 // Length of the counter in bits
   * });
   * ```
   *
   * @param params - The parameters for the encryption operation.
   * @param params.key - The key to use for encryption, represented in JWK format.
   * @param params.data - The data to encrypt, represented as a Uint8Array.
   * @param params.counter - The initial value of the counter block.
   * @param params.length - The number of bits in the counter block that are used for the actual counter.
   *
   * @returns A Promise that resolves to the encrypted data as a Uint8Array.
   */
  public static async encrypt({ key, data, counter, length }: {
    key: Jwk;
    data: Uint8Array;
    counter: Uint8Array;
    length: number;
  }): Promise<Uint8Array> {
    // Validate the initial counter block value length.
    if (counter.byteLength !== AES_BLOCK_SIZE / 8) {
      throw new TypeError(`The counter must be ${AES_BLOCK_SIZE} bits in length`);
    }

    // Validate the length of the counter.
    if (length === 0 || length > COUNTER_MAX_LENGTH) {
      throw new TypeError(`The 'length' property must be in the range 1 to ${COUNTER_MAX_LENGTH}`);
    }

    // Get the Web Crypto API interface.
    const webCrypto = getWebcryptoSubtle();

    // Import the JWK into the Web Crypto API to use for the encrypt operation.
    const webCryptoKey = await webCrypto.importKey('jwk', key, { name: 'AES-CTR' }, true, ['encrypt', 'decrypt']);

    // Encrypt the data.
    const ciphertextBuffer = await webCrypto.encrypt(
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
   * @remarks
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
   * @example
   * ```ts
   * const length = 256; // Length of the key in bits (e.g., 128, 192, 256)
   * const privateKey = await AesCtr.generateKey({ length });
   * ```
   *
   * @param params - The parameters for the key generation.
   * @param params.length - The length of the key in bits. Common lengths are 128, 192, and 256 bits.
   *
   * @returns A Promise that resolves to the generated symmetric key in JWK format.
   */
  public static async generateKey({ length }: {
    length: typeof AES_KEY_LENGTHS[number];
  }): Promise<Jwk> {
    // Validate the key length.
    if (!AES_KEY_LENGTHS.includes(length as any)) {
      throw new RangeError(`The key length is invalid: Must be ${AES_KEY_LENGTHS.join(', ')} bits`);
    }

    // Get the Web Crypto API interface.
    const webCrypto = getWebcryptoSubtle();

    // Generate a random private key.
    // See https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues#usage_notes for
    // an explanation for why Web Crypto generateKey() is used instead of getRandomValues().
    const webCryptoKey = await webCrypto.generateKey( { name: 'AES-CTR', length }, true, ['encrypt']);

    // Export the private key in JWK format.
    const { ext, key_ops, ...privateKey } = await webCrypto.exportKey('jwk', webCryptoKey);

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
   * const privateKeyBytes = await AesCtr.privateKeyToBytes({ privateKey });
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
      throw new Error(`AesCtr: The provided key is not a valid oct private key.`);
    }

    // Decode the provided private key to bytes.
    const privateKeyBytes = Convert.base64Url(privateKey.k).toUint8Array();

    return privateKeyBytes;
  }
}