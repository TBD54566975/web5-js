export declare const didResolverTestVectors: {
    id: string;
    input: string;
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
    };
}[];
//# sourceMappingURL=did-resolver.d.ts.map