import type { JwkKeyPair } from '@web5/crypto';
import type { IonDocumentModel } from '@decentralized-identity/ion-sdk';
import type { DidDocument, DidKeySetVerificationMethodKey, DidMethod, DidResolutionOptions, DidResolutionResult, DidService, PortableDid } from './types.js';
export type DidIonAnchorOptions = {
    challengeEnabled?: boolean;
    challengeEndpoint?: string;
    operationsEndpoint?: string;
    keySet: DidIonKeySet;
    services: DidService[];
};
export type DidIonCreateOptions = {
    anchor?: boolean;
    keyAlgorithm?: typeof SupportedCryptoAlgorithms[number];
    keySet?: DidIonKeySet;
    services?: DidService[];
};
export type DidIonKeySet = {
    recoveryKey?: JwkKeyPair;
    updateKey?: JwkKeyPair;
    verificationMethodKeys?: DidKeySetVerificationMethodKey[];
};
declare enum OperationType {
    Create = "create",
    Update = "update",
    Deactivate = "deactivate",
    Recover = "recover"
}
/**
 * Data model representing a public key in the DID Document.
 */
export interface IonCreateRequestModel {
    type: OperationType;
    suffixData: {
        deltaHash: string;
        recoveryCommitment: string;
    };
    delta: {
        updateCommitment: string;
        patches: {
            action: string;
            document: IonDocumentModel;
        }[];
    };
}
declare const SupportedCryptoAlgorithms: readonly ["Ed25519", "secp256k1"];
export declare class DidIonMethod implements DidMethod {
    /**
     * Name of the DID method
    */
    static methodName: string;
    static anchor(options: {
        services: DidService[];
        keySet: DidIonKeySet;
        challengeEnabled?: boolean;
        challengeEndpoint?: string;
        operationsEndpoint?: string;
    }): Promise<DidResolutionResult | undefined>;
    static create(options?: DidIonCreateOptions): Promise<PortableDid>;
    static decodeLongFormDid(options: {
        didUrl: string;
    }): Promise<IonCreateRequestModel>;
    /**
     * Generates two key pairs used for authorization and encryption purposes
     * when interfacing with DWNs. The IDs of these keys are referenced in the
     * service object that includes the dwnUrls provided.
     */
    static generateDwnOptions(options: {
        encryptionKeyId?: string;
        serviceEndpointNodes: string[];
        serviceId?: string;
        signingKeyAlgorithm?: typeof SupportedCryptoAlgorithms[number];
        signingKeyId?: string;
    }): Promise<DidIonCreateOptions>;
    static generateJwkKeyPair(options: {
        keyAlgorithm: typeof SupportedCryptoAlgorithms[number];
        keyId?: string;
    }): Promise<JwkKeyPair>;
    static generateKeySet(options?: {
        keyAlgorithm?: typeof SupportedCryptoAlgorithms[number];
        keySet?: DidIonKeySet;
    }): Promise<DidIonKeySet>;
    /**
     * Given the W3C DID Document of a `did:ion` DID, return the identifier of
     * the verification method key that will be used for signing messages and
     * credentials, by default.
     *
     * @param document = DID Document to get the default signing key from.
     * @returns Verification method identifier for the default signing key.
     */
    static getDefaultSigningKey(options: {
        didDocument: DidDocument;
    }): Promise<string | undefined>;
    static getLongFormDid(options: {
        services: DidService[];
        keySet: DidIonKeySet;
    }): Promise<string>;
    static getShortFormDid(options: {
        didUrl: string;
    }): Promise<string>;
    static resolve(options: {
        didUrl: string;
        resolutionOptions?: DidResolutionOptions;
    }): Promise<DidResolutionResult>;
    private static createIonDocument;
    private static getIonCreateRequest;
    private static jwkToIonJwk;
}
export {};
//# sourceMappingURL=did-ion.d.ts.map