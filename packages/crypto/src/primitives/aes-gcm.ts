import { Convert } from '@web5/common';
import { getWebcryptoSubtle } from '@noble/ciphers/webcrypto';

import type { Jwk } from '../jose/jwk.js';

import { computeJwkThumbprint, isOctPrivateJwk } from '../jose/jwk.js';

/**
 * Const defining the AES-GCM initialization vector (IV) length in bits.
 *
 * @remarks
 * NIST Special Publication 800-38D, Section 5.2.1.1 states that the IV length:
 * > For IVs, it is recommended that implementations restrict support to the length of 96 bits, to
 * > promote interoperability, efficiency, and simplicity of design.
 *
 * This implementation does not support IV lengths that are different from the value defined by
 * this constant.
 *
 * @see {@link https://doi.org/10.6028/NIST.SP.800-38D | NIST SP 800-38D}
 */
const AES_GCM_IV_LENGTH = 96;

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
 * Constant defining the AES-GCM tag length values in bits.
 *
 * @remarks
 * NIST Special Publication 800-38D, Section 5.2.1.2 states that the tag length:
 * > may be any one of the following five values: 128, 120, 112, 104, or 96
 *
 * Although the NIST specification allows for tag lengths of 32 or 64 bits in certain applications,
 * the use of shorter tag lengths can be problematic for GCM due to targeted forgery attacks. As a
 * precaution, this implementation does not support tag lengths that are different from the five
 * values defined by this constant. See Appendix C of the NIST SP 800-38D specification for
 * additional guidance and details.
 *
 * @see {@link https://doi.org/10.6028/NIST.SP.800-38D | NIST SP 800-38D}
 */
export const AES_GCM_TAG_LENGTHS = [96, 104, 112, 120, 128] as const;

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
 * const data = new TextEncoder().encode('Messsage');
 * const iv = new Uint8Array(12); // 12-byte initialization vector
 * const encryptedData = await AesGcm.encrypt({
 *   data,
 *   iv,
 *   key: privateKey
 * });
 *
 * // Decryption
 * const decryptedData = await AesGcm.decrypt({
 *   data: encryptedData,
 *   iv,
 *   key: privateKey
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
 * @remarks
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
   * Decrypts the provided data using AES-GCM.
   *
   * @remarks
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
   * const key = { ... }; // A Jwk object representing the AES key
   * const decryptedData = await AesGcm.decrypt({
   *   data: encryptedData,
   *   iv,
   *   additionalData,
   *   key,
   *   tagLength: 128 // Optional tag length in bits
   * });
   * ```
   *
   * @param params - The parameters for the decryption operation.
   * @param params.key - The key to use for decryption, represented in JWK format.
   * @param params.data - The encrypted data to decrypt, represented as a Uint8Array.
   * @param params.iv - The initialization vector, represented as a Uint8Array.
   * @param params.additionalData - Optional additional authenticated data. Optional.
   * @param params.tagLength - The length of the authentication tag in bits. Optional.
   *
   * @returns A Promise that resolves to the decrypted data as a Uint8Array.
   */
  public static async decrypt({ key, data, iv, additionalData, tagLength }: {
    key: Jwk;
    data: Uint8Array;
    iv: Uint8Array;
    additionalData?: Uint8Array;
    tagLength?: typeof AES_GCM_TAG_LENGTHS[number];
  }): Promise<Uint8Array> {
    // Validate the initialization vector length.
    if (iv.byteLength !== AES_GCM_IV_LENGTH / 8) {
      throw new TypeError(`The initialization vector must be ${AES_GCM_IV_LENGTH} bits in length`);
    }

    // Validate the tag length.
    if (tagLength && !AES_GCM_TAG_LENGTHS.includes(tagLength as any)) {
      throw new RangeError(`The tag length is invalid: Must be ${AES_GCM_TAG_LENGTHS.join(', ')} bits`);
    }

    // Get the Web Crypto API interface.
    const webCrypto = getWebcryptoSubtle();

    // Import the JWK into the Web Crypto API to use for the decrypt operation.
    const webCryptoKey = await webCrypto.importKey('jwk', key, { name: 'AES-GCM' }, true, ['decrypt']);

    // Note: Some browser implementations of the Web Crypto API throw an error if additionalData or
    // tagLength are undefined, so only include them in the algorithm object if they are defined.
    const algorithm = {
      name: 'AES-GCM',
      iv,
      ...(tagLength && { tagLength }),
      ...(additionalData && { additionalData})
    };

    // Decrypt the data.
    const plaintextBuffer = await webCrypto.decrypt(algorithm, webCryptoKey, data);

    // Convert from ArrayBuffer to Uint8Array.
    const plaintext = new Uint8Array(plaintextBuffer);

    return plaintext;
  }

  /**
   * Encrypts the provided data using AES-GCM.
   *
   * @remarks
   * This method performs AES-GCM encryption on the given data using the specified key.
   * It requires an initialization vector (IV), the encrypted data along with the decryption key,
   * and optionally, additional authenticated data (AAD). The method returns the encrypted data as a
   * Uint8Array. The optional `tagLength` parameter specifies the size in bits of the authentication
   * tag generated in the encryption operation and used for authentication in the corresponding
   * decryption. If not specified, the default tag length of 128 bits is used.
   *
   * @example
   * ```ts
   * const data = new TextEncoder().encode('Messsage');
   * const iv = new Uint8Array([...]); // Initialization vector
   * const additionalData = new Uint8Array([...]); // Optional additional authenticated data
   * const key = { ... }; // A Jwk object representing an AES key
   * const encryptedData = await AesGcm.encrypt({
   *   data,
   *   iv,
   *   additionalData,
   *   key,
   *   tagLength: 128 // Optional tag length in bits
   * });
   * ```
   *
   * @param params - The parameters for the encryption operation.
   * @param params.key - The key to use for encryption, represented in JWK format.
   * @param params.data - The data to encrypt, represented as a Uint8Array.
   * @param params.iv - The initialization vector, represented as a Uint8Array.
   * @param params.additionalData - Optional additional authenticated data. Optional.
   * @param params.tagLength - The length of the authentication tag in bits. Optional.
   *
   * @returns A Promise that resolves to the encrypted data as a Uint8Array.
   */
  public static async encrypt({ data, iv, key, additionalData, tagLength }: {
    key: Jwk;
    data: Uint8Array;
    iv: Uint8Array;
    additionalData?: Uint8Array;
    tagLength?: typeof AES_GCM_TAG_LENGTHS[number];
  }): Promise<Uint8Array> {
    // Validate the initialization vector length.
    if (iv.byteLength !== AES_GCM_IV_LENGTH / 8) {
      throw new TypeError(`The initialization vector must be ${AES_GCM_IV_LENGTH} bits in length`);
    }

    // Validate the tag length.
    if (tagLength && !AES_GCM_TAG_LENGTHS.includes(tagLength as any)) {
      throw new RangeError(`The tag length is invalid: Must be ${AES_GCM_TAG_LENGTHS.join(', ')} bits`);
    }

    // Get the Web Crypto API interface.
    const webCrypto = getWebcryptoSubtle();

    // Import the JWK into the Web Crypto API to use for the encrypt operation.
    const webCryptoKey = await webCrypto.importKey('jwk', key, { name: 'AES-GCM' }, true, ['encrypt']);

    // Note: Some browser implementations of the Web Crypto API throw an error if additionalData or
    // tagLength are undefined, so only include them in the algorithm object if they are defined.
    const algorithm = {
      name: 'AES-GCM',
      iv,
      ...(tagLength && { tagLength }),
      ...(additionalData && { additionalData})
    };

    // Encrypt the data.
    const ciphertextBuffer = await webCrypto.encrypt(algorithm, webCryptoKey, data);

    // Convert from ArrayBuffer to Uint8Array.
    const ciphertext = new Uint8Array(ciphertextBuffer);

    return ciphertext;
  }

  /**
   * Generates a symmetric key for AES in Galois/Counter Mode (GCM) in JSON Web Key (JWK) format.
   *
   * @remarks
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
    const webCryptoKey = await webCrypto.generateKey( { name: 'AES-GCM', length }, true, ['encrypt']);

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
      throw new Error(`AesGcm: The provided key is not a valid oct private key.`);
    }

    // Decode the provided private key to bytes.
    const privateKeyBytes = Convert.base64Url(privateKey.k).toUint8Array();

    return privateKeyBytes;
  }
}