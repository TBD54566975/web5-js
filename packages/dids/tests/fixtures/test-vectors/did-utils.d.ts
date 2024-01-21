export declare const didDocumentIdTestVectors: ({
    id: string;
    input: {
        didDocument: {
            '@context': string[];
            id: string;
            verificationMethod: ({
                id: string;
                type: string;
                controller: string;
                publicKeyJwk: {
                    alg: string;
                    kty: string;
                    crv: string;
                    x: string;
                };
                publicKeyMultibase?: undefined;
            } | {
                id: string;
                type: string;
                controller: string;
                publicKeyMultibase: string;
                publicKeyJwk?: undefined;
            })[];
            authentication: (string | {
                id: string;
                type: string;
                controller: string;
                publicKeyJwk: {
                    alg: string;
                    kty: string;
                    crv: string;
                    x: string;
                };
            })[];
            keyAgreement: ({
                id: string;
                type: string;
                controller: string;
                publicKeyJwk: {
                    alg: string;
                    kty: string;
                    crv: string;
                    x: string;
                };
                publicKeyMultibase?: undefined;
            } | {
                id: string;
                type: string;
                controller: string;
                publicKeyMultibase: string;
                publicKeyJwk?: undefined;
            })[];
        };
        publicKeyJwk: {
            kty: string;
            crv: string;
            x: string;
        };
        publicKeyMultibase?: undefined;
    };
    output: string;
} | {
    id: string;
    input: {
        didDocument: {
            '@context': string[];
            id: string;
            verificationMethod: ({
                id: string;
                type: string;
                controller: string;
                publicKeyJwk: {
                    alg: string;
                    kty: string;
                    crv: string;
                    x: string;
                };
                publicKeyMultibase?: undefined;
            } | {
                id: string;
                type: string;
                controller: string;
                publicKeyMultibase: string;
                publicKeyJwk?: undefined;
            })[];
            authentication: (string | {
                id: string;
                type: string;
                controller: string;
                publicKeyJwk: {
                    alg: string;
                    kty: string;
                    crv: string;
                    x: string;
                };
            })[];
            keyAgreement: ({
                id: string;
                type: string;
                controller: string;
                publicKeyJwk: {
                    alg: string;
                    kty: string;
                    crv: string;
                    x: string;
                };
                publicKeyMultibase?: undefined;
            } | {
                id: string;
                type: string;
                controller: string;
                publicKeyMultibase: string;
                publicKeyJwk?: undefined;
            })[];
        };
        publicKeyMultibase: string;
        publicKeyJwk?: undefined;
    };
    output: string;
} | {
    id: string;
    input: {
        didDocument: {
            '@context': string[];
            id: string;
            verificationMethod: ({
                id: string;
                type: string;
                controller: string;
                publicKeyJwk: {
                    alg: string;
                    kty: string;
                    crv: string;
                    x: string;
                };
                publicKeyMultibase?: undefined;
            } | {
                id: string;
                type: string;
                controller: string;
                publicKeyMultibase: string;
                publicKeyJwk?: undefined;
            })[];
            authentication: (string | {
                id: string;
                type: string;
                controller: string;
                publicKeyJwk: {
                    alg: string;
                    kty: string;
                    crv: string;
                    x: string;
                };
            })[];
            keyAgreement: ({
                id: string;
                type: string;
                controller: string;
                publicKeyJwk: {
                    alg: string;
                    kty: string;
                    crv: string;
                    x: string;
                };
                publicKeyMultibase?: undefined;
            } | {
                id: string;
                type: string;
                controller: string;
                publicKeyMultibase: string;
                publicKeyJwk?: undefined;
            })[];
        };
        publicKeyJwk: {
            kty: string;
            crv: string;
            x: string;
        };
        publicKeyMultibase: string;
    };
    output: string;
} | {
    id: string;
    input: {
        didDocument: {
            '@context': string[];
            id: string;
            verificationMethod: ({
                id: string;
                type: string;
                controller: string;
                publicKeyJwk: {
                    alg: string;
                    kty: string;
                    crv: string;
                    x: string;
                };
                publicKeyMultibase?: undefined;
            } | {
                id: string;
                type: string;
                controller: string;
                publicKeyMultibase: string;
                publicKeyJwk?: undefined;
            })[];
            authentication: (string | {
                id: string;
                type: string;
                controller: string;
                publicKeyJwk: {
                    alg: string;
                    kty: string;
                    crv: string;
                    x: string;
                };
            })[];
            keyAgreement: ({
                id: string;
                type: string;
                controller: string;
                publicKeyJwk: {
                    alg: string;
                    kty: string;
                    crv: string;
                    x: string;
                };
                publicKeyMultibase?: undefined;
            } | {
                id: string;
                type: string;
                controller: string;
                publicKeyMultibase: string;
                publicKeyJwk?: undefined;
            })[];
        };
        publicKeyJwk: {
            kty: string;
            crv: string;
            x: string;
        };
        publicKeyMultibase?: undefined;
    };
    output: undefined;
})[];
export declare const didDocumentTypeTestVectors: ({
    id: string;
    input: {
        didDocument: {
            '@context': string[];
            id: string;
            verificationMethod: {
                id: string;
                type: string;
                controller: string;
                publicKeyMultibase: string;
            }[];
            authentication: (string | {
                id: string;
                type: string;
                controller: string;
                publicKeyMultibase: string;
            })[];
            assertionMethod: (string | {
                id: string;
                type: string;
                controller: string;
                publicKeyMultibase: string;
            })[];
            capabilityDelegation: string[];
            capabilityInvocation: string[];
            keyAgreement: string[];
        };
    };
    output: string[];
} | {
    id: string;
    input: {
        didDocument: {
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
    };
    output: string[];
} | {
    id: string;
    input: {
        didDocument: {
            '@context': string[];
            verificationMethod: ({
                id: string;
                type: string;
                controller: string;
                publicKeyBase58: string;
                publicKeyJwk?: undefined;
            } | {
                id: string;
                type: string;
                controller: string;
                publicKeyJwk: {
                    kty: string;
                    crv: string;
                    x: string;
                    y: string;
                };
                publicKeyBase58?: undefined;
            })[];
            id?: undefined;
            authentication?: undefined;
            assertionMethod?: undefined;
            capabilityDelegation?: undefined;
            capabilityInvocation?: undefined;
            keyAgreement?: undefined;
        };
    };
    output: string[];
})[];
//# sourceMappingURL=did-utils.d.ts.map