import type { Jwk } from '../jose/jwk.js';
import type { Cipher } from '../types/cipher.js';
import type { KeyGenerator } from '../types/key-generator.js';
import type { DecryptParams, EncryptParams, GenerateKeyParams } from '../types/params-direct.js';
import { CryptoAlgorithm } from './crypto-algorithm.js';
import { AES_GCM_TAG_LENGTHS } from '../primitives/aes-gcm.js';
/**
 * The `AesGcmGenerateKeyParams` interface defines the algorithm-specific parameters that should be
 * passed into the `generateKey()` method when using the AES-GCM algorithm.
 */
export interface AesGcmGenerateKeyParams extends GenerateKeyParams {
    /** Specifies the algorithm variant for key generation in AES-GCM mode.
     * The value determines the length of the key to be generated and must be one of the following:
     * - `"A128GCM"`: Generates a 128-bit key.
     * - `"A192GCM"`: Generates a 192-bit key.
     * - `"A256GCM"`: Generates a 256-bit key.
     */
    algorithm: 'A128GCM' | 'A192GCM' | 'A256GCM';
}
/**
 * The `AesGcmParams` interface defines the algorithm-specific parameters that should be passed
 * into the `encrypt()` and `decrypt()` methods when using the AES-GCM algorithm.
 */
export interface AesGcmParams {
    /**
     * The `additionalData` property is used for authentication alongside encrypted data but isn't
     * encrypted itself. It must match in both encryption and decryption; a mismatch will cause
     * decryption to fail. This feature allows for the authentication of data without encrypting it.
     *
     * The `additionalData` property is optional and omitting it does not compromise encryption
     * security.
     */
    additionalData?: Uint8Array;
    /**
     * The initialization vector (IV) must be unique for every encryption operation carried out with a
     * given key. The IV need not be secret, but it must be unpredictable: that is, the IV must not be
     * reused with the same key. The IV must be 12 bytes (96 bits) in length in accordance with the
     * AES-GCM specification recommendedation to promote interoperability and efficiency.
     *
     * Note: It is OK to transmit the IV in the clear with the encrypted message.
     */
    iv: Uint8Array;
    /**
     * This property determines the size in bits of the authentication tag generated in the encryption
     * operation and used for authentication in the corresponding decryption. In accordance with the
     * AES-GCM specification, the tag length must be 96, 104, 112, 120 or 128.
     *
     * The `tagLength` property is optional and defaults to 128 bits if omitted.
     */
    tagLength?: typeof AES_GCM_TAG_LENGTHS[number];
}
/**
 * The `AesGcmAlgorithm` class provides a concrete implementation for cryptographic operations using
 * the AES algorithm in Galois/Counter Mode (GCM). This class implements both
 * {@link Cipher | `Cipher`} and { @link KeyGenerator | `KeyGenerator`} interfaces, providing
 * key generation, encryption, and decryption features.
 *
 * This class is typically accessed through implementations that extend the
 * {@link CryptoApi | `CryptoApi`} interface.
 */
export declare class AesGcmAlgorithm extends CryptoAlgorithm implements Cipher<AesGcmParams, AesGcmParams>, KeyGenerator<AesGcmGenerateKeyParams, Jwk> {
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
    decrypt(params: DecryptParams & AesGcmParams): Promise<Uint8Array>;
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
    encrypt(params: EncryptParams & AesGcmParams): Promise<Uint8Array>;
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
    generateKey({ algorithm }: AesGcmGenerateKeyParams): Promise<Jwk>;
}
//# sourceMappingURL=aes-gcm.d.ts.map