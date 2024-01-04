import type { Jwk } from '../jose/jwk.js';
import type { Cipher } from '../types/cipher.js';
import type { KeyGenerator } from '../types/key-generator.js';
import type { DecryptParams, EncryptParams, GenerateKeyParams } from '../types/params-direct.js';

import { AesCtr } from '../primitives/aes-ctr.js';
import { CryptoAlgorithm } from './crypto-algorithm.js';

/**
 * The `AesCtrGenerateKeyParams` interface defines the algorithm-specific parameters that should be
 * passed into the `generateKey()` method when using the AES-CTR algorithm.
 */
export interface AesCtrGenerateKeyParams extends GenerateKeyParams {
  /** Specifies the algorithm variant for key generation in AES-CTR mode.
   * The value determines the length of the key to be generated and must be one of the following:
   * - `"A128CTR"`: Generates a 128-bit key.
   * - `"A192CTR"`: Generates a 192-bit key.
   * - `"A256CTR"`: Generates a 256-bit key.
   */
  algorithm: 'A128CTR' | 'A192CTR' | 'A256CTR';
}

/**
 * The `AesCtrParams` interface defines the algorithm-specific parameters that should be passed
 * into the `encrypt()` and `decrypt()` methods when using the AES-CTR algorithm.
 */
export interface AesCtrParams {
  /** The initial value of the counter block. */
  counter: Uint8Array;

  /** The number of bits in the counter block that are used for the actual counter. */
  length: number;
}

/**
 * The `AesCtrAlgorithm` class provides a concrete implementation for cryptographic operations using
 * the AES algorithm in Counter (CTR) mode. This class implements both {@link Cipher | `Cipher`} and
 * { @link KeyGenerator | `KeyGenerator`} interfaces, providing key generation, encryption, and
 * decryption features.
 *
 * This class is typically accessed through implementations that extend the
 * {@link CryptoApi | `CryptoApi`} interface.
 */
export class AesCtrAlgorithm extends CryptoAlgorithm
  implements Cipher<EncryptParams & AesCtrParams, DecryptParams & AesCtrParams>,
             KeyGenerator<AesCtrGenerateKeyParams, Jwk> {

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
  public async decrypt(params:
    DecryptParams & AesCtrParams
  ): Promise<Uint8Array> {
    const plaintext = AesCtr.decrypt(params);

    return plaintext;
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
  public async encrypt(params:
    EncryptParams & AesCtrParams
  ): Promise<Uint8Array> {
    const ciphertext = AesCtr.encrypt(params);

    return ciphertext;
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
  public async generateKey({ algorithm }:
    AesCtrGenerateKeyParams
  ): Promise<Jwk> {
    // Map algorithm name to key length.
    const length = { A128CTR: 128, A192CTR: 192, A256CTR: 256 }[algorithm] as 128 | 192 | 256;

    // Generate a random private key.
    const privateKey = await AesCtr.generateKey({ length });

    // Set the `alg` property based on the specified algorithm.
    privateKey.alg = algorithm;

    return privateKey;
  }
}