/**
 * Infer the type of a type parameter.
 *
 * This is useful when you want to infer the type of a type parameter in a generic function.
 */
export type InferType<T> = T extends infer U ? U : never;