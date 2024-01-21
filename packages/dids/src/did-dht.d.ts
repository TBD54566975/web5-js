import type { JwkKeyPair, PublicKeyJwk } from '@web5/crypto';
import type { DidMethod, DidService, DidDocument, PortableDid, DidResolutionResult, DidResolutionOptions, DidKeySetVerificationMethodKey } from './types.js';
declare const SupportedCryptoKeyTypes: readonly ["Ed25519", "secp256k1"];
export type DidDhtCreateOptions = {
    publish?: boolean;
    keySet?: DidDhtKeySet;
    services?: DidService[];
};
export type DidDhtKeySet = {
    verificationMethodKeys?: DidKeySetVerificationMethodKey[];
};
export declare class DidDhtMethod implements DidMethod {
    static methodName: string;
    /**
     * Creates a new DID Document according to the did:dht spec.
     * @param options The options to use when creating the DID Document, including whether to publish it.
     * @returns A promise that resolves to a PortableDid object.
     */
    static create(options?: DidDhtCreateOptions): Promise<PortableDid>;
    /**
     * Generates a JWK key pair.
     * @param options The key algorithm and key ID to use.
     * @returns A promise that resolves to a JwkKeyPair object.
     */
    static generateJwkKeyPair(options: {
        keyAlgorithm: typeof SupportedCryptoKeyTypes[number];
        keyId?: string;
    }): Promise<JwkKeyPair>;
    /**
     * Generates a key set for a DID Document.
     * @param options The key set to use when generating the key set.
     * @returns A promise that resolves to a DidDhtKeySet object.
     */
    static generateKeySet(options?: {
        keySet?: DidDhtKeySet;
    }): Promise<DidDhtKeySet>;
    /**
     * Gets the identifier fragment from a DID.
     * @param options The key to get the identifier fragment from.
     * @returns A promise that resolves to a string containing the identifier.
     */
    static getDidIdentifier(options: {
        key: PublicKeyJwk;
    }): Promise<string>;
    /**
     * Gets the identifier fragment from a DID.
     * @param options The key to get the identifier fragment from.
     * @returns A promise that resolves to a string containing the identifier fragment.
     */
    static getDidIdentifierFragment(options: {
        key: PublicKeyJwk;
    }): Promise<string>;
    /**
     * Publishes a DID Document to the DHT.
     * @param keySet The key set to use to sign the DHT payload.
     * @param didDocument The DID Document to publish.
     * @returns A boolean indicating the success of the publishing operation.
     */
    static publish({ didDocument, identityKey }: {
        didDocument: DidDocument;
        identityKey: DidKeySetVerificationMethodKey;
    }): Promise<boolean>;
    /**
     * Resolves a DID Document based on the specified options.
     *
     * @param options - Configuration for resolving a DID Document.
     * @param options.didUrl - The DID URL to resolve.
     * @param options.resolutionOptions - Optional settings for the DID resolution process as defined in the DID Core specification.
     * @returns A Promise that resolves to a `DidResolutionResult`, containing the resolved DID Document and associated metadata.
     */
    static resolve(options: {
        didUrl: string;
        resolutionOptions?: DidResolutionOptions;
    }): Promise<DidResolutionResult>;
}
export {};
//# sourceMappingURL=did-dht.d.ts.map