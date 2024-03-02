/**
 * The `KeyDeriver` interface provide a method for key derivation.
 *
 * The `deriveKey()` method derives a {@link Jwk | JWK} from input data using the specified key
 * derivation algorithm. This interface is designed to support various key derivation
 * algorithms, accommodating different input and output types.
 */
export interface KeyDeriver<
  DeriveKeyInput,
  DeriveKeyOutput,
> {
  /**
   * Derives a cryptographic key in JWK format based on the provided input parameters.
   *
   * @remarks
   * The `deriveKey()` method of the {@link KeyDeriver | `KeyDeriver`} interface is utilized to
   * generate cryptographic keys for operations like encryption, decryption, or signing. The method
   * takes in parameters tailored to the key derivation algorithm being used and returns a promise
   * that resolves to the derived key.
   *
   * @param params - The parameters for the key derivation process, specific to the chosen
   *                 algorithm.
   *
   * @returns A Promise resolving to the derived key in the specified output format.
   */
  deriveKey(params: DeriveKeyInput): Promise<DeriveKeyOutput>;
}

/**
 * The `KeyBytesDeriver` interface provide a method for deriving a byte array using a key derivation
 * algorithm.
 *
 * The `deriveKeyBytes()` method to derives cryptographic bits from input data using the specified
 * key derivation algorithm. This interface is designed to support various key derivation
 * algorithms, accommodating different input and output types.
 */
export interface KeyBytesDeriver<
  DeriveKeyBytesInput,
  DeriveKeyBytesOutput
> {
  /**
   * Generates a specified number of cryptographic bits from given input parameters.
   *
   * @remarks
   * The `deriveKeyBytes()` method of the {@link KeyBytesDeriver | `KeyBytesDeriver`} interface is
   * used to create cryptographic material such as initialization vectors or keys from various
   * sources. The method takes in parameters specific to the chosen key derivation algorithm and
   * outputs a promise that resolves to a `Uint8Array` containing the derived bits.
   *
   * @param params - The parameters for the key derivation process, specific to the chosen
   *                 algorithm.
   *
   * @returns A Promise resolving to the derived bits in the specified format.
   */
  deriveKeyBytes(params: DeriveKeyBytesInput): Promise<DeriveKeyBytesOutput>;
}