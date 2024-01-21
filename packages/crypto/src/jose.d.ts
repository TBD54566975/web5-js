import { MulticodecCode, MulticodecDefinition } from '@web5/common';
import type { Jwk } from './jose/jwk.js';
/**
 * The `Jose` class provides utility functions for converting between JOSE (JSON Object Signing and
 * Encryption) formats and multicodec representations.
 */
export declare class Jose {
    /**
     * Converts a JWK (JSON Web Key) to a Multicodec code and name.
     *
     * @example
     * ```ts
     * const jwk: Jwk = { crv: 'Ed25519', kty: 'OKP', x: '...' };
     * const { code, name } = await Jose.jwkToMulticodec({ jwk });
     * ```
     *
     * @param params - The parameters for the conversion.
     * @param params.jwk - The JSON Web Key to be converted.
     * @returns A promise that resolves to a Multicodec definition.
     */
    static jwkToMulticodec({ jwk }: {
        jwk: Jwk;
    }): Promise<MulticodecDefinition<MulticodecCode>>;
    /**
     * Converts a public key in JWK (JSON Web Key) format to a multibase identifier.
     *
     * @remarks
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
     *
     * @example
     * ```ts
     * const publicKey = { crv: 'Ed25519', kty: 'OKP', x: '...' };
     * const multibaseId = await Jose.publicKeyToMultibaseId({ publicKey });
     * ```
     *
     * @param params - The parameters for the conversion.
     * @param params.publicKey - The public key in JWK format.
     * @returns A promise that resolves to the multibase identifier.
     */
    static publicKeyToMultibaseId({ publicKey }: {
        publicKey: Jwk;
    }): Promise<string>;
    /**
     * Converts a Multicodec code or name to parial JWK (JSON Web Key).
     *
     * @example
     * ```ts
     * const partialJwk = await Jose.multicodecToJose({ name: 'ed25519-pub' });
     * ```
     *
     * @param params - The parameters for the conversion.
     * @param params.code - Optional Multicodec code to convert.
     * @param params.name - Optional Multicodec name to convert.
     * @returns A promise that resolves to a JOSE format key.
     */
    static multicodecToJose({ code, name }: {
        code?: MulticodecCode;
        name?: string;
    }): Promise<Jwk>;
}
//# sourceMappingURL=jose.d.ts.map