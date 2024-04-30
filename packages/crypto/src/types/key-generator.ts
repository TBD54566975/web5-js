import type { Jwk } from '../jose/jwk.js';

/**
 * The `KeyGenerator` interface provides a method for cryptographic key generation. It includes
 * the `generateKey()` method to produce keys for cryptographic operations, supporting various
 * algorithms and configurations. This interface is adaptable to different key generation
 * requirements and can produce keys in formats such as JWK.
 *
 * The method returns a Promise that resolves to the generated key in the specified format.
 */
export interface KeyGenerator<
  GenerateKeyInput,
  GenerateKeyOutput
> {
  /**
   * Generates a cryptographic key based on the provided parameters.
   *
   * @remarks
   * The `generateKey()` method of the {@link KeyGenerator | `KeyGenerator`} interface generates
   * private keys suitable for various cryptographic operations. This method can adapt to different
   * key generation algorithms and input parameters.
   *
   * @param params - Optional parameters for the key generation process, specific to the chosen
   *                 algorithm.
   *
   * @returns A Promise resolving to the generated private key in the specified output format.
   */
  generateKey(params?: GenerateKeyInput): Promise<GenerateKeyOutput>;
}

/**
 * The `AsymmetricKeyGenerator` interface extends {@link KeyGenerator | `KeyGenerator`}, adding
 * methods specific to asymmetric public keys. It supports generating asymmetric private keys and
 * obtaining the public key from a private key.
 *
 * This interface is designed for asymmetric cryptographic operations where both public and private
 * keys are used.
 */
export interface AsymmetricKeyGenerator<
  GenerateKeyInput,
  GenerateKeyOutput,
  GetPublicKeyInput
> extends KeyGenerator<GenerateKeyInput, GenerateKeyOutput> {
  /**
   * Optional method that mathetmatically derives the public key in JWK format from a given private
   * key.
   *
   * @param params - The parameters for public key computation.
   *
   * @returns A Promise resolving to the public key in JWK format.
   */
  computePublicKey?(params: GetPublicKeyInput): Promise<Jwk>;

  /**
   * Extracts the public key portion from the given public key in JWK format.
   *
   * @remarks
   * Unlike `computePublicKey()`, the `getPublicKey()` method does not mathematically validate the
   * private key, nor does it derive the public key from the private key. It simply extracts
   * existing public key properties from the private key JWK object. This makes it suitable for
   * scenarios where speed is critical and the private key's integrity is already assured.
   *
   * @param params - The parameters for public key retrieval.
   *
   * @returns A Promise resolving to the public key in JWK format.
   */
  getPublicKey(params: GetPublicKeyInput): Promise<Jwk>;
}

/**
 * Infers the supported algorithm type from the `generateKey` method of a key generator.
 *
 * @remarks
 * The `InferKeyGeneratorAlgorithm` utility type extracts the algorithm type from the input
 * parameters of the `generateKey` method implemented in a key generator. This type is useful when
 * working with various cryptographic key generators, as it enables TypeScript to infer the
 * supported algorithms based on the key generator's implementation. This inference ensures type
 * safety and improves developer experience by providing relevant suggestions and checks for the
 * supported algorithms during development.
 *
 * This utility type can be particularly advantageous in contexts where the specific key generator
 * may vary, but the code needs to adapt dynamically based on the supported algorithms of the
 * provided key generator instance.
 *
 * @example
 * ```ts
 * export interface MyKmsGenerateKeyParams extends KmsGenerateKeyParams {
 *  algorithm: 'Ed25519' | 'secp256k1';
 * }
 *
 * class MyKms implements KeyGenerator<MyKmsGenerateKeyParams, Jwk> {
 *   generateKey(params: MyKmsGenerateKeyParams): Promise<Jwk> {
 *     // Implementation for generating a key...
 *   }
 * }
 *
 * type SupportedAlgorithms = InferKeyGeneratorAlgorithm<MyKms>;
 * // `SupportedAlgorithms` will be inferred as 'Ed25519' | 'secp256k1'
 * ```
 *
 * @template T - The type of the key generator from which to infer the algorithm type.
 */
export type InferKeyGeneratorAlgorithm<T> = T extends {
    /**
     * The `generateKey` method signature from which the algorithm type is inferred.
     * This is an internal implementation detail and not part of the public API.
     */
    generateKey(params: infer P): any;
  }
  ? P extends {
      /**
       * The `algorithm` property within the parameters of `generateKey`.
       * This internal element is used to infer the algorithm type.
       */
      algorithm: infer A
    }
    ? A
    : never
  : never;