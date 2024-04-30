import type { Jwk } from './jwk.js';

/**
 * JSON Object Signing and Encryption (JOSE) Header Parameters
 *
 * The Header Parameter names for use in both JWSs and JWEs are registered in the IANA "JSON Web
 * Signature and Encryption Header Parameters" registry.
 *
 * As indicated by the common registry, JWSs and JWEs share a common Header Parameter space; when a
 * parameter is used by both specifications, its usage must be compatible between the
 * specifications.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc7515#section-4.1 | RFC 7515, Section 4.1}
 */
export interface JoseHeaderParams {
  /** Content Type Header Parameter */
  cty?: string;

  /** JWK Set URL Header Parameter */
  jku?: string;

  /** JSON Web Key Header Parameter */
  jwk?: Jwk;

  /** Key ID Header Parameter */
  kid?: string;

  /** Type Header Parameter */
  typ?: string;

  /** X.509 Certificate Chain Header Parameter */
  x5c?: string[];

  /** X.509 Certificate SHA-1 Thumbprint Header Parameter */
  x5t?: string;

  /** X.509 URL Header Parameter */
  x5u?: string;
}

/**
 * JSON Web Signature (JWS) Header Parameters
 *
 * The Header Parameter names for use in JWSs are registered in the IANA "JSON Web Signature and
 * Encryption Header Parameters" registry.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc7515#section-4.1 | RFC 7515, Section 4.1}
 */
export interface JwsHeaderParams extends JoseHeaderParams {
  /**
   * Algorithm Header Parameter
   *
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
   * Critical Header Parameter
   *
   * Indicates that extensions to JOSE RFCs are being used that MUST be understood and processed.
   */
  crit?: string[]

  /**
   * Additional Public or Private Header Parameter names.
   */
  [key: string]: unknown
}