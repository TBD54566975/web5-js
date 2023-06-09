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