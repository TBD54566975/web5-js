import type { GenerateKeyParams, Jwk, KeyConverter, KeyGenerator, KeyWrapper } from '@web5/crypto';

import { CryptoAlgorithm } from '@web5/crypto';

import type { BytesToPrivateKeyParams, PrivateKeyToBytesParams, UnwrapKeyParams, WrapKeyParams } from '../types/params-direct.js';

import { AesKw } from '../primitives/aes-kw.js';
import { RequireOnly } from '@web5/common';

/**
 * The `AesKwGenerateKeyParams` interface defines the algorithm-specific parameters that should be
 * passed into the `generateKey()` method when using the AES-KW algorithm.
 */
export interface AesKwGenerateKeyParams extends GenerateKeyParams {
  /** Specifies the algorithm variant for key generation in AES-KW mode.
   * The value determines the length of the key to be generated and must be one of the following:
   * - `"A128KW"`: AES Key Wrap using a 128-bit key.
   * - `"A192KW"`: AES Key Wrap using a 192-bit key.
   * - `"A256KW"`: AES Key Wrap using a 256-bit key.
   */
  algorithm: 'A128KW' | 'A192KW' | 'A256KW';
}

/**
 * The `AesKwAlgorithm` class provides a concrete implementation for cryptographic operations using
 * the AES algorithm for key wrapping. This class implements both
 * {@link KeyGenerator | `KeyGenerator`} and {@link KeyWrapper | `KeyWrapper`} interfaces, providing
 * key generation, key wrapping, and key unwrapping features.
 *
 * This class is typically accessed through implementations that extend the
 * {@link CryptoApi | `CryptoApi`} interface.
 */
export class AesKwAlgorithm extends CryptoAlgorithm
  implements KeyConverter,
             KeyGenerator<AesKwGenerateKeyParams, Jwk>,
             KeyWrapper<WrapKeyParams, UnwrapKeyParams> {

  public async bytesToPrivateKey({ privateKeyBytes }:
    RequireOnly<BytesToPrivateKeyParams, 'privateKeyBytes'>
  ): Promise<Jwk> {
    // Convert the byte array to a JWK.
    const privateKey = await AesKw.bytesToPrivateKey({ privateKeyBytes });

    // Set the `alg` property based on the key length.
    privateKey.alg = { 16: 'A128KW', 24: 'A192KW', 32: 'A256KW' }[privateKeyBytes.length];

    return privateKey;
  }

  /**
   * Generates a symmetric key for AES for key wrapping in JSON Web Key (JWK) format.
   *
   * @remarks
   * This method generates a symmetric AES key for use in key wrapping mode, based on the specified
   * `algorithm` parameter which determines the key length. It uses cryptographically secure random
   * number generation to ensure the uniqueness and security of the key. The key is returned in JWK
   * format.
   *
   * The generated key includes the following components:
   * - `kty`: Key Type, set to 'oct' for Octet Sequence.
   * - `k`: The symmetric key component, base64url-encoded.
   * - `kid`: Key ID, generated based on the JWK thumbprint.
   * - `alg`: Algorithm, set to 'A128KW', 'A192KW', or 'A256KW' for AES Key Wrap with the
   *   specified key length.
   *
   * @example
   * ```ts
   * const aesKw = new AesKwAlgorithm();
   * const privateKey = await aesKw.generateKey({ algorithm: 'A256KW' });
   * ```
   *
   * @param params - The parameters for the key generation.
   *
   * @returns A Promise that resolves to the generated symmetric key in JWK format.
   */
  public async generateKey({ algorithm }:
    AesKwGenerateKeyParams
  ): Promise<Jwk> {
    // Map algorithm name to key length.
    const length = { A128KW: 128, A192KW: 192, A256KW: 256 }[algorithm] as 128 | 192 | 256;

    // Generate a random private key.
    const privateKey = await AesKw.generateKey({ length });

    // Set the `alg` property based on the specified algorithm.
    privateKey.alg = algorithm;

    return privateKey;
  }

  public async privateKeyToBytes({ privateKey }:
    PrivateKeyToBytesParams
  ): Promise<Uint8Array> {
    // Convert the JWK to a byte array.
    const privateKeyBytes = await AesKw.privateKeyToBytes({ privateKey });

    return privateKeyBytes;
  }

  /**
   * Decrypts a wrapped key using the AES Key Wrap algorithm.
   *
   * @remarks
   * This method unwraps a previously wrapped cryptographic key using the AES Key Wrap algorithm.
   * The wrapped key, provided as a byte array, is unwrapped using the decryption key specified in
   * the parameters.
   *
   * This operation is useful for securely receiving keys transmitted over untrusted mediums. The
   * method returns the unwrapped key as a JSON Web Key (JWK).
   *
   * @example
   * ```ts
   * const aesKw = new AesKwAlgorithm();
   * const wrappedKeyBytes = new Uint8Array([...]); // Byte array of a wrapped AES-256 GCM key
   * const decryptionKey = { ... }; // A Jwk object representing the AES unwrapping key
   * const unwrappedKey = await aesKw.unwrapKey({
   *   wrappedKeyBytes,
   *   wrappedKeyAlgorithm: 'A256GCM',
   *   decryptionKey
   * });
   * ```
   *
   * @param params - The parameters for the key unwrapping operation.
   *
   * @returns A Promise that resolves to the unwrapped key in JWK format.
   */
  public async unwrapKey(params:
    UnwrapKeyParams
  ): Promise<Jwk> {
    const unwrappedKey = await AesKw.unwrapKey(params);

    return unwrappedKey;
  }

  /**
   * Encrypts a given key using the AES Key Wrap algorithm.
   *
   * @remarks
   * This method wraps a given cryptographic key using the AES Key Wrap algorithm. The private key
   * to be wrapped is provided in the form of a JSON Web Key (JWK).
   *
   * This operation is useful for securely transmitting keys over untrusted mediums. The method
   * returns the wrapped key as a byte array.
   *
   * @example
   * ```ts
   * const aesKw = new AesKwAlgorithm();
   * const unwrappedKey = { ... }; // A Jwk object representing the key to be wrapped
   * const encryptionKey = { ... }; // A Jwk object representing the AES wrapping key
   * const wrappedKeyBytes = await aesKw.wrapKey({ unwrappedKey, encryptionKey });
   * ```
   *
   * @param params - The parameters for the key wrapping operation.
   *
   * @returns A Promise that resolves to the wrapped key as a Uint8Array.
   */
  public async wrapKey(params:
    WrapKeyParams
  ): Promise<Uint8Array> {
    const wrappedKeyBytes = AesKw.wrapKey(params);

    return wrappedKeyBytes;
  }
}