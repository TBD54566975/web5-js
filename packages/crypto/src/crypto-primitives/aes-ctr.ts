import { crypto } from '@noble/hashes/crypto';

export class AesCtr {
  public static async decrypt(options: {
    counter: BufferSource,
    data: BufferSource,
    key: ArrayBuffer,
    length: number
  }): Promise<ArrayBuffer> {
    const { counter, data, key, length } = options;

    const webCryptoKey = await this.#importKey(key);

    const ciphertext = await crypto.subtle.decrypt(
      { name: 'AES-CTR', counter, length },
      webCryptoKey,
      data
    );

    return ciphertext;
  }

  public static async encrypt(options: {
    counter: BufferSource,
    data: BufferSource,
    key: ArrayBuffer,
    length: number
  }): Promise<ArrayBuffer> {
    const { counter, data, key, length } = options;

    const webCryptoKey = await this.#importKey(key);

    const plaintext = await crypto.subtle.encrypt(
      { name: 'AES-CTR', counter, length },
      webCryptoKey,
      data
    );

    return plaintext;
  }

  public static async generateKey(byteLength: number): Promise<ArrayBuffer> {
    // Generate the secret key.
    const secretKey = crypto.getRandomValues(new Uint8Array(byteLength));

    return secretKey.buffer;
  }

  static async #importKey(key: ArrayBuffer): Promise<CryptoKey> {
    return crypto.subtle.importKey(
      'raw',
      key,
      { name: 'AES-CTR', length: key.byteLength * 8 },
      true,
      ['encrypt', 'decrypt']
    );
  }
}