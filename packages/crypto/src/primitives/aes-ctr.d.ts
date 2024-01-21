import type { Jwk } from '../jose/jwk.js';
/**
 * Constant defining the AES key length values in bits.
 *
 * @remarks
 * NIST publication FIPS 197 states:
 * > The AES algorithm is capable of using cryptographic keys of 128, 192, and 256 bits to encrypt
 * > and decrypt data in blocks of 128 bits.
 *
 * This implementation does not support key lengths that are different from the three values
 * defined by this constant.
 *
 * @see {@link https://doi.org/10.6028/NIST.FIPS.197-upd1 | NIST FIPS 197}
 */
declare const AES_KEY_LENGTHS: readonly [128, 192, 256];
/**
 * The `AesCtr` class provides a comprehensive set of utilities for cryptographic operations
 * using the Advanced Encryption Standard (AES) in Counter (CTR) mode. This class includes
 * methods for key generation, encryption, decryption, and conversions between raw byte arrays
 * and JSON Web Key (JWK) formats. It is designed to support AES-CTR, a symmetric key algorithm
 * that is widely used in various cryptographic applications for its efficiency and security.
 *
 * AES-CTR mode operates as a stream cipher using a block cipher (AES) and is well-suited for
 * scenarios where parallel processing is beneficial or where the same key is required to
 * encrypt multiple data blocks. The class adheres to standard cryptographic practices, ensuring
 * compatibility and security in its implementations.
 *
 * Key Features:
 * - Key Generation: Generate AES symmetric keys in JWK format.
 * - Key Conversion: Transform keys between raw byte arrays and JWK formats.
 * - Encryption: Encrypt data using AES-CTR with the provided symmetric key.
 * - Decryption: Decrypt data encrypted with AES-CTR using the corresponding symmetric key.
 *
 * The methods in this class are asynchronous, returning Promises to accommodate various
 * JavaScript environments.
 *
 * @example
 * ```ts
 * // Key Generation
 * const length = 256; // Length of the key in bits (e.g., 128, 192, 256)
 * const privateKey = await AesCtr.generateKey({ length });
 *
 * // Encryption
 * const data = new TextEncoder().encode('Messsage');
 * const counter = new Uint8Array(16); // 16-byte (128-bit) counter block
 * const encryptedData = await AesCtr.encrypt({
 *   data,
 *   counter,
 *   key: privateKey,
 *   length: 64 // Length of the counter in bits
 * });
 *
 * // Decryption
 * const decryptedData = await AesCtr.decrypt({
 *   data: encryptedData,
 *   counter,
 *   key: privateKey,
 *   length: 64 // Length of the counter in bits
 * });
 *
 * // Key Conversion
 * const privateKeyBytes = await AesCtr.privateKeyToBytes({ privateKey });
 * ```
 */
export declare class AesCtr {
    /**
     * Converts a raw private key in bytes to its corresponding JSON Web Key (JWK) format.
     *
     * @remarks
     * This method takes a symmetric key represented as a byte array (Uint8Array) and
     * converts it into a JWK object for use with AES (Advanced Encryption Standard)
     * in Counter (CTR) mode. The conversion process involves encoding the key into
     * base64url format and setting the appropriate JWK parameters.
     *
     * The resulting JWK object includes the following properties:
     * - `kty`: Key Type, set to 'oct' for Octet Sequence (representing a symmetric key).
     * - `k`: The symmetric key, base64url-encoded.
     * - `kid`: Key ID, generated based on the JWK thumbprint.
     *
     * @example
     * ```ts
     * const privateKeyBytes = new Uint8Array([...]); // Replace with actual symmetric key bytes
     * const privateKey = await AesCtr.bytesToPrivateKey({ privateKeyBytes });
     * ```
     *
     * @param params - The parameters for the symmetric key conversion.
     * @param params.privateKeyBytes - The raw symmetric key as a Uint8Array.
     *
     * @returns A Promise that resolves to the symmetric key in JWK format.
     */
    static bytesToPrivateKey({ privateKeyBytes }: {
        privateKeyBytes: Uint8Array;
    }): Promise<Jwk>;
    /**
     * Decrypts the provided data using AES in Counter (CTR) mode.
     *
     * @remarks
     * This method performs AES-CTR decryption on the given encrypted data using the specified key.
     * Similar to the encryption process, it requires an initial counter block and the length
     * of the counter block, along with the encrypted data and the decryption key. The method
     * returns the decrypted data as a Uint8Array.
     *
     * @example
     * ```ts
     * const encryptedData = new Uint8Array([...]); // Encrypted data
     * const counter = new Uint8Array(16); // 16-byte (128-bit) counter block used during encryption
     * const key = { ... }; // A Jwk object representing the same AES key used for encryption
     * const decryptedData = await AesCtr.decrypt({
     *   data: encryptedData,
     *   counter,
     *   key,
     *   length: 64 // Length of the counter in bits
     * });
     * ```
     *
     * @param params - The parameters for the decryption operation.
     * @param params.key - The key to use for decryption, represented in JWK format.
     * @param params.data - The encrypted data to decrypt, as a Uint8Array.
     * @param params.counter - The initial value of the counter block.
     * @param params.length - The number of bits in the counter block that are used for the actual counter.
     *
     * @returns A Promise that resolves to the decrypted data as a Uint8Array.
     */
    static decrypt({ key, data, counter, length }: {
        key: Jwk;
        data: Uint8Array;
        counter: Uint8Array;
        length: number;
    }): Promise<Uint8Array>;
    /**
     * Encrypts the provided data using AES in Counter (CTR) mode.
     *
     * @remarks
     * This method performs AES-CTR encryption on the given data using the specified key.
     * It requires the initial counter block and the length of the counter block, alongside
     * the data and key. The method is designed to work asynchronously and returns the
     * encrypted data as a Uint8Array.
     *
     * @example
     * ```ts
     * const data = new TextEncoder().encode('Messsage');
     * const counter = new Uint8Array(16); // 16-byte (128-bit) counter block
     * const key = { ... }; // A Jwk object representing an AES key
     * const encryptedData = await AesCtr.encrypt({
     *   data,
     *   counter,
     *   key,
     *   length: 64 // Length of the counter in bits
     * });
     * ```
     *
     * @param params - The parameters for the encryption operation.
     * @param params.key - The key to use for encryption, represented in JWK format.
     * @param params.data - The data to encrypt, represented as a Uint8Array.
     * @param params.counter - The initial value of the counter block.
     * @param params.length - The number of bits in the counter block that are used for the actual counter.
     *
     * @returns A Promise that resolves to the encrypted data as a Uint8Array.
     */
    static encrypt({ key, data, counter, length }: {
        key: Jwk;
        data: Uint8Array;
        counter: Uint8Array;
        length: number;
    }): Promise<Uint8Array>;
    /**
     * Generates a symmetric key for AES in Counter (CTR) mode in JSON Web Key (JWK) format.
     *
     * @remarks
     * This method creates a new symmetric key of a specified length suitable for use with
     * AES-CTR encryption. It uses cryptographically secure random number generation to
     * ensure the uniqueness and security of the key. The generated key adheres to the JWK
     * format, making it compatible with common cryptographic standards and easy to use in
     * various cryptographic processes.
     *
     * The generated key includes the following components:
     * - `kty`: Key Type, set to 'oct' for Octet Sequence.
     * - `k`: The symmetric key component, base64url-encoded.
     * - `kid`: Key ID, generated based on the JWK thumbprint.
     *
     * @example
     * ```ts
     * const length = 256; // Length of the key in bits (e.g., 128, 192, 256)
     * const privateKey = await AesCtr.generateKey({ length });
     * ```
     *
     * @param params - The parameters for the key generation.
     * @param params.length - The length of the key in bits. Common lengths are 128, 192, and 256 bits.
     *
     * @returns A Promise that resolves to the generated symmetric key in JWK format.
     */
    static generateKey({ length }: {
        length: typeof AES_KEY_LENGTHS[number];
    }): Promise<Jwk>;
    /**
     * Converts a private key from JSON Web Key (JWK) format to a raw byte array (Uint8Array).
     *
     * @remarks
     * This method takes a symmetric key in JWK format and extracts its raw byte representation.
     * It decodes the 'k' parameter of the JWK value, which represents the symmetric key in base64url
     * encoding, into a byte array.
     *
     * @example
     * ```ts
     * const privateKey = { ... }; // A symmetric key in JWK format
     * const privateKeyBytes = await AesCtr.privateKeyToBytes({ privateKey });
     * ```
     *
     * @param params - The parameters for the symmetric key conversion.
     * @param params.privateKey - The symmetric key in JWK format.
     *
     * @returns A Promise that resolves to the symmetric key as a Uint8Array.
     */
    static privateKeyToBytes({ privateKey }: {
        privateKey: Jwk;
    }): Promise<Uint8Array>;
}
export {};
//# sourceMappingURL=aes-ctr.d.ts.map