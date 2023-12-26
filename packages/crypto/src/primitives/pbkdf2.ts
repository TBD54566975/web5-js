import { crypto } from '@noble/hashes/crypto';

import { isWebCryptoSupported } from '../utils.js';

type DeriveKeyParams = {
  hash: 'SHA-256' | 'SHA-384' | 'SHA-512';
  password: Uint8Array;
  salt: Uint8Array;
  iterations: number;
  length: number;
};

/**
 * The `Pbkdf2` class provides a secure way to derive cryptographic keys from a password
 * using the PBKDF2 (Password-Based Key Derivation Function 2) algorithm. This class
 * supports both the Web Crypto API and Node.js Crypto module to offer flexibility in
 * different JavaScript environments.
 *
 * The PBKDF2 algorithm is widely used for generating keys from passwords, as it applies
 * a pseudorandom function to the input password along with a salt value and iterates the
 * process multiple times to increase the key's resistance to brute-force attacks.
 *
 * This class offers a single static method `deriveKey` to perform key derivation. It
 * automatically chooses between Web Crypto and Node.js Crypto based on the runtime
 * environment's support.
 *
 * @example
 * ```ts
 * const options = {
 *   hash: 'SHA-256', // The hash function to use ('SHA-256', 'SHA-384', 'SHA-512')
 *   password: new TextEncoder().encode('password'), // The password as a Uint8Array
 *   salt: new Uint8Array([...]), // The salt value
 *   iterations: 1000, // The number of iterations
 *   length: 256 // The length of the derived key in bits
 * };
 * const derivedKey = await Pbkdf2.deriveKey(options);
 * ```
 *
 * @remarks
 * This class relies on the availability of the Web Crypto API or Node.js Crypto module.
 * It falls back to Node.js Crypto if Web Crypto is not supported in the environment.
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
   * const derivedKey = await Pbkdf2.deriveKey({
   *   hash: 'SHA-256',
   *   password: new TextEncoder().encode('password'),
   *   salt: new Uint8Array([...]),
   *   iterations: 1000,
   *   length: 256
   * });
   * ```
   *
   * @param params - The parameters for key derivation.
   * @param params.hash - The hash function to use, such as 'SHA-256', 'SHA-384', or 'SHA-512'.
   * @param params.password - The password from which to derive the key, represented as a Uint8Array.
   * @param params.salt - The salt value to use in the derivation process, as a Uint8Array.
   * @param params.iterations - The number of iterations to apply in the PBKDF2 algorithm.
   * @param params.length - The desired length of the derived key in bits.
   *
   * @returns A Promise that resolves to the derived key as a Uint8Array.
   */
  public static async deriveKey(params: DeriveKeyParams): Promise<Uint8Array> {
    if (isWebCryptoSupported()) {
      return Pbkdf2.deriveKeyWithWebCrypto(params);
    } else {
      return Pbkdf2.deriveKeyWithNodeCrypto(params);
    }
  }

  private static async deriveKeyWithNodeCrypto({ hash, iterations, length, password, salt }:
    DeriveKeyParams
  ): Promise<Uint8Array> {
    // Map the hash string to the node:crypto equivalent.
    const hashToNodeCryptoMap = {
      'SHA-256' : 'sha256',
      'SHA-384' : 'sha384',
      'SHA-512' : 'sha512'
    };
    const nodeHash = hashToNodeCryptoMap[hash];

    // Convert length from bits to bytes.
    const lengthInBytes = length / 8;

    // Dynamically import the `crypto` package.
    const { pbkdf2 } = await import('node:crypto');

    return new Promise((resolve) => {
      pbkdf2(
        password,
        salt,
        iterations,
        lengthInBytes,
        nodeHash,
        (err, derivedKey) => {
          if (!err) {
            resolve(new Uint8Array(derivedKey));
          }
        }
      );
    });
  }

  private static async deriveKeyWithWebCrypto({ hash, password, salt, iterations, length }:
    DeriveKeyParams
  ): Promise<Uint8Array> {
    // Import the password as a raw key for use with the Web Crypto API.
    const webCryptoKey = await crypto.subtle.importKey(
      'raw',
      password,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derivedKeyBuffer = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash, salt, iterations },
      webCryptoKey,
      length
    );

    // Convert from ArrayBuffer to Uint8Array.
    const derivedKey = new Uint8Array(derivedKeyBuffer);

    return derivedKey;
  }
}