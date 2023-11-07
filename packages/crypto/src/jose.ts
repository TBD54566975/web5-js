import { sha256 } from '@noble/hashes/sha256';
import { Convert, Multicodec, MulticodecCode, MulticodecDefinition, removeUndefinedProperties } from '@web5/common';

import type { Web5Crypto } from './types/web5-crypto.js';

import { keyToMultibaseId } from './utils.js';
import { CryptoKey } from './algorithms-api/index.js';
import { Ed25519, Secp256k1, X25519 } from './crypto-primitives/index.js';

/**
 * JSON Web Key Operations
 *
 * decrypt    : Decrypt content and validate decryption, if applicable
 * deriveBits : Derive bits not to be used as a key
 * deriveKey  : Derive key
 * encrypt    : Encrypt content
 * sign       : Compute digital signature or MAC
 * unwrapKey  : Decrypt key and validate decryption, if applicable
 * verify     : Verify digital signature or MAC
 * wrapKey    : Encrypt key
 */
export type JwkOperation = Web5Crypto.KeyUsage[] | string[];

/**
 * JSON Web Key Use
 *
 * sig : Digital Signature or MAC
 * enc : Encryption
 */
export type JwkUse = 'sig' | 'enc' | string;

/**
 * JSON Web Key Types
 */
export type JwkType =
  /**
   * Elliptic Curve
   * Used with Elliptic Curve Digital Signature Algorithm (ECDSA) and Elliptic
   * Curve Diffie-Hellman (ECDH), including secp256k1, P-256, P-384, and P-521.
   */
  | 'EC'
  /**
   * RSA
   * Widely used for encryption and digital signatures. RSA keys are used in
   * various algorithms like RS256, RS384, RS512, etc.
   */
  | 'RSA'
  /**
   * Octet sequence
   * Used with symmetric signing (e.g., HMAC HS256, HS512, etc.) and
   * symmetric encryption (e.g., A256CBC-HS512, A256GCM, etc.) algorithms.
   */
  | 'oct'
  /**
   * Octet string key pairs (OKP)
   * A type of public key that is used with algorithms such as EdDSA (Ed25519 and
   * Ed448 curves) and ECDH (X25519 and X448 curves).
   */
  | 'OKP'

/**
 * JSON Web Key Elliptic Curve
 */
export type JwkNamedCurves =
  // P-256 Curve
  | 'P-256'
  // P-384 Curve
  | 'P-384'
  // P-521 Curve
  | 'P-521'
  // Ed25519 signature algorithm key pairs
  | 'Ed25519'
  // Ed448 signature algorithm key pairs
  | 'Ed448'
  // X25519 function key pairs
  | 'X25519'
  // X448 function key pairs
  | 'X448'
  // SECG secp256k1 curve
  | 'secp256k1';

/**
 * JSON Web Key Parameters
 */

// Used with any "kty" (key type) value.
export type JwkParamsAnyKeyType = {
  // The algorithm intended for use with the key
  alg?: string;
  // Extractable
  ext?: 'true' | 'false';
  // Key Operations
  key_ops?: JwkOperation;
  // Key ID
  kid?: string;
  // Key Type
  kty: JwkType;
  // Public Key Use
  use?: JwkUse;
  // X.509 Certificate Chain
  x5c?: string;
  // X.509 Certificate SHA-1 Thumbprint
  x5t?: string;
  // X.509 Certificate SHA-256 Thumbprint
  'x5t#S256'?: string;
  // X.509 URL
  x5u?: string;
}

// Used with "EC" (elliptic curve) public keys.
export type JwkParamsEcPublic = Omit<JwkParamsAnyKeyType, 'alg' | 'kty'> & {
  /**
   * The algorithm intended for use with the key.
   * ES256  : ECDSA using P-256 and SHA-256
   * ES256K : ECDSA using secp256k1 curve and SHA-256
   * ES384  : ECDSA using P-384 and SHA-384
   * ES512  : ECDSA using P-521 and SHA-512
   */
  alg?: 'ES256' | 'ES256K' | 'ES384' | 'ES512';

  /**
   * Elliptic Curve key pair.
   */
  kty: 'EC';

  /**
   * The cryptographic curve used with the key.
   * MUST be present for all EC public keys.
   */
  crv: 'secp256k1' | 'P-256' | 'P-384' | 'P-521';

  /**
   * The x-coordinate for the Elliptic Curve point.
   * Represented as the base64url encoding of the octet string
   * representation of the coordinate.
   * MUST be present for all EC public keys
   */
  x: string;

  /**
   * The y-coordinate for the Elliptic Curve point.
   * Represented as the base64url encoding of the octet string
   * representation of the coordinate.
   * MUST be present only for secp256k1 public keys.
   */
  y?: string;
}

// Used with "EC" (elliptic curve) private keys.
export type JwkParamsEcPrivate = JwkParamsEcPublic & {
  /**
   * The d-coordinate for the Elliptic Curve point.
   * Represented as the base64url encoding of the octet string
   * representation of the coordinate.
   * MUST be present for all EC private keys.
   */
  d: string;
}

// Used with "OKP" (octet key pair) public keys.
export type JwkParamsOkpPublic =
  Omit<JwkParamsAnyKeyType, 'kty' | 'alg' | 'crv'> &
  Pick<JwkParamsEcPublic, 'x'> & {
  /**
   * The algorithm intended for use with the key.
   * EdDSA: Edwards Curve Digital Signature Algorithm
   */
  alg?: 'EdDSA';

  /**
   * The cryptographic curve used with the key.
   * MUST be present for all OKP public keys.
   */
  crv: 'Ed25519' | 'Ed448' | 'X25519' | 'X448';

  /**
   * Key type
   * OKP (Octet Key Pair) is defined for public key algorithms that use octet
   * strings as private and public keys.
   */
  kty: 'OKP';
}

// Used with "OKP" (octet key pair) private keys.
export type JwkParamsOkpPrivate = JwkParamsOkpPublic & {
  /**
   * The d-coordinate for the Edwards Curve point.
   * Represented as the base64url encoding of the octet string
   * representation of the coordinate.
   * MUST be present for all EC private keys.
   */
    d: string;
};

// Used with "oct" (octet sequence) private keys.
export type JwkParamsOctPrivate = Omit<JwkParamsAnyKeyType, 'alg' | 'kty'> & {
  /**
   * The algorithm intended for use with the key.
   * Used with symmetric signing (e.g., HMAC HS256, etc.) and
   * symmetric encryption (e.g., A256GCM, etc.) algorithms.
   */
  alg?:
    // AES CBC using 128-bit key
    | 'A128CBC'
    // AES CBC using 192-bit key
    | 'A192CBC'
    // AES CBC using 256-bit key
    | 'A256CBC'
    // AES CTR using 128-bit key
    | 'A128CTR'
    // AES CTR using 192-bit key
    | 'A192CTR'
    // AES CTR using 256-bit key
    | 'A256CTR'
    // AES GCM using a 128-bit key
    | 'A128GCM'
    // AES GCM using a 192-bit key
    | 'A192GCM'
    // AES GCM using a 256-bit key
    | 'A256GCM'
    // HMAC using SHA-256
    | 'HS256'
    // HMAC using SHA-384
    | 'HS384'
    // HMAC using SHA-512
    | 'HS512'

  /**
   * The "k" (key value) parameter contains the value of the symmetric
   * (or other single-valued) key.  It is represented as the base64url
   * encoding of the octet sequence containing the key value.
   */
  k: string;

  /**
   * Key type
   * oct (Octet Sequence) is defined for symmetric encryption and
   * symmetric signature algorithms.
   */
  kty: 'oct';
}

// Used with "RSA" public keys.
export type JwkParamsRsaPublic = Omit<JwkParamsAnyKeyType, 'kty'> & {
  // Public exponent for RSA
  e: string;

  /**
   * Key type
   * RSA is widely used for encryption and digital signatures.
   */
  kty: 'RSA';

  // Modulus for RSA
  n: string;
};

// Used with "RSA" private keys.
export type JwkParamsRsaPrivate = JwkParamsRsaPublic & {
  // Private exponent for RSA
  d: string;
  // First prime factor for RSA
  p?: string;
  // Second prime factor for RSA
  q?: string;
  // First factor's CRT exponent for RSA
  dp?: string;
  // Second factor's CRT exponent for RSA
  dq?: string;
  // First CRT coefficient for RSA
  qi?: string;
  // Other primes information (optional in RFC 7518)
  oth?: {
    r: string;
    d: string;
    t: string;
  }[];
};

export type PublicKeyJwk = JwkParamsEcPublic | JwkParamsOkpPublic | JwkParamsRsaPublic;

export type PrivateKeyJwk = JwkParamsEcPrivate | JwkParamsOkpPrivate | JwkParamsOctPrivate | JwkParamsRsaPrivate;

export type JwkKeyPair = {
  publicKeyJwk: PublicKeyJwk;
  privateKeyJwk: PrivateKeyJwk;
}

export type JsonWebKey = PrivateKeyJwk | PublicKeyJwk;

export interface JoseHeaderParams {
  // Content Type
  cty?: string;
  // JWK Set URL
  jku?: string;
  // JSON Web Key
  jwk?: PublicKeyJwk;
  // Key ID
  kid?: string;
  // Type
  typ?: string;
  // X.509 Certificate Chain
  x5c?: string[];
  // X.509 Certificate SHA-1 Thumbprint
  x5t?: string;
  // X.509 URL
  x5u?: string;
}

export interface JwsHeaderParams extends JoseHeaderParams {
  alg:
    // Edwards curve digital signature algorithm (e.g., Ed25519)
    | 'EdDSA'
    // ECDSA using P-256 and SHA-256
    | 'ES256'
    // ECDSA using secp256k1 curve and SHA-256
    | 'ES256K'
    // ECDSA using P-384 and SHA-384
    | 'ES384'
    // ECDSA using P-521 and SHA-512
    | 'ES512'
    // HMAC using SHA-256
    | 'HS256'
    // HMAC using SHA-384
    | 'HS384'
    // HMAC using SHA-512
    | 'HS512';

  // Indicates that extensions to JOSE RFCs are being used
  // that MUST be understood and processed.
  crit?: string[]

  // Additional Public or Private Header Parameter names.
  [key: string]: unknown
}

export interface JweHeaderParams extends JoseHeaderParams {
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
    | 'PBES2-HS512+XC20PKW';

  apu?: Uint8Array;

  apv?: Uint8Array;

  // Indicates that extensions to JOSE RFCs are being used
  // that MUST be understood and processed.
  crit?: string[]

  /**
   * Cryptographic Algorithms for Content Encryption
   * JWE uses cryptographic algorithms to encrypt and integrity-protect the
   * plaintext and to integrity-protect the Additional Authenticated Data.
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
    | 'XC20P';

  epk?: Uint8Array;

  iv?: Uint8Array;

  p2c?: number;

  p2s?: string;

  // Additional Public or Private Header Parameter names.
  [key: string]: unknown
}

const joseToWebCryptoMapping: { [key: string]: Web5Crypto.GenerateKeyOptions } = {
  'Ed25519'          : { name: 'EdDSA', namedCurve: 'Ed25519' },
  'Ed448'            : { name: 'EdDSA', namedCurve: 'Ed448' },
  'X25519'           : { name: 'ECDH', namedCurve: 'X25519' },
  'secp256k1:ES256K' : { name: 'ECDSA', namedCurve: 'secp256k1' },
  'secp256k1'        : { name: 'ECDH', namedCurve: 'secp256k1' },
  'P-256'            : { name: 'ECDSA', namedCurve: 'P-256' },
  'P-384'            : { name: 'ECDSA', namedCurve: 'P-384' },
  'P-521'            : { name: 'ECDSA', namedCurve: 'P-521' },
  'A128CBC'          : { name: 'AES-CBC', length: 128 },
  'A192CBC'          : { name: 'AES-CBC', length: 192 },
  'A256CBC'          : { name: 'AES-CBC', length: 256 },
  'A128CTR'          : { name: 'AES-CTR', length: 128 },
  'A192CTR'          : { name: 'AES-CTR', length: 192 },
  'A256CTR'          : { name: 'AES-CTR', length: 256 },
  'A128GCM'          : { name: 'AES-GCM', length: 128 },
  'A192GCM'          : { name: 'AES-GCM', length: 192 },
  'A256GCM'          : { name: 'AES-GCM', length: 256 },
  'HS256'            : { name: 'HMAC', hash: { name: 'SHA-256' } },
  'HS384'            : { name: 'HMAC', hash: { name: 'SHA-384' } },
  'HS512'            : { name: 'HMAC', hash: { name: 'SHA-512' } },
};

const webCryptoToJoseMapping: { [key: string]: Partial<JsonWebKey> } = {
  'EdDSA:Ed25519'   : { alg: 'EdDSA',   crv: 'Ed25519',   kty: 'OKP' },
  'EdDSA:Ed448'     : { alg: 'EdDSA',   crv: 'Ed448',     kty: 'OKP' },
  'ECDH:X25519'     : {                 crv: 'X25519',    kty: 'OKP' },
  'ECDSA:secp256k1' : { alg: 'ES256K',  crv: 'secp256k1', kty: 'EC' },
  'ECDH:secp256k1'  : {                 crv: 'secp256k1', kty: 'EC' },
  'ECDSA:P-256'     : { alg: 'ES256',   crv: 'P-256',     kty: 'EC' },
  'ECDSA:P-384'     : { alg: 'ES384',   crv: 'P-384',     kty: 'EC' },
  'ECDSA:P-521'     : { alg: 'ES512',   crv: 'P-521',     kty: 'EC' },
  'AES-CBC:128'     : { alg: 'A128CBC',                   kty: 'oct' },
  'AES-CBC:192'     : { alg: 'A192CBC',                   kty: 'oct' },
  'AES-CBC:256'     : { alg: 'A256CBC',                   kty: 'oct' },
  'AES-CTR:128'     : { alg: 'A128CTR',                   kty: 'oct' },
  'AES-CTR:192'     : { alg: 'A192CTR',                   kty: 'oct' },
  'AES-CTR:256'     : { alg: 'A256CTR',                   kty: 'oct' },
  'AES-GCM:128'     : { alg: 'A128GCM',                   kty: 'oct' },
  'AES-GCM:192'     : { alg: 'A192GCM',                   kty: 'oct' },
  'AES-GCM:256'     : { alg: 'A256GCM',                   kty: 'oct' },
  'HMAC:SHA-256'    : { alg: 'HS256',                     kty: 'oct' },
  'HMAC:SHA-384'    : { alg: 'HS384',                     kty: 'oct' },
  'HMAC:SHA-512'    : { alg: 'HS512',                     kty: 'oct' },
};

const multicodecToJoseMapping: { [key: string]: JsonWebKey } = {
  'ed25519-pub'    : { alg: 'EdDSA',  crv: 'Ed25519',   kty: 'OKP', x: '' },
  'ed25519-priv'   : { alg: 'EdDSA',  crv: 'Ed25519',   kty: 'OKP', x: '',        d: '' },
  'secp256k1-pub'  : { alg: 'ES256K', crv: 'secp256k1', kty: 'EC',  x: '', y: ''},
  'secp256k1-priv' : { alg: 'ES256K', crv: 'secp256k1', kty: 'EC',  x: '', y: '', d: '' },
  'x25519-pub'     : {                crv: 'X25519',    kty: 'OKP', x: '' },
  'x25519-priv'    : {                crv: 'X25519',    kty: 'OKP', x: '',        d: '' },
};

const joseToMulticodecMapping: { [key: string]: string } = {
  'Ed25519:public'    : 'ed25519-pub',
  'Ed25519:private'   : 'ed25519-priv',
  'secp256k1:public'  : 'secp256k1-pub',
  'secp256k1:private' : 'secp256k1-priv',
  'X25519:public'     : 'x25519-pub',
  'X25519:private'    : 'x25519-priv',
};

export class Jose {

  public static async cryptoKeyToJwk(options: {
    key: Web5Crypto.CryptoKey,
  }): Promise<JsonWebKey> {
    const { algorithm, extractable, material, type, usages } = options.key;

    // Translate WebCrypto algorithm to JOSE format.
    let jsonWebKey = Jose.webCryptoToJose(algorithm) as JsonWebKey;

    // Set extractable parameter.
    jsonWebKey.ext = extractable ? 'true' : 'false';

    // Set key use parameter.
    jsonWebKey.key_ops = usages;

    jsonWebKey = await Jose.keyToJwk({
      keyMaterial : material,
      keyType     : type,
      ...jsonWebKey
    });

    return { ...jsonWebKey };
  }

  public static async cryptoKeyToJwkPair(options: {
    keyPair: Web5Crypto.CryptoKeyPair,
  }): Promise<JwkKeyPair> {
    const { keyPair } = options;

    // Convert public and private keys into JSON Web Key format.
    const privateKeyJwk = await Jose.cryptoKeyToJwk({ key: keyPair.privateKey }) as PrivateKeyJwk;
    const publicKeyJwk = await Jose.cryptoKeyToJwk({ key: keyPair.publicKey }) as PublicKeyJwk;

    // Assemble as a JWK key pair
    const jwkKeyPair: JwkKeyPair = { privateKeyJwk, publicKeyJwk };

    return { ...jwkKeyPair };
  }

  public static async joseToMulticodec(options: {
    key: JsonWebKey
  }): Promise<MulticodecDefinition<MulticodecCode>> {
    const jsonWebKey = options.key;

    const params: string[] = [];

    if ('crv' in jsonWebKey) {
      params.push(jsonWebKey.crv);
      if ('d' in jsonWebKey) {
        params.push('private');
      } else {
        params.push('public');
      }
    }

    const lookupKey = params.join(':');
    const name = joseToMulticodecMapping[lookupKey];

    if (name === undefined) {
      throw new Error(`Unsupported JOSE to Multicodec conversion: '${lookupKey}'`);
    }

    const code = Multicodec.getCodeFromName({ name });

    return { code, name };
  }

  public static joseToWebCrypto(options:
    Partial<JsonWebKey>
  ): Web5Crypto.GenerateKeyOptions {
    const params: string[] = [];

    /**
     * All Elliptic Curve (EC) and Octet Key Pair (OKP) JSON Web Keys
     * set a value for the "crv" parameter.
     */
    if ('crv' in options && options.crv) {
      params.push(options.crv);
      // Special case for secp256k1. If alg is "ES256K", then ECDSA. Else ECDH.
      if (options.crv === 'secp256k1' && options.alg === 'ES256K') {
        params.push(options.alg);
      }

    /**
     * All Octet Sequence (oct) JSON Web Keys omit "crv" and
     * set a value for the "alg" parameter.
     */
    } else if (options.alg !== undefined) {
      params.push(options.alg);

    } else {
      throw new TypeError(`One or more parameters missing: 'alg' or 'crv'`);
    }

    const lookupKey = params.join(':');
    const webCrypto = joseToWebCryptoMapping[lookupKey];

    if (webCrypto === undefined) {
      throw new Error(`Unsupported JOSE to WebCrypto conversion: '${lookupKey}'`);
    }

    return { ...webCrypto };
  }

  /**
   * Computes the thumbprint of a JSON Web Key (JWK) using the method
   * specified in RFC 7638. This function accepts RSA, EC, OKP, and oct keys
   * and returns the thumbprint as a base64url encoded SHA-256 hash of the
   * JWK's required members, serialized and sorted lexicographically.
   *
   * Purpose:
   * - Uniquely Identifying Keys: The thumbprint allows the unique
   *   identification of a specific JWK within a set of JWKs. It provides a
   *   deterministic way to generate a value that can be used as a key
   *   identifier (kid) or to match a specific key.
   *
   * - Simplifying Key Management: In systems where multiple keys are used,
   *   managing and identifying individual keys can become complex. The
   *   thumbprint method simplifies this by creating a standardized, unique
   *   identifier for each key.
   *
   * - Enabling Interoperability: By standardizing the method to compute a
   *   thumbprint, different systems can compute the same thumbprint value for
   *   a given JWK. This enables interoperability among systems that use JWKs.
   *
   * - Secure Comparison: The thumbprint provides a way to securely compare
   *   JWKs to determine if they are equivalent.
   *
   * @param jwk - The JSON Web Key for which the thumbprint will be computed.
   *              This must be an RSA, EC, OKP, or oct key.
   * @returns The thumbprint as a base64url encoded string.
   * @throws {Error} Throws an error if the provided key type is unsupported.
   *
   * @example
   * const jwk: PublicKeyJwk = {
   *   'kty': 'EC',
   *   'crv': 'secp256k1',
   *   'x': '61iPYuGefxotzBdQZtDvv6cWHZmXrTTscY-u7Y2pFZc',
   *   'y': '88nPCVLfrAY9i-wg5ORcwVbHWC_tbeAd1JE2e0co0lU'
   * };
   *
   * const thumbprint = jwkThumbprint(jwk);
   * console.log(`JWK thumbprint: ${thumbprint}`);
   *
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7638 | RFC7638} for
   * the specification of JWK thumbprint computation.
   */
  public static async jwkThumbprint(options: {
    key: JsonWebKey
  }): Promise<string> {
    const { key } = options;

    /** Step 1 - Normalization: The JWK is normalized to include only specific
     * members and in lexicographic order.
     * */
    const keyType = key.kty;
    let normalizedJwk: Partial<JsonWebKey>;
    if (keyType === 'EC') {
      normalizedJwk = { crv: key.crv, kty: key.kty, x: key.x, y: key.y };
    } else if (keyType === 'oct') {
      normalizedJwk = { k: key.k, kty: key.kty };
    } else if (keyType === 'OKP') {
      normalizedJwk = { crv: key.crv, kty: key.kty, x: key.x };
    } else if (keyType === 'RSA') {
      normalizedJwk = { e: key.e, kty: key.kty, n: key.n };
    } else {
      throw new Error(`Unsupported key type: ${keyType}`);
    }
    removeUndefinedProperties(normalizedJwk);

    /** Step 2 - Serialization: The normalized JWK is serialized to a UTF-8
     * representation of its JSON encoding. */
    const serializedJwk = Jose.canonicalize(normalizedJwk);

    /** Step 3 - Digest Calculation: A cryptographic hash function
     * (SHA-256 is recommended) is applied to the serialized JWK,
     * resulting in the thumbprint. */
    const utf8Bytes = Convert.string(serializedJwk).toUint8Array();
    const digest = sha256(utf8Bytes);

    // Encode as Base64Url.
    const thumbprint = Convert.uint8Array(digest).toBase64Url();

    return thumbprint;
  }

  public static async jwkToCryptoKey(options: {
    key: JsonWebKey
  }): Promise<Web5Crypto.CryptoKey> {
    const jsonWebKey = options.key;

    const { keyMaterial, keyType } = await Jose.jwkToKey({ key: jsonWebKey });

    // Translate JOSE format to WebCrypto algorithm.
    let algorithm = Jose.joseToWebCrypto(jsonWebKey) as Web5Crypto.GenerateKeyOptions;

    // Set extractable parameter.
    let extractable: boolean;
    if ('ext' in jsonWebKey && jsonWebKey.ext !== undefined) {
      extractable = jsonWebKey.ext === 'true' ? true : false;
    } else {
      throw new Error(`Conversion from JWK to CryptoKey failed. Required parameter missing: 'ext'`);
    }

    // Set key use parameter.
    let keyUsage: Web5Crypto.KeyUsage[];
    if ('key_ops' in jsonWebKey && jsonWebKey.key_ops !== undefined) {
      keyUsage = jsonWebKey.key_ops as Web5Crypto.KeyUsage[];
    } else {
      throw new Error(`Conversion from JWK to CryptoKey failed. Required parameter missing: 'key_ops'`);
    }

    const cryptoKey = new CryptoKey(
      algorithm,
      extractable,
      keyMaterial,
      keyType,
      keyUsage
    );

    return cryptoKey;
  }

  public static async jwkToKey(options: {
    key: JsonWebKey
  }): Promise<{ keyMaterial: Uint8Array, keyType: Web5Crypto.KeyType }> {
    const jsonWebKey = options.key;

    let keyMaterial: Uint8Array;
    let keyType: Web5Crypto.KeyType;

    // Asymmetric private key ("EC" or "OKP" - Curve25519 or SECG curves).
    if ('d' in jsonWebKey) {
      keyMaterial = Convert.base64Url(jsonWebKey.d).toUint8Array();
      keyType = 'private';
    }

    // Asymmetric public key ("EC" - secp256k1, secp256r1, secp384r1, secp521r1).
    else if ('y' in jsonWebKey && jsonWebKey.y) {
      const prefix = new Uint8Array([0x04]); // Designates an uncompressed key.
      const x = Convert.base64Url(jsonWebKey.x).toUint8Array();
      const y = Convert.base64Url(jsonWebKey.y).toUint8Array();

      const publicKey = new Uint8Array([...prefix, ...x, ...y]);
      keyMaterial = publicKey;
      keyType = 'public';
    }

    // Asymmetric public key ("OKP" - Ed25519, X25519).
    else if ('x' in jsonWebKey) {
      keyMaterial = Convert.base64Url(jsonWebKey.x).toUint8Array();
      keyType = 'public';
    }

    // Symmetric encryption or signature key ("oct" - AES, HMAC)
    else if ('k' in jsonWebKey) {
      keyMaterial = Convert.base64Url(jsonWebKey.k).toUint8Array();
      keyType = 'private';
    }

    else {
      throw new Error('Jose: Unknown JSON Web Key format.');
    }

    return { keyMaterial, keyType };
  }

  /**
  * Note: All secp public keys are converted to compressed point encoding
  *    before the multibase identifier is computed.
  *
  * Per {@link https://github.com/multiformats/multicodec/blob/master/table.csv | Multicodec table}:
  *    public keys for Elliptic Curve cryptography algorithms (e.g., secp256k1,
  *    secp256k1r1, secp384r1, etc.) are always represented with compressed point
  *    encoding (e.g., secp256k1-pub, p256-pub, p384-pub, etc.).
  *
  * Per {@link https://datatracker.ietf.org/doc/html/rfc8812#name-jose-and-cose-secp256k1-cur | RFC 8812}:
  *    "As a compressed point encoding representation is not defined for JWK
  *    elliptic curve points, the uncompressed point encoding defined there
  *    MUST be used. The x and y values represented MUST both be exactly
  *    256 bits, with any leading zeros preserved.
  *
  */
  public static async jwkToMultibaseId(options: {
    key: JsonWebKey
  }): Promise<string> {
    const jsonWebKey = options.key;

    // Convert the algorithm into Multicodec name format.
    const { name: multicodecName } = await Jose.joseToMulticodec({ key: jsonWebKey });

    // Decode the key as a raw binary data from the JWK.
    let { keyMaterial } = await Jose.jwkToKey({ key: jsonWebKey });

    // Convert secp256k1 public keys to compressed format.
    if ('crv' in jsonWebKey && !('d' in jsonWebKey)) {
      switch (jsonWebKey.crv) {
        case 'secp256k1': {
          keyMaterial = await Secp256k1.convertPublicKey({
            publicKey           : keyMaterial,
            compressedPublicKey : true
          });
          break;
        }
      }
    }

    // Compute the multibase identifier based on the provided key.
    const multibaseId = keyToMultibaseId({ key: keyMaterial, multicodecName });

    return multibaseId;
  }

  public static async keyToJwk(options:
    Partial<JsonWebKey> & {
    keyMaterial: Uint8Array,
    keyType: Web5Crypto.KeyType,
  }): Promise<JsonWebKey> {
    const { keyMaterial, keyType, ...jsonWebKeyOptions } = options;

    let jsonWebKey = { ...jsonWebKeyOptions } as JsonWebKey;

    /**
     * All Elliptic Curve (EC) and Octet Key Pair (OKP) keys
     * specify a "crv" (named curve) parameter.
     */
    if ('crv' in jsonWebKey) {
      switch (jsonWebKey.crv) {

        case 'Ed25519': {
          const publicKey = (keyType === 'private')
            ? await Ed25519.getPublicKey({ privateKey: keyMaterial })
            : keyMaterial;
          jsonWebKey.x = Convert.uint8Array(publicKey).toBase64Url();
          jsonWebKey.kty ??= 'OKP';
          break;
        }

        case 'X25519': {
          const publicKey = (keyType === 'private')
            ? await X25519.getPublicKey({ privateKey: keyMaterial })
            : keyMaterial;
          jsonWebKey.x = Convert.uint8Array(publicKey).toBase64Url();
          jsonWebKey.kty ??= 'OKP';
          break;
        }

        case 'secp256k1': {
          const points = await Secp256k1.getCurvePoints({ key: keyMaterial });
          jsonWebKey.x = Convert.uint8Array(points.x).toBase64Url();
          jsonWebKey.y = Convert.uint8Array(points.y).toBase64Url();
          jsonWebKey.kty ??= 'EC';
          break;
        }

        default: {
          throw new Error(`Unsupported key to JWK conversion: ${jsonWebKey.crv}`);
        }
      }

      if (keyType === 'private') {
        jsonWebKey = {
          d: Convert.uint8Array(keyMaterial).toBase64Url(),
          ...jsonWebKey
        };
      }
    }

    /**
     * All Octet Sequence (oct) symmetric encryption and signature keys
     * specify only an "alg" parameter.
     */
    if (!('crv' in jsonWebKey) && jsonWebKey.kty === 'oct') {
      jsonWebKey.k = Convert.uint8Array(keyMaterial).toBase64Url();
    }

    return { ...jsonWebKey };
  }

  public static async multicodecToJose(options: {
    code?: MulticodecCode,
    name?: string
  }): Promise<JsonWebKey> {
    let { code, name } = options;

    // Either code or name must be specified, but not both.
    if (!(name ? !code : code)) {
      throw new Error(`Either 'name' or 'code' must be defined, but not both.`);
    }

    // If name is undefined, lookup by code.
    name = (name === undefined ) ? Multicodec.getNameFromCode({ code: code! }) : name;

    const lookupKey = name;
    const jose = multicodecToJoseMapping[lookupKey];

    if (jose === undefined) {
      throw new Error(`Unsupported Multicodec to JOSE conversion: '${options.name}'`);
    }

    return { ...jose };
  }

  public static webCryptoToJose(options:
    Web5Crypto.Algorithm | Web5Crypto.GenerateKeyOptions
  ): Partial<JsonWebKey> {
    const params: string[] = [];

    /**
     * All WebCrypto algorithms have the "named" parameter.
     */
    params.push(options.name);

    /**
     * All Elliptic Curve (EC) WebCrypto algorithms
     * set a value for the "namedCurve" parameter.
     */
    if ('namedCurve' in options) {
      params.push(options.namedCurve);

    /**
     * All symmetric encryption (AES) WebCrypto algorithms
     * set a value for the "length" parameter.
     */
    } else if ('length' in options && options.length !== undefined) {
      params.push(options.length.toString());

    /**
     * All symmetric signature (HMAC) WebCrypto algorithms
     * set a value for the "hash" parameter.
     */
    } else if ('hash' in options) {
      params.push(options.hash.name);

    } else {
      throw new TypeError(`One or more parameters missing: 'name', 'namedCurve', 'length', or 'hash'`);
    }

    const lookupKey = params.join(':');
    const jose = webCryptoToJoseMapping[lookupKey];

    if (jose === undefined) {
      throw new Error(`Unsupported WebCrypto to JOSE conversion: '${lookupKey}'`);
    }

    return { ...jose };
  }

  private static canonicalize(obj: { [key: string]: any }): string {
    const sortedKeys = Object.keys(obj).sort();
    const sortedObj = sortedKeys.reduce<{ [key: string]: any }>((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, {});
    return JSON.stringify(sortedObj);
  }
}

type Constructable = new (...args: any[]) => object;

export function CryptoKeyToJwkMixin<T extends Constructable>(Base: T) {
  return class extends Base {
    public async toJwk(): Promise<JsonWebKey> {
      const jwk = Jose.cryptoKeyToJwk({ key: (this as unknown) as CryptoKey });
      return jwk;
    }
  };
}

export const CryptoKeyWithJwk = CryptoKeyToJwkMixin(CryptoKey);