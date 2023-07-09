import type { BufferKeyPair } from '../types/index.js';

import { Convert } from '@tbd54566975/common';
import { x25519 } from '@noble/curves/ed25519';

/**
 * The `X25519` class provides an interface for X25519 (Curve25519) key pair
 * generation, public key computation, and shared secret computation. The class
 * uses the '@noble/curves/ed25519' package for the cryptographic operations.
 *
 * All methods of this class are asynchronous and return Promises. They all use
 * the ArrayBuffer type for keys and data, providing a consistent
 * interface for working with binary data.
 *
 * Example usage:
 *
 * ```ts
 * const ownKeyPair = await X25519.generateKeyPair();
 * const otherPartyKeyPair = await X25519.generateKeyPair();
 * const sharedSecret = await X25519.sharedSecret({
 *   privateKey : ownKeyPair.privateKey,
 *   publicKey  : otherPartyKeyPair.publicKey
 * });
 * ```
 */
export class X25519 {
  /**
   * Generates a key pair for X25519 (private and public key).
   *
   * @returns A Promise that resolves to a BufferKeyPair object.
   */
  public static async generateKeyPair(): Promise<BufferKeyPair> {
    // Generate the private key and compute its public key.
    const privateKey = x25519.utils.randomPrivateKey();
    const publicKey  = x25519.getPublicKey(privateKey);

    const keyPair = {
      privateKey : privateKey.buffer,
      publicKey  : publicKey.buffer
    };

    return keyPair;
  }

  /**
   * Computes a public key given a private key.
   *
   * @param options - The options for the public key computation operation.
   * @param options.privateKey - The private key used to compute the public key.
   * @returns A Promise that resolves to the computed public key as an ArrayBuffer.
   */
  public static async getPublicKey(options: {
    privateKey: ArrayBuffer
  }): Promise<ArrayBuffer> {
    let { privateKey } = options;

    // Convert key material from ArrayBuffer to Uint8Array.
    const privateKeyU8A = Convert.arrayBuffer(privateKey).toUint8Array();

    // Compute public key.
    const publicKey  = x25519.getPublicKey(privateKeyU8A);

    return publicKey;
  }

  /**
   * Generates a RFC6090 ECDH shared secret given the private key of one party
   * and the public key of another party.
   *
   * @param options - The options for the shared secret computation operation.
   * @param options.privateKey - The private key of one party.
   * @param options.publicKey - The public key of the other party.
   * @returns A Promise that resolves to the computed shared secret as an ArrayBuffer.
   */
  public static async sharedSecret(options: {
    privateKey: ArrayBuffer,
    publicKey: ArrayBuffer
  }): Promise<ArrayBuffer> {
    let { privateKey, publicKey } = options;

    // Convert private and public key material from ArrayBuffer to Uint8Array.
    const privateKeyU8A = Convert.arrayBuffer(privateKey).toUint8Array();
    const publicKeyU8A = Convert.arrayBuffer(publicKey).toUint8Array();

    const sharedSecret = x25519.getSharedSecret(privateKeyU8A, publicKeyU8A);

    return sharedSecret.buffer;
  }
}