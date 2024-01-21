import type { PortableDid } from '@web5/dids';
import type { JwtPayload, Web5Crypto, CryptoAlgorithm, JwtHeaderParams } from '@web5/crypto';
import { DidResolver } from '@web5/dids';
/**
 * Result of parsing a JWT.
 */
export type JwtParseResult = {
    decoded: JwtVerifyResult;
    encoded: {
        header: string;
        payload: string;
        signature: string;
    };
};
/**
 * Result of verifying a JWT.
 */
export interface JwtVerifyResult {
    /** JWT Protected Header */
    header: JwtHeaderParams;
    /** JWT Claims Set */
    payload: JwtPayload;
}
/**
 * Parameters for parsing a JWT.
 * used in {@link Jwt.parse}
 */
export type ParseJwtOptions = {
    jwt: string;
};
/**
 * Parameters for signing a JWT.
 */
export type SignJwtOptions = {
    signerDid: PortableDid;
    payload: JwtPayload;
};
/**
 * Parameters for verifying a JWT.
 */
export type VerifyJwtOptions = {
    jwt: string;
};
/**
 * Represents a signer with a specific cryptographic algorithm and options.
 * @template T - The type of cryptographic options.
 */
type Signer<T extends Web5Crypto.Algorithm> = {
    signer: CryptoAlgorithm;
    options?: T | undefined;
    alg: string;
    crv: string;
};
/**
 * Class for handling Compact JSON Web Tokens (JWTs).
 * This class provides methods to create, verify, and decode JWTs using various cryptographic algorithms.
 * More information on JWTs can be found [here](https://datatracker.ietf.org/doc/html/rfc7519)
 */
export declare class Jwt {
    /** supported cryptographic algorithms. keys are `${alg}:${crv}`. */
    static algorithms: {
        [alg: string]: Signer<Web5Crypto.EcdsaOptions | Web5Crypto.EdDsaOptions>;
    };
    /**
     * DID Resolver instance for resolving decentralized identifiers.
     */
    static didResolver: DidResolver;
    /**
     * Creates a signed JWT.
     *
     * @example
     * ```ts
     * const jwt = await Jwt.sign({ signerDid: myDid, payload: myPayload });
     * ```
     *
     * @param options - Parameters for JWT creation including signer DID and payload.
     * @returns The compact JWT as a string.
     */
    static sign(options: SignJwtOptions): Promise<string>;
    /**
     * Verifies a JWT.
     *
     * @example
     * ```ts
     * const verifiedJwt = await Jwt.verify({ jwt: myJwt });
     * ```
     *
     * @param options - Parameters for JWT verification
     * @returns Verified JWT information including signer DID, header, and payload.
     */
    static verify(options: VerifyJwtOptions): Promise<JwtVerifyResult>;
    /**
     * Parses a JWT without verifying its signature.
     *
     * @example
     * ```ts
     * const { encoded: encodedJwt, decoded: decodedJwt } = Jwt.parse({ jwt: myJwt });
     * ```
     *
     * @param options - Parameters for JWT decoding, including the JWT string.
     * @returns both encoded and decoded JWT parts
     */
    static parse(options: ParseJwtOptions): JwtParseResult;
}
export {};
//# sourceMappingURL=jwt.d.ts.map