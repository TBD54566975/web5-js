export type MulticodecCode = number;
export type MulticodecDefinition<MulticodecCode> = {
    code: MulticodecCode;
    name: string;
};
/**
 * The `Multicodec` class provides an interface to prepend binary data
 * with a prefix that identifies the data that follows.
 * https://github.com/multiformats/multicodec/blob/master/table.csv
 *
 * Multicodec is a self-describing multiformat, it wraps other formats with
 * a tiny bit of self-description. A multicodec identifier is a
 * varint (variable integer) that indicates the format of the data.
 *
 * The canonical table of multicodecs can be access at the following URL:
 * https://github.com/multiformats/multicodec/blob/master/table.csv
 *
 * Example usage:
 *
 * ```ts
 * Multicodec.registerCodec({ code: 0xed, name: 'ed25519-pub' });
 * const prefixedData = Multicodec.addPrefix({ code: 0xed, data: new Uint8Array(32) });
 * ```
 */
export declare class Multicodec {
    /**
     * A static field containing a map of codec codes to their corresponding names.
     */
    static codeToName: Map<number, string>;
    /**
     * A static field containing a map of codec names to their corresponding codes.
     */
    static nameToCode: Map<string, number>;
    /**
     * Adds a multicodec prefix to input data.
     *
     * @param options - The options for adding a prefix.
     * @param options.code - The codec code. Either the code or name must be provided.
     * @param options.name - The codec name. Either the code or name must be provided.
     * @param options.data - The data to be prefixed.
     * @returns The data with the added prefix as a Uint8Array.
     */
    static addPrefix(options: {
        code?: MulticodecCode;
        data: Uint8Array;
        name?: string;
    }): Uint8Array;
    /**
     * Get the Multicodec code from given prefixed data.
     *
     * @param options - The options for getting the codec code.
     * @param options.prefixedData - The data to extract the codec code from.
     * @returns - The Multicodec code as a number.
     */
    static getCodeFromData(options: {
        prefixedData: Uint8Array;
    }): MulticodecCode;
    /**
     * Get the Multicodec code from given Multicodec name.
     *
     * @param options - The options for getting the codec code.
     * @param options.name - The name to lookup.
     * @returns - The Multicodec code as a number.
     */
    static getCodeFromName(options: {
        name: string;
    }): MulticodecCode;
    /**
     * Get the Multicodec name from given Multicodec code.
     *
     * @param options - The options for getting the codec name.
     * @param options.name - The code to lookup.
     * @returns - The Multicodec name as a string.
     */
    static getNameFromCode(options: {
        code: MulticodecCode;
    }): string;
    /**
     * Registers a new codec in the Multicodec class.
     *
     * @param codec - The codec to be registered.
     */
    static registerCodec(codec: MulticodecDefinition<MulticodecCode>): void;
    /**
     * Returns the data with the Multicodec prefix removed.
     *
     * @param refixedData - The data to extract the codec code from.
     * @returns {Uint8Array}
     */
    static removePrefix(options: {
        prefixedData: Uint8Array;
    }): {
        code: MulticodecCode;
        name: string;
        data: Uint8Array;
    };
}
//# sourceMappingURL=multicodec.d.ts.map