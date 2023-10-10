import type { CHash } from '@noble/hashes/utils';

import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { sha384, sha512 } from '@noble/hashes/sha512';

/**
 * The `Hkdf` class provides an interface for HMAC-based Extract-and-Expand Key Derivation Function (HKDF)
 * as defined in RFC 5869.
 *
 * The class leverages the '@noble/hashes/hkdf' for the HKDF operations and utilizes
 * various hash functions from '@noble/hashes' to support multiple hash algorithms.
 *
 * The methods of this class are asynchronous and return Promises. They utilize the Uint8Array
 * type for input keying material, info, salt, and derived keys, ensuring a uniform interface
 * for binary data manipulation.
 *
 * Example usage:
 *
 * ```ts
 * const inputKeyingMaterial = new Uint8Array([...]);
 * const salt = new Uint8Array([...]);
 * const info = new Uint8Array([...]);
 * const derivedKey = await Hkdf.deriveKey({
 *   hash: 'SHA-256',
 *   inputKeyingMaterial,
 *   length: 32,
 *   salt,
 *   info
 * });
 * console.log(derivedKey);
 * ```
 */
export class Hkdf {
  /**
   * A private static field containing a map of hash algorithm names to their
   * corresponding hash functions.  The map is used in the 'deriveKey' method
   * to get the specified hash function.
   */
  private static readonly hashAlgorithms: Record<string, CHash> = {
    'SHA-256' : sha256,
    'SHA-384' : sha384,
    'SHA-512' : sha512,
  } as const;

  /**
   * Derives a key using the HMAC-based Extract-and-Expand Key Derivation Function (HKDF).
   *
   * This method generates a derived key from a given input keying material, using a hash function.
   * Optionally, it can also use a salt and info for the derivation process. The length of the
   * derived key can be specified.
   *
   * HKDF is useful in various cryptographic applications and protocols, especially when
   * there's a need to derive multiple keys from a single piece of key material.
   *
   * @param options - The options for the key derivation.
   * @param options.hash - The hash algorithm to use in the HKDF process.
   * @param options.inputKeyingMaterial - The source key material for the HKDF.
   * @param options.length - The desired byte-length of the derived key.
   * @param options.salt - An optional salt (non-secret random value) for the HKDF.
   * @param options.info - Optional application-specific information to use in the HKDF.
   *
   * @returns A Promise that resolves to the derived key as a Uint8Array.
   */
  public static async deriveKey(options: {
    hash: string,
    info?: string | Uint8Array,
    inputKeyingMaterial: string | Uint8Array,
    length: number,
    salt?: string | Uint8Array
  }): Promise<Uint8Array> {
    const { hash, info, inputKeyingMaterial, length, salt } = options;

    // Get the specified hash function.
    const hashFunction = this.hashAlgorithms[hash];

    /** Derive key material from the input keying material, and optionally,
     * salt and info values. */
    const outputKeyingMaterial = hkdf(hashFunction, inputKeyingMaterial, salt, info, length);

    return outputKeyingMaterial;
  }
}