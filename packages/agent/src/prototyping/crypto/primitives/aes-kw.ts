// ! TODO : Make sure I remove `@noble/ciphers` from the Agent package.json once this is moved to the `@web5/crypto` package.
import { getWebcryptoSubtle } from '@noble/ciphers/webcrypto/utils';

import type { Jwk } from '@web5/crypto';

import { Convert } from '@web5/common';
import { computeJwkThumbprint, isOctPrivateJwk } from '@web5/crypto';

import type { UnwrapKeyParams, WrapKeyParams } from '../types/params-direct.js';
import { CryptoError, CryptoErrorCode } from '../crypto-error.js';

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

export class AesKw {
  /**
   * Converts a raw private key in bytes to its corresponding JSON Web Key (JWK) format.
   *
   * @remarks
   * This method takes a symmetric key represented as a byte array (Uint8Array) and
   * converts it into a JWK object for use with AES (Advanced Encryption Standard)
   * for key wrapping. The conversion process involves encoding the key into
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
   * const privateKey = await AesKw.bytesToPrivateKey({ privateKeyBytes });
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

    // Add algorithm identifier based on key length.
    const lengthInBits = privateKeyBytes.length * 8;
    privateKey.alg = { 128: 'A128KW', 192: 'A192KW', 256: 'A256KW' }[lengthInBits];

    return privateKey;
  }

  /**
   * Generates a symmetric key for AES for key wrapping in JSON Web Key (JWK) format.
   *
   * @remarks
   * This method creates a new symmetric key of a specified length suitable for use with
   * AES key wrapping. It uses cryptographically secure random number generation to
   * ensure the uniqueness and security of the key. The generated key adheres to the JWK
   * format, making it compatible with common cryptographic standards and easy to use in
   * various cryptographic processes.
   *
   * The generated key includes the following components:
   * - `kty`: Key Type, set to 'oct' for Octet Sequence.
   * - `k`: The symmetric key component, base64url-encoded.
   * - `kid`: Key ID, generated based on the JWK thumbprint.
   * - `alg`: Algorithm, set to 'A128KW', 'A192KW', or 'A256KW' for AES Key Wrap with the
   *   specified key length.
   *
   * @example
   * ```ts
   * const length = 256; // Length of the key in bits (e.g., 128, 192, 256)
   * const privateKey = await AesKw.generateKey({ length });
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
    const webCrypto = getWebcryptoSubtle() as SubtleCrypto;

    // Generate a random private key.
    // See https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues#usage_notes for
    // an explanation for why Web Crypto generateKey() is used instead of getRandomValues().
    const webCryptoKey = await webCrypto.generateKey( { name: 'AES-KW', length }, true, ['wrapKey', 'unwrapKey']);

    // Export the private key in JWK format.
    const { ext, key_ops, ...privateKey } = await webCrypto.exportKey('jwk', webCryptoKey) as Jwk;

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
   * const privateKeyBytes = await AesKw.privateKeyToBytes({ privateKey });
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
      throw new Error(`AesKw: The provided key is not a valid oct private key.`);
    }

    // Decode the provided private key to bytes.
    const privateKeyBytes = Convert.base64Url(privateKey.k).toUint8Array();

    return privateKeyBytes;
  }

  public static async unwrapKey({ wrappedKeyBytes, wrappedKeyAlgorithm, decryptionKey }:
    UnwrapKeyParams
  ): Promise<Jwk> {
    if (!('alg' in decryptionKey && decryptionKey.alg)) {
      throw new CryptoError(CryptoErrorCode.InvalidJwk, `The decryption key is missing the 'alg' property.`);
    }

    if (!['A128KW', 'A192KW', 'A256KW'].includes(decryptionKey.alg)) {
      throw new CryptoError(CryptoErrorCode.AlgorithmNotSupported, `The 'decryptionKey' algorithm is not supported: ${decryptionKey.alg}`);
    }

    // Get the Web Crypto API interface.
    const webCrypto = getWebcryptoSubtle() as SubtleCrypto;

    // Import the decryption key for use with the Web Crypto API.
    const decryptionCryptoKey = await webCrypto.importKey(
      'jwk',                       // key format
      decryptionKey as JsonWebKey, // key data
      { name: 'AES-KW' },          // algorithm identifier
      true,                        // key is extractable
      ['unwrapKey']                // key usages
    );

    // Map the private key's JOSE algorithm name to the Web Crypto API algorithm identifier.
    const webCryptoAlgorithm = {
      A128KW  : 'AES-KW', A192KW  : 'AES-KW', A256KW  : 'AES-KW',
      A128GCM : 'AES-GCM', A192GCM : 'AES-GCM', A256GCM : 'AES-GCM',
    }[wrappedKeyAlgorithm];

    if (!webCryptoAlgorithm) {
      throw new CryptoError(CryptoErrorCode.AlgorithmNotSupported, `The 'wrappedKeyAlgorithm' is not supported: ${wrappedKeyAlgorithm}`);
    }

    // Unwrap the key using the Web Crypto API.
    const unwrappedCryptoKey = await webCrypto.unwrapKey(
      'raw',                        // output format
      wrappedKeyBytes.buffer,       // key to unwrap
      decryptionCryptoKey,          // unwrapping key
      'AES-KW',                     // algorithm identifier
      { name: webCryptoAlgorithm }, // unwrapped key algorithm identifier
      true,                         // key is extractable
      ['unwrapKey']                 // key usages
    );

    // Export the unwrapped key in JWK format.
    const { ext, key_ops, ...unwrappedJsonWebKey } = await webCrypto.exportKey('jwk', unwrappedCryptoKey);
    const unwrappedKey = unwrappedJsonWebKey as Jwk;

    // Compute the JWK thumbprint and set as the key ID.
    unwrappedKey.kid = await computeJwkThumbprint({ jwk: unwrappedKey });

    return unwrappedKey;
  }

  public static async wrapKey({ unwrappedKey, encryptionKey }:
    WrapKeyParams
  ): Promise<Uint8Array> {
    if (!('alg' in encryptionKey && encryptionKey.alg)) {
      throw new CryptoError(CryptoErrorCode.InvalidJwk, `The encryption key is missing the 'alg' property.`);
    }

    if (!['A128KW', 'A192KW', 'A256KW'].includes(encryptionKey.alg)) {
      throw new CryptoError(CryptoErrorCode.AlgorithmNotSupported, `The 'encryptionKey' algorithm is not supported: ${encryptionKey.alg}`);
    }

    if (!('alg' in unwrappedKey && unwrappedKey.alg)) {
      throw new CryptoError(CryptoErrorCode.InvalidJwk, `The private key to wrap is missing the 'alg' property.`);
    }

    // Get the Web Crypto API interface.
    const webCrypto = getWebcryptoSubtle() as SubtleCrypto;

    // Import the encryption key for use with the Web Crypto API.
    const encryptionCryptoKey = await webCrypto.importKey(
      'jwk',                       // key format
      encryptionKey as JsonWebKey, // key data
      { name: 'AES-KW' },          // algorithm identifier
      true,                        // key is extractable
      ['wrapKey']                  // key usages
    );

    // Map the private key's JOSE algorithm name to the Web Crypto API algorithm identifier.
    const webCryptoAlgorithm = {
      A128KW  : 'AES-KW', A192KW  : 'AES-KW', A256KW  : 'AES-KW',
      A128GCM : 'AES-GCM', A192GCM : 'AES-GCM', A256GCM : 'AES-GCM',
    }[unwrappedKey.alg];

    if (!webCryptoAlgorithm) {
      throw new CryptoError(CryptoErrorCode.AlgorithmNotSupported, `The 'unwrappedKey' algorithm is not supported: ${unwrappedKey.alg}`);
    }

    // Import the private key to wrap for use with the Web Crypto API.
    const unwrappedCryptoKey = await webCrypto.importKey(
      'jwk',                        // key format
      unwrappedKey as JsonWebKey,   // key data
      { name: webCryptoAlgorithm }, // algorithm identifier
      true,                         // key is extractable
      ['unwrapKey']                 // key usages
    );

    // Wrap the key using the Web Crypto API.
    const wrappedKeyBuffer = await webCrypto.wrapKey(
      'raw',                     // output format
      unwrappedCryptoKey,        // key to wrap
      encryptionCryptoKey,       // wrapping key
      'AES-KW'                   // algorithm identifier
    );

    // Convert from ArrayBuffer to Uint8Array.
    const wrappedKeyBytes = new Uint8Array(wrappedKeyBuffer);

    return wrappedKeyBytes;
  }
}