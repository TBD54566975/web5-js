// ! TODO : Make sure I remove `@noble/ciphers` from the Agent package.json once this is moved to the `@web5/crypto` package.
import { getWebcryptoSubtle } from '@noble/ciphers/webcrypto/utils';

import type { DeriveKeyBytesParams } from '../types/params-direct.js';

/**
 * The object that should be passed into `Pbkdf2.deriveKeyBytes()`, when using the PBKDF2 algorithm.
 */
export interface Pbkdf2Params {
  /**
   * A string representing the digest algorithm to use. This may be one of:
   * - 'SHA-256'
   * - 'SHA-384'
   * - 'SHA-512'
   */
  hash: 'SHA-256' | 'SHA-384' | 'SHA-512';

  /**
   * The salt value to use in the derivation process, as a Uint8Array. This should be a random or
   * pseudo-random value of at least 16 bytes. Unlike the `password`, `salt` does not need to be
   * kept secret.
   */
  salt: Uint8Array;

  /**
   * A `Number` representing the number of iterations the hash function will be executed in
   * `deriveKey()`. This impacts the computational cost of the `deriveKey()` operation, making it
   * more resistant to dictionary attacks. The higher the number, the more secure, but also slower,
   * the operation. Choose a value that balances security needs and performance for your
   * application.
   */
  iterations: number;
}

/**
 * The `Pbkdf2` class provides a secure way to derive cryptographic keys from a password
 * using the PBKDF2 (Password-Based Key Derivation Function 2) algorithm.
 *
 * The PBKDF2 algorithm is widely used for generating keys from passwords, as it applies
 * a pseudorandom function to the input password along with a salt value and iterates the
 * process multiple times to increase the key's resistance to brute-force attacks.
 *
 * Notes:
 * - The `baseKeyBytes` that will be the input key material for PBKDF2 is expected to be a low-entropy
 *   value, such as a password or passphrase. It should be kept confidential.
 * - In 2023, {@link https://web.archive.org/web/20230123232056/https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#pbkdf2 | OWASP recommended}
 *   a minimum of 600,000 iterations for PBKDF2-HMAC-SHA256 and 210,000 for PBKDF2-HMAC-SHA512.
 *
 * @example
 * ```ts
 * // Key Derivation
 * const derivedKeyBytes = await Pbkdf2.deriveKeyBytes({
 *   baseKeyBytes: new TextEncoder().encode('password'), // The password as a Uint8Array
 *   hash: 'SHA-256', // The hash function to use ('SHA-256', 'SHA-384', 'SHA-512')
 *   salt: new Uint8Array([...]), // The salt value
 *   iterations: 600_000, // The number of iterations
 *   length: 256 // The length of the derived key in bits
 * });
 * ```
 *
 * @remarks
 * This class relies on the availability of the Web Crypto API.
 */
export class Pbkdf2 {
  /**
   * Derives a cryptographic key from a password using the PBKDF2 algorithm.
   *
   * @remarks
   * This method applies the PBKDF2 algorithm to the provided password along with
   * a salt value and iterates the process a specified number of times. It uses
   * a cryptographic hash function to enhance security and produce a key of the
   * desired length. The method is capable of utilizing either the Web Crypto API
   * or the Node.js Crypto module, depending on the environment's support.
   *
   * @example
   * ```ts
   * const derivedKeyBytes = await Pbkdf2.deriveKeyBytes({
   *   baseKeyBytes: new TextEncoder().encode('password'), // The password as a Uint8Array
   *   hash: 'SHA-256', // The hash function to use ('SHA-256', 'SHA-384', 'SHA-512')
   *   salt: new Uint8Array([...]), // The salt value
   *   iterations: 600_000, // The number of iterations
   *   length: 256 // The length of the derived key in bits
   * });
   * ```
   *
   * @param params - The parameters for key derivation.
   * @returns A Promise that resolves to the derived key as a byte array.
   */
  public static async deriveKeyBytes({ baseKeyBytes, hash, salt, iterations, length }:
    DeriveKeyBytesParams & Pbkdf2Params
  ): Promise<Uint8Array> {
    // Get the Web Crypto API interface.
    const webCrypto = getWebcryptoSubtle() as SubtleCrypto;

    // Import the password as a raw key for use with the Web Crypto API.
    const webCryptoKey = await webCrypto.importKey(
      'raw',              // key format is raw bytes
      baseKeyBytes,       // key data to import
      { name: 'PBKDF2' }, // algorithm identifier
      false,              // key is not extractable
      ['deriveBits']      // key usages
    );

    // Derive the bytes using the Web Crypto API.
    const derivedKeyBuffer = await webCrypto.deriveBits(
      { name: 'PBKDF2', hash, salt, iterations },
      webCryptoKey,
      length
    );

    // Convert from ArrayBuffer to Uint8Array.
    const derivedKeyBytes = new Uint8Array(derivedKeyBuffer);

    return derivedKeyBytes;
  }
}