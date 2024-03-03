import type { JoseHeaderParams, Jwk, KeyIdentifier } from '@web5/crypto';

import { utils as cryptoUtils } from '@web5/crypto';

import type { CryptoApi } from '../types/crypto-api.js';
import type { KeyManager } from '../types/key-manager.js';



// TODO: Once ready to migrate -- overwrite the existing `src/jose/jwe.ts` file with this one.

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





export interface CompactJweDecryptParams<TKeyManager, TCrypto> {
  jwe: string;

  key: KeyIdentifier | Jwk | Uint8Array;

  keyManager?: TKeyManager;

  crypto?: TCrypto;

  options?: JweDecryptOptions;
}



export interface CompactJweEncryptParams<TKeyManager, TCrypto> {
  plaintext: Uint8Array;

  protectedHeader: JweHeaderParams;

  key: KeyIdentifier | Jwk | Uint8Array;

  keyManager?: TKeyManager;

  crypto?: TCrypto;

  options?: JweEncryptOptions;
}




export interface CompactJweDecryptResult {
  /** Plaintext as a byte array. */
  plaintext: Uint8Array

  /** JWE Protected Header. */
  protectedHeader: JweHeaderParams
}

export class CompactJwe {
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














import { Convert } from '@web5/common';
import { LocalKeyManager } from '@web5/crypto';

import { isCipher } from '../utils.js';
import { AgentCryptoApi } from '../../../crypto-api.js';
import { hasDuplicateProperties } from '../../common/object.js';
import { CryptoError, CryptoErrorCode } from '../crypto-error.js';

function isValidJweHeader(obj: unknown): obj is JweHeaderParams {
  return typeof obj === 'object' && obj !== null
    && 'alg' in obj && obj.alg !== undefined
    && 'enc' in obj && obj.enc !== undefined;
}

export interface FlattenedJweEncryptParams<TKeyManager, TCrypto> extends FlattenedJweDecryptResult {
  key: KeyIdentifier | Jwk | Uint8Array;
  keyManager?: TKeyManager;
  crypto?: TCrypto;
  options?: JweEncryptOptions;
}

export interface FlattenedJweDecryptParams<TKeyManager, TCrypto> {
  jwe: FlattenedJweParams | FlattenedJwe;
  key: KeyIdentifier | Jwk | Uint8Array;
  keyManager?: TKeyManager;
  crypto?: TCrypto;
  options?: JweDecryptOptions;
}

export interface FlattenedJweDecryptResult {
  /** JWE Additional Authenticated Data (AAD). */
  additionalAuthenticatedData?: Uint8Array

  /** Plaintext. */
  plaintext: Uint8Array

  /** JWE Protected Header. */
  protectedHeader?: Partial<JweHeaderParams>

  /** JWE Shared Unprotected Header. */
  sharedUnprotectedHeader?: Partial<JweHeaderParams>

  /** JWE Per-Recipient Unprotected Header. */
  unprotectedHeader?: Partial<JweHeaderParams>
}

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

export interface FlattenedJweParams {
  aad?: string;
  ciphertext: string;
  encrypted_key?: string;
  header?: Partial<JweHeaderParams>;
  iv?: string;
  protected?: string;
  tag?: string;
  unprotected?: Partial<JweHeaderParams>;
}

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

export class FlattenedJwe {
  public aad?: string;
  public ciphertext: string = '';
  public encrypted_key?: string;
  public header?: Partial<JweHeaderParams>;
  public iv?: string;
  public protected?: string;
  public tag?: string;
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

      cek = await FlattenedJwe.decryptContentEncryptionKey({
        key,
        encryptedKey,
        joseHeader,
        keyManager,
        crypto
      });

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

    const { cek, encryptedKey } = await FlattenedJwe.encryptContentEncryptionKey({
      key,
      joseHeader,
      keyManager,
      crypto
    });

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
    if (unprotectedHeader) jwe.unprotected = unprotectedHeader;
    if (sharedUnprotectedHeader) jwe.header = sharedUnprotectedHeader;
    if (iv) jwe.iv = Convert.uint8Array(iv).toBase64Url();
    if (encodedAad) jwe.aad = encodedAad;
    if (authenticationTag) jwe.tag = Convert.uint8Array(authenticationTag).toBase64Url();

    return jwe;
  }

  private static async decryptContentEncryptionKey<
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

  private static async encryptContentEncryptionKey<
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