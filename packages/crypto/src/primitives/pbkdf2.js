var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { crypto } from '@noble/hashes/crypto';
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
export class Pbkdf2 {
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
    static deriveKey({ hash, password, salt, iterations, length }) {
        return __awaiter(this, void 0, void 0, function* () {
            // Import the password as a raw key for use with the Web Crypto API.
            const webCryptoKey = yield crypto.subtle.importKey('raw', password, { name: 'PBKDF2' }, false, ['deriveBits']);
            const derivedKeyBuffer = yield crypto.subtle.deriveBits({ name: 'PBKDF2', hash, salt, iterations }, webCryptoKey, length);
            // Convert from ArrayBuffer to Uint8Array.
            const derivedKey = new Uint8Array(derivedKeyBuffer);
            return derivedKey;
        });
    }
}
//# sourceMappingURL=pbkdf2.js.map