import { xchacha20poly1305 } from '@noble/ciphers/chacha';

export class XChaCha20Poly1305 {

  public static readonly TAG_LENGTH = 16;

  public static async decrypt(options: {
    additionalData?: Uint8Array,
    data: Uint8Array,
    key: Uint8Array,
    nonce: Uint8Array
  }): Promise<Uint8Array> {
    const { additionalData, data, key, nonce } = options;

    const xc20p = xchacha20poly1305(key, nonce, additionalData);
    const plaintext = xc20p.decrypt(data);

    return plaintext;
  }

  public static async encrypt(options: {
    additionalData?: Uint8Array,
    data: Uint8Array,
    key: Uint8Array,
    nonce: Uint8Array
  }): Promise<Uint8Array> {
    const { additionalData, data, key, nonce } = options;

    const xc20p = xchacha20poly1305(key, nonce, additionalData);
    const ciphertext = xc20p.encrypt(data);

    return ciphertext;
  }

  public static async generateKey(): Promise<Uint8Array> {
    // Generate the secret key.
    const secretKey = crypto.getRandomValues(new Uint8Array(32));

    return secretKey;
  }
}