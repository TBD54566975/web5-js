/**
 * Checks if a variable is defined and not null.
 * After this check, Typescript sees the variable as defined.
 *
 * @param arg - The input to be verified
 * @returns true if the input variable is defined.
 */
export function isDefined<T>(arg: T): arg is Exclude<T, null | undefined> {
  return arg !== null && typeof arg !== 'undefined';
}

/**
 * Represents an object type where a subset of keys are required and everything else is optional.
 */
export type RequireOnly<T, K extends keyof T> = Required<Pick<T, K>> & Partial<T>

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
  const match = typeString.match(/\s([a-zA-Z]+)/);
  // Mostly a typeguard, but if `match()` returns null, throw an error.
  if (match === null) {
    throw new Error('unable to determine type.');
  }
  // Deconstructs the array and gets just the type from index 1.
  const [_, type] = match;

  return type;
}