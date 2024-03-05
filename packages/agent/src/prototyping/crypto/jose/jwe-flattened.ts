import type { Jwk, KeyIdentifier } from '@web5/crypto';

import { Convert } from '@web5/common';
import { LocalKeyManager, utils as cryptoUtils } from '@web5/crypto';

import type { CryptoApi } from '../types/crypto-api.js';
import type { KeyManager } from '../types/key-manager.js';
import type { JweDecryptOptions, JweEncryptOptions, JweHeaderParams } from './jwe.js';

import { isCipher } from '../utils.js';
import { AgentCryptoApi } from '../../../crypto-api.js';
import { JweKeyManagement, isValidJweHeader } from './jwe.js';
import { hasDuplicateProperties } from '../../common/object.js';
import { CryptoError, CryptoErrorCode } from '../crypto-error.js';

/**
 * Parameters required for decrypting a flattened JWE.
 *
 * @typeParam TKeyManager - The Key Manager used to manage cryptographic keys.
 * @typeParam TCrypto - The Crypto API used to perform cryptographic operations.
 */
export interface FlattenedJweDecryptParams<TKeyManager, TCrypto> {
  /** The flattened JWE. */
  jwe: FlattenedJweParams | FlattenedJwe;

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
 * Result of decrypting a flattened JWE, containing the plaintext and related information.
 */
export interface FlattenedJweDecryptResult {
  /** JWE Additional Authenticated Data (AAD). */
  additionalAuthenticatedData?: Uint8Array;

  /** Plaintext. */
  plaintext: Uint8Array;

  /** JWE Protected Header. */
  protectedHeader?: Partial<JweHeaderParams>;

  /** JWE Shared Unprotected Header. */
  sharedUnprotectedHeader?: Partial<JweHeaderParams>;

  /** JWE Per-Recipient Unprotected Header. */
  unprotectedHeader?: Partial<JweHeaderParams>;
}

/**
 * Parameters for encrypting data into a flattened JWE format.
 *
 * @typeParam TKeyManager - The Key Manager used to manage cryptographic keys.
 * @typeParam TCrypto - The Crypto API used to perform cryptographic operations.
 */
export interface FlattenedJweEncryptParams<TKeyManager, TCrypto> extends FlattenedJweDecryptResult {
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
 * Represents the parameters for a flattened JWE object, typically used in single-recipient
 * scenarios.
 */
export interface FlattenedJweParams {
  /** Base64URL encoded additional authenticated data. */
  aad?: string;

  /** Base64URL encoded ciphertext. */
  ciphertext: string;

  /** Base64URL encoded encrypted key. */
  encrypted_key?: string;

  /** Per-Recipient Unprotected Header parameters. */
  header?: Partial<JweHeaderParams>;

  /** Base64URL encoded initialization vector. */
  iv?: string;

  /** Base64URL encoded string of the Protected Header. */
  protected?: string;

  /** Base64URL encoded authentication tag. */
  tag?: string;

  /** Shared Unprotected Header parameters. */
  unprotected?: Partial<JweHeaderParams>;
}

/**
 * A helper utility function used internally to decode a JWE header parameter from a Base64 URL
 * encoded string to a Uint8Array. It's designed to process individual JWE header parameter values,
 * ensuring they are correctly formatted and decoded.
 *
 * @param param - The name of the JWE header parameter being decoded; used for error messaging.
 * @param value - The Base64 URL encoded string value of the header parameter to decode.
 * @returns The decoded parameter as a Uint8Array, or undefined if the input value is undefined.
 * @throws {@link CryptoError} if the value is not a properly encoded Base64 URL string or if it's
 *         not a string.
 */
function decodeHeaderParam(param: string, value?: string): Uint8Array | undefined {
  // If the parameter value is not present, return undefined.
  if (value === undefined) return undefined;

  try {
    if (typeof value !== 'string') throw new Error();
    return Convert.base64Url(value).toUint8Array();
  } catch {
    throw new CryptoError(CryptoErrorCode.InvalidJwe,
      `Failed to decode the JWE Header parameter '${param}' from Base64 URL format to ` +
      'Uint8Array. Ensure the value is properly encoded in Base64 URL format without padding.'
    );
  }
}

/**
 * The `FlattenedJwe` class handles the encryption and decryption of JSON Web Encryption (JWE)
 * objects in the flattened serialization format. This format is a compact, URL-safe means of
 * representing encrypted content, typically used when dealing with a single recipient or when
 * bandwidth efficiency is important.
 *
 * This class provides methods to encrypt plaintext to a flattened JWE and decrypt a flattened JWE
 * back to plaintext, utilizing a variety of supported cryptographic algorithms as specified in the
 * JWE header parameters.
 *
 * @example
 * ```ts
 *  // Example usage of encrypt method
 * const plaintext = new TextEncoder().encode("Secret Message");
 * const key = { kty: "oct", k: "your-secret-key" }; // Example symmetric key
 * const protectedHeader = { alg: "dir", enc: "A256GCM" };
 * const encryptedJwe = await FlattenedJwe.encrypt({
 *   plaintext,
 *   protectedHeader,
 *   key,
 * });
 * ```
 *
 * @example
 * // Decryption example
 * const { plaintext, protectedHeader } = await FlattenedJwe.decrypt({
 *   jwe: yourFlattenedJweObject,
 *   key: yourDecryptionKey,
 *   crypto: new YourCryptoApi(),
 * });
 */
export class FlattenedJwe {
  /** Base64URL encoded additional authenticated data. */
  public aad?: string;

  /** Base64URL encoded ciphertext. */
  public ciphertext: string = '';

  /** Base64URL encoded encrypted key. */
  public encrypted_key?: string;

  /** Per-Recipient Unprotected Header parameters. */
  public header?: Partial<JweHeaderParams>;

  /** Base64URL encoded initialization vector. */
  public iv?: string;

  /** Base64URL encoded string of the Protected Header. */
  public protected?: string;

  /** Base64URL encoded authentication tag. */
  public tag?: string;

  /** Shared Unprotected Header parameters. */
  public unprotected?: Partial<JweHeaderParams>;

  constructor(params: FlattenedJweParams) {
    Object.assign(this, params);
  }

  public static async decrypt<
    TKeyManager extends KeyManager | undefined = KeyManager,
    TCrypto extends CryptoApi | undefined = CryptoApi
  >({
    jwe,
    key,
    keyManager = new LocalKeyManager(),
    crypto = new AgentCryptoApi(),
    options = {}
  }: FlattenedJweDecryptParams<TKeyManager, TCrypto>): Promise<FlattenedJweDecryptResult> {
    // Verify that the provided Crypto API supports the decrypt operation before proceeding.
    if (!isCipher(crypto)) {
      throw new CryptoError(CryptoErrorCode.OperationNotSupported, 'Crypto API does not support the "encrypt" operation.');
    }
    // Verify that the provided Key Manager supports the decrypt operation before proceeding.
    if (!isCipher(keyManager)) {
      throw new CryptoError(CryptoErrorCode.OperationNotSupported, 'Key Manager does not support the "decrypt" operation.');
    }

    // Verify that at least one of the JOSE header objects is present.
    if (!jwe.protected && !jwe.header && !jwe.unprotected) {
      throw new CryptoError(CryptoErrorCode.InvalidJwe,
        'JWE is missing the required JOSE header parameters. ' +
        'Please provide at least one of the following: "protected", "header", or "unprotected"'
      );
    }

    // Verify that the JWE Ciphertext is present.
    if (typeof jwe.ciphertext !== 'string') {
      throw new CryptoError(CryptoErrorCode.InvalidJwe, 'JWE Ciphertext is missing or not a string.');
    }

    // Parse the JWE Protected Header, if present.
    let parsedProtectedHeader: Partial<JweHeaderParams> | undefined;
    if (jwe.protected) {
      try {
        parsedProtectedHeader = Convert.base64Url(jwe.protected).toObject();
      } catch {
        throw new Error('JWE Protected Header is invalid');
      }
    }

    // Per {@link https://www.rfc-editor.org/rfc/rfc7516#section-5.2 | RFC7516 Section 5.2}
    // the resulting JOSE Header MUST NOT contain duplicate Header Parameter names. In other words,
    // the same Header Parameter name MUST NOT occur in the `header`, `protected`, and
    // `unprotected` JSON object values that together comprise the JOSE Header.
    if (hasDuplicateProperties(parsedProtectedHeader, jwe.header, jwe.unprotected)){
      throw new Error(
        'Duplicate properties detected. Please ensure that each parameter is defined only once ' +
        'across the JWE "header", "protected", and "unprotected" objects.'
      );
    }

    // The JOSE Header is the union of the members of the JWE Protected Header (`protected`), the
    // JWE Shared Unprotected Header (`unprotected`), and the corresponding JWE Per-Recipient
    // Unprotected Header (`header`).
    const joseHeader = { ...parsedProtectedHeader, ...jwe.header, ...jwe.unprotected };

    if (!isValidJweHeader(joseHeader)) {
      throw new Error('JWE Header is missing required "alg" (Algorithm) and/or "enc" (Encryption) Header Parameters');
    }

    if (Array.isArray(options.allowedAlgValues)
        && !options.allowedAlgValues.includes(joseHeader.alg)) {
      throw new Error(`"alg" (Algorithm) Header Parameter value not allowed: ${joseHeader.alg}`);
    }

    if (Array.isArray(options.allowedEncValues)
        && !options.allowedEncValues.includes(joseHeader.enc)) {
      throw new Error(`"enc" (Encryption Algorithm) Header Parameter value not allowed: ${joseHeader.enc}`);
    }

    let cek: KeyIdentifier | Jwk;
    try {
      const encryptedKey = jwe.encrypted_key
        ? Convert.base64Url(jwe.encrypted_key).toUint8Array()
        : undefined;

      cek = await JweKeyManagement.decrypt({ key, encryptedKey, joseHeader, keyManager, crypto });

    } catch (error: any) {
      // If the error is a CryptoError with code "InvalidJwe" or "AlgorithmNotSupported", re-throw.
      if (error instanceof CryptoError
          && (error.code === CryptoErrorCode.InvalidJwe || error.code === CryptoErrorCode.AlgorithmNotSupported)) {
        throw error;
      }

      // Otherwise, generate a random CEK and proceed to the next step.
      // As noted in
      // {@link https://datatracker.ietf.org/doc/html/rfc7516#section-11.5 | RFC 7516 Section 11.5},
      // to mitigate the attacks described in
      // {@link https://datatracker.ietf.org/doc/html/rfc3218 | RFC 3218}, the recipient MUST NOT
      // distinguish between format, padding, and length errors of encrypted keys. It is strongly
      // recommended, in the event of receiving an improperly formatted key, that the recipient
      // substitute a randomly generated CEK and proceed to the next step, to mitigate timing
      // attacks.
      cek = typeof key === 'string'
        ? await keyManager.generateKey({ algorithm: joseHeader.enc })
        : await crypto.generateKey({ algorithm: joseHeader.enc });
    }

    // If present, decode the JWE Initialization Vector (IV) and Authentication Tag.
    const iv = decodeHeaderParam('iv', jwe.iv);
    const tag = decodeHeaderParam('tag', jwe.tag);

    // Decode the JWE Ciphertext to a byte array, and if present, append the Authentication Tag.
    const ciphertext = tag !== undefined
      ? new Uint8Array([
        ...Convert.base64Url(jwe.ciphertext).toUint8Array(),
        ...(tag ?? [])
      ])
      : Convert.base64Url(jwe.ciphertext).toUint8Array();

    // If the JWE Additional Authenticated Data (AAD) is present, the Additional Authenticated Data
    // input to the Content Encryption Algorithm is
    // ASCII(Encoded Protected Header || '.' || BASE64URL(JWE AAD)). If the JWE AAD is absent, the
    // Additional Authenticated Data is ASCII(BASE64URL(UTF8(JWE Protected Header))).
    const additionalData = jwe.aad !== undefined
      ? new Uint8Array([
        ...Convert.string(jwe.protected ?? '').toUint8Array(),
        ...Convert.string('.').toUint8Array(),
        ...Convert.string(jwe.aad).toUint8Array()
      ])
      : Convert.string(jwe.protected ?? '').toUint8Array();

    // Decrypt the JWE using the Content Encryption Key (CEK) with:
    // - Key Manager: If the CEK is a Key Identifier.
    // - Crypto API: If the CEK is a JWK.
    const plaintext = typeof cek === 'string'
      ? await keyManager.decrypt({ keyUri: cek, data: ciphertext, iv, additionalData })
      : await crypto.decrypt({ key: cek, data: ciphertext, iv, additionalData });

    return {
      plaintext,
      protectedHeader             : parsedProtectedHeader,
      additionalAuthenticatedData : decodeHeaderParam('aad', jwe.aad),
      sharedUnprotectedHeader     : jwe.unprotected,
      unprotectedHeader           : jwe.header
    };
  }

  public static async encrypt<
    TKeyManager extends KeyManager | undefined = KeyManager,
    TCrypto extends CryptoApi | undefined = CryptoApi
  >({
    key,
    plaintext,
    additionalAuthenticatedData,
    protectedHeader,
    sharedUnprotectedHeader,
    unprotectedHeader,
    keyManager = new LocalKeyManager(),
    crypto = new AgentCryptoApi(),
  }: FlattenedJweEncryptParams<TKeyManager, TCrypto>): Promise<FlattenedJwe> {
    // Verify that the provided Crypto API supports the decrypt operation before proceeding.
    if (!isCipher(crypto)) {
      throw new CryptoError(CryptoErrorCode.OperationNotSupported, 'Crypto API does not support the "encrypt" operation.');
    }
    // Verify that the provided Key Manager supports the decrypt operation before proceeding.
    if (!isCipher(keyManager)) {
      throw new CryptoError(CryptoErrorCode.OperationNotSupported, 'Key Manager does not support the "decrypt" operation.');
    }

    // Verify that at least one of the JOSE header objects is present.
    if (!protectedHeader && !sharedUnprotectedHeader && !unprotectedHeader) {
      throw new CryptoError(CryptoErrorCode.InvalidJwe,
        'JWE is missing the required JOSE header parameters. ' +
            'Please provide at least one of the following: "protectedHeader", "sharedUnprotectedHeader", or "unprotectedHeader"'
      );
    }

    // Verify that the Plaintext is present.
    if (!(plaintext instanceof Uint8Array)) {
      throw new CryptoError(CryptoErrorCode.InvalidJwe, 'Plaintext is missing or not a byte array.');
    }

    // Per {@link https://www.rfc-editor.org/rfc/rfc7516#section-5.2 | RFC7516 Section 5.2}
    // the resulting JOSE Header MUST NOT contain duplicate Header Parameter names. In other words,
    // the same Header Parameter name MUST NOT occur in the `header`, `protected`, and
    // `unprotected` JSON object values that together comprise the JOSE Header.
    if (hasDuplicateProperties(protectedHeader, sharedUnprotectedHeader, unprotectedHeader)){
      throw new Error(
        'Duplicate properties detected. Please ensure that each parameter is defined only once ' +
        'across the JWE "protectedHeader", "sharedUnprotectedHeader", and "unprotectedHeader" objects.'
      );
    }

    // The JOSE Header is the union of the members of the JWE Protected Header (`protectedHeader`),
    // the JWE Shared Unprotected Header (`sharedUnprotectedHeader`), and the corresponding JWE
    // Per-Recipient Unprotected Header (`unprotectedHeader`).
    const joseHeader = { ...protectedHeader, ...sharedUnprotectedHeader, ...unprotectedHeader };

    if (!isValidJweHeader(joseHeader)) {
      throw new Error('JWE Header is missing required "alg" (Algorithm) and/or "enc" (Encryption) Header Parameters');
    }

    const { cek, encryptedKey } = await JweKeyManagement.encrypt({ key, joseHeader, keyManager, crypto });

    // If required for the Content Encryption Algorithm, generate a random JWE Initialization
    // Vector (IV) of the correct size; otherwise, let the JWE Initialization Vector be the empty
    // octet sequence.
    let iv: Uint8Array;
    switch (joseHeader.enc) {
      case 'A128GCM':
      case 'A192GCM':
      case 'A256GCM':
        iv = cryptoUtils.randomBytes(12);
        break;
      default:
        iv = new Uint8Array(0);
    }

    // Compute the Encoded Protected Header value BASE64URL(UTF8(JWE Protected Header)).  If the JWE
    // Protected Header is not present, let this value be the empty string.
    const encodedProtectedHeader = protectedHeader
      ? Convert.object(protectedHeader).toBase64Url()
      : '';

    // If the JWE Additional Authenticated Data (AAD) is present, the Additional Authenticated Data
    // input to the Content Encryption Algorithm is
    // ASCII(Encoded Protected Header || '.' || BASE64URL(JWE AAD)). If the JWE AAD is absent, the
    // Additional Authenticated Data is ASCII(BASE64URL(UTF8(JWE Protected Header))).
    let additionalData: Uint8Array;
    let encodedAad: string | undefined;
    if (additionalAuthenticatedData) {
      encodedAad = Convert.uint8Array(additionalAuthenticatedData).toBase64Url();
      additionalData = Convert.string(encodedProtectedHeader + '.' + encodedAad).toUint8Array();
    } else {
      additionalData = Convert.string(encodedProtectedHeader).toUint8Array();
    }

    // Encrypt the plaintext using the CEK, the JWE Initialization Vector, and the Additional
    // Authenticated Data value using the specified content encryption algorithm to create the JWE
    // Ciphertext value and the JWE Authentication Tag.
    const ciphertextWithTag = typeof cek === 'string'
      ? await keyManager.encrypt({ keyUri: cek, data: plaintext, iv, additionalData })
      : await crypto.encrypt({ key: cek, data: plaintext, iv, additionalData });
    const ciphertext = ciphertextWithTag.slice(0, -16);
    const authenticationTag = ciphertextWithTag.slice(-16);

    // Create the Flattened JWE JSON Serialization output, which is based upon the General syntax,
    // but flattens it, optimizing it for the single-recipient case. It flattens it by removing the
    // "recipients" member and instead placing those members defined for use in the "recipients"
    // array (the "header" and "encrypted_key" members) in the top-level JSON object (at the same
    // level as the "ciphertext" member).
    const jwe = new FlattenedJwe({
      ciphertext: Convert.uint8Array(ciphertext).toBase64Url(),
    });
    if (encryptedKey) jwe.encrypted_key = Convert.uint8Array(encryptedKey).toBase64Url();
    if (protectedHeader) jwe.protected = encodedProtectedHeader;
    if (sharedUnprotectedHeader) jwe.unprotected = sharedUnprotectedHeader;
    if (unprotectedHeader) jwe.header = unprotectedHeader;
    if (iv) jwe.iv = Convert.uint8Array(iv).toBase64Url();
    if (encodedAad) jwe.aad = encodedAad;
    if (authenticationTag) jwe.tag = Convert.uint8Array(authenticationTag).toBase64Url();

    return jwe;
  }
}