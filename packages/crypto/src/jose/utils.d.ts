/**
 * Canonicalizes a given object according to RFC 8785 (https://tools.ietf.org/html/rfc8785),
 * which describes JSON Canonicalization Scheme (JCS). This function sorts the keys of the
 * object and its nested objects alphabetically and then returns a stringified version of it.
 * This method handles nested objects, array values, and null values appropriately.
 *
 * @param obj - The object to canonicalize.
 * @returns The stringified version of the input object with its keys sorted alphabetically
 * per RFC 8785.
 */
export declare function canonicalize(obj: {
    [key: string]: any;
}): string;
//# sourceMappingURL=utils.d.ts.map