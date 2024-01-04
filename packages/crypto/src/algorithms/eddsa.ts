import type { Jwk } from '../jose/jwk.js';
import type { Signer } from '../types/signer.js';
import type { AsymmetricKeyGenerator } from '../types/key-generator.js';
import type {
  SignParams,
  VerifyParams,
  GenerateKeyParams,
  GetPublicKeyParams,
  ComputePublicKeyParams,
} from '../types/params-direct.js';

import { Ed25519 } from '../primitives/ed25519.js';
import { CryptoAlgorithm } from './crypto-algorithm.js';
import { isOkpPrivateJwk, isOkpPublicJwk } from '../jose/jwk.js';

/**
 * The `EdDsaGenerateKeyParams` interface defines the algorithm-specific parameters that should be
 * passed into the `generateKey()` method when using the EdDSA algorithm.
 */
export interface EdDsaGenerateKeyParams extends GenerateKeyParams {
  /**
   * A string defining the type of key to generate. The value must be one of the following:
   * - `"Ed25519"`: EdDSA using the Ed25519 curve.
   */
  algorithm: 'Ed25519';
}

/**
 * The `EdDsaAlgorithm` class provides a concrete implementation for cryptographic operations using
 * the Edwards-curve Digital Signature Algorithm (EdDSA). This class implements both
 * {@link Signer | `Signer`} and { @link AsymmetricKeyGenerator | `AsymmetricKeyGenerator`}
 * interfaces, providing private key generation, public key derivation, and creation/verification
 * of signatures.
 *
 * This class is typically accessed through implementations that extend the
 * {@link CryptoApi | `CryptoApi`} interface.
 */
export class EdDsaAlgorithm extends CryptoAlgorithm
  implements AsymmetricKeyGenerator<EdDsaGenerateKeyParams, Jwk, GetPublicKeyParams>,
             Signer<SignParams, VerifyParams> {

  /**
   * Derives the public key in JWK format from a given private key.
   *
   * @remarks
   * This method takes a private key in JWK format and derives its corresponding public key,
   * also in JWK format. The process ensures that the derived public key correctly corresponds to
   * the given private key.
   *
   * @example
   * ```ts
   * const eddsa = new EdDsaAlgorithm();
   * const privateKey = { ... }; // A Jwk object representing a private key
   * const publicKey = await eddsa.computePublicKey({ key: privateKey });
   * ```
   *
   * @param params - The parameters for the public key derivation.
   * @param params.key - The private key in JWK format from which to derive the public key.
   *
   * @returns A Promise that resolves to the derived public key in JWK format.
   */
  public async computePublicKey({ key }:
    ComputePublicKeyParams
  ): Promise<Jwk> {
    if (!isOkpPrivateJwk(key)) throw new TypeError('Invalid key provided. Must be an octet key pair (OKP) private key.');

    switch (key.crv) {

      case 'Ed25519': {
        const publicKey = await Ed25519.computePublicKey({ key });
        publicKey.alg = 'EdDSA';
        return publicKey;
      }

      default: {
        throw new Error(`Unsupported curve: ${key.crv}`);
      }
    }
  }

  /**
   * Generates a new private key with the specified algorithm in JSON Web Key (JWK) format.
   *
   * @example
   * ```ts
   * const eddsa = new EdDsaAlgorithm();
   * const privateKey = await eddsa.generateKey({ algorithm: 'Ed25519' });
   * ```
   *
   * @param params - The parameters for key generation.
   * @param params.algorithm - The algorithm to use for key generation.
   *
   * @returns A Promise that resolves to the generated private key in JWK format.
   */
  async generateKey({ algorithm }:
    EdDsaGenerateKeyParams
  ): Promise<Jwk> {
    switch (algorithm) {

      case 'Ed25519': {
        const privateKey = await Ed25519.generateKey();
        privateKey.alg = 'EdDSA';
        return privateKey;
      }
    }
  }

  /**
   * Retrieves the public key properties from a given private key in JWK format.
   *
   * @remarks
   * This method extracts the public key portion from an EdDSA private key in JWK format. It does
   * so by removing the private key property 'd' and making a shallow copy, effectively yielding the
   * public key.
   *
   * Note: This method offers a significant performance advantage, being about 100 times faster
   * than `computePublicKey()`. However, it does not mathematically validate the private key, nor
   * does it derive the public key from the private key. It simply extracts existing public key
   * properties from the private key object. This makes it suitable for scenarios where speed is
   * critical and the private key's integrity is already assured.
   *
   * @example
   * ```ts
   * const eddsa = new EdDsaAlgorithm();
   * const privateKey = { ... }; // A Jwk object representing a private key
   * const publicKey = await eddsa.getPublicKey({ key: privateKey });
   * ```
   *
   * @param params - The parameters for retrieving the public key properties.
   * @param params.key - The private key in JWK format.
   *
   * @returns A Promise that resolves to the public key in JWK format.
   */
  public async getPublicKey({ key }:
    GetPublicKeyParams
  ): Promise<Jwk> {
    if (!isOkpPrivateJwk(key)) throw new TypeError('Invalid key provided. Must be an octet key pair (OKP) private key.');

    switch (key.crv) {

      case 'Ed25519': {
        const publicKey = await Ed25519.getPublicKey({ key });
        publicKey.alg = 'EdDSA';
        return publicKey;
      }

      default: {
        throw new Error(`Unsupported curve: ${key.crv}`);
      }
    }
  }

  /**
   * Generates an EdDSA signature of given data using a private key.
   *
   * @remarks
   * This method uses the signature algorithm determined by the given `algorithm` to sign the
   * provided data.
   *
   * The signature can later be verified by parties with access to the corresponding
   * public key, ensuring that the data has not been tampered with and was indeed signed by the
   * holder of the private key.
   *
   * @example
   * ```ts
   * const eddsa = new EdDsaAlgorithm();
   * const data = new TextEncoder().encode('Message');
   * const privateKey = { ... }; // A Jwk object representing a private key
   * const signature = await eddsa.sign({
   *   key: privateKey,
   *   data
   * });
   * ```
   *
   * @param params - The parameters for the signing operation.
   * @param params.key - The private key to use for signing, represented in JWK format.
   * @param params.data - The data to sign.
   *
   * @returns A Promise resolving to the digital signature as a `Uint8Array`.
   */
  public async sign({ key, data }:
    SignParams
  ): Promise<Uint8Array> {
    if (!isOkpPrivateJwk(key)) throw new TypeError('Invalid key provided. Must be an octet key pair (OKP) private key.');

    switch (key.crv) {

      case 'Ed25519': {
        return await Ed25519.sign({ key, data });
      }

      default: {
        throw new Error(`Unsupported curve: ${key.crv}`);
      }
    }
  }

  /**
   * Verifies an EdDSA signature associated with the provided data using the provided key.
   *
   * @remarks
   * This method uses the signature algorithm determined by the `crv` property of the provided key
   * to check the validity of a digital signature against the original data. It confirms whether the
   * signature was created by the holder of the corresponding private key and that the data has not
   * been tampered with.
   *s
   * @example
   * ```ts
   * const eddsa = new EdDsaAlgorithm();
   * const publicKey = { ... }; // Public key in JWK format corresponding to the private key that signed the data
   * const signature = new Uint8Array([...]); // Signature to verify
   * const data = new TextEncoder().encode('Message');
   * const isValid = await eddsa.verify({
   *   key: publicKey,
   *   signature,
   *   data
   * });
   * ```
   *
   * @param params - The parameters for the verification operation.
   * @param params.key - The key to use for verification.
   * @param params.signature - The signature to verify.
   * @param params.data - The data to verify.
   *
   * @returns A Promise resolving to a boolean indicating whether the signature is valid.
   */
  public async verify({ key, signature, data }:
    VerifyParams
  ): Promise<boolean> {
    if (!isOkpPublicJwk(key)) throw new TypeError('Invalid key provided. Must be an octet key pair (OKP) public key.');

    switch (key.crv) {

      case 'Ed25519': {
        return await Ed25519.verify({ key, signature, data });
      }

      default: {
        throw new Error(`Unsupported curve: ${key.crv}`);
      }
    }
  }
}