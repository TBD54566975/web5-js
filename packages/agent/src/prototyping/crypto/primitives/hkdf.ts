// ! TODO : Make sure I remove `@noble/ciphers` from the Agent package.json once this is moved to the `@web5/crypto` package.
import { getWebcryptoSubtle } from '@noble/ciphers/webcrypto/utils';

import { Convert } from '@web5/common';
import { DeriveKeyBytesParams } from '../types/params-direct.js';

/**
 * The object that should be passed into `Hkdf.deriveKey()`, when using the HKDF algorithm.
 */
export type HkdfParams = {
  /**
   * A string representing the digest algorithm to use. This may be one of:
   * - 'SHA-256'
   * - 'SHA-384'
   * - 'SHA-512'
   */
  hash: 'SHA-256' | 'SHA-384' | 'SHA-512';

  /**
   * The salt value to use in the derivation process.
   *
   * Ideally, the salt is a random or pseudo-random value with the same length as the output of the
   * digest function. Unlike the input key material passed into deriveKey(), salt does not need to
   * be kept secret.
   *
   * Note: The {@link https://datatracker.ietf.org/doc/html/rfc5869 | HKDF specification} states
   *       that adding salt "adds significantly to the strength of HKDF".
   */
  salt: string | Uint8Array;

  /**
   * Optional application-specific information to use in the HKDF.
   *
   * If given, this value is used to bind the derived key to application-specific contextual
   * information. This makes it possible to derive different keys for different contexts while using
   * the same input key material.
   *
   * If not provided, the `info` value is set to an empty array.
   *
   * Note: It is important that the `info` value be independent and unrelated to the input key
   * material.
   */
  info?: string | Uint8Array,
};

/**
 * The `Hkdf` class provides an interface for HMAC-based Extract-and-Expand Key Derivation Function (HKDF)
 * as defined in RFC 5869.
 *
 * Note: The `baseKeyBytes` that will be the input key material for HKDF should be a high-entropy secret
 * value, such as a cryptographic key. It should be kept confidential and not be derived from a
 * low-entropy value, such as a password.
 *
 * @example
 * ```ts
 * const info = new Uint8Array([...]);
 * const derivedKeyBytes = await Hkdf.deriveKeyBytes({
 *   baseKeyBytes: new Uint8Array([...]), // Input keying material
 *   hash: 'SHA-256', // The hash function to use ('SHA-256', 'SHA-384', 'SHA-512')
 *   salt: new Uint8Array([...]), // The salt value
 *   info: new Uint8Array([...]), // Optional application-specific information
 *   length: 256 // The length of the derived key in bits
 * });
 * ```
 */
export class Hkdf {
  /**
   * Derives a key using the HMAC-based Extract-and-Expand Key Derivation Function (HKDF).
   *
   * This method generates a derived key using a hash function from input keying material given as
   * `baseKeyBytes`. The length of the derived key can be specified. Optionally, it can also use a salt
   * and info for the derivation process.
   *
   * HKDF is useful in various cryptographic applications and protocols, especially when
   * there's a need to derive multiple keys from a single source of key material.
   *
   * Note: The `baseKeyBytes` that will be the input key material for HKDF should be a high-entropy
   * secret value, such as a cryptographic key. It should be kept confidential and not be derived
   * from a low-entropy value, such as a password.
   *
   * @example
   * ```ts
   * const info = new Uint8Array([...]);
   * const derivedKeyBytes = await Hkdf.deriveKeyBytes({
   *   baseKeyBytes: new Uint8Array([...]), // Input keying material
   *   hash: 'SHA-256', // The hash function to use ('SHA-256', 'SHA-384', 'SHA-512')
   *   salt: new Uint8Array([...]), // The salt value
   *   info: new Uint8Array([...]), // Optional application-specific information
   *   length: 256 // The length of the derived key in bits
   * });
   * ```
   *
   * @param params - The parameters for key derivation.
   * @returns A Promise that resolves to the derived key as a byte array.
   */
  public static async deriveKeyBytes({ baseKeyBytes, length, hash, salt, info = new Uint8Array() }:
    DeriveKeyBytesParams & HkdfParams
  ): Promise<Uint8Array> {
    // Get the Web Crypto API interface.
    const webCrypto = getWebcryptoSubtle() as SubtleCrypto;

    // Import the baseKeyBytes into the Web Crypto API to use for the key derivation operation.
    const webCryptoKey = await webCrypto.importKey('raw', baseKeyBytes, { name: 'HKDF' }, false, ['deriveBits']);

    // Convert the salt and info to Uint8Array if they are provided as strings.
    salt = typeof salt === 'string' ? Convert.string(salt).toUint8Array() : salt;
    info = typeof info === 'string' ? Convert.string(info).toUint8Array() : info;

    // Derive the bytes using the Web Crypto API.
    const derivedKeyBuffer = await crypto.subtle.deriveBits(
      { name: 'HKDF', hash, salt, info },
      webCryptoKey,
      length
    );

    // Convert from ArrayBuffer to Uint8Array.
    const derivedKeyBytes = new Uint8Array(derivedKeyBuffer);

    return derivedKeyBytes;
  }
}