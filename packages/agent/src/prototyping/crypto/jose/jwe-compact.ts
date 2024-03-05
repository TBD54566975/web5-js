import type { Jwk, KeyIdentifier } from '@web5/crypto';

import { LocalKeyManager } from '@web5/crypto';

import type { CryptoApi } from '../types/crypto-api.js';
import type { KeyManager } from '../types/key-manager.js';
import type { JweDecryptOptions, JweEncryptOptions, JweHeaderParams } from './jwe.js';

import { isValidJweHeader } from './jwe.js';
import { FlattenedJwe } from './jwe-flattened.js';
import { AgentCryptoApi } from '../../../crypto-api.js';
import { CryptoError, CryptoErrorCode } from '../crypto-error.js';

/**
 * Parameters required for decrypting a JWE in Compact Serialization format.
 *
 * @typeParam TKeyManager - The Key Manager used to manage cryptographic keys.
 * @typeParam TCrypto - The Crypto API used to perform cryptographic operations.
 */
export interface CompactJweDecryptParams<TKeyManager, TCrypto> {
  /** The JWE string in Compact Serialization format. */
  jwe: string;

  /**
   * The decryption key which can be a Key Identifier such as a KMS key URI, a JSON Web Key (JWK),
   * or raw key material represented as a byte array.
   */
  key: KeyIdentifier | Jwk | Uint8Array;

  /** Key Manager instanceß responsible for managing cryptographic keys. */
  keyManager?: TKeyManager;

  /** Crypto API instance that provides the necessary cryptographic operations. */
  crypto?: TCrypto;

  /** {@inheritDoc JweDecryptOptions} */
  options?: JweDecryptOptions;
}

/**
 * Result of decrypting a JWE in Compact Serialization format.
 */
export interface CompactJweDecryptResult {
  /** Decrypted plaintext as a byte array. */
  plaintext: Uint8Array;

  /** The protected header of the JWE. */
  protectedHeader: JweHeaderParams;
}

/**
 * Parameters required for encrypting data into a JWE in Compact Serialization format.
 *
 * @typeParam TKeyManager - The Key Manager used to manage cryptographic keys.
 * @typeParam TCrypto - The Crypto API used to perform cryptographic operations.
 */
export interface CompactJweEncryptParams<TKeyManager, TCrypto> {
  /** The plaintext data to be encrypted as a byte array. */
  plaintext: Uint8Array;

  /** JWE Protected Header containing encryption algorithm details. */
  protectedHeader: JweHeaderParams;

  /**
   * The encryption key which can be a Key Identifier such as a KMS key URI, a JSON Web Key (JWK),
   * or raw key material represented as a byte array.
   */
  key: KeyIdentifier | Jwk | Uint8Array;

  /** Key Manager instanceß responsible for managing cryptographic keys. */
  keyManager?: TKeyManager;

  /** Crypto API instance that provides the necessary cryptographic operations. */
  crypto?: TCrypto;

  /** {@inheritDoc JweEncryptOptions} */
  options?: JweEncryptOptions;
}

/**
 * The `CompactJwe` class facilitates encryption and decryption processes using the JSON Web
 * Encryption (JWE) Compact Serialization format. This class adheres to the specifications
 * outlined in {@link https://datatracker.ietf.org/doc/html/rfc7516 | RFC 7516}, enabling secure
 * data encapsulation through various cryptographic algorithms.
 *
 * Compact Serialization is a space-efficient representation of JWE, suitable for contexts
 * where verbose data structures are impractical, such as HTTP headers. It provides mechanisms to
 * encrypt content and protect its integrity with authenticated encryption, ensuring
 * confidentiality, authenticity, and non-repudiation.
 *
 * This class supports the following operations:
 * - Decrypting data from a compact serialized JWE string.
 * - Encrypting data and producing a compact serialized JWE string.
 *
 * Usage involves specifying the cryptographic details, such as keys and algorithms, and the class
 * handles the complexities of the JWE processing, including parsing, validating, and applying the
 * cryptographic operations defined in the JWE specification.
 *
 * @example
 * ```ts
 *  // Example usage of encrypt method
 * const plaintext = new TextEncoder().encode("Secret Message");
 * const key = { kty: "oct", k: "your-secret-key" }; // Example symmetric key
 * const protectedHeader = { alg: "dir", enc: "A256GCM" };
 * const encryptedJweString = await CompactJwe.encrypt({
 *   plaintext,
 *   protectedHeader,
 *   key,
 * });
 * console.log(encryptedJweString); // Outputs the JWE string in Compact Serialization format
 * ```
 *
 * @example
 * ```ts
 * // Example usage of decrypt method
 * const jweString = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // A JWE in Compact Serialization
 * const decryptionKey = { kty: "oct", k: "your-secret-key" }; // The key must match the one used for encryption
 * const { plaintext, protectedHeader } = await CompactJwe.decrypt({
 *   jwe: jweString,
 *   key: decryptionKey,
 * });
 * console.log(new TextDecoder().decode(plaintext)); // Outputs the decrypted message
 * ```
 */
export class CompactJwe {
  /**
   * Decrypts a JWE string in Compact Serialization format, extracting the plaintext and
   * reconstructing the JWE Protected Header.
   *
   * This method parses the compact JWE, validates its structure, and applies the appropriate
   * decryption algorithm as specified in the JWE Protected Header. It returns the decrypted
   * plaintext along with the reconstructed protected header, ensuring the data's authenticity
   * and integrity.
   *
   * @param params - The decryption parameters including the JWE string, cryptographic key, and
   *                 optional instances of Key Manager and Crypto API.
   * @returns A promise resolving to the decrypted content and the JWE Protected Header.
   * @throws {@link CryptoError} if the JWE format is invalid or decryption fails.
   */
  public static async decrypt<
    TKeyManager extends KeyManager | undefined = KeyManager,
    TCrypto extends CryptoApi | undefined = CryptoApi
  >({
    jwe,
    key,
    keyManager = new LocalKeyManager(),
    crypto = new AgentCryptoApi(),
    options = {}
  }: CompactJweDecryptParams<TKeyManager, TCrypto>
  ): Promise<CompactJweDecryptResult> {
    if (typeof jwe !== 'string') {
      throw new CryptoError(CryptoErrorCode.InvalidJwe, 'Invalid JWE format. JWE must be a string.');
    }

    // Split the JWE into its constituent parts.
    const {
      0: protectedHeader,
      1: encryptedKey,
      2: initializationVector,
      3: ciphertext,
      4: authenticationTag,
      length,
    } = jwe.split('.');

    // Ensure that the JWE has the required number of parts.
    if (length !== 5) {
      throw new CryptoError(CryptoErrorCode.InvalidJwe, 'Invalid JWE format. JWE must have 5 parts.');
    }

    // Decrypt the JWE using the provided Key URI.
    const flattenedJwe = await FlattenedJwe.decrypt({
      jwe: {
        ciphertext,
        encrypted_key : encryptedKey || undefined,
        iv            : initializationVector || undefined,
        protected     : protectedHeader,
        tag           : authenticationTag || undefined,
      },
      key,
      keyManager,
      crypto,
      options
    });

    if (!isValidJweHeader(flattenedJwe.protectedHeader)) {
      throw new CryptoError(CryptoErrorCode.InvalidJwe, 'Decrypt operation failed due to missing or malformed JWE Protected Header');
    }

    return { plaintext: flattenedJwe.plaintext, protectedHeader: flattenedJwe.protectedHeader };
  }

  /**
   * Encrypts plaintext to a JWE string in Compact Serialization format, encapsulating the content
   * with the specified cryptographic protections.
   *
   * It constructs the JWE by encrypting the plaintext, then serializing the output to the
   * compact format, which includes concatenating various components like the protected header,
   * encrypted key, initialization vector, ciphertext, and authentication tag.
   *
   * @param params - The encryption parameters, including plaintext, JWE Protected Header,
   *                 cryptographic key, and optional Key Manager and Crypto API instances.
   * @returns A promise that resolves to a string representing the JWE in Compact Serialization
   *          format.
   * @throws {@link CryptoError} if encryption fails or the input parameters are invalid.
   */
  public static async encrypt<
    TKeyManager extends KeyManager | undefined = KeyManager,
    TCrypto extends CryptoApi | undefined = CryptoApi
  >({
    plaintext,
    protectedHeader,
    key,
    keyManager = new LocalKeyManager(),
    crypto = new AgentCryptoApi(),
    options = {}
  }: CompactJweEncryptParams<TKeyManager, TCrypto>
  ): Promise<string> {
    const jwe = await FlattenedJwe.encrypt({ plaintext, protectedHeader, key, keyManager, crypto, options });

    // Create the Compact Serialization, which is the string BASE64URL(UTF8(JWE Protected Header))
    // || '.' || BASE64URL(JWE Encrypted Key) || '.' || BASE64URL(JWE Initialization Vector)
    // || '.' || BASE64URL(JWE Ciphertext) || '.' || BASE64URL(JWE Authentication Tag).
    return [jwe.protected, jwe.encrypted_key, jwe.iv, jwe.ciphertext, jwe.tag].join('.');
  }
}