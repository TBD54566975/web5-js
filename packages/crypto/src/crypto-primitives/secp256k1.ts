import type { BufferKeyPair } from '../types/index.js';

import { Convert } from '@tbd54566975/common';
import { sha256 } from '@noble/hashes/sha256';
import { secp256k1 } from '@noble/curves/secp256k1';

export type HashFunction = (data: Uint8Array) => Uint8Array;

/**
 * The `Secp256k1` class provides an interface for generating secp256k1 key pairs,
 * computing public keys from private keys, generating shaerd secrets, and
 * signing and verifying messages.
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
   * Generates a RFC6090 ECDH shared secret given the private key of one party
   * and the public key another party.
   *
   * Note: When performing Elliptic Curve Diffie-Hellman (ECDH) key agreement,
   * the resulting shared secret is a point on the elliptic curve, which
   * consists of an x-coordinate and a y-coordinate. With a 256-bit curve like
   * secp256k1, each of these coordinates is 32 bytes (256 bits) long. However,
   * in the ECDH process, it's standard practice to use only the x-coordinate
   * of the shared secret point as the resulting shared key. This is because
   * the y-coordinate does not add to the entropy of the key, and both parties
   * can independently compute the x-coordinate, so using just the x-coordinate
   * simplifies matters.
   */
  public static async sharedSecret(options: {
    compressedSecret?: boolean,
    privateKey: ArrayBuffer,
    publicKey: ArrayBuffer
  }): Promise<ArrayBuffer> {
    let { privateKey, publicKey } = options;

    // Convert private and public key material from ArrayBuffer to Uint8Array.
    const privateKeyU8A = Convert.arrayBuffer(privateKey).toUint8Array();
    const publicKeyU8A = Convert.arrayBuffer(publicKey).toUint8Array();

    // Compute the shared secret between the public and private keys.
    const sharedSecret = secp256k1.getSharedSecret(privateKeyU8A, publicKeyU8A);

    // Remove the leading byte that indicates the sign of the y-coordinate
    // of the point on the elliptic curve.  See note above.
    return sharedSecret.slice(1).buffer;
  }

  /**
   * Generates a RFC6979 ECDSA signature of given data with a given private key and hash algorithm.
   *
   * @param options - The options for the signing operation.
   * @param options.data - The data to sign.
   * @param options.hash - The hash algorithm to use to generate a digest of the data.
   * @param options.key - The private key to use for signing.
   * @returns A Promise that resolves to the signature as an ArrayBuffer.
   */
  public static async sign(options: {
    data: BufferSource,
    hash: string,
    key: ArrayBuffer
  }): Promise<ArrayBuffer> {
    const { data, hash, key } = options;

    // Convert data from BufferSource to Uint8Array.
    const dataU8A = Convert.bufferSource(data).toUint8Array();

    // Generate a digest of the data using the specified hash function.
    const hashFunction = this.#hashAlgorithms[hash];
    const digest = hashFunction(dataU8A);

    // Convert private key material from ArrayBuffer to Uint8Array.
    const privateKeyU8A = Convert.arrayBuffer(key).toUint8Array();

    // Signature operation returns a Signature instance with { r, s, recovery } properties.
    const signatureObject = secp256k1.sign(digest, privateKeyU8A);

    // Convert Signature object to Uint8Array.
    const signatureU8A = signatureObject.toCompactRawBytes();

    return signatureU8A.buffer;
  }

  /**
   * Verifies a RFC6979 ECDSA signature of given data with a given public key and hash algorithm.
   *
   * @param options - The options for the verification operation.
   * @param options.data - The data that was signed.
   * @param options.hash - The hash algorithm to use to generate a digest of the data.
   * @param options.key - The public key to use for verification.
   * @param options.signature - The signature to verify.
   * @returns A Promise that resolves to a boolean indicating whether the signature is valid.
   */
  public static async verify(options: {
    data: BufferSource,
    hash: string,
    key: ArrayBuffer,
    signature: ArrayBuffer
  }): Promise<boolean> {
    const { data, hash, key, signature } = options;

    // Convert public key material from ArrayBuffer to Uint8Array.
    const publicKeyU8A = Convert.arrayBuffer(key).toUint8Array();

    // Convert signature from ArrayBuffer to Uint8Array.
    const signatureU8A = Convert.arrayBuffer(signature).toUint8Array();

    // Convert data from BufferSource to Uint8Array.
    const dataU8A = Convert.bufferSource(data).toUint8Array();

    // Generate a digest of the data using the specified hash function.
    const hashFunction = this.#hashAlgorithms[hash];
    const digest = hashFunction(dataU8A);

    // Verify operation.
    const isValid = secp256k1.verify(signatureU8A, digest, publicKeyU8A);

    return isValid;
  }
}