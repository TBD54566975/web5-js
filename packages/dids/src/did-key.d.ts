import type { DidMethod, DidDocument, PortableDid, VerificationMethod, DidResolutionResult, DidResolutionOptions, DidKeySetVerificationMethodKey } from './types.js';
declare const SupportedCryptoAlgorithms: readonly ["Ed25519", "secp256k1"];
declare const VERIFICATION_METHOD_TYPES: Record<string, string>;
export type DidVerificationMethodType = keyof typeof VERIFICATION_METHOD_TYPES;
export type DidKeyCreateOptions = {
    enableEncryptionKeyDerivation?: boolean;
    keyAlgorithm?: typeof SupportedCryptoAlgorithms[number];
    keySet?: DidKeyKeySet;
    publicKeyFormat?: DidVerificationMethodType;
};
export type DidKeyCreateDocumentOptions = {
    defaultContext?: string;
    did: string;
    enableEncryptionKeyDerivation?: boolean;
    enableExperimentalPublicKeyTypes?: boolean;
    publicKeyFormat?: DidVerificationMethodType;
};
export type DidKeyDeriveEncryptionKeyResult = {
    key: Uint8Array;
    multicodecCode: number;
};
export type DidKeyIdentifier = {
    fragment: string;
    method: string;
    multibaseValue: string;
    scheme: string;
    version: string;
};
export type DidKeyKeySet = {
    verificationMethodKeys?: DidKeySetVerificationMethodKey[];
};
export declare class DidKeyMethod implements DidMethod {
    /**
     * Name of the DID method
    */
    static methodName: string;
    static create(options?: DidKeyCreateOptions): Promise<PortableDid>;
    /**
     * Expands a did:key identifier to a DID Document.
     *
     * Reference: https://w3c-ccg.github.io/did-method-key/#document-creation-algorithm
     *
     * @param options
     * @returns - A DID dodcument.
     */
    static createDocument(options: DidKeyCreateDocumentOptions): Promise<DidDocument>;
    /**
     * Decoding a multibase-encoded multicodec value into a verification method
     * that is suitable for verifying that encrypted information will be
     * received by the intended recipient.
     */
    static createEncryptionMethod(options: {
        did: string;
        enableExperimentalPublicKeyTypes: boolean;
        multibaseValue: string;
        publicKeyFormat: DidVerificationMethodType;
    }): Promise<VerificationMethod>;
    /**
     * Transform a multibase-encoded multicodec value to public encryption key
     * components that are suitable for encrypting messages to a receiver. A
     * mathematical proof elaborating on the safety of performing this operation
     * is available in:
     * {@link https://eprint.iacr.org/2021/509.pdf | On using the same key pair for Ed25519 and an X25519 based KEM}
     */
    static deriveEncryptionKey(options: {
        multibaseValue: string;
    }): Promise<DidKeyDeriveEncryptionKeyResult>;
    /**
     * Decodes a multibase-encoded multicodec value into a verification method
     * that is suitable for verifying digital signatures.
     * @param options - Signature method creation algorithm inputs.
     * @returns - A verification method.
     */
    static createSignatureMethod(options: {
        did: string;
        enableExperimentalPublicKeyTypes: boolean;
        multibaseValue: string;
        publicKeyFormat: DidVerificationMethodType;
    }): Promise<VerificationMethod>;
    static generateKeySet(options?: {
        keyAlgorithm?: typeof SupportedCryptoAlgorithms[number];
    }): Promise<DidKeyKeySet>;
    /**
     * Given the W3C DID Document of a `did:key` DID, return the identifier of
     * the verification method key that will be used for signing messages and
     * credentials, by default.
     *
     * @param document = DID Document to get the default signing key from.
     * @returns Verification method identifier for the default signing key.
     */
    static getDefaultSigningKey(options: {
        didDocument: DidDocument;
    }): Promise<string | undefined>;
    static resolve(options: {
        didUrl: string;
        resolutionOptions?: DidResolutionOptions;
    }): Promise<DidResolutionResult>;
    static validateIdentifier(options: {
        did: string;
    }): boolean;
}
export {};
//# sourceMappingURL=did-key.d.ts.map