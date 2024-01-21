/**
 * The object that should be passed into `Pbkdf2.deriveKey()`, when using the PBKDF2 algorithm.
 */
export type Pbkdf2DeriveKeyParams = {
    /**
     * A string representing the digest algorithm to use. This may be one of:
     * - 'SHA-256'
     * - 'SHA-384'
     * - 'SHA-512'
     */
    hash: 'SHA-256' | 'SHA-384' | 'SHA-512';
    /**
     * The password from which to derive the key, represented as a Uint8Array.
     */
    password: Uint8Array;
    /**
     * The salt value to use in the derivation process, as a Uint8Array. This should be a random or
     * pseudo-random value of at least 16 bytes. Unlike the `password`, `salt` does not need to be
     * kept secret.
     */
    salt: Uint8Array;
    /**
     * A `Number` representing the number of iterations the hash function will be executed in
     * `deriveKey()`. This impacts the computational cost of the `deriveKey()` operation, making it
     * more resistant to dictionary attacks. The higher the number, the more secure, but also slower,
     * the operation. Choose a value that balances security needs and performance for your
     * application.
     */
    iterations: number;
    /**
     * The desired length of the derived key in bits. To be compatible with all browsers, the number
     * should be a multiple of 8.
     */
    length: number;
};
/**
 * The `Pbkdf2` class provides a secure way to derive cryptographic keys from a password
 * using the PBKDF2 (Password-Based Key Derivation Function 2) algorithm.
 *
 * The PBKDF2 algorithm is widely used for generating keys from passwords, as it applies
 * a pseudorandom function to the input password along with a salt value and iterates the
 * process multiple times to increase the key's resistance to brute-force attacks.
 *
 * This class offers a single static method `deriveKey` to perform key derivation.
 *
 * @example
 * ```ts
 * // Key Derivation
 * const derivedKey = await Pbkdf2.deriveKey({
 *   hash: 'SHA-256', // The hash function to use ('SHA-256', 'SHA-384', 'SHA-512')
 *   password: new TextEncoder().encode('password'), // The password as a Uint8Array
 *   salt: new Uint8Array([...]), // The salt value
 *   iterations: 1000, // The number of iterations
 *   length: 256 // The length of the derived key in bits
 * });
 * ```
 *
 * @remarks
 * This class relies on the availability of the Web Crypto API.
 */
export declare class Pbkdf2 {
    /**
     * Derives a cryptographic key from a password using the PBKDF2 algorithm.
     *
     * @remarks
     * This method applies the PBKDF2 algorithm to the provided password along with
     * a salt value and iterates the process a specified number of times. It uses
     * a cryptographic hash function to enhance security and produce a key of the
     * desired length. The method is capable of utilizing either the Web Crypto API
     * or the Node.js Crypto module, depending on the environment's support.
     *
     * @example
     * ```ts
     * const derivedKey = await Pbkdf2.deriveKey({
     *   hash: 'SHA-256',
     *   password: new TextEncoder().encode('password'),
     *   salt: new Uint8Array([...]),
     *   iterations: 1000,
     *   length: 256
     * });
     * ```
     *
     * @param params - The parameters for key derivation.
     * @param params.hash - The hash function to use, such as 'SHA-256', 'SHA-384', or 'SHA-512'.
     * @param params.password - The password from which to derive the key, represented as a Uint8Array.
     * @param params.salt - The salt value to use in the derivation process, as a Uint8Array.
     * @param params.iterations - The number of iterations to apply in the PBKDF2 algorithm.
     * @param params.length - The desired length of the derived key in bits.
     *
     * @returns A Promise that resolves to the derived key as a Uint8Array.
     */
    static deriveKey({ hash, password, salt, iterations, length }: Pbkdf2DeriveKeyParams): Promise<Uint8Array>;
}
//# sourceMappingURL=pbkdf2.d.ts.map