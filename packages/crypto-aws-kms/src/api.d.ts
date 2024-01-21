import type { Jwk, CryptoApi, KeyIdentifier, KmsSignParams, KmsDigestParams, KmsVerifyParams, KmsGetKeyUriParams, KmsGenerateKeyParams, KmsGetPublicKeyParams } from '@web5/crypto';
import { KMSClient } from '@aws-sdk/client-kms';
/**
 * The `AwsKmsCryptoParams` interface specifies the parameters for initializing an instance of
 * `AwsKmsCrypto`, which is an implementation of the `CryptoApi` interface tailored for AWS KMS.
 *
 * This interface allows the optional inclusion of a `KMSClient` instance, which is used for
 * interacting with AWS KMS. If not provided, a default `KMSClient` instance will be created and
 * used.
 */
export type AwsKmsCryptoParams = {
    /**
   * An optional property to specify a custom `KMSClient` instance. If not provided, the
   * `AwsKmsCrypto` class will instantiate a default `KMSClient`. This client is used for all
   * interactions with AWS Key Management Service (KMS), such as generating keys and signing data.
   *
   * @param kmsClient - A `KMSClient` instance from the AWS SDK.
   */
    kmsClient?: KMSClient;
};
/**
 * The `AwsKmsDigestParams` interface defines the algorithm-specific parameters that should be
 * passed into the {@link AwsKmsCrypto.digest | `AwsKmsCrypto.digest()`} method.
 */
export interface AwsKmsDigestParams extends KmsDigestParams {
    /**
     * A string defining the name of hash function to use. The value must be one of the following:
     * - `"SHA-256"`: Generates a 256-bit digest.
     */
    algorithm: 'SHA-256';
}
/**
 * The `AwsKmsGenerateKeyParams` interface defines the algorithm-specific parameters that should be
 * passed into the {@link AwsKmsCrypto.generateKey | `AwsKmsCrypto.generateKey()`} method when
 * generating a key in AWS KMS.
 */
export interface AwsKmsGenerateKeyParams extends KmsGenerateKeyParams {
    /**
     * A string defining the type of key to generate. The value must be one of the following:
     * - `"ES256K"`: ECDSA using the secp256k1 curve and SHA-256.
     */
    algorithm: 'ES256K';
}
export declare class AwsKmsCrypto implements CryptoApi<AwsKmsGenerateKeyParams> {
    /**
     * A private map that stores instances of cryptographic algorithm implementations. Each key in this
     * map is an `AlgorithmConstructor`, and its corresponding value is an instance of a class that
     * implements a specific cryptographic algorithm. This map is used to cache and reuse instances for
     * performance optimization, ensuring that each algorithm is instantiated only once.
     */
    private _algorithmInstances;
    /**
     * A private instance of `KMSClient` from the AWS SDK. This client is used for all interactions
     * with AWS Key Management Service (KMS), such as generating keys, signing data, and retrieving
     * public keys. If a custom `KMSClient` is not provided in the constructor, a default instance is
     * created and used.
     */
    private _kmsClient;
    constructor(params?: AwsKmsCryptoParams);
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
     * const crypto = new AwsKmsCrypto();
     * const data = new Uint8Array([...]);
     * const digest = await crypto.digest({ algorithm: 'SHA-256', data });
     * ```
     *
     * @param params - The parameters for the digest operation.
     * @param params.algorithm - The name of hash function to use.
     * @param params.data - The data to digest.
     *
     * @returns A Promise which will be fulfilled with the hash digest.
     */
    digest({ algorithm, data }: AwsKmsDigestParams): Promise<Uint8Array>;
    /**
     * Generates a new cryptographic key in AWS KMS with the specified algorithm and returns a unique
     * key URI which can be used to reference the key in subsequent operations.
     *
     * @remarks
     * This method initiates the creation of a customer-managed key in AWS KMS, using the specified
     * algorithm parameters. The generated key is an AWS KMS key, identified by an AWS-assigned
     * {@link https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#key-id-key-id | key ID}
     * (UUID V4 format) and a
     * {@link https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#key-id-key-ARN | key ARN}
     * (Amazon Resource Name). The method returns a key URI that uniquely
     * identifies the key and can be used in subsequent cryptographic operations.
     *
     * @example
     * ```ts
     * const crypto = new AwsKmsCrypto();
     * const keyUri = await crypto.generateKey({ algorithm: 'ES256K' });
     * console.log(keyUri); // Outputs the key URI
     * ```
     *
     * @param params - The parameters for key generation.
     * @param params.algorithm - The algorithm to use for key generation, defined in `SupportedAlgorithm`.
     *
     * @returns A Promise that resolves to the key URI, a unique identifier for the generated key.
     */
    generateKey({ algorithm }: AwsKmsGenerateKeyParams): Promise<KeyIdentifier>;
    /**
     * Computes the Key URI for a given public JWK (JSON Web Key).
     *
     * @remarks
     * This method generates a {@link https://datatracker.ietf.org/doc/html/rfc3986 | URI}
     * (Uniform Resource Identifier) for the given JWK, which uniquely identifies the key across all
     * `CryptoApi` implementations. The key URI is constructed by appending the
     * {@link https://datatracker.ietf.org/doc/html/rfc7638 | JWK thumbprint} to the prefix
     * `urn:jwk:`. The JWK thumbprint is deterministically computed from the JWK and is consistent
     * regardless of property order or optional property inclusion in the JWK. This ensures that the
     * same key material represented as a JWK will always yield the same thumbprint, and therefore,
     * the same key URI.
     *
     * @example
     * ```ts
     * const crypto = new AwsKmsCrypto();
     * const publicKey = { ... }; // Public key in JWK format
     * const keyUri = await crypto.getKeyUri({ key: publicKey });
     * ```
     *
     * @param params - The parameters for getting the key URI.
     * @param params.key - The JWK for which to compute the key URI.
     *
     * @returns A Promise that resolves to the key URI as a string.
     */
    getKeyUri({ key }: KmsGetKeyUriParams): Promise<KeyIdentifier>;
    /**
     * Retrieves the public key associated with a previously generated private key, identified by
     * the provided key URI.
     *
     * @example
     * ```ts
     * const crypto = new AwsKmsCrypto();
     * const keyUri = await crypto.generateKey({ algorithm: 'ES256K' });
     * const publicKey = await crypto.getPublicKey({ keyUri });
     * ```
     *
     * @param params - The parameters for retrieving the public key.
     * @param params.keyUri - The key URI of the private key to retrieve the public key for.
     *
     * @returns A Promise that resolves to the public key in JWK format.
     */
    getPublicKey({ keyUri }: KmsGetPublicKeyParams): Promise<Jwk>;
    /**
     * Signs the provided data using the private key identified by the provided key URI.
     *
     * @remarks
     * This method uses the signature algorithm determined by the AWS KMS `KeySpec` of the private key
     * identified by the provided key URI to sign the provided data. The signature can later be
     * verified by parties with access to the corresponding public key, ensuring that the data has not
     * been tampered with and was indeed signed by the holder of the private key.
     *
     * @example
     * ```ts
     * const crypto = new AwsKmsCrypto();
     * const data = new TextEncoder().encode('Message to sign');
     * const signature = await crypto.sign({
     *   keyUri: 'urn:jwk:...',
     *   data
     * });
     * ```
     *
     * @param params - The parameters for the signing operation.
     * @param params.keyUri - The key URI of the private key to use for signing.
     * @param params.data - The data to sign.
     *
     * @returns A Promise resolving to the digital signature as a `Uint8Array`.
     */
    sign({ keyUri, data }: KmsSignParams): Promise<Uint8Array>;
    /**
     * Verifies a digital signature associated the provided data using the provided key.
     *
     * @remarks
     * This method uses the signature algorithm determined by the `alg` and/or `crv` properties of the
     * provided key to check the validity of a digital signature against the original data. It
     * confirms whether the signature was created by the holder of the corresponding private key and
     * that the data has not been tampered with.
     *
     * @example
     * ```ts
     * const crypto = new AwsKmsCrypto();
     * const publicKey = { ... }; // Public key in JWK format corresponding to the private key that signed the data
     * const data = new TextEncoder().encode('Message to sign'); // Data that was signed
     * const signature = new Uint8Array([...]); // Signature to verify
     * const isValid = await ecdsa.verify({
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
    verify({ key, signature, data }: KmsVerifyParams): Promise<boolean>;
    /**
     * Retrieves an algorithm implementation instance based on the provided algorithm name.
     *
     * @remarks
     * This method checks if the requested algorithm is supported and returns a cached instance
     * if available. If an instance does not exist, it creates and caches a new one. This approach
     * optimizes performance by reusing algorithm instances across cryptographic operations.
     *
     * @example
     * ```ts
     * const signer = this.getAlgorithm({ algorithm: 'ES256K' });
     * ```
     *
     * @param params - The parameters for retrieving the algorithm implementation.
     * @param params.algorithm - The name of the algorithm to retrieve.
     *
     * @returns An instance of the requested algorithm implementation.
     *
     * @throws Error if the requested algorithm is not supported.
     */
    private getAlgorithm;
    /**
     * Determines the name of the algorithm based on the key's properties or key specification.
     *
     * @remarks
     * This method facilitates the identification of the correct algorithm for cryptographic
     * operations based on the `alg` or `crv` properties of a {@link Jwk | JWK} or a given AWS
     * key specification.
     *
     * @example
     * ```ts
     * // Using a JWK.
     * const publicKey = { ... }; // Public key in JWK format
     * const algorithm = this.getAlgorithmName({ key: publicKey });
     *
     * // Using a key specification.
     * const keySpec = KeySpec.ECC_SECG_P256K1;
     * const algorithm = this.getAlgorithmName({ keySpec });
     * ```
     *
     * @param params - The parameters for determining the algorithm name.
     * @param params.keySpec - The AWS key specification.
     * @param params.key - A JWK containing the `alg` or `crv` properties.
     *
     * @returns The name of the algorithm associated with the key.
     *
     * @throws Error if the algorithm cannot be determined from the provided input.
     */
    private getAlgorithmName;
}
//# sourceMappingURL=api.d.ts.map