export declare const didKeyCreateDocumentTestVectors: ({
    id: string;
    input: {
        did: string;
        publicKeyFormat: string;
        enableEncryptionKeyDerivation?: undefined;
    };
    output: {
        '@context': string[];
        id: string;
        verificationMethod: {
            id: string;
            type: string;
            controller: string;
            publicKeyJwk: {
                alg: string;
                crv: string;
                kty: string;
                x: string;
            };
        }[];
        assertionMethod: string[];
        authentication: string[];
        capabilityDelegation: string[];
        capabilityInvocation: string[];
        keyAgreement?: undefined;
    };
} | {
    id: string;
    input: {
        did: string;
        publicKeyFormat: string;
        enableEncryptionKeyDerivation?: undefined;
    };
    output: {
        '@context': string[];
        id: string;
        verificationMethod: {
            id: string;
            type: string;
            controller: string;
            publicKeyMultibase: string;
        }[];
        assertionMethod: string[];
        authentication: string[];
        capabilityDelegation: string[];
        capabilityInvocation: string[];
        keyAgreement?: undefined;
    };
} | {
    id: string;
    input: {
        did: string;
        enableEncryptionKeyDerivation: boolean;
        publicKeyFormat: string;
    };
    output: {
        '@context': string[];
        id: string;
        verificationMethod: ({
            id: string;
            type: string;
            controller: string;
            publicKeyJwk: {
                alg: string;
                crv: string;
                kty: string;
                x: string;
            };
        } | {
            id: string;
            type: string;
            controller: string;
            publicKeyJwk: {
                crv: string;
                kty: string;
                x: string;
                alg?: undefined;
            };
        })[];
        assertionMethod: string[];
        authentication: string[];
        capabilityDelegation: string[];
        capabilityInvocation: string[];
        keyAgreement: string[];
    };
} | {
    id: string;
    input: {
        did: string;
        enableEncryptionKeyDerivation: boolean;
        publicKeyFormat: string;
    };
    output: {
        '@context': string[];
        id: string;
        verificationMethod: {
            id: string;
            type: string;
            controller: string;
            publicKeyMultibase: string;
        }[];
        assertionMethod: string[];
        authentication: string[];
        capabilityDelegation: string[];
        capabilityInvocation: string[];
        keyAgreement: string[];
    };
})[];
export declare const didKeyCreateTestVectors: ({
    id: string;
    input: {
        keySet: {
            verificationMethodKeys: {
                publicKeyJwk: {
                    alg: string;
                    crv: string;
                    kty: string;
                    x: string;
                };
                relationships: string[];
            }[];
        };
        publicKeyAlgorithm: string;
        publicKeyFormat: string;
        enableEncryptionKeyDerivation?: undefined;
    };
    output: {
        did: string;
        document: {
            '@context': string[];
            id: string;
            verificationMethod: {
                id: string;
                type: string;
                controller: string;
                publicKeyJwk: {
                    alg: string;
                    crv: string;
                    kty: string;
                    x: string;
                };
            }[];
            assertionMethod: string[];
            authentication: string[];
            capabilityDelegation: string[];
            capabilityInvocation: string[];
            keyAgreement?: undefined;
        };
        keySet: {
            verificationMethodKeys: {
                publicKeyJwk: {
                    alg: string;
                    crv: string;
                    kty: string;
                    x: string;
                };
                relationships: string[];
            }[];
        };
    };
} | {
    id: string;
    input: {
        enableEncryptionKeyDerivation: boolean;
        keySet: {
            verificationMethodKeys: {
                publicKeyJwk: {
                    alg: string;
                    crv: string;
                    kty: string;
                    x: string;
                };
                relationships: string[];
            }[];
        };
        publicKeyAlgorithm: string;
        publicKeyFormat: string;
    };
    output: {
        did: string;
        document: {
            '@context': string[];
            id: string;
            verificationMethod: ({
                id: string;
                type: string;
                controller: string;
                publicKeyJwk: {
                    alg: string;
                    crv: string;
                    kty: string;
                    x: string;
                };
            } | {
                controller: string;
                type: string;
                id: string;
                publicKeyJwk: {
                    crv: string;
                    kty: string;
                    x: string;
                    alg?: undefined;
                };
            })[];
            assertionMethod: string[];
            authentication: string[];
            capabilityDelegation: string[];
            capabilityInvocation: string[];
            keyAgreement: string[];
        };
        keySet: {
            verificationMethodKeys: {
                publicKeyJwk: {
                    alg: string;
                    crv: string;
                    kty: string;
                    x: string;
                };
                relationships: string[];
            }[];
        };
    };
})[];
//# sourceMappingURL=did-key.d.ts.map