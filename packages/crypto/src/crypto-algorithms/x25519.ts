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
}