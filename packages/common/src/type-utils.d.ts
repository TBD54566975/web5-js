/**
 * isArrayBufferSlice
 *
 * Checks if the ArrayBufferView represents a slice (subarray or a subview)
 * of an ArrayBuffer.
 *
 * An ArrayBufferView (TypedArray or DataView) can represent a portion of an
 * ArrayBuffer - such a view is said to be a "slice" of the original buffer.
 * This can occur when the `subarray` or `slice` method is called on a
 * TypedArray or when a DataView is created with a byteOffset and/or
 * byteLength that doesn't cover the full ArrayBuffer.
 *
 * @param arrayBufferView - The ArrayBufferView to be checked
 * @returns true if the ArrayBufferView represents a slice of an ArrayBuffer; false otherwise.
 */
export declare function isArrayBufferSlice(arrayBufferView: ArrayBufferView): boolean;
/**
 * Checks if the given object is an AsyncIterable.
 *
 * An AsyncIterable is an object that implements the AsyncIterable protocol,
 * which means it has a [Symbol.asyncIterator] method. This function checks
 * if the provided object conforms to this protocol by verifying the presence
 * and type of the [Symbol.asyncIterator] method.
 *
 * @param obj - The object to be checked for AsyncIterable conformity.
 * @returns True if the object is an AsyncIterable, false otherwise.
 *
 * @example
 * ```ts
 * // Returns true for a valid AsyncIterable
 * const asyncIterable = {
 *   async *[Symbol.asyncIterator]() {
 *     yield 1;
 *     yield 2;
 *   }
 * };
 * console.log(isAsyncIterable(asyncIterable)); // true
 * ```
 *
 * @example
 * ```ts
 * // Returns false for a regular object
 * console.log(isAsyncIterable({ a: 1, b: 2 })); // false
 * ```
 */
export declare function isAsyncIterable(obj: any): obj is AsyncIterable<any>;
/**
 * isDefined
 *
 * Utility function to check if a variable is neither null nor undefined.
 * This function helps in making TypeScript infer the type of the variable
 * as being defined, excluding `null` and `undefined`.
 *
 * The function uses strict equality (`!==`) for the comparison, ensuring
 * that the variable is not just falsy (like an empty string or zero),
 * but is truly either `null` or `undefined`.
 *
 * @param arg - The variable to be checked
 * @returns true if the variable is neither `null` nor `undefined`
 */
export declare function isDefined<T>(arg: T): arg is Exclude<T, null | undefined>;
/**
 * universalTypeOf
 *
 * Why does this function exist?
 *
 * You can typically check if a value is of a particular type, such as
 * Uint8Array or ArrayBuffer, by using the `instanceof` operator. The
 * `instanceof` operator checks the prototype property of a constructor
 * in the object's prototype chain.
 *
 * However, there is a caveat with the `instanceof` check if the value
 * was created from a different JavaScript context (like an iframe or
 * a web worker). In those cases, the `instanceof` check might fail
 * because each context has a different global object, and therefore,
 * different built-in constructor functions.
 *
 * The `typeof` operator provides information about the type of the
 * operand in a less detailed way. For basic data types like number,
 * string, boolean, and undefined, the `typeof` operator works as
 * expected.  However, for objects, including arrays and null,
 * it always returns "object".  For functions, it returns "function".
 * So, while `typeof` is good for basic type checking, it doesn't
 * give detailed information about complex data types.
 *
 * Unlike `instanceof` and `typeof`, `Object.prototype.toString.call(value)`
 * can ensure a consistent result across different JavaScript
 * contexts.
 *
 * Credit for inspiration:
 *   Angus Croll
 *   https://github.com/angus-c
 *   https://javascriptweblog.wordpress.com/2011/08/08/fixing-the-javascript-typeof-operator/
 */
export declare function universalTypeOf(value: unknown): string;
//# sourceMappingURL=type-utils.d.ts.map