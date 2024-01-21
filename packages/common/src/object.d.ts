/**
 * Checks whether the given object has any properties.
 */
export declare function isEmptyObject(obj: unknown): boolean;
/**
 * Recursively removes all properties with an empty object or array as its value from the given object.
 */
export declare function removeEmptyObjects(obj: Record<string, unknown>): void;
/**
 * Recursively removes all properties with `undefined` as its value from the given object.
 */
export declare function removeUndefinedProperties(obj: Record<string, unknown>): void;
//# sourceMappingURL=object.d.ts.map