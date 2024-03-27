export type InferKeyUnwrapAlgorithm<T> = T extends {
  /**
   * The `unwrapKey` method signature from which the algorithm type is inferred.
   * This is an internal implementation detail and not part of the public API.
   */
  unwrapKey(params: infer P): any;
}
? P extends {
    /**
     * The `wrappedKeyAlgorithm` property within the parameters of `unwrapKey`.
     * This internal element is used to infer the algorithm type.
     */
    wrappedKeyAlgorithm: infer A
  }
  ? A
  : never
: never;