import type { BufferKeyPair } from '../types/index.js';

import { Convert } from '@tbd54566975/common';
import { ed25519 } from '@noble/curves/ed25519';

/**
 * The `Ed25519` class provides an interface for generating Ed25519 key pairs,
 * computing public keys from private keys, and signing and verifying messages.
 *
 * The class uses the '@noble/curves' package for the cryptographic operations.
 *
 * The methods of this class are all asynchronous and return Promises. They all use
 * the ArrayBuffer type for keys, signatures, and data, providing a consistent
 * interface for working with binary data.
 *
 * Example usage:
 *
 * ```ts
 * const keyPair = await Ed25519.generateKeyPair();
 * const message = new TextEncoder().encode('Hello, world!');
 * const signature = await Ed25519.sign({
 *   key: keyPair.privateKey,
 *   data: message
 * });
 * const isValid = await Ed25519.verify({
 *   key: keyPair.publicKey,
 *   signature,
 *   data: message
 * });
 * console.log(isValid); // true
 * ```
 */
export class Ed25519 {
  /**
   * Generates an Ed25519 key pair.
   *
   * @returns A Promise that resolves to an object containing the private and public keys as ArrayBuffers.
   */
  public static async generateKeyPair(): Promise<BufferKeyPair> {
    // Generate the private key and compute its public key.
    const privateKey = ed25519.utils.randomPrivateKey();
    const publicKey  = ed25519.getPublicKey(privateKey);

    const keyPair = {
      privateKey : privateKey.buffer,
      publicKey  : publicKey.buffer
    };

    return keyPair;
  }

  /**
   * Computes the public key from a given private key.
   *
   * @param options - The options for the public key computation.
   * @param options.privateKey - The 32-byte private key from which to compute the public key.
   * @returns A Promise that resolves to the computed 32-byte public key as an ArrayBuffer.
   */
  public static async getPublicKey(options: {
    privateKey: ArrayBuffer
  }): Promise<ArrayBuffer> {
    let { privateKey } = options;

    // Convert key material from ArrayBuffer to Uint8Array.
    const privateKeyU8A = Convert.arrayBuffer(privateKey).toUint8Array();

    // Compute public key.
    const publicKey  = ed25519.getPublicKey(privateKeyU8A);

    return publicKey;
  }

  /**
   * Generates a RFC8032 EdDSA signature of given data with a given private key.
   *
   * @param options - The options for the signing operation.
   * @param options.key - The private key to use for signing.
   * @param options.data - The data to sign.
   * @returns A Promise that resolves to the signature as an ArrayBuffer.
   */
  public static async sign(options: {
    data: BufferSource,
    key: ArrayBuffer
  }): Promise<ArrayBuffer> {
    const { key, data } = options;

    // Convert data from BufferSource to Uint8Array.
    const dataU8A = Convert.bufferSource(data).toUint8Array();

    // Convert private key material from ArrayBuffer to Uint8Array.
    const privateKeyU8A = Convert.arrayBuffer(key).toUint8Array();

    // Signature operation.
    const signatureU8A = ed25519.sign(dataU8A, privateKeyU8A);

    return signatureU8A.buffer;
  }

  /**
   * Verifies a RFC8032 EdDSA signature of given data with a given public key.
   *
   * @param options - The options for the verification operation.
   * @param options.key - The public key to use for verification.
   * @param options.signature - The signature to verify.
   * @param options.data - The data that was signed.
   * @returns A Promise that resolves to a boolean indicating whether the signature is valid.
   */
  public static async verify(options: {
    data: BufferSource,
    key: ArrayBuffer,
    signature: ArrayBuffer
  }): Promise<boolean> {
    const { key, signature, data } = options;

    // Convert public key material from ArrayBuffer to Uint8Array.
    const publicKeyU8A = Convert.arrayBuffer(key).toUint8Array();

    // Convert signature from ArrayBuffer to Uint8Array.
    const signatureU8A = Convert.arrayBuffer(signature).toUint8Array();

    // Convert data from BufferSource to Uint8Array.
    const dataU8A = Convert.bufferSource(data).toUint8Array();

    // Verify operation.
    const isValid = ed25519.verify(signatureU8A, dataU8A, publicKeyU8A);

    return isValid;
  }
}