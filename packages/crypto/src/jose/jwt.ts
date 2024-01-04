import type { JweHeaderParams } from './jwe.js';
import type { JwsHeaderParams } from './jws.js';

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