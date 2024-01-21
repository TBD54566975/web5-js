import type { Jwk } from './jwk.js';
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
    alg: 'EdDSA' | 'ES256' | 'ES256K' | 'ES384' | 'ES512' | 'HS256' | 'HS384' | 'HS512' | string;
    /**
     * Critical Header Parameter
     *
     * Indicates that extensions to JOSE RFCs are being used that MUST be understood and processed.
     */
    crit?: string[];
    /**
     * Additional Public or Private Header Parameter names.
     */
    [key: string]: unknown;
}
//# sourceMappingURL=jws.d.ts.map