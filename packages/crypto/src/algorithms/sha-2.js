var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Sha256 } from '../primitives/sha256.js';
import { CryptoAlgorithm } from './crypto-algorithm.js';
/**
 * The `Sha2Algorithm` class is an implementation of the {@link Hasher | `Hasher`} interface for the
 * SHA-2 family of cryptographic hash functions. The `digest` method takes the algorithm identifier
 * of the hash function and arbitrary data as input and returns the hash digest of the data.
 *
 * This class is typically accessed through implementations that extend the
 * {@link CryptoApi | `CryptoApi`} interface.
 */
export class Sha2Algorithm extends CryptoAlgorithm {
    /**
     * Generates a hash digest of the provided data.
     *
     * @remarks
     * A digest is the output of the hash function. It's a fixed-size string of bytes
     * that uniquely represents the data input into the hash function. The digest is often used for
     * data integrity checks, as any alteration in the input data results in a significantly
     * different digest.
     *
     * It takes the algorithm identifier of the hash function and data to digest as input and returns
     * the digest of the data.
     *
     * @example
     * ```ts
     * const sha2 = new Sha2Algorithm();
     * const data = new TextEncoder().encode('Messsage');
     * const digest = await sha2.digest({ data });
     * ```
     *
     * @param params - The parameters for the digest operation.
     * @param params.algorithm - The name of hash function to use.
     * @param params.data - The data to digest.
     *
     * @returns A Promise which will be fulfilled with the hash digest.
     */
    digest({ algorithm, data }) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (algorithm) {
                case 'SHA-256': {
                    const hash = yield Sha256.digest({ data });
                    return hash;
                }
            }
        });
    }
}
//# sourceMappingURL=sha-2.js.map