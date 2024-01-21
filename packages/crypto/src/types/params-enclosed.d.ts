/**
 * Parameters for enclosed decryption operations.
 *
 * Note: This interface is intended to be used with a closure that captures the key and
 * algorithm-specific parameters so that arbitrary data can be decrypted without exposing the key or
 * parameters to the caller.
 */
export interface EnclosedDecryptParams {
    /** Data to be decrypted. */
    data: Uint8Array;
}
/**
 * Parameters for enclosed encryption operations.
 *
 * Note: This interface is intended to be used with a closure that captures the key and
 * algorithm-specific parameters so that arbitrary data can be encrypted without exposing the key or
 * parameters to the caller.
 */
export interface EnclosedEncryptParams {
    /** Data to be encrypted. */
    data: Uint8Array;
}
/**
 * Parameters for enclosed signing operations.
 *
 * Note: This interface is intended to be used with a closure that captures the key and
 * algorithm-specific parameters so that arbitrary data can be signed without exposing the key or
 * parameters to the caller.
 */
export interface EnclosedSignParams {
    /** Data to be signed. */
    data: Uint8Array;
}
/**
 * Parameters for enclosed verification operations.
 *
 * Note: This interface is intended to be used with a closure that captures the key and
 * algorithm-specific parameters so that signatures of arbitrary data can be verified without
 * exposing the key or parameters to the caller.
 */
export interface EnclosedVerifyParams {
    /** Signature to be verified. */
    signature: Uint8Array;
    /** Data associated with the signature. */
    data: Uint8Array;
}
//# sourceMappingURL=params-enclosed.d.ts.map