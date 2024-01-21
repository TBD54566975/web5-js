export declare const joseToMulticodecTestVectors: ({
    output: {
        code: number;
        name: string;
    };
    input: {
        alg: string;
        crv: string;
        kty: string;
        x: string;
        d?: undefined;
        y?: undefined;
    };
} | {
    output: {
        code: number;
        name: string;
    };
    input: {
        d: string;
        alg: string;
        crv: string;
        kty: string;
        x: string;
        y?: undefined;
    };
} | {
    output: {
        code: number;
        name: string;
    };
    input: {
        alg: string;
        crv: string;
        kty: string;
        x: string;
        y: string;
        d?: undefined;
    };
} | {
    output: {
        code: number;
        name: string;
    };
    input: {
        d: string;
        alg: string;
        crv: string;
        kty: string;
        x: string;
        y: string;
    };
} | {
    output: {
        code: number;
        name: string;
    };
    input: {
        crv: string;
        kty: string;
        x: string;
        alg?: undefined;
        d?: undefined;
        y?: undefined;
    };
} | {
    output: {
        code: number;
        name: string;
    };
    input: {
        d: string;
        crv: string;
        kty: string;
        x: string;
        alg?: undefined;
        y?: undefined;
    };
})[];
export declare const jwkToThumbprintTestVectors: ({
    output: string;
    input: {
        kty: string;
        n: string;
        e: string;
        alg: string;
        kid: string;
        k?: undefined;
        crv?: undefined;
        x?: undefined;
        y?: undefined;
        d?: undefined;
    };
} | {
    output: string;
    input: {
        alg: string;
        kty: string;
        k: string;
        n?: undefined;
        e?: undefined;
        kid?: undefined;
        crv?: undefined;
        x?: undefined;
        y?: undefined;
        d?: undefined;
    };
} | {
    output: string;
    input: {
        alg: string;
        crv: string;
        kty: string;
        x: string;
        y: string;
        n?: undefined;
        e?: undefined;
        kid?: undefined;
        k?: undefined;
        d?: undefined;
    };
} | {
    output: string;
    input: {
        crv: string;
        kty: string;
        x: string;
        n?: undefined;
        e?: undefined;
        alg?: undefined;
        kid?: undefined;
        k?: undefined;
        y?: undefined;
        d?: undefined;
    };
} | {
    output: string;
    input: {
        d: string;
        crv: string;
        kty: string;
        x: string;
        n?: undefined;
        e?: undefined;
        alg?: undefined;
        kid?: undefined;
        k?: undefined;
        y?: undefined;
    };
})[];
export declare const jwkToMultibaseIdTestVectors: ({
    input: {
        crv: string;
        kty: string;
        x: string;
        y: string;
    };
    output: string;
} | {
    input: {
        crv: string;
        kty: string;
        x: string;
        y?: undefined;
    };
    output: string;
})[];
//# sourceMappingURL=jose.d.ts.map