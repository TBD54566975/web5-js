import type { JoseHeaderParams, Jwk, KeyIdentifier } from '@web5/crypto';

import { Convert } from '@web5/common';

import type { CryptoApi } from '../types/crypto-api.js';
import type { KeyManager } from '../types/key-manager.js';

import { CryptoError, CryptoErrorCode } from '../crypto-error.js';

export interface JweDecryptOptions {
  /**
   * Optionally specify the permitted JWE "alg" (Algorithm) Header Parameter values. By default, all
   * values are allowed.
   *
   * The "alg" Header Parameter specifies the cryptographic algorithm used to encrypt the Content
   * Encryption Key (CEK), producing the JWE Encrypted Key, or to use key agreement to agree upon
   * the CEK.
   */
  allowedAlgValues?: string[];

  /**
   * Optionally specify the permitted JWE "enc" (Encryption) Header Parameter values. By default,
   * all values are allowed.
   *
   * The "enc" Header Parameter is specifies the cryptographic algorithm used to encrypt and
   * integrity-protect the plaintext and to integrity-protect the Additional Authenticated Data.
   */
  allowedEncValues?: string[];
}

export interface JweEncryptOptions {}

/**
 * JSON Web Encryption (JWE) Header Parameters
 *
 * The Header Parameter names for use in JWEs are registered in the IANA "JSON Web Signature and
 * Encryption Header Parameters" registry.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc7516#section-4.1 | RFC 7516, Section 4.1}
 */
export interface JweHeaderParams extends JoseHeaderParams {
  /**
   * Algorithm Header Parameter
   *
   * Identifies the cryptographic algorithm used to encrypt or determine the value of the Content
   * Encryption Key (CEK). The encrypted content is not usable if the "alg" value does not represent
   * a supported algorithm, or if the recipient does not have a key that can be used with that
   * algorithm.
   *
   * "alg" values should either be registered in the IANA "JSON Web Signature and Encryption
   * Algorithms" registry or be a value that contains a Collision-Resistant Name. The "alg" value is
   * a case-sensitive ASCII string.  This Header Parameter MUST be present and MUST be understood
   * and processed by implementations.
   *
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7516#section-4.1.1 | RFC 7516, Section 4.1.1}
   */
  alg:
    // AES Key Wrap with default initial value using 128-bit key
    | 'A128KW'
    // AES Key Wrap with default initial value using 192-bit key
    | 'A192KW'
    // AES Key Wrap with default initial value using 256-bit key
    | 'A256KW'
    // Direct use of a shared symmetric key as the CEK
    | 'dir'
    // Elliptic Curve Diffie-Hellman Ephemeral Static key agreement using Concat KDF
    | 'ECDH-ES'
    // ECDH-ES using Concat KDF and CEK wrapped with "A128KW"
    | 'ECDH-ES+A128KW'
    // ECDH-ES using Concat KDF and CEK wrapped with "A192KW"
    | 'ECDH-ES+A192KW'
    // ECDH-ES using Concat KDF and CEK wrapped with "A256KW"
    | 'ECDH-ES+A256KW'
    // Key wrapping with AES GCM using 128-bit key
    | 'A128GCMKW'
    // Key wrapping with AES GCM using 192-bit key
    | 'A192GCMKW'
    // Key wrapping with AES GCM using 256-bit key
    | 'A256GCMKW'
    // PBES2 with HMAC SHA-256 and "A128KW" wrapping
    | 'PBES2-HS256+A128KW'
    // PBES2 with HMAC SHA-384 and "A192KW" wrapping
    | 'PBES2-HS384+A192KW'
    // PBES2 with HMAC SHA-512 and "A256KW" wrapping
    | 'PBES2-HS512+A256KW'
    // PBES2 with HMAC SHA-512 and "XC20PKW" wrapping
    | 'PBES2-HS512+XC20PKW'
    // an unregistered, case-sensitive, collision-resistant string
    | string;

  /**
   * Agreement PartyUInfo Header Parameter
   *
   * The "apu" (agreement PartyUInfo) value is a base64url-encoded octet sequence containing
   * information about the producer of the JWE.  This information is used by the recipient to
   * determine the key agreement algorithm and key encryption algorithm to use to decrypt the JWE.
   *
   * Note: This parameter is intended only for use when the recipient is a key agreement algorithm
   * that uses public key cryptography.
   */
  apu?: string;

  /**
   * Agreement PartyVInfo Header Parameter
   *
   * The "apv" (agreement PartyVInfo) value is a base64url-encoded octet sequence containing
   * information about the recipient of the JWE.  This information is used by the recipient to
   * determine the key agreement algorithm and key encryption algorithm to use to decrypt the JWE.
   *
   * Note: This parameter is intended only for use when the recipient is a key agreement algorithm
   * that uses public key cryptography.
   */
  apv?: string;

  /**
   * Critical Header Parameter
   *
   * Indicates that extensions to JOSE RFCs are being used that MUST be understood and processed.
   */
  crit?: string[]

  /**
   * Encryption Algorithm Header Parameter
   *
   * Identifies the content encryption algorithm used to encrypt and integrity-protect (also
   * known as "authenticated encryption") the plaintext and to integrity-protect the Additional
   * Authenticated Data (AAD), if any.  This algorithm MUST be an AEAD algorithm with a specified
   * key length.
   *
   * The encrypted content is not usable if the "enc" value does not represent a supported
   * algorithm.  "enc" values should either be registered in the IANA "JSON Web Signature and
   * Encryption Algorithms" registry or be a value that contains a Collision-Resistant Name. The
   * "enc" value is a case-sensitive ASCII string containing a StringOrURI value. This Header
   * Parameter MUST be present and MUST be understood and processed by implementations.
   *
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7516#section-4.1.2 | RFC 7516, Section 4.1.2}
   */
  enc:
    // AES_128_CBC_HMAC_SHA_256 authenticated encryption algorithm,
    // as defined in RFC 7518, Section 5.2.3
    | 'A128CBC-HS256'
    // AES_192_CBC_HMAC_SHA_384 authenticated encryption algorithm,
    // as defined in RFC 7518, Section 5.2.4
    | 'A192CBC-HS384'
    // AES_256_CBC_HMAC_SHA_512 authenticated encryption algorithm,
    // as defined in RFC 7518, Section 5.2.5
    | 'A256CBC-HS512'
    // AES GCM using 128-bit key
    | 'A128GCM'
    // AES GCM using 192-bit key
    | 'A192GCM'
    // AES GCM using 256-bit key
    | 'A256GCM'
    // XChaCha20-Poly1305 authenticated encryption algorithm
    | 'XC20P'
    // an unregistered, case-sensitive, collision-resistant string
    | string;

  /**
   * Ephemeral Public Key Header Parameter
   *
   * The "epk" (ephemeral public key) value created by the originator for the use in key agreement
   * algorithms.  It is the ephemeral public key that corresponds to the key used to encrypt the
   * JWE.  This value is represented as a JSON Web Key (JWK).
   *
   * Note: This parameter is intended only for use when the recipient is a key agreement algorithm
   * that uses public key cryptography.
   */
  epk?: Jwk;

  /**
   * Initialization Vector Header Parameter
   *
   * The "iv" (initialization vector) value is a base64url-encoded octet sequence used by the
   * specified "enc" algorithm.  The length of this Initialization Vector value MUST be exactly
   * equal to the value that would be produced by the "enc" algorithm.
   *
   * Note: With symmetric encryption algorithms such as AES GCM, this Header Parameter MUST
   * be present and MUST be understood and processed by implementations.
   */
  iv?: string;

  /**
   * PBES2 Count Header Parameter
   *
   * The "p2c" (PBES2 count) value is an integer indicating the number of iterations of the PBKDF2
   * algorithm performed during key derivation.
   *
   * Note: The iteration count adds computational expense, ideally compounded by the possible range
   * of keys introduced by the salt.  A minimum iteration count of 1000 is RECOMMENDED.
   */
  p2c?: number;

  /**
   * PBES2 Salt Input Header Parameter
   *
   * The "p2s" (PBES2 salt) value is a base64url-encoded octet sequence used as the salt value
   * input to the PBKDF2 algorithm during key derivation.
   *
   * The salt value used is (UTF8(Alg) || 0x00 || Salt Input), where Alg is the "alg" (algorithm)
   * Header Parameter value.
   *
   * Note: The salt value is used to ensure that each key derived from the master key is
   * independent of every other key. A suitable source of salt value is a sequence of
   * cryptographically random bytes containing 8 or more octets.
   */
  p2s?: string;

  /**
   * Authentication Tag Header Parameter
   *
   * The "tag" value is a base64url-encoded octet sequence containing the value of the
   * Authentication Tag output by the specified "enc" algorithm.  The length of this
   * Authentication Tag value MUST be exactly equal to the value that would be produced by the
   * "enc" algorithm.
   *
   * Note: With authenticated encryption algorithms such as AES GCM, this Header Parameter MUST
   * be present and MUST be understood and processed by implementations.
   */
  tag?: string;

  /**
   * Additional Public or Private Header Parameter names.
   */
  [key: string]: unknown
}

export function isValidJweHeader(obj: unknown): obj is JweHeaderParams {
  return typeof obj === 'object' && obj !== null
    && 'alg' in obj && obj.alg !== undefined
    && 'enc' in obj && obj.enc !== undefined;
}

export class JweKeyManagement {
  public static async decrypt<
    TKeyManager extends KeyManager,
    TCrypto extends CryptoApi
  >({ key, encryptedKey, joseHeader, crypto }: {
    key: KeyIdentifier | Jwk | Uint8Array;
    encryptedKey?: Uint8Array;
    joseHeader: JweHeaderParams;
    keyManager: TKeyManager;
    crypto: TCrypto;
  }): Promise<KeyIdentifier | Jwk> {
    // Determine the Key Management Mode employed by the algorithm specified by the "alg"
    // (algorithm) Header Parameter.
    switch (joseHeader.alg) {
      case 'dir': {
        // In Direct Encryption mode, a JWE "Encrypted Key" is not provided. Instead, the
        // provided key management `key` is directly used as the Content Encryption Key (CEK) to
        // decrypt the JWE payload.

        // Verify that the JWE Encrypted Key value is empty.
        if (encryptedKey !== undefined) {
          throw new CryptoError(CryptoErrorCode.InvalidJwe, 'JWE "encrypted_key" is not allowed when using "dir" (Direct Encryption Mode).');
        }

        // Verify the key management `key` is a Key Identifier or JWK.
        if (key instanceof Uint8Array) {
          throw new CryptoError(CryptoErrorCode.InvalidJwe, 'Key management "key" must be a Key URI or JWK when using "dir" (Direct Encryption Mode).');
        }

        // return the key management `key` as the CEK.
        return key;
      }

      case 'PBES2-HS256+A128KW':
      case 'PBES2-HS384+A192KW':
      case 'PBES2-HS512+A256KW': {
        // In Key Encryption mode (PBES2) with key wrapping (A128KW, A192KW, A256KW), the given
        // passphrase, salt (p2s), and iteration count (p2c) are used with the PBKDF2 key derivation
        // function to derive the Key Encryption Key (KEK).  The KEK is then used to decrypt the JWE
        // Encrypted Key to obtain the Content Encryption Key (CEK).

        if (typeof joseHeader.p2c !== 'number') {
          throw new CryptoError(CryptoErrorCode.InvalidJwe, 'JOSE Header "p2c" (PBES2 Count) is missing or not a number.');
        }

        if (typeof joseHeader.p2s !== 'string') {
          throw new CryptoError(CryptoErrorCode.InvalidJwe, 'JOSE Header "p2s" (PBES2 salt) is missing or not a string.');
        }

        // Throw an error if the key management `key` is not a byte array.
        if (!(key instanceof Uint8Array)) {
          throw new CryptoError(CryptoErrorCode.InvalidJwe, 'Key management "key" must be a Uint8Array when using "PBES2" (Key Encryption Mode).');
        }

        // Verify that the JWE Encrypted Key value is present.
        if (encryptedKey === undefined) {
          throw new CryptoError(CryptoErrorCode.InvalidJwe, 'JWE "encrypted_key" is required when using "PBES2" (Key Encryption Mode).');
        }

        // Per {@link https://www.rfc-editor.org/rfc/rfc7518.html#section-4.8.1.1 | RFC 7518, Section 4.8.1.1},
        // the salt value used with PBES2 should be of the format (UTF8(Alg) || 0x00 || Salt Input),
        // where Alg is the "alg" (algorithm) Header Parameter value. This reduces the potential for
        // a precomputed dictionary attack (also known as a rainbow table attack).
        let salt: Uint8Array;
        try {
          salt = new Uint8Array([
            ...Convert.string(joseHeader.alg).toUint8Array(),
            0x00,
            ...Convert.base64Url(joseHeader.p2s).toUint8Array()
          ]);
        } catch {
          throw new CryptoError(CryptoErrorCode.EncodingError, 'Failed to decode the JOSE Header "p2s" (PBES2 salt) value.');
        }

        // Derive the Key Encryption Key (KEK) from the given passphrase, salt, and iteration count.
        const kek = await crypto.deriveKey({
          algorithm    : joseHeader.alg,
          baseKeyBytes : key,
          iterations   : joseHeader.p2c,
          salt
        });

        if (!(kek.alg && ['A128KW', 'A192KW', 'A256KW'].includes(kek.alg))) {
          throw new CryptoError(CryptoErrorCode.AlgorithmNotSupported, `Unsupported Key Encryption Algorithm (alg) value: ${kek.alg}`);
        }

        // Decrypt the Content Encryption Key (CEK) with the derived KEK.
        return await crypto.unwrapKey({
          decryptionKey       : kek,
          wrappedKeyBytes     : encryptedKey,
          wrappedKeyAlgorithm : joseHeader.enc
        });
      }

      default: {
        throw new CryptoError(
          CryptoErrorCode.AlgorithmNotSupported,
          `Unsupported "alg" (Algorithm) Header Parameter value: ${joseHeader.alg}`
        );
      }
    }
  }

  public static async encrypt<
    TKeyManager extends KeyManager,
    TCrypto extends CryptoApi
  >({ key, joseHeader, crypto }: {
    key: KeyIdentifier | Jwk | Uint8Array;
    joseHeader: JweHeaderParams;
    keyManager: TKeyManager;
    crypto: TCrypto;
  }): Promise<{ cek: KeyIdentifier | Jwk, encryptedKey?: Uint8Array }> {
    let cek: KeyIdentifier | Jwk;
    let encryptedKey: Uint8Array | undefined;

    // Determine the Key Management Mode employed by the algorithm specified by the "alg"
    // (algorithm) Header Parameter.
    switch (joseHeader.alg) {
      case 'dir': {
        // In Direct Encryption mode (dir), a JWE "Encrypted Key" is not provided. Instead, the
        // provided key management `key` is directly used as the Content Encryption Key (CEK) to
        // decrypt the JWE payload.

        // Verify that the JWE Encrypted Key value is empty.
        if (encryptedKey !== undefined) {
          throw new CryptoError(CryptoErrorCode.InvalidJwe, 'JWE "encrypted_key" is not allowed when using "dir" (Direct Encryption Mode).');
        }

        // Verify the key management `key` is a Key Identifier or JWK.
        if (key instanceof Uint8Array) {
          throw new CryptoError(CryptoErrorCode.InvalidJwe, 'Key management "key" must be a Key URI or JWK when using "dir" (Direct Encryption Mode).');
        }

        // Set the CEK to the key management `key`.
        cek = key;
        break;
      }

      case 'PBES2-HS256+A128KW':
      case 'PBES2-HS384+A192KW':
      case 'PBES2-HS512+A256KW': {
        // In Key Encryption mode (PBES2) with key wrapping (A128KW, A192KW, A256KW), a randomly
        // generated Content Encryption Key (CEK) is encrypted with a Key Encryption Key (KEK)
        // derived from the given passphrase, salt (p2s), and iteration count (p2c) using the
        // PBKDF2 key derivation function.

        if (typeof joseHeader.p2c !== 'number') {
          throw new CryptoError(CryptoErrorCode.InvalidJwe, 'JOSE Header "p2c" (PBES2 Count) is missing or not a number.');
        }

        if (typeof joseHeader.p2s !== 'string') {
          throw new CryptoError(CryptoErrorCode.InvalidJwe, 'JOSE Header "p2s" (PBES2 salt) is missing or not a string.');
        }

        // Throw an error if the key management `key` is not a byte array.
        if (!(key instanceof Uint8Array)) {
          throw new CryptoError(CryptoErrorCode.InvalidJwe, 'Key management "key" must be a Uint8Array when using "PBES2" (Key Encryption Mode).');
        }

        // Generate a random Content Encryption Key (CEK) using the algorithm specified by the "enc"
        // (encryption) Header Parameter.
        cek = await crypto.generateKey({ algorithm: joseHeader.enc });

        // Per {@link https://www.rfc-editor.org/rfc/rfc7518.html#section-4.8.1.1 | RFC 7518, Section 4.8.1.1},
        // the salt value used with PBES2 should be of the format (UTF8(Alg) || 0x00 || Salt Input),
        // where Alg is the "alg" (algorithm) Header Parameter value. This reduces the potential for
        // a precomputed dictionary attack (also known as a rainbow table attack).
        let salt: Uint8Array;
        try {
          salt = new Uint8Array([
            ...Convert.string(joseHeader.alg).toUint8Array(),
            0x00,
            ...Convert.base64Url(joseHeader.p2s).toUint8Array()
          ]);
        } catch {
          throw new CryptoError(CryptoErrorCode.EncodingError, 'Failed to decode the JOSE Header "p2s" (PBES2 salt) value.');
        }

        // Derive a Key Encryption Key (KEK) from the given passphrase, salt, and iteration count.
        const kek = await crypto.deriveKey({
          algorithm    : joseHeader.alg,
          baseKeyBytes : key,
          iterations   : joseHeader.p2c,
          salt
        });

        // Encrypt the randomly generated CEK with the derived Key Encryption Key (KEK).
        encryptedKey = await crypto.wrapKey({ encryptionKey: kek, unwrappedKey: cek });

        break;
      }

      default: {
        throw new CryptoError(
          CryptoErrorCode.AlgorithmNotSupported,
          `Unsupported "alg" (Algorithm) Header Parameter value: ${joseHeader.alg}`
        );
      }
    }

    return { cek, encryptedKey };
  }
}