import type { BufferKeyPair } from '../types-key-manager.js';

import { x25519 } from '@noble/curves/ed25519';

import { Convert } from '../common/convert.js';

export class X25519 {
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

  public static async getPublicKey(
    options: { privateKey: ArrayBuffer }
  ): Promise<ArrayBuffer> {
    let { privateKey } = options;

    // Convert key material from ArrayBuffer to Uint8Array.
    const privateKeyU8A = Convert.arrayBuffer(privateKey).toUint8Array();

    // Compute public key.
    const publicKey  = x25519.getPublicKey(privateKeyU8A);

    return publicKey;
  }

  /**
   * Generates a RFC6090 ECDH shared secret given the private key of one party
   * and the public key another party.
   */
  public static async sharedSecret(
    options: { privateKey: ArrayBuffer, publicKey: ArrayBuffer }
  ): Promise<ArrayBuffer> {
    let { privateKey, publicKey } = options;

    // Convert private and public key material from ArrayBuffer to Uint8Array.
    const privateKeyU8A = Convert.arrayBuffer(privateKey).toUint8Array();
    const publicKeyU8A = Convert.arrayBuffer(publicKey).toUint8Array();

    const sharedSecret = x25519.getSharedSecret(privateKeyU8A, publicKeyU8A);

    return sharedSecret.buffer;
  }
}