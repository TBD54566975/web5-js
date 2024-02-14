/**
 * Represents an array of a fixed length, preventing modifications to its size.
 *
 * The `FixedLengthArray` utility type transforms a standard array into a variant where
 * methods that could alter the length are omitted. It leverages TypeScript's advanced types,
 * such as conditional types and mapped types, to ensure that the array cannot be resized
 * through methods like `push`, `pop`, `splice`, `shift`, and `unshift`. The utility type
 * maintains all other characteristics of a standard array, including indexing, iteration,
 * and type checking for its elements.
 *
 * Note: The type does not prevent direct assignment to indices, even if it would exceed
 * the original length. However, such actions would lead to TypeScript type errors.
 *
 * @example
 * ```ts
 * // Declare a variable with a type of fixed-length array of three strings.
 * let myFixedLengthArray: FixedLengthArray< [string, string, string]>;
 *
 * // Array declaration tests
 * myFixedLengthArray = [ 'a', 'b', 'c' ];  // OK
 * myFixedLengthArray = [ 'a', 'b', 123 ];  // TYPE ERROR
 * myFixedLengthArray = [ 'a' ];            // LENGTH ERROR
 * myFixedLengthArray = [ 'a', 'b' ];       // LENGTH ERROR
 *
 * // Index assignment tests
 * myFixedLengthArray[1] = 'foo';           // OK
 * myFixedLengthArray[1000] = 'foo';        // INVALID INDEX ERROR
 *
 * // Methods that mutate array length
 * myFixedLengthArray.push('foo');          // MISSING METHOD ERROR
 * myFixedLengthArray.pop();                // MISSING METHOD ERROR
 *
 * // Direct length manipulation
 * myFixedLengthArray.length = 123;         // READ-ONLY ERROR
 *
 * // Destructuring
 * let [ a ] = myFixedLengthArray;          // OK
 * let [ a, b ] = myFixedLengthArray;       // OK
 * let [ a, b, c ] = myFixedLengthArray;    // OK
 * let [ a, b, c, d ] = myFixedLengthArray; // INVALID INDEX ERROR
 * ```
 *
 * @template T extends any[] - The array type to be transformed.
 */
export type FixedLengthArray<T extends any[]> =
  Pick<T, Exclude<keyof T, ArrayLengthMutationKeys>>
  & {
    /**
     * Custom iterator for the `FixedLengthArray` type.
     *
     * This iterator allows the `FixedLengthArray` to be used in standard iteration
     * contexts, such as `for...of` loops and spread syntax. It ensures that even though
     * the array is of a fixed length with disabled mutation methods, it still retains
     * iterable behavior similar to a regular array.
     *
     * @returns An IterableIterator for the array items.
     */
    [Symbol.iterator]: () => IterableIterator<ArrayItems<T>>
  };

/** Helper types for {@link FixedLengthArray} */
type ArrayLengthMutationKeys = 'splice' | 'push' | 'pop' | 'shift' | 'unshift' | number;
type ArrayItems<T extends Array<any>> = T extends Array<infer TItems> ? TItems : never;

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
export function isArrayBufferSlice(arrayBufferView: ArrayBufferView): boolean {
  return arrayBufferView.byteOffset !== 0 || arrayBufferView.byteLength !== arrayBufferView.buffer.byteLength;
}

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
export function isAsyncIterable(obj: any): obj is AsyncIterable<any> {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  return typeof obj[Symbol.asyncIterator] === 'function';
}

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
export function isDefined<T>(arg: T): arg is Exclude<T, null | undefined> {
  return arg !== null && typeof arg !== 'undefined';
}

/**
 * Utility type that transforms a type `T` to have only certain keys `K` as required, while the
 * rest remain optional, except for keys specified in `O`, which are omitted entirely.
 *
 * This type is useful when you need a variation of a type where only specific properties are
 * required, and others are either optional or not included at all. It allows for more flexible type
 * definitions based on existing types without the need to redefine them.
 *
 * @template T - The original type to be transformed.
 * @template K - The keys of `T` that should be required.
 * @template O - The keys of `T` that should be omitted from the resulting type (optional).
 *
 * @example
 * ```ts
 * // Given an interface
 * interface Example {
 *   requiredProp: string;
 *   optionalProp?: number;
 *   anotherOptionalProp?: boolean;
 * }
 *
 * // Making 'optionalProp' required and omitting 'anotherOptionalProp'
 * type ModifiedExample = RequireOnly<Example, 'optionalProp', 'anotherOptionalProp'>;
 * // Result: { requiredProp?: string; optionalProp: number; }
 * ```
 */
export type RequireOnly<T, K extends keyof T, O extends keyof T = never> = Required<Pick<T, K>> & Omit<Partial<T>, O>;

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
export function universalTypeOf(value: unknown) {
  // Returns '[Object Type]' string.
  const typeString = Object.prototype.toString.call(value);
  // Returns ['Object', 'Type'] array or null.
  const match = typeString.match(/\s([a-zA-Z0-9]+)/);
  // Deconstructs the array and gets just the type from index 1.
  const [_, type] = match as RegExpMatchArray;

  return type;
}

/**
 * Utility type to extract the type resolved by a Promise.
 *
 * This type unwraps the type `T` from `Promise<T>` if `T` is a Promise, otherwise returns `T` as
 * is. It's useful in situations where you need to handle the type returned by a promise-based
 * function in a synchronous context, such as defining types for test vectors or handling return
 * types in non-async code blocks.
 *
 * @template T - The type to unwrap from the Promise.
 *
 * @example
 * ```ts
 * // For a Promise type, it extracts the resolved type.
 * type AsyncNumber = Promise<number>;
 * type UnwrappedNumber = UnwrapPromise<AsyncNumber>; // number
 *
 * // For a non-Promise type, it returns the type as is.
 * type StringValue = string;
 * type UnwrappedString = UnwrapPromise<StringValue>; // string
 * ```
 */
export type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;