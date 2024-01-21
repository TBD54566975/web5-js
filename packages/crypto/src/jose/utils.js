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
export function canonicalize(obj) {
    /**
     * Recursively sorts the keys of an object.
     *
     * @param obj - The object whose keys are to be sorted.
     * @returns A new object with sorted keys.
     */
    const sortObjKeys = (obj) => {
        if (obj !== null && typeof obj === 'object' && !Array.isArray(obj)) {
            const sortedKeys = Object.keys(obj).sort();
            const sortedObj = {};
            for (const key of sortedKeys) {
                // Recursively sort keys of nested objects.
                sortedObj[key] = sortObjKeys(obj[key]);
            }
            return sortedObj;
        }
        return obj;
    };
    // Stringify and return the final sorted object.
    const sortedObj = sortObjKeys(obj);
    return JSON.stringify(sortedObj);
}
//# sourceMappingURL=utils.js.map