import { Convert } from '@tbd54566975/common';
import { xchacha20 } from '@noble/ciphers/chacha';

export class XChaCha20 {
  public static async decrypt(options: {
    data: BufferSource,
    key: ArrayBuffer,
    nonce: BufferSource
  }): Promise<ArrayBuffer> {
    const { data, key, nonce } = options;

    // Convert data, key material, and nonce to Uint8Array.
    const dataU8A = Convert.bufferSource(data).toUint8Array();
    const keyU8A = Convert.arrayBuffer(key).toUint8Array();
    const nonceU8A = Convert.bufferSource(nonce).toUint8Array();

    const ciphertext = xchacha20(keyU8A, nonceU8A, dataU8A);

    return ciphertext.buffer;
  }

  public static async encrypt(options: {
    data: BufferSource,
    key: ArrayBuffer,
    nonce: BufferSource
  }): Promise<ArrayBuffer> {
    const { data, key, nonce } = options;

    // Convert data, key material, and nonce to Uint8Array.
    const dataU8A = Convert.bufferSource(data).toUint8Array();
    const keyU8A = Convert.arrayBuffer(key).toUint8Array();
    const nonceU8A = Convert.bufferSource(nonce).toUint8Array();

    const plaintext = xchacha20(keyU8A, nonceU8A, dataU8A);

    return plaintext.buffer;
  }

  public static async generateKey(): Promise<ArrayBuffer> {
    // Generate the secret key.
    const secretKey = crypto.getRandomValues(new Uint8Array(32));

    return secretKey.buffer;
  }
}