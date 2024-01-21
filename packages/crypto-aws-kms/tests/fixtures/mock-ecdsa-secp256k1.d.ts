import type { SignCommandOutput, CreateKeyCommandOutput, CreateAliasCommandOutput, DescribeKeyCommandOutput, GetPublicKeyCommandOutput } from '@aws-sdk/client-kms';
export declare const mockCreateAliasCommandOutput: CreateAliasCommandOutput;
export declare const mockCreateKeyCommandOutput: CreateKeyCommandOutput;
export declare const mockDescribeKeyCommandOutput: DescribeKeyCommandOutput;
export declare const mockGetPublicKeyCommandOutput: GetPublicKeyCommandOutput;
export declare const mockSignCommandOutput: SignCommandOutput;
export declare const mockEcdsaSecp256k1: {
    createKeyAlias: {
        input: {
            alias: string;
            awsKeyId: string;
        };
        output: CreateAliasCommandOutput;
    };
    generateKey: {
        input: {
            algorithm: string;
        };
        output: CreateKeyCommandOutput;
    };
    getKeySpec: {
        input: {
            keyUri: string;
        };
        output: DescribeKeyCommandOutput;
    };
    getPublicKey: {
        input: {
            keyUri: string;
        };
        output: GetPublicKeyCommandOutput;
    };
    sign: {
        input: {
            algorithm: string;
            data: Uint8Array;
            keyUri: string;
        };
        output: SignCommandOutput;
    };
    verify: {
        input: {
            key: {
                kty: string;
                x: string;
                y: string;
                crv: string;
                alg: string;
                kid: string;
            };
            signature: Uint8Array;
            data: Uint8Array;
        };
        output: SignCommandOutput;
    };
};
//# sourceMappingURL=mock-ecdsa-secp256k1.d.ts.map