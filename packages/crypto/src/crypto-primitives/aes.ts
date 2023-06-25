import { crypto } from '@noble/hashes/crypto';

export class Aes {
  public static async generateKey(byteLength: number): Promise<ArrayBuffer> {
    // Generate the secret key.
    const secretKey = crypto.getRandomValues(new Uint8Array(byteLength));

    return secretKey.buffer;
  }
}