import { sha256 } from '@noble/hashes/sha256';
import { Convert, Multicodec, MulticodecCode, MulticodecDefinition, removeUndefinedProperties } from '@web5/common';

import { keyToMultibaseId } from './utils.js';
import { Ed25519, Secp256k1, X25519 } from './crypto-primitives/index.js';

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

// Used with any "kty" (key type) value.
export type JwkParamsAnyKeyType = {
  // The algorithm intended for use with the key
  alg?: string;
  // Extractable
  ext?: 'true' | 'false';
  // Key Operations
  key_ops?: JwkOperation[];
  //'encrypt' | 'decrypt' | 'sign' | 'verify' | 'deriveKey' | 'deriveBits' | 'wrapKey' | 'unwrapKey';D
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
  /**
   * Identifies the cryptographic algorithm used to secure the JWS. The JWS Signature value is not
   * valid if the "alg" value does not represent a supported algorithm or if there is not a key for
   * use with that algorithm associated with the party that digitally signed or MACed the content.
   *
   * "alg" values should either be registered in the IANA "JSON Web Signature and Encryption
   * Algorithms" registry or be a value that contains a Collision-Resistant Name. The "alg" value is
   * a case-sensitive ASCII string.  This Header Parameter MUST be present and MUST be understood
   * and processed by implementations.
   *
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7515#section-4.1.1 | RFC 7515, Section 4.1.1}
   */
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
    | 'HS512'
    // an unregistered, case-sensitive, collision-resistant string
    | string;

  /**
   * Indicates that extensions to JOSE RFCs are being used that MUST be understood and processed.
   */
  crit?: string[]

  /**
   * Additional Public or Private Header Parameter names.
   */
  [key: string]: unknown
}

export interface JweHeaderParams extends JoseHeaderParams {
  /**
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

  apu?: Uint8Array;

  apv?: Uint8Array;

  /**
   * Indicates that extensions to JOSE RFCs are being used that MUST be understood and processed.
   */
  crit?: string[]

  /**
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

  epk?: Uint8Array;

  iv?: Uint8Array;

  p2c?: number;

  p2s?: string;

  /**
   * Additional Public or Private Header Parameter names.
   */
  [key: string]: unknown
}

/**
 * JSON Web Token (JWT) Header
 *
 * For a JWT object, the members of the JSON object represented by the JOSE Header describe the
 * cryptographic operations applied to the JWT and optionally, additional properties of the JWT.
 * Depending upon whether the JWT is a JWS or JWE, the corresponding rules for the JOSE Header
 * values apply.
 *
 * The {@link https://datatracker.ietf.org/doc/html/rfc7519#section-5 | RFC 7519} specification
 * further specifies the use of the following Header Parameters in both the cases where the JWT is a
 * JWS and where it is a JWE:
 *
 * - "typ" (type) Header Parameter: This Header Parameter is OPTIONAL. When used, this Header
 *   Parameter MUST be used to declare the MIME Media Type of this complete JWT. This parameter is
 *   ignored by JWT implementations; any processing of this parameter is performed by the JWT
 *   application.  If present, it is RECOMMENDED that its value be "JWT" to indicate that this
 *   object is a JWT.  While media type names are not case sensitive, it is RECOMMENDED that "JWT"
 *   always be spelled using uppercase characters for compatibility with legacy implementations.
 *
 * - "cty" (content type) Header Parameter: This Header Parameter is OPTIONAL. When used, this
 *   Header Parameter MUST be used to declare the MIME Media Type of the secured content (the
 *   payload). In the normal case in which nested signing or encryption operations are not employed,
 *   the use of this Header Parameter is NOT RECOMMENDED.  In the case that nested signing or
 *   encryption is employed, this Header Parameter MUST be present; in this case, the value MUST be
 *   "JWT", to indicate that a Nested JWT is carried in this JWT.  While media type names are not
 *   case sensitive, it is RECOMMENDED that "JWT" always be spelled using uppercase characters
 *   for compatibility with legacy implementations.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-5 | RFC 7519, Section 5}
 */
export type JwtHeaderParams = JwsHeaderParams | JweHeaderParams;

/**
 * JSON Web Token Payload
 *
 * The JWT Claims Set represents a JSON object whose members are the claims conveyed by the JWT.
 * The Claim Names within a JWT Claims Set MUST be unique; JWT parsers MUST either reject JWTs
 * with duplicate Claim Names or use a JSON parser that returns only the lexically last duplicate
 * member name.
 *
 * The set of claims that a JWT must contain to be considered valid is context dependent and is
 * undefined by RFC 7519. Specific applications of JWTs will require implementations to understand
 * and process some claims in particular ways.
 *
 * There are three classes of JWT Claim Names:
 *
 * - Registered Claim Names: Claim names registered in the IANA "JSON Web Token Claims" registry.
 *   None of the claims defined below are intended to be mandatory to use or implement in all cases,
 *   but rather they provide a starting point for a set of useful, interoperable claims
 *   Applications using JWTs should define which specific claims they use and when they are required
 *   or optional.
 *
 * - Public Claim Names: Claim Names can be defined at will by those using JWTs. However, in order
 *   prevent collisions, any new Claim Name should either be registered in the IANA "JSON Web Token
 *   Claims" registry or be a Public Name: a value that contains a Collision-Resistant Name. In each
 *   case, the definer of the name or value needs to take reasonable precautions to make sure they
 *   are in control of the part of the namespace they use to define the Claim Name.
 *
 * - Private Claim Names: A producer and consumer of a JWT MAY agree to use Claim Names that are
 *   Private Names: names that are not Registered Claim Names or Public Claim Names. Unlike Public
 *   Claim Names, Private Claim Names are subject to collision and should be used with caution.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-4 | RFC 7519, Section 4}
 */
export interface JwtPayload {
  /**
   * Issuer
   * Identifies the principal that issued the JWT. The "iss" value is a case-sensitive string
   * containing a string or URI value.  Use of this claim is OPTIONAL.
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.1 | RFC 7519, Section 4.1.1}
   */
  iss?: string;

  /**
   * Subject
   * Identifies the principal that is the subject of the JWT. The claims in a JWT are normally
   * statements about the subject. The subject value MUST either be scoped to be locally unique in
   * the context of the issuer or be globally unique. The "sub" value is a case-sensitive string
   * containing a string or URI value. Use of this claim is OPTIONAL.
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.2 | RFC 7519, Section 4.1.2}
   */
  sub?: string;

  /**
   * Audience
   * Identifies the recipients that the JWT is intended for. Each principal intended to process
   * the JWT MUST identify itself with a value in the audience claim. If the principal processing
   * the claim does not identify itself with a value in the "aud" claim when this claim is present,
   * then the JWT MUST be rejected. In the general case, the "aud" value is an array of case-
   * sensitive strings, each containing a string or URI value. In the special case when the JWT has
   * one audience, the "aud" value MAY be a single case-sensitive string containing a string or URI
   * value. Use of this claim is OPTIONAL.
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.3 | RFC 7519, Section 4.1.3}
   */
  aud?: string | string[];

  /**
   * Expiration Time
   * Identifies the expiration time on or after which the JWT MUST NOT be accepted for processing.
   * The processing of the "exp" claim requires that the current date/time MUST be before the
   * expiration date/time listed in the "exp" claim. Implementers MAY provide for some small leeway,
   * usually no more than a few minutes, to account for clock skew. Its value MUST be a number
   * containing a numeric date value. Use of this claim is OPTIONAL.
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.4 | RFC 7519, Section 4.1.4}
   */
  exp?: number;

  /**
   * Not Before
   * Identifies the time before which the JWT MUST NOT be accepted for processing. The processing
   * of the "nbf" claim requires that the current date/time MUST be after or equal to the not-before
   * date/time listed in the "nbf" claim. Implementers MAY provide for some small leeway, usually no
   * more than a few minutes, to account for clock skew. Its value MUST be a number containing a
   * numeric date value. Use of this claim is OPTIONAL.
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.5 | RFC 7519, Section 4.1.5}
   */
  nbf?: number;

  /**
   * Issued At
   * Identifies the time at which the JWT was issued. This claim can be used to determine the age
   * of the JWT. Its value MUST be a number containing a numeric date value. Use of this claim is
   * OPTIONAL.
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.6 | RFC 7519, Section 4.1.6}
   */
  iat?: number;

  /**
   * JWT ID
   * Provides a unique identifier for the JWT. The identifier value MUST be assigned in a manner
   * that ensures that there is a negligible probability that the same value will be accidentally
   * assigned to a different data object; if the application uses multiple issuers, collisions
   * MUST be prevented among values produced by different issuers as well. The "jti" claim can be
   * used to prevent the JWT from being replayed. The "jti" value is a case-sensitive string.
   * Use of this claim is OPTIONAL.
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.7 | RFC 7519, Section 4.1.7}
   */
  jti?: string;

  /**
   * Additional Public or Private Claim names.
   */
  [key: string]: unknown;
}

const multicodecToJoseMapping: { [key: string]: JsonWebKey } = {
  'ed25519-pub'    : { crv: 'Ed25519',   kty: 'OKP', x: '' },
  'ed25519-priv'   : { crv: 'Ed25519',   kty: 'OKP', x: '',        d: '' },
  'secp256k1-pub'  : { crv: 'secp256k1', kty: 'EC',  x: '', y: ''},
  'secp256k1-priv' : { crv: 'secp256k1', kty: 'EC',  x: '', y: '', d: '' },
  'x25519-pub'     : { crv: 'X25519',    kty: 'OKP', x: '' },
  'x25519-priv'    : { crv: 'X25519',    kty: 'OKP', x: '',        d: '' },
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
  public static isEcPrivateKeyJwk(obj: unknown): obj is JwkParamsEcPrivate {
    if (!obj || typeof obj !== 'object') return false;
    if (!('kty' in obj && 'crv' in obj && 'x' in obj && 'd' in obj)) return false;
    if (obj.kty !== 'EC') return false;
    if (typeof obj.d !== 'string') return false;
    if (typeof obj.x !== 'string') return false;

    return true;
  }

  public static isEcPublicKeyJwk(obj: unknown): obj is JwkParamsEcPublic {
    if (!obj || typeof obj !== 'object') return false;
    if (!('kty' in obj && 'crv' in obj && 'x' in obj)) return false;
    if ('d' in obj) return false;
    if (obj.kty !== 'EC') return false;
    if (typeof obj.x !== 'string') return false;
    return true;
  }

  public static isOctPrivateKeyJwk(obj: unknown): obj is JwkParamsOctPrivate {
    if (!obj || typeof obj !== 'object') return false;
    if (!('kty' in obj && 'k' in obj)) return false;
    if (obj.kty !== 'oct') return false;
    if (typeof obj.k !== 'string') return false;

    return true;
  }

  public static isOkpPrivateKeyJwk(obj: unknown): obj is JwkParamsOkpPrivate {
    if (!obj || typeof obj !== 'object') return false;
    if (!('kty' in obj && 'crv' in obj && 'x' in obj && 'd' in obj)) return false;
    if (obj.kty !== 'OKP') return false;
    if (typeof obj.d !== 'string') return false;
    if (typeof obj.x !== 'string') return false;

    return true;
  }

  public static isOkpPublicKeyJwk(obj: unknown): obj is JwkParamsOkpPublic {
    if (!obj || typeof obj !== 'object') return false;
    if ('d' in obj) return false;
    if (!('kty' in obj && 'crv' in obj && 'x' in obj)) return false;
    if (obj.kty !== 'OKP') return false;
    if (typeof obj.x !== 'string') return false;
    return true;
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
     */
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

  /**
   * Note: All secp public keys are converted to compressed point encoding
   *       before the multibase identifier is computed.
   *
   * Per {@link https://github.com/multiformats/multicodec/blob/master/table.csv | Multicodec table}:
   *    Public keys for Elliptic Curve cryptography algorithms (e.g., secp256k1,
   *    secp256k1r1, secp384r1, etc.) are always represented with compressed point
   *    encoding (e.g., secp256k1-pub, p256-pub, p384-pub, etc.).
   *
   * Per {@link https://datatracker.ietf.org/doc/html/rfc8812#name-jose-and-cose-secp256k1-cur | RFC 8812}:
   *    "As a compressed point encoding representation is not defined for JWK
   *    elliptic curve points, the uncompressed point encoding defined there
   *    MUST be used. The x and y values represented MUST both be exactly
   *    256 bits, with any leading zeros preserved."
   */
  public static async publicKeyToMultibaseId(options: {
    publicKey: PublicKeyJwk
  }): Promise<string> {
    const { publicKey } = options;

    if (!('crv' in publicKey)) {
      throw new Error(`Jose: Unsupported public key type: ${publicKey.kty}`);
    }

    let publicKeyBytes: Uint8Array;

    switch (publicKey.crv) {
      case 'Ed25519': {
        publicKeyBytes = await Ed25519.publicKeyToBytes({ publicKey });
        break;
      }

      case 'secp256k1': {
        publicKeyBytes = await Secp256k1.publicKeyToBytes({ publicKey });
        // Convert secp256k1 public keys to compressed format.
        publicKeyBytes = await Secp256k1.compressPublicKey({ publicKeyBytes });
        break;
      }

      case 'X25519': {
        publicKeyBytes = await X25519.publicKeyToBytes({ publicKey });
        break;
      }

      default: {
        throw new Error(`Jose: Unsupported public key curve: ${publicKey.crv}`);
      }
    }

    // Convert the JSON Web Key (JWK) parameters to a Multicodec name.
    const { name: multicodecName } = await Jose.joseToMulticodec({ key: publicKey });

    // Compute the multibase identifier based on the provided key.
    const multibaseId = keyToMultibaseId({ key: publicKeyBytes, multicodecName });

    return multibaseId;
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

  private static canonicalize(obj: { [key: string]: any }): string {
    const sortedKeys = Object.keys(obj).sort();
    const sortedObj = sortedKeys.reduce<{ [key: string]: any }>((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, {});
    return JSON.stringify(sortedObj);
  }
}