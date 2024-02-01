import { Convert, removeUndefinedProperties } from '@web5/common';

import { canonicalize } from './utils.js';
import { Sha256 } from '../primitives/sha256.js';

/**
 * Constant defining the prefix for JSON Web Keys (JWK) key URIs in this library.
 *
 * The prefix 'urn:jwk:' makes it explicit that a string represents a JWK, referenced by a
 * {@link https://datatracker.ietf.org/doc/html/rfc3986 | URI} (Uniform Resource Identifier),
 * which ensures consistent key referencing across all Web5 Key Management System (KMS)
 * implementations.
 *
 * These key URIs take the form `urn:jwk:<JWK thumbprint>`, where the
 * {@link https://datatracker.ietf.org/doc/html/rfc7638 | JWK thumbprint}, derived from the JWK, is
 * unique to the key's material, unaffected by the order or optional properties in the JWK.
 */
export const KEY_URI_PREFIX_JWK = 'urn:jwk:';

/**
 * JSON Web Key Operations
 *
 * The "key_ops" (key operations) parameter identifies the operation(s)
 * for which the key is intended to be used.  The "key_ops" parameter is
 * intended for use cases in which public, private, or symmetric keys
 * may be present.
 *
 * Its value is an array of key operation values.  Values defined by
 * {@link https://www.rfc-editor.org/rfc/rfc7517.html#section-4.3 | RFC 7517 Section 4.3} are:
 *
 * - "decrypt"    : Decrypt content and validate decryption, if applicable
 * - "deriveBits" : Derive bits not to be used as a key
 * - "deriveKey"  : Derive key
 * - "encrypt"    : Encrypt content
 * - "sign"       : Compute digital signature or MAC
 * - "unwrapKey"  : Decrypt key and validate decryption, if applicable
 * - "verify"     : Verify digital signature or MAC
 * - "wrapKey"    : Encrypt key
 *
 * Other values MAY be used.  The key operation values are case-
 * sensitive strings.  Duplicate key operation values MUST NOT be
 * present in the array.  Use of the "key_ops" member is OPTIONAL,
 * unless the application requires its presence.
 *
 * The "use" and "key_ops" JWK members SHOULD NOT be used together;
 * however, if both are used, the information they convey MUST be
 * consistent.  Applications should specify which of these members they
 * use, if either is to be used by the application.
 */
export type JwkOperation = 'encrypt' | 'decrypt' | 'sign' | 'verify' | 'deriveKey' | 'deriveBits' | 'wrapKey' | 'unwrapKey';

/**
 * JSON Web Key Use
 *
 * The "use" (public key use) parameter identifies the intended use of
 * the public key.  The "use" parameter is employed to indicate whether
 * a public key is used for encrypting data or verifying the signature
 * on data.
 *
 * Values defined by {@link https://datatracker.ietf.org/doc/html/rfc7517#section-4.2 | RFC 7517 Section 4.2} are:
 *
 * - "sig" (signature)
 * - "enc" (encryption)
 *
 * Other values MAY be used.  The "use" value is a case-sensitive
 * string.  Use of the "use" member is OPTIONAL, unless the application
 * requires its presence.
 *
 * The "use" and "key_ops" JWK members SHOULD NOT be used together;
 * however, if both are used, the information they convey MUST be
 * consistent.  Applications should specify which of these members they
 * use, if either is to be used by the application.
 *
 * When a key is used to wrap another key and a public key use
 * designation for the first key is desired, the "enc" (encryption) key
 * use value is used, since key wrapping is a kind of encryption.  The
 * "enc" value is also to be used for public keys used for key agreement
 * operations.
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

/** Parameters used with any "kty" (key type) value. */
export type JwkParamsAnyKeyType = {
  /** JWK Algorithm Parameter. The algorithm intended for use with the key. */
  alg?: string;
  /** JWK Extractable Parameter */
  ext?: 'true' | 'false';
  /** JWK Key Operations Parameter */
  key_ops?: JwkOperation[];
  /** JWK Key ID Parameter */
  kid?: string;
  /** JWK Key Type Parameter */
  kty: JwkType;
  /** JWK Public Key Use Parameter */
  use?: JwkUse;
  /** JWK X.509 Certificate Chain Parameter */
  x5c?: string;
  /** JWK X.509 Certificate SHA-1 Thumbprint Parameter */
  x5t?: string;
  /** JWK X.509 Certificate SHA-256 Thumbprint Parameter */
  'x5t#S256'?: string;
  /** JWK X.509 URL Parameter */
  x5u?: string;
}

/** Parameters used with "EC" (elliptic curve) public keys. */
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

/** Parameters used with "EC" (elliptic curve) private keys. */
export type JwkParamsEcPrivate = JwkParamsEcPublic & {
  /**
   * The d-coordinate for the Elliptic Curve point.
   * Represented as the base64url encoding of the octet string
   * representation of the coordinate.
   * MUST be present for all EC private keys.
   */
  d: string;
}

/** Parameters used with "OKP" (octet key pair) public keys. */
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

/** Parameters used with "OKP" (octet key pair) private keys. */
export type JwkParamsOkpPrivate = JwkParamsOkpPublic & {
  /**
   * The d-coordinate for the Edwards Curve point.
   * Represented as the base64url encoding of the octet string
   * representation of the coordinate.
   * MUST be present for all EC private keys.
   */
  d: string;
};

/** Parameters used with "oct" (octet sequence) private keys. */
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

/** Parameters Used with "RSA" public keys. */
export type JwkParamsRsaPublic = Omit<JwkParamsAnyKeyType, 'kty'> & {
  /** Public exponent for RSA */
  e: string;

  /**
   * Key type
   * RSA is widely used for encryption and digital signatures.
   */
  kty: 'RSA';

  /** Modulus for RSA */
  n: string;
};

/** Parameters used with "RSA" private keys. */
export type JwkParamsRsaPrivate = JwkParamsRsaPublic & {
  /** Private exponent for RSA */
  d: string;
  /** First prime factor for RSA */
  p?: string;
  /** Second prime factor for RSA */
  q?: string;
  /** First factor's CRT exponent for RSA */
  dp?: string;
  /** Second factor's CRT exponent for RSA */
  dq?: string;
  /** First CRT coefficient for RSA */
  qi?: string;
  /** Other primes information (optional in RFC 7518) */
  oth?: {
    /** Other primes' factor */
    r: string;
    /** Other primes' CRT exponent */
    d: string;
    /** Other primes' CRT coefficient */
    t: string;
  }[];
};

/** Parameters used with public keys in JWK format. */
export type PublicKeyJwk = JwkParamsEcPublic | JwkParamsOkpPublic | JwkParamsRsaPublic;

/** Parameters used with private keys in JWK format. */
export type PrivateKeyJwk = JwkParamsEcPrivate | JwkParamsOkpPrivate | JwkParamsOctPrivate | JwkParamsRsaPrivate;

/**
 * JSON Web Key ({@link https://datatracker.ietf.org/doc/html/rfc7517 | JWK}).
 * "RSA", "EC", "OKP", and "oct" key types are supported.
 */
export interface Jwk {
  // Common properties that apply to all key types.

  /** JWK Algorithm Parameter. The algorithm intended for use with the key. */
  alg?: string;
  /** JWK Extractable Parameter */
  ext?: 'true' | 'false';
  /** JWK Key Operations Parameter */
  key_ops?: JwkOperation[];
  /** JWK Key ID Parameter */
  kid?: string;
  /** JWK Key Type Parameter */
  kty: JwkType;
  /** JWK Public Key Use Parameter */
  use?: JwkUse;
  /** JWK X.509 Certificate Chain Parameter */
  x5c?: string;
  /** JWK X.509 Certificate SHA-1 Thumbprint Parameter */
  x5t?: string;
  /** JWK X.509 Certificate SHA-256 Thumbprint Parameter */
  'x5t#S256'?: string;
  /** JWK X.509 URL Parameter */
  x5u?: string;

  // Elliptic Curve (EC or OKP) public key properties.

  /** The cryptographic curve used with the key. */
  crv?: string;
  /** The x-coordinate for the Elliptic Curve point. */
  x?: string;
  /** The y-coordinate for the Elliptic Curve point. */
  y?: string;

  // Symmetric key properties.

  /** The "k" (key value) parameter contains the value of the symmetric (or other single-valued) key. */
  k?: string;

  // RSA public key properties.

  /** Public exponent for RSA */
  e?: string;
  /** Modulus for RSA */
  n?: string;
  /** First prime factor for RSA */
  p?: string;
  /** Second prime factor for RSA */
  q?: string;
  /** First factor's CRT exponent for RSA */
  dp?: string;
  /** Second factor's CRT exponent for RSA */
  dq?: string;
  /** First CRT coefficient for RSA */
  qi?: string;
  /** Other primes information (optional in RFC 7518) */
  oth?: {
    /** Other primes' factor */
    r: string;
    /** Other primes' CRT exponent */
    d: string;
    /** Other primes' CRT coefficient */
    t: string;
  }[];

  // Elliptic Curve and RSA private key properties.

  /** Private key component for EC, OKP, or RSA keys. */
  d?: string;

  // Additional public or private properties.
  [key: string]: unknown;
}

/**
 * JSON Web Key Set ({@link https://datatracker.ietf.org/doc/html/rfc7517 | JWK Set})
 *
 * @remarks
 * A JWK Set is a JSON object that represents a set of JWKs. The JSON object MUST have a "keys"
 * member, with its value being an array of JWKs.
 *
 * Additional members can be present in the JWK Set but member names MUST be unique. If not
 * understood by implementations encountering them, they MUST be ignored. Parameters for
 * representing additional properties of JWK Sets should either be registered in the IANA
 * "JSON Web Key Set Parameters" registry or be a value that contains a Collision-Resistant Name.
 */
export interface JwkSet {
  /** Array of JWKs */
  keys: Jwk[]
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
 * @example
 * ```ts
 * const jwk: PublicKeyJwk = {
 *   'kty': 'EC',
 *   'crv': 'secp256k1',
 *   'x': '61iPYuGefxotzBdQZtDvv6cWHZmXrTTscY-u7Y2pFZc',
 *   'y': '88nPCVLfrAY9i-wg5ORcwVbHWC_tbeAd1JE2e0co0lU'
 * };
 *
 * const thumbprint = jwkThumbprint(jwk);
 * console.log(`JWK thumbprint: ${thumbprint}`);
 * ```
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc7638 | RFC7638} for
 * the specification of JWK thumbprint computation.
 *
 * @param jwk - The JSON Web Key for which the thumbprint will be computed.
 *              This must be an RSA, EC, OKP, or oct key.
 * @returns The thumbprint as a base64url encoded string.
 * @throws Throws an `Error` if the provided key type is unsupported.
 */
export async function computeJwkThumbprint({ jwk }: {
  jwk: Jwk
}): Promise<string> {
  /** Step 1 - Normalization: The JWK is normalized to include only specific
   * members and in lexicographic order.
   */
  const keyType = jwk.kty;
  let normalizedJwk: Jwk;
  if (keyType === 'EC') {
    normalizedJwk = { crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y };
  } else if (keyType === 'oct') {
    normalizedJwk = { k: jwk.k, kty: jwk.kty };
  } else if (keyType === 'OKP') {
    normalizedJwk = { crv: jwk.crv, kty: jwk.kty, x: jwk.x };
  } else if (keyType === 'RSA') {
    normalizedJwk = { e: jwk.e, kty: jwk.kty, n: jwk.n };
  } else {
    throw new Error(`Unsupported key type: ${keyType}`);
  }
  removeUndefinedProperties(normalizedJwk);

  /** Step 2 - Serialization: The normalized JWK is serialized to a UTF-8
   * representation of its JSON encoding. */
  const serializedJwk = canonicalize(normalizedJwk);

  /** Step 3 - Digest Calculation: A cryptographic hash function
   * (SHA-256 is recommended) is applied to the serialized JWK,
   * resulting in the thumbprint. */
  const utf8Bytes = Convert.string(serializedJwk).toUint8Array();
  const digest = await Sha256.digest({ data: utf8Bytes });

  // Encode as Base64Url.
  const thumbprint = Convert.uint8Array(digest).toBase64Url();

  return thumbprint;
}

/**
 * Checks if the provided object is a valid elliptic curve private key in JWK format.
 *
 * @param obj - The object to check.
 * @returns True if the object is a valid EC private JWK; otherwise, false.
 */
export function isEcPrivateJwk(obj: unknown): obj is JwkParamsEcPrivate {
  if (!obj || typeof obj !== 'object') return false;
  if (!('kty' in obj && 'crv' in obj && 'x' in obj && 'd' in obj)) return false;
  if (obj.kty !== 'EC') return false;
  if (typeof obj.d !== 'string') return false;
  if (typeof obj.x !== 'string') return false;
  return true;
}

/**
 * Checks if the provided object is a valid elliptic curve public key in JWK format.
 *
 * @param obj - The object to check.
 * @returns True if the object is a valid EC public JWK; otherwise, false.
 */
export function isEcPublicJwk(obj: unknown): obj is JwkParamsEcPublic {
  if (!obj || typeof obj !== 'object') return false;
  if (!('kty' in obj && 'crv' in obj && 'x' in obj)) return false;
  if ('d' in obj) return false;
  if (obj.kty !== 'EC') return false;
  if (typeof obj.x !== 'string') return false;
  return true;
}

/**
 * Checks if the provided object is a valid octet sequence (symmetric key) in JWK format.
 *
 * @param obj - The object to check.
 * @returns True if the object is a valid oct private JWK; otherwise, false.
 */
export function isOctPrivateJwk(obj: unknown): obj is JwkParamsOctPrivate {
  if (!obj || typeof obj !== 'object') return false;
  if (!('kty' in obj && 'k' in obj)) return false;
  if (obj.kty !== 'oct') return false;
  if (typeof obj.k !== 'string') return false;
  return true;
}

/**
 * Checks if the provided object is a valid octet key pair private key in JWK format.
 *
 * @param obj - The object to check.
 * @returns True if the object is a valid OKP private JWK; otherwise, false.
 */
export function isOkpPrivateJwk(obj: unknown): obj is JwkParamsOkpPrivate {
  if (!obj || typeof obj !== 'object') return false;
  if (!('kty' in obj && 'crv' in obj && 'x' in obj && 'd' in obj)) return false;
  if (obj.kty !== 'OKP') return false;
  if (typeof obj.d !== 'string') return false;
  if (typeof obj.x !== 'string') return false;
  return true;
}

/**
 * Checks if the provided object is a valid octet key pair public key in JWK format.
 *
 * @param obj - The object to check.
 * @returns True if the object is a valid OKP public JWK; otherwise, false.
 */
export function isOkpPublicJwk(obj: unknown): obj is JwkParamsOkpPublic {
  if (!obj || typeof obj !== 'object') return false;
  if ('d' in obj) return false;
  if (!('kty' in obj && 'crv' in obj && 'x' in obj)) return false;
  if (obj.kty !== 'OKP') return false;
  if (typeof obj.x !== 'string') return false;
  return true;
}

/**
 * Checks if the provided object is a valid private key in JWK format of any supported type.
 *
 * @param obj - The object to check.
 * @returns True if the object is a valid private JWK; otherwise, false.
 */
export function isPrivateJwk(obj: unknown): obj is PrivateKeyJwk {
  if (!obj || typeof obj !== 'object') return false;

  const kty = (obj as { kty: string }).kty;

  switch (kty) {
    case 'EC':
    case 'OKP':
    case 'RSA':
      return 'd' in obj;
    case 'oct':
      return 'k' in obj;
    default:
      return false;
  }
}

/**
 * Checks if the provided object is a valid public key in JWK format of any supported type.
 *
 * @param obj - The object to check.
 * @returns True if the object is a valid public JWK; otherwise, false.
 */
export function isPublicJwk(obj: unknown): obj is PublicKeyJwk {
  if (!obj || typeof obj !== 'object') return false;

  const kty = (obj as { kty: string }).kty;

  switch (kty) {
    case 'EC':
    case 'OKP':
      return 'x' in obj && !('d' in obj);
    case 'RSA':
      return 'n' in obj && 'e' in obj && !('d' in obj);
    default:
      return false;
  }
}