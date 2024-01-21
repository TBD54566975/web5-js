import type { JoseHeaderParams } from './jws.js';
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
    alg: 'A128KW' | 'A192KW' | 'A256KW' | 'dir' | 'ECDH-ES' | 'ECDH-ES+A128KW' | 'ECDH-ES+A192KW' | 'ECDH-ES+A256KW' | 'A128GCMKW' | 'A192GCMKW' | 'A256GCMKW' | 'PBES2-HS256+A128KW' | 'PBES2-HS384+A192KW' | 'PBES2-HS512+A256KW' | 'PBES2-HS512+XC20PKW' | string;
    apu?: Uint8Array;
    apv?: Uint8Array;
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
    enc: 'A128CBC-HS256' | 'A192CBC-HS384' | 'A256CBC-HS512' | 'A128GCM' | 'A192GCM' | 'A256GCM' | 'XC20P' | string;
    epk?: Uint8Array;
    iv?: Uint8Array;
    p2c?: number;
    p2s?: string;
    /**
     * Additional Public or Private Header Parameter names.
     */
    [key: string]: unknown;
}
//# sourceMappingURL=jwe.d.ts.map