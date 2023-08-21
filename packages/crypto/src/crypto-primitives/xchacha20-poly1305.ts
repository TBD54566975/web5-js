import { xchacha20_poly1305 } from '@noble/ciphers/chacha';

const TAG_LENGTH = 16;

export class XChaCha20Poly1305 {

  public static async decrypt(options: {
    additionalData?: Uint8Array,
    data: Uint8Array,
    key: Uint8Array,
    nonce: Uint8Array,
    tag: Uint8Array
  }): Promise<Uint8Array> {
    const { additionalData, data, key, nonce, tag } = options;

    const xc20p = xchacha20_poly1305(key, nonce, additionalData);
    const ciphertext = new Uint8Array([...data, ...tag]);
    const plaintext = xc20p.decrypt(ciphertext);

    return plaintext;
  }

  public static async encrypt(options: {
    additionalData?: Uint8Array,
    data: Uint8Array,
    key: Uint8Array,
    nonce: Uint8Array
  }): Promise<{ ciphertext: Uint8Array, tag: Uint8Array }> {
    const { additionalData, data, key, nonce } = options;

    const xc20p = xchacha20_poly1305(key, nonce, additionalData);
    const cipherOutput = xc20p.encrypt(data);

    const ciphertext = cipherOutput.subarray(0, -TAG_LENGTH);
    const tag = cipherOutput.subarray(-TAG_LENGTH);

    return { ciphertext, tag };
  }

  public static async generateKey(): Promise<Uint8Array> {
    // Generate the secret key.
    const secretKey = crypto.getRandomValues(new Uint8Array(32));

    return secretKey;
  }
}