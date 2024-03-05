import type { JoseHeaderParams, Jwk, KeyIdentifier } from '@web5/crypto';

import { Convert } from '@web5/common';

import type { CryptoApi } from '../types/crypto-api.js';
import type { KeyManager } from '../types/key-manager.js';

import { CryptoError, CryptoErrorCode } from '../crypto-error.js';

/**
 * Specifies options for decrypting a JWE, allowing the caller to define constraints on the JWE
 * decryption process, particularly regarding the algorithms used.
 *
 * These options ensure that only expected and permitted algorithms are utilized during the
 * decryption, enhancing security by preventing unexpected algorithm usage.
 */
export interface JweDecryptOptions {
  /**
   * The allowed "alg" (Algorithm) Header Parameter values.
   *
   * These values specify the cryptographic algorithms that are permissible for decrypting
   * the Content Encryption Key (CEK) or for key agreement to determine the CEK.
   *
   * Note: If not specified, all algorithm values are considered allowed, which might not be
   * desirable in all contexts.
   */
  allowedAlgValues?: string[];

  /**
   * The allowed "enc" (Encryption) Header Parameter values.
   *
   * These values determine the cryptographic algorithms that can be used for decrypting the
   * ciphertext and protecting the integrity of the plaintext and Additional Authenticated Data.
   *
   * Note: If left unspecified, it implies that all encryption algorithms are acceptable, which may
   * not be secure in every scenario.
   *
   */
  allowedEncValues?: string[];
}

/**
 * Placeholder for specifying options during the JWE encryption process. Currently, this interface
 * does not define any specific options but can be extended in the future to include parameters
 * that control various aspects of the JWE encryption workflow.
 */
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
  crit?: string[];

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
  [key: string]: unknown;
}

/**
 * Represents the result of the JWE key management encryption process, encapsulating the Content
 * Encryption Key (CEK) and optionally the encrypted CEK.
 */
export interface JweKeyManagementEncryptResult {
  /**
   * The Content Encryption Key (CEK) used for encrypting the JWE payload. It can be a Key
   * Identifier such as a KMS URI or a JSON Web Key (JWK).
   */
  cek: KeyIdentifier | Jwk;

  /**
   * The encrypted version of the CEK, provided as a byte array. The encrypted version of the CEK
   * is returned for all key management modes other than "dir" (Direct Encryption Mode).
   */
  encryptedKey?: Uint8Array;
}

/**
 * Defines the parameters required to decrypt a JWE encrypted key, including the key management
 * details.
 *
 * @typeParam TKeyManager - The Key Manager used to manage cryptographic keys.
 * @typeParam TCrypto - The Crypto API used to perform cryptographic operations.
 */
export interface JweKeyManagementDecryptParams<TKeyManager, TCrypto> {
  /**
   * The decryption key which can be a Key Identifier such as a KMS key URI, a JSON Web Key (JWK),
   * or raw key material represented as a byte array.
   */
  key: KeyIdentifier | Jwk | Uint8Array;

  /**
   * The encrypted key extracted from the JWE, represented as a byte array. This parameter is
   * optional and is used when the key is wrapped.
   */
  encryptedKey?: Uint8Array;

  /**
   * The JWE header parameters that define the characteristics of the decryption process, specifying
   * the algorithm and encryption method among other settings.
   */
  joseHeader: JweHeaderParams;

  /** Key Manager instanceß responsible for managing cryptographic keys. */
  keyManager: TKeyManager;

  /** Crypto API instance that provides the necessary cryptographic operations. */
  crypto: TCrypto;
}

/**
 * Defines the parameters required for encrypting a JWE CEK, including the key management details.
 *
 * @typeParam TKeyManager - The Key Manager used to manage cryptographic keys.
 * @typeParam TCrypto - The Crypto API used to perform cryptographic operations.
 */
export interface JweKeyManagementEncryptParams<TKeyManager, TCrypto> {
  /**
   * The encryption key which can be a Key Identifier such as a KMS key URI, a JSON Web Key (JWK),
   * or raw key material represented as a byte array.
   */
  key: KeyIdentifier | Jwk | Uint8Array;

  /**
   * The JWE header parameters that define the characteristics of the encryption process, specifying
   * the algorithm and encryption method among other settings.
   */
  joseHeader: JweHeaderParams;

  /** Key Manager instanceß responsible for managing cryptographic keys. */
  keyManager: TKeyManager;

  /** Crypto API instance that provides the necessary cryptographic operations. */
  crypto: TCrypto;
}

/**
 * Checks if the provided object is a valid JWE (JSON Web Encryption) header.
 *
 * This function evaluates whether the given object adheres to the structure expected for
 * a JWE header, specifically looking for the presence and proper format of the "alg" (algorithm)
 * and "enc" (encryption algorithm) properties, which are essential for defining the JWE's
 * cryptographic operations.
 *
 * @example
 * ```ts
 * const header = {
 *   alg: 'dir',
 *   enc: 'A256GCM'
 * };
 *
 * if (isValidJweHeader(header)) {
 *   console.log('The object is a valid JWE header.');
 * } else {
 *   console.log('The object is not a valid JWE header.');
 * }
 * ```
 *
 * @param obj - The object to be validated as a JWE header.
 * @returns Returns `true` if the object is a valid JWE header, otherwise `false`.
 */
export function isValidJweHeader(obj: unknown): obj is JweHeaderParams {
  return typeof obj === 'object' && obj !== null
    && 'alg' in obj && obj.alg !== undefined
    && 'enc' in obj && obj.enc !== undefined;
}

/**
 * The `JweKeyManagement` class implements the key management aspects of JSON Web Encryption (JWE)
 * as specified in {@link https://datatracker.ietf.org/doc/html/rfc7516 | RFC 7516}.
 *
 * It supports algorithms for encrypting and decrypting keys, thereby enabling the secure
 * transmission of information where the payload is encrypted, and the encryption key is also
 * encrypted or agreed upon using key agreement techniques.
 *
 * The choice of algorithm is determined by the "alg" parameter in the JWE
 * header, and the class is designed to handle the intricacies associated with each algorithm,
 * ensuring the secure handling of the encryption keys.
 *
 * Supported algorithms include:
 * - `"dir"`: Direct Encryption Mode
 * - `"PBES2-HS256+A128KW"`, `"PBES2-HS384+A192KW"`, `"PBES2-HS512+A256KW"`: Password-Based
 *   Encryption Mode with Key Wrapping (PBES2) using HMAC-SHA and AES Key Wrap algorithms for key
 *   wrapping and encryption.
 *
 * @example
 * // To encrypt a key:
 * const keyEncryptionKey = Convert.string(passphrase).toUint8Array()
 * const { cek, encryptedKey: encryptedCek } = await JweKeyManagement.encrypt({
 *   key: keyEncryptionKey,
 *   joseHeader: {
 *     alg: 'PBES2-HS512+A256KW',
 *     enc: 'A256GCM',
 *     p2c : 210_000,
       p2s : Convert.uint8Array(saltInput).toBase64Url()
 *   },
 *   crypto: new AgentCryptoApi(),
 * });
 *
 * // To decrypt a key:
 * const cek = await JweKeyManagement.decrypt({
 *   key: keyEncryptionKey,
 *   encryptedKey: encryptedCek,
 *   joseHeader: {
 *     alg: 'PBES2-HS512+A256KW',
 *     enc: 'A256GCM',
 *     p2c : 210_000,
       p2s : Convert.uint8Array(saltInput).toBase64Url()
 *   },
 *   crypto: new AgentCryptoApi(),
 * });
 */
export class JweKeyManagement {
  /**
   * Decrypts the encrypted key (JWE Encrypted Key) using the specified key encryption algorithm
   * defined in the JWE Header's "alg" parameter.
   *
   * This method supports multiple key management algorithms, including Direct Encryption (dir) and
   * PBES2 schemes with key wrapping.
   *
   * The method takes a key, which can be a Key Identifier, JWK, or raw byte array, and the
   * encrypted key along with the JWE header. It returns the decrypted Content Encryption Key (CEK)
   * which can then be used to decrypt the JWE ciphertext.
   *
   * @example
   * ```ts
   * // Decrypting the CEK with the PBES2-HS512+A256KW algorithm
   * const cek = await JweKeyManagement.decrypt({
   *   key: Convert.string(passphrase).toUint8Array(),
   *   encryptedKey: encryptedCek,
   *   joseHeader: {
   *     alg: 'PBES2-HS512+A256KW',
   *     enc: 'A256GCM',
   *     p2c: 210_000,
   *     p2s: Convert.uint8Array(saltInput).toBase64Url(),
   *   },
   *   crypto: new AgentCryptoApi()
   * });
   * ```
   *
   * @param params - The decryption parameters.
   * @throws Throws an error if the key management algorithm is not supported or if required
   *         parameters are missing or invalid.
   */
  public static async decrypt<TKeyManager extends KeyManager, TCrypto extends CryptoApi>({
    key, encryptedKey, joseHeader, crypto
  }: JweKeyManagementDecryptParams<TKeyManager, TCrypto>
  ): Promise<KeyIdentifier | Jwk> {
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

        // Throw an error if the key management `key` is not a byte array. For PBES2, the key is
        // expected to be a low-entropy passphrase as a byte array.
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

  /**
   * Encrypts a Content Encryption Key (CEK) using the key management algorithm specified in the
   * JWE Header's "alg" parameter.
   *
   * This method supports various key management algorithms, including Direct Encryption (dir) and
   * PBES2 with key wrapping.
   *
   * It generates a random CEK for the specified encryption algorithm in the JWE header, which
   * can then be used to encrypt the actual payload. For algorithms that require an encrypted key,
   * it returns the CEK along with the encrypted key.
   *
   * @example
   * ```ts
   * // Encrypting the CEK with the PBES2-HS512+A256KW algorithm
   * const { cek, encryptedKey } = await JweKeyManagement.encrypt({
   *   key: Convert.string(passphrase).toUint8Array(),
   *   joseHeader: {
   *     alg: 'PBES2-HS512+A256KW',
   *     enc: 'A256GCM',
   *     p2c: 210_000,
   *     p2s: Convert.uint8Array(saltInput).toBase64Url(),
   *   },
   *   crypto: crypto: new AgentCryptoApi()
   * });
   * ```
   *
   * @param params - The encryption parameters.
   * @returns The encrypted key result containing the CEK and optionally the encrypted CEK
   *          (JWE Encrypted Key).
   * @throws Throws an error if the key management algorithm is not supported or if required
   *         parameters are missing or invalid.
   */
  public static async encrypt<TKeyManager extends KeyManager, TCrypto extends CryptoApi>({
    key, joseHeader, crypto
  }: JweKeyManagementEncryptParams<TKeyManager, TCrypto>
  ): Promise<JweKeyManagementEncryptResult> {
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