import type { Multibase } from 'multiformats';
export declare class Convert {
    data: any;
    format: string;
    constructor(data: any, format: string);
    static arrayBuffer(data: ArrayBuffer): Convert;
    static asyncIterable(data: AsyncIterable<any>): Convert;
    static base58Btc(data: string): Convert;
    static base64Url(data: string): Convert;
    /**
     * Reference:
     * The BufferSource type is a TypeScript type that represents an ArrayBuffer
     * or one of the ArrayBufferView types, such a TypedArray (e.g., Uint8Array)
     * or a DataView.
     */
    static bufferSource(data: BufferSource): Convert;
    static hex(data: string): Convert;
    static multibase(data: string): Convert;
    static object(data: Record<string, any>): Convert;
    static string(data: string): Convert;
    static uint8Array(data: Uint8Array): Convert;
    toArrayBuffer(): ArrayBuffer;
    toArrayBufferAsync(): Promise<ArrayBuffer>;
    toBase58Btc(): string;
    toBase64Url(): string;
    toBlobAsync(): Promise<Blob>;
    toHex(): string;
    toMultibase(): Multibase<any>;
    toObject(): object;
    toObjectAsync(): Promise<any>;
    toString(): string;
    toStringAsync(): Promise<string>;
    toUint8Array(): Uint8Array;
    toUint8ArrayAsync(): Promise<Uint8Array>;
}
//# sourceMappingURL=convert.d.ts.map