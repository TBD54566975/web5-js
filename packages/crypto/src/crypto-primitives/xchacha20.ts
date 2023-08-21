import { xchacha20 } from '@noble/ciphers/chacha';

export class XChaCha20 {
  public static async decrypt(options: {
    data: Uint8Array,
    key: Uint8Array,
    nonce: Uint8Array
  }): Promise<Uint8Array> {
    const { data, key, nonce } = options;

    const ciphertext = xchacha20(key, nonce, data);

    return ciphertext;
  }

  public static async encrypt(options: {
    data: Uint8Array,
    key: Uint8Array,
    nonce: Uint8Array
  }): Promise<Uint8Array> {
    const { data, key, nonce } = options;

    const plaintext = xchacha20(key, nonce, data);

    return plaintext;
  }

  public static async generateKey(): Promise<Uint8Array> {
    // Generate the secret key.
    const secretKey = crypto.getRandomValues(new Uint8Array(32));

    return secretKey;
  }
}