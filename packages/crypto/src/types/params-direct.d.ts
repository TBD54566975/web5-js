import type { Jwk } from '../jose/jwk.js';
import type { AlgorithmIdentifier } from './identifier.js';
/**
 * Parameters for computing a public key.
 */
export interface ComputePublicKeyParams extends GetPublicKeyParams {
}
/**
 * Parameters for decrypting data.
 */
export interface DecryptParams {
    /** A {@link Jwk} containing the key to be used for decryption. */
    key: Jwk;
    /** Data to be decrypted. */
    data: Uint8Array;
}
/**
 * Parameters for deriving bits.
 */
export interface DeriveBitsParams {
    /** A {@link Jwk} containing the base key to be used for derivation. */
    key: Jwk;
    /**
     * The number of bits to derive. To be compatible with all browsers, the number should be a
     * multiple of 8.
     */
    length: number;
}
/**
 * Parameters for deriving a key.
 */
export interface DeriveKeyParams {
    /** A {@link Jwk} containing the base key to be used for derivation. */
    key: Jwk;
    /** An object defining the algorithm-specific parameters for the derived key. */
    derivedKeyParams: unknown;
}
/**
 * Parameters for computing a hash digest.
 */
export interface DigestParams {
    /** The algorithm identifier. */
    algorithm: AlgorithmIdentifier;
    /** Data to be digested. */
    data: Uint8Array;
}
/**
 * Parameters for encrypting data.
 */
export interface EncryptParams {
    /** A {@link Jwk} containing the key to be used for encryption. */
    key: Jwk;
    /** Data to be encrypted. */
    data: Uint8Array;
}
/**
 * Parameters for generating a key.
 */
export interface GenerateKeyParams {
    /** The algorithm identifier. */
    algorithm: AlgorithmIdentifier;
}
/**
 * Parameters for retrieving a public key.
 */
export interface GetPublicKeyParams {
    /** A {@link Jwk} containing the key from which to derive the public key. */
    key: Jwk;
}
/**
 * Parameters for signing data.
 */
export interface SignParams {
    /** A {@link Jwk} containing the key used for signing. */
    key: Jwk;
    /** Data to be signed. */
    data: Uint8Array;
}
/**
 * Parameters for verifying a signature.
 */
export interface VerifyParams {
    /** A {@link Jwk} containing the key used for verification. */
    key: Jwk;
    /** The signature to verify. */
    signature: Uint8Array;
    /** The data associated with the signature. */
    data: Uint8Array;
}
//# sourceMappingURL=params-direct.d.ts.map