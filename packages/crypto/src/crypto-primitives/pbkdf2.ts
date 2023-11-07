import { crypto } from '@noble/hashes/crypto';

import { isWebCryptoSupported } from '../utils.js';

type DeriveKeyOptions = {
  hash: 'SHA-256' | 'SHA-384' | 'SHA-512',
  password: Uint8Array,
  salt: Uint8Array,
  iterations: number,
  length: number
};

export class Pbkdf2 {
  public static async deriveKey(options: DeriveKeyOptions): Promise<Uint8Array> {
    if (isWebCryptoSupported()) {
      return Pbkdf2.deriveKeyWithWebCrypto(options);
    } else {
      return Pbkdf2.deriveKeyWithNodeCrypto(options);
    }
  }

  private static async deriveKeyWithNodeCrypto(options: DeriveKeyOptions): Promise<Uint8Array> {
    const { password, salt, iterations } = options;

    // Map the hash string to the node:crypto equivalent.
    const hashToNodeCryptoMap = {
      'SHA-256' : 'sha256',
      'SHA-384' : 'sha384',
      'SHA-512' : 'sha512'
    };
    const hash = hashToNodeCryptoMap[options.hash];

    // Convert length from bits to bytes.
    const length = options.length / 8;

    // Dynamically import the `crypto` package.
    const { pbkdf2 } = await import('node:crypto');

    return new Promise((resolve) => {
      pbkdf2(
        password,
        salt,
        iterations,
        length,
        hash,
        (err, derivedKey) => {
          if (!err) {
            resolve(new Uint8Array(derivedKey));
          }
        }
      );
    });
  }

  private static async deriveKeyWithWebCrypto(options: DeriveKeyOptions): Promise<Uint8Array> {
    const { hash, password, salt, iterations, length } = options;

    // Import the password as a raw key for use with the Web Crypto API.
    const webCryptoKey = await crypto.subtle.importKey(
      'raw',
      password,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derivedKeyBuffer = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash, salt, iterations },
      webCryptoKey,
      length
    );

    // Convert from ArrayBuffer to Uint8Array.
    const derivedKey = new Uint8Array(derivedKeyBuffer);

    return derivedKey;
  }
}