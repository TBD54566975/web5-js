/**
 * The `KeyDeriver` interface provides methods for key derivation. It includes the methods
 * `deriveBits()` to derive cryptographic bits and `deriveKey()` to derive JWK keys from input data
 * using specific algorithms. This interface is designed to support various key derivation
 * algorithms, accommodating different input and output types.
 *
 * Both methods return a Promise that resolves to the derived cryptographic material.
 */
export interface KeyDeriver<DeriveBitsInput, DeriveKeyInput, DeriveKeyOutput> {
    /**
     * Generates a specified number of cryptographic bits from given input parameters.
     *
     * @remarks
     * The `deriveBits()` method of the {@link KeyDeriver | `KeyDeriver`} interface is used to create
     * cryptographic material such as initialization vectors or keys from various sources. The method
     * takes in parameters specific to the chosen key derivation algorithm and outputs a promise that
     * resolves to a `Uint8Array` containing the derived bits.
     *
     * @param params - The parameters for the bit derivation process, specific to the chosen algorithm.
     *
     * @returns A Promise resolving to the derived bits as a `Uint8Array`.
     */
    deriveBits(params: DeriveBitsInput): Promise<Uint8Array>;
    /**
     * Derives a cryptographic key in JWK format based on the provided input parameters.
     *
     * @remarks
     * The `deriveKey()` method of the {@link KeyDeriver | `KeyDeriver`} interface is utilized to
     * generate cryptographic keys for operations like encryption, decryption, or signing. The method
     * takes in parameters tailored to the key derivation algorithm being used and returns a promise
     * that resolves to the derived key.
     *
     * @param params - The parameters for the key derivation process, customized for the specific algorithm.
     *
     * @returns A Promise resolving to the derived key in the specified output format.
     */
    deriveKey(params: DeriveKeyInput): Promise<DeriveKeyOutput>;
}
//# sourceMappingURL=key-deriver.d.ts.map