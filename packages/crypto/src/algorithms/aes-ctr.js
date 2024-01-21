var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { AesCtr } from '../primitives/aes-ctr.js';
import { CryptoAlgorithm } from './crypto-algorithm.js';
/**
 * The `AesCtrAlgorithm` class provides a concrete implementation for cryptographic operations using
 * the AES algorithm in Counter (CTR) mode. This class implements both {@link Cipher | `Cipher`} and
 * { @link KeyGenerator | `KeyGenerator`} interfaces, providing key generation, encryption, and
 * decryption features.
 *
 * This class is typically accessed through implementations that extend the
 * {@link CryptoApi | `CryptoApi`} interface.
 */
export class AesCtrAlgorithm extends CryptoAlgorithm {
    /**
     * Decrypts the provided data using AES-CTR.
     *
     * @remarks
     * This method performs AES-CTR decryption on the given encrypted data using the specified key.
     * Similar to the encryption process, it requires an initial counter block and the length
     * of the counter block, along with the encrypted data and the decryption key. The method
     * returns the decrypted data as a Uint8Array.
     *
     * @example
     * ```ts
     * const aesCtr = new AesCtrAlgorithm();
     * const encryptedData = new Uint8Array([...]); // Encrypted data
     * const counter = new Uint8Array(16); // 16-byte (128-bit) counter block used during encryption
     * const key = { ... }; // A Jwk object representing the same AES key used for encryption
     * const decryptedData = await aesCtr.decrypt({
     *   data: encryptedData,
     *   counter,
     *   key,
     *   length: 128 // Length of the counter in bits
     * });
     * ```
     *
     * @param params - The parameters for the decryption operation.
     *
     * @returns A Promise that resolves to the decrypted data as a Uint8Array.
     */
    decrypt(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const plaintext = AesCtr.decrypt(params);
            return plaintext;
        });
    }
    /**
     * Encrypts the provided data using AES-CTR.
     *
     * @remarks
     * This method performs AES-CTR encryption on the given data using the specified key.
     * It requires the initial counter block and the length of the counter block, alongside
     * the data and key. The method is designed to work asynchronously and returns the
     * encrypted data as a Uint8Array.
     *
     * @example
     * ```ts
     * const aesCtr = new AesCtrAlgorithm();
     * const data = new TextEncoder().encode('Messsage');
     * const counter = new Uint8Array(16); // 16-byte (128-bit) counter block
     * const key = { ... }; // A Jwk object representing an AES key
     * const encryptedData = await aesCtr.encrypt({
     *   data,
     *   counter,
     *   key,
     *   length: 128 // Length of the counter in bits
     * });
     * ```
     *
     * @param params - The parameters for the encryption operation.
     *
     * @returns A Promise that resolves to the encrypted data as a Uint8Array.
     */
    encrypt(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const ciphertext = AesCtr.encrypt(params);
            return ciphertext;
        });
    }
    /**
     * Generates a symmetric key for AES in Counter (CTR) mode in JSON Web Key (JWK) format.
     *
     * @remarks
     * This method generates a symmetric AES key for use in CTR mode, based on the specified
     * `algorithm` parameter which determines the key length. It uses cryptographically secure random
     * number generation to ensure the uniqueness and security of the key. The key is returned in JWK
     * format.
     *
     * The generated key includes the following components:
     * - `kty`: Key Type, set to 'oct' for Octet Sequence.
     * - `k`: The symmetric key component, base64url-encoded.
     * - `kid`: Key ID, generated based on the JWK thumbprint.
     *
     * @example
     * ```ts
     * const aesCtr = new AesCtrAlgorithm();
     * const privateKey = await aesCtr.generateKey({ algorithm: 'A256CTR' });
     * ```
     *
     * @param params - The parameters for the key generation.
     *
     * @returns A Promise that resolves to the generated symmetric key in JWK format.
     */
    generateKey({ algorithm }) {
        return __awaiter(this, void 0, void 0, function* () {
            // Map algorithm name to key length.
            const length = { A128CTR: 128, A192CTR: 192, A256CTR: 256 }[algorithm];
            // Generate a random private key.
            const privateKey = yield AesCtr.generateKey({ length });
            // Set the `alg` property based on the specified algorithm.
            privateKey.alg = algorithm;
            return privateKey;
        });
    }
}
//# sourceMappingURL=aes-ctr.js.map