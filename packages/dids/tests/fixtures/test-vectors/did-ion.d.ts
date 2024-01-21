export declare const didIonCreateTestVectors: ({
    id: string;
    input: {
        keySet: {
            recoveryKey: {
                privateKeyJwk: {
                    alg: string;
                    crv: string;
                    d: string;
                    ext: string;
                    key_ops: string[];
                    kid: string;
                    kty: string;
                    x: string;
                    y: string;
                };
                publicKeyJwk: {
                    alg: string;
                    crv: string;
                    ext: string;
                    key_ops: string[];
                    kid: string;
                    kty: string;
                    x: string;
                    y: string;
                };
            };
            updateKey: {
                privateKeyJwk: {
                    alg: string;
                    crv: string;
                    d: string;
                    ext: string;
                    key_ops: string[];
                    kid: string;
                    kty: string;
                    x: string;
                    y: string;
                };
                publicKeyJwk: {
                    alg: string;
                    crv: string;
                    ext: string;
                    key_ops: string[];
                    kid: string;
                    kty: string;
                    x: string;
                    y: string;
                };
            };
            verificationMethodKeys: {
                publicKeyJwk: {
                    alg: string;
                    crv: string;
                    kid: string;
                    kty: string;
                    x: string;
                };
                relationships: string[];
            }[];
        };
        keyAlgorithm: string;
    };
    output: {
        canonicalId: string;
        did: string;
        document: {
            '@context': (string | {
                '@base': string;
            })[];
            id: string;
            verificationMethod: {
                id: string;
                type: string;
                controller: string;
                publicKeyJwk: {
                    crv: string;
                    kty: string;
                    x: string;
                };
            }[];
            authentication: string[];
            assertionMethod: string[];
            service: never[];
        };
        keySet: {
            recoveryKey: {
                privateKeyJwk: {
                    alg: string;
                    crv: string;
                    d: string;
                    ext: string;
                    key_ops: string[];
                    kid: string;
                    kty: string;
                    x: string;
                    y: string;
                };
                publicKeyJwk: {
                    alg: string;
                    crv: string;
                    ext: string;
                    key_ops: string[];
                    kid: string;
                    kty: string;
                    x: string;
                    y: string;
                };
            };
            updateKey: {
                privateKeyJwk: {
                    alg: string;
                    crv: string;
                    d: string;
                    ext: string;
                    key_ops: string[];
                    kid: string;
                    kty: string;
                    x: string;
                    y: string;
                };
                publicKeyJwk: {
                    alg: string;
                    crv: string;
                    ext: string;
                    key_ops: string[];
                    kid: string;
                    kty: string;
                    x: string;
                    y: string;
                };
            };
            verificationMethodKeys: {
                publicKeyJwk: {
                    alg: string;
                    crv: string;
                    kid: string;
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
        keySet: {
            recoveryKey: {
                privateKeyJwk: {
                    alg: string;
                    crv: string;
                    d: string;
                    ext: string;
                    key_ops: string[];
                    kty: string;
                    x: string;
                    y: string;
                    kid?: undefined;
                };
                publicKeyJwk: {
                    alg: string;
                    crv: string;
                    ext: string;
                    key_ops: string[];
                    kty: string;
                    x: string;
                    y: string;
                    kid?: undefined;
                };
            };
            updateKey: {
                privateKeyJwk: {
                    alg: string;
                    crv: string;
                    d: string;
                    ext: string;
                    key_ops: string[];
                    kty: string;
                    x: string;
                    y: string;
                    kid?: undefined;
                };
                publicKeyJwk: {
                    alg: string;
                    crv: string;
                    ext: string;
                    key_ops: string[];
                    kty: string;
                    x: string;
                    y: string;
                    kid?: undefined;
                };
            };
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
        keyAlgorithm: string;
    };
    output: {
        canonicalId: string;
        did: string;
        document: {
            '@context': (string | {
                '@base': string;
            })[];
            id: string;
            verificationMethod: {
                id: string;
                type: string;
                controller: string;
                publicKeyJwk: {
                    crv: string;
                    kty: string;
                    x: string;
                };
            }[];
            authentication: string[];
            service: never[];
            assertionMethod?: undefined;
        };
        keySet: {
            recoveryKey: {
                privateKeyJwk: {
                    alg: string;
                    crv: string;
                    d: string;
                    ext: string;
                    key_ops: string[];
                    kid: string;
                    kty: string;
                    x: string;
                    y: string;
                };
                publicKeyJwk: {
                    alg: string;
                    crv: string;
                    ext: string;
                    key_ops: string[];
                    kid: string;
                    kty: string;
                    x: string;
                    y: string;
                };
            };
            updateKey: {
                privateKeyJwk: {
                    alg: string;
                    crv: string;
                    d: string;
                    ext: string;
                    key_ops: string[];
                    kid: string;
                    kty: string;
                    x: string;
                    y: string;
                };
                publicKeyJwk: {
                    alg: string;
                    crv: string;
                    ext: string;
                    key_ops: string[];
                    kid: string;
                    kty: string;
                    x: string;
                    y: string;
                };
            };
            verificationMethodKeys: {
                publicKeyJwk: {
                    alg: string;
                    crv: string;
                    kid: string;
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
        keySet: {
            recoveryKey: {
                privateKeyJwk: {
                    alg: string;
                    crv: string;
                    d: string;
                    ext: string;
                    key_ops: string[];
                    kty: string;
                    x: string;
                    y: string;
                    kid?: undefined;
                };
                publicKeyJwk: {
                    alg: string;
                    crv: string;
                    ext: string;
                    key_ops: string[];
                    kty: string;
                    x: string;
                    y: string;
                    kid?: undefined;
                };
            };
            updateKey: {
                privateKeyJwk: {
                    alg: string;
                    crv: string;
                    d: string;
                    ext: string;
                    key_ops: string[];
                    kty: string;
                    x: string;
                    y: string;
                    kid?: undefined;
                };
                publicKeyJwk: {
                    alg: string;
                    crv: string;
                    ext: string;
                    key_ops: string[];
                    kty: string;
                    x: string;
                    y: string;
                    kid?: undefined;
                };
            };
            verificationMethodKeys: {
                publicKeyJwk: {
                    alg: string;
                    crv: string;
                    kty: string;
                    x: string;
                    y: string;
                };
                relationships: string[];
            }[];
        };
        keyAlgorithm: string;
    };
    output: {
        canonicalId: string;
        did: string;
        document: {
            '@context': (string | {
                '@base': string;
            })[];
            id: string;
            verificationMethod: {
                id: string;
                type: string;
                controller: string;
                publicKeyJwk: {
                    crv: string;
                    kty: string;
                    x: string;
                    y: string;
                };
            }[];
            authentication: string[];
            service: never[];
            assertionMethod?: undefined;
        };
        keySet: {
            recoveryKey: {
                privateKeyJwk: {
                    alg: string;
                    crv: string;
                    d: string;
                    ext: string;
                    key_ops: string[];
                    kid: string;
                    kty: string;
                    x: string;
                    y: string;
                };
                publicKeyJwk: {
                    alg: string;
                    crv: string;
                    ext: string;
                    key_ops: string[];
                    kid: string;
                    kty: string;
                    x: string;
                    y: string;
                };
            };
            updateKey: {
                privateKeyJwk: {
                    alg: string;
                    crv: string;
                    d: string;
                    ext: string;
                    key_ops: string[];
                    kid: string;
                    kty: string;
                    x: string;
                    y: string;
                };
                publicKeyJwk: {
                    alg: string;
                    crv: string;
                    ext: string;
                    key_ops: string[];
                    kid: string;
                    kty: string;
                    x: string;
                    y: string;
                };
            };
            verificationMethodKeys: {
                publicKeyJwk: {
                    alg: string;
                    crv: string;
                    kid: string;
                    kty: string;
                    x: string;
                    y: string;
                };
                relationships: string[];
            }[];
        };
    };
})[];
//# sourceMappingURL=did-ion.d.ts.map