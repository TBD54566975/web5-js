export type InferCipherAlgorithm<T> = T extends {
  /**
   * The `encrypt` method signature from which the algorithm type is inferred.
   * This is an internal implementation detail and not part of the public API.
   */
  encrypt(params: infer P): any;
}
? P extends {
    /**
     * The `algorithm` property within the parameters of `encrypt`.
     * This internal element is used to infer the algorithm type.
     */
    algorithm: infer A
  }
  ? A
  : never
: never;