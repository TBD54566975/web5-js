import type { BufferKeyPair } from '../types-key-manager.js';

import * as secp256k1 from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';

import { Convert } from '../common/convert.js';

export type HashFunction = (data: Uint8Array) => Uint8Array;

/**
 * The `Secp256k1` class provides an interface for generating secp256k1 key pairs,
 * computing public keys from private keys, and signing and verifying messages.
 *
 * The class uses the '@noble/secp256k1' package for the cryptographic operations,
 * and the '@noble/hashes/sha256' package for generating the hash digests needed
 * for the signing and verification operations.
 *
 * The methods of this class are all asynchronous and return Promises. They all use
 * the ArrayBuffer type for keys, signatures, and data, providing a consistent
 * interface for working with binary data.
 *
 * Example usage:
 *
 * ```ts
 * const keyPair = await Secp256k1.generateKeyPair();
 * const message = new TextEncoder().encode('Hello, world!');
 * const signature = await Secp256k1.sign({
 *   algorithm: { hash: 'SHA-256' },
 *   key: keyPair.privateKey,
 *   data: message
 * });
 * const isValid = await Secp256k1.verify({
 *   algorithm: { hash: 'SHA-256' },
 *   key: keyPair.publicKey,
 *   signature,
 *   data: message
 * });
 * console.log(isValid); // true
 * ```
 */
export class Secp256k1 {
  /**
   * A private static field containing a map of hash algorithm names to their
   * corresponding hash functions.  The map is used in the 'sign' and 'verify'
   * methods to get the specified hash function.
   */
  static #hashAlgorithms: Record<string, HashFunction> = {
    'SHA-256': sha256
  };

  /**
   * Generates a secp256k1 key pair.
   *
   * @param options - Optional parameters for the key generation.
   * @param options.compressedPublicKey - If true, generates a compressed public key. Defaults to true.
   * @returns A Promise that resolves to an object containing the private and public keys as ArrayBuffers.
   */
  public static async generateKeyPair(
    options?: { compressedPublicKey?: boolean }
  ): Promise<BufferKeyPair> {
    let { compressedPublicKey } = options ?? { };

    compressedPublicKey ??= true; // Default to compressed public key, matching the default of @noble/secp256k1.

    // Generate the private key and compute its public key.
    const privateKey = secp256k1.utils.randomPrivateKey();
    const publicKey  = secp256k1.getPublicKey(privateKey, compressedPublicKey);

    const keyPair = {
      privateKey : privateKey.buffer,
      publicKey  : publicKey.buffer
    };

    return keyPair;
  }

  /**
   * Computes the public key from a given private key.
   * If compressedPublicKey=true then the output is a 33-byte public key.
   * If compressedPublicKey=false then the output is a 65-byte public key.
   *
   * @param options - The options for the public key computation.
   * @param options.privateKey - The 32-byte private key from which to compute the public key.
   * @param options.compressedPublicKey - If true, returns a compressed public key. Defaults to true.
   * @returns A Promise that resolves to the computed public key as an ArrayBuffer.
   */
  public static async getPublicKey(
    options: { privateKey: ArrayBuffer, compressedPublicKey?: boolean }
  ): Promise<ArrayBuffer> {
    let { privateKey, compressedPublicKey } = options;

    compressedPublicKey ??= true; // Default to compressed public key, matching the default of @noble/secp256k1.

    // Convert key material from ArrayBuffer to Uint8Array.
    const privateKeyU8A = Convert.arrayBuffer(privateKey).toUint8Array();

    // Compute public key.
    const publicKey  = secp256k1.getPublicKey(privateKeyU8A, compressedPublicKey);

    return publicKey;
  }

  /**
   * Generates a RFC6979 ECDSA signature of given data with a given private key and hash algorithm.
   *
   * @param options - The options for the signing operation.
   * @param options.algorithm - The hash algorithm to use to generate a digest of the data.
   * @param options.key - The private key to use for signing.
   * @param options.data - The data to sign.
   * @returns A Promise that resolves to the signature as an ArrayBuffer.
   */
  public static async sign(
    options: { algorithm: { hash: string }, key: ArrayBuffer, data: BufferSource }
  ): Promise<ArrayBuffer> {
    const { algorithm, key, data } = options;

    // Convert data from BufferSource to Uint8Array.
    const dataU8A = Convert.bufferSource(data).toUint8Array();

    // Generate a digest of the data using the specified hash function.
    const hashFunction = this.#hashAlgorithms[algorithm.hash];
    const digest = hashFunction(dataU8A);

    // Convert private key material from ArrayBuffer to Uint8Array.
    const privateKeyU8A = Convert.arrayBuffer(key).toUint8Array();

    // Signature operation returns a Signature instance with { r, s, recovery } properties.
    const signatureObject = await secp256k1.signAsync(digest, privateKeyU8A);

    // Convert Signature object to Uint8Array.
    const signatureU8A = signatureObject.toCompactRawBytes();

    return signatureU8A.buffer;
  }

  /**
   * Verifies a RFC6979 ECDSA signature of given data with a given public key and hash algorithm.
   *
   * @param options - The options for the verification operation.
   * @param options.algorithm - The hash algorithm to use to generate a digest of the data.
   * @param options.key - The public key to use for verification.
   * @param options.signature - The signature to verify.
   * @param options.data - The data that was signed.
   * @returns A Promise that resolves to a boolean indicating whether the signature is valid.
   */
  public static async verify(
    options: { algorithm: { hash: string }, key: ArrayBuffer, signature: ArrayBuffer, data: BufferSource }
  ): Promise<boolean> {
    const { algorithm, key, signature, data } = options;

    // Convert public key material from ArrayBuffer to Uint8Array.
    const publicKeyU8A = Convert.arrayBuffer(key).toUint8Array();

    // Convert signature from ArrayBuffer to Uint8Array.
    const signatureU8A = Convert.arrayBuffer(signature).toUint8Array();

    // Convert data from BufferSource to Uint8Array.
    const dataU8A = Convert.bufferSource(data).toUint8Array();

    // Generate a digest of the data using the specified hash function.
    const hashFunction = this.#hashAlgorithms[algorithm.hash];
    const digest = hashFunction(dataU8A);

    // Verify operation.
    const isValid = secp256k1.verify(signatureU8A, digest, publicKeyU8A);

    return isValid;
  }
}