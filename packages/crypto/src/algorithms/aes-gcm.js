var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { CryptoAlgorithm } from './crypto-algorithm.js';
import { AesGcm } from '../primitives/aes-gcm.js';
/**
 * The `AesGcmAlgorithm` class provides a concrete implementation for cryptographic operations using
 * the AES algorithm in Galois/Counter Mode (GCM). This class implements both
 * {@link Cipher | `Cipher`} and { @link KeyGenerator | `KeyGenerator`} interfaces, providing
 * key generation, encryption, and decryption features.
 *
 * This class is typically accessed through implementations that extend the
 * {@link CryptoApi | `CryptoApi`} interface.
 */
export class AesGcmAlgorithm extends CryptoAlgorithm {
    /**
     * Decrypts the provided data using AES-GCM.
     *
     * @remarks
     * This method performs AES-GCM decryption on the given encrypted data using the specified key.
     * It requires an initialization vector (IV), the encrypted data along with the decryption key,
     * and optionally, additional authenticated data (AAD). The method returns the decrypted data as a
     * Uint8Array. The optional `tagLength` parameter specifies the size in bits of the authentication
     * tag used when encrypting the data. If not specified, the default tag length of 128 bits is
     * used.
     *
     * @example
     * ```ts
     * const aesGcm = new AesGcmAlgorithm();
     * const encryptedData = new Uint8Array([...]); // Encrypted data
     * const iv = new Uint8Array([...]); // Initialization vector used during encryption
     * const additionalData = new Uint8Array([...]); // Optional additional authenticated data
     * const key = { ... }; // A Jwk object representing the AES key
     * const decryptedData = await aesGcm.decrypt({
     *   data: encryptedData,
     *   iv,
     *   additionalData,
     *   key,
     *   tagLength: 128 // Optional tag length in bits
     * });
     * ```
     *
     * @param params - The parameters for the decryption operation.
     *
     * @returns A Promise that resolves to the decrypted data as a Uint8Array.
     */
    decrypt(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const plaintext = AesGcm.decrypt(params);
            return plaintext;
        });
    }
    /**
     * Encrypts the provided data using AES-GCM.
     *
     * @remarks
     * This method performs AES-GCM encryption on the given data using the specified key.
     * It requires an initialization vector (IV), the encrypted data along with the decryption key,
     * and optionally, additional authenticated data (AAD). The method returns the encrypted data as a
     * Uint8Array. The optional `tagLength` parameter specifies the size in bits of the authentication
     * tag generated in the encryption operation and used for authentication in the corresponding
     * decryption. If not specified, the default tag length of 128 bits is used.
     *
     * @example
     * ```ts
     * const aesGcm = new AesGcmAlgorithm();
     * const data = new TextEncoder().encode('Messsage');
     * const iv = new Uint8Array([...]); // Initialization vector
     * const additionalData = new Uint8Array([...]); // Optional additional authenticated data
     * const key = { ... }; // A Jwk object representing an AES key
     * const encryptedData = await aesGcm.encrypt({
     *   data,
     *   iv,
     *   additionalData,
     *   key,
     *   tagLength: 128 // Optional tag length in bits
     * });
     * ```
     *
     * @param params - The parameters for the encryption operation.
     *
     * @returns A Promise that resolves to the encrypted data as a Uint8Array.
     */
    encrypt(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const ciphertext = AesGcm.encrypt(params);
            return ciphertext;
        });
    }
    /**
     * Generates a symmetric key for AES in Galois/Counter Mode (GCM) in JSON Web Key (JWK) format.
     *
     * @remarks
     * This method generates a symmetric AES key for use in GCM mode, based on the specified
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
     * const aesGcm = new AesGcmAlgorithm();
     * const privateKey = await aesGcm.generateKey({ algorithm: 'A256GCM' });
     * ```
     *
     * @param params - The parameters for the key generation.
     *
     * @returns A Promise that resolves to the generated symmetric key in JWK format.
     */
    generateKey({ algorithm }) {
        return __awaiter(this, void 0, void 0, function* () {
            // Map algorithm name to key length.
            const length = { A128GCM: 128, A192GCM: 192, A256GCM: 256 }[algorithm];
            // Generate a random private key.
            const privateKey = yield AesGcm.generateKey({ length });
            // Set the `alg` property based on the specified algorithm.
            privateKey.alg = algorithm;
            return privateKey;
        });
    }
}
//# sourceMappingURL=aes-gcm.js.map