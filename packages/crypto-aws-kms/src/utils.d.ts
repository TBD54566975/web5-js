import type { Jwk, KeyIdentifier } from '@web5/crypto';
import { KMSClient, KeySpec } from '@aws-sdk/client-kms';
/**
 * Converts a DER-encoded SPKI public key to its JWK format.
 *
 * @remarks
 * This method is used to transform a public key from its DER-encoded X.509 `SubjectPublicKeyInfo`
 * (SPKI) format to JSON Web Key (JWK) format. This conversion is necessary because AWS KMS
 * returns public keys in SPKI format, but all other Web5 cryptographic libraries use JWK format.
 *
 * @param params - The parameters for the SPKI to JWK conversion.
 * @param params.spki - The DER-encoded SPKI public key as a `Uint8Array`.
 *
 * @returns The public key in JWK format.
 */
export declare function convertSpkiToPublicKey({ spki }: {
    spki: Uint8Array;
}): Jwk;
/**
 * Creates an alias that is associated with an AWS KMS key.
 *
 * @remarks
 * This method creates an alias (friendly name) for identifying an AWS KMS
 * {@link https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#customer-cmk | customer managed key}.
 * The method requires an alias name and an AWS key identifier (either a
 * {@link https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#key-id-key-id | key ID}
 * or
 * {@link https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#key-id-key-ARN | key ARN}).
 *
 * This library uses the AWS KMS alias feature to make it possible to reference a key using a
 * {@link https://datatracker.ietf.org/doc/html/rfc3986 | URI} (Uniform Resource Identifier)
 * that is consistent across all implementations of `CryptoApi`. These key URIs take the
 * form `urn:jwk:<JWK thumbprint>`, where the
 * {@link https://datatracker.ietf.org/doc/html/rfc7638 | JWK thumbprint} is deterministically
 * computed from the {@link https://datatracker.ietf.org/doc/html/rfc7517 | JWK} (JSON Web Key)
 * representation of the key. In other words, the same key material represented as a JWK will
 * always produce the same JWK thumbprint regardless of the order of JWK properties or inclusion
 * of optional properties. Due to AWS KMS restrictions on key alias names, the JWK thumbprint
 * is prepended with the "alias/" prefix and the URN namespace separator is replaced with dashes.
 *
 * **Alias name restrictions imposed by AWS KMS:**
 * - must be a string of 1-256 characters
 * - can contain only alphanumeric characters, forward slashes (/), underscores (_), and
 *   dashes (-)
 * - must begin with `alias/` followed by a name, such as `alias/ExampleAlias`
 * - cannot begin with `alias/aws/` because this prefix is reserved for AWS managed keys
 * - must be unique within an AWS account and region.
 *
 * @param params - The parameters for creating the key alias.
 * @param params.alias - The name of the key alias.
 * @param params.awsKeyId - The AWS Key ID or AWS Key ARN of the key to associate the alias with.
 *
 * @returns A promise that resolves when the key alias has been created.
 *
 * @throws {@link https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-kms/Class/AlreadyExistsException/ | `AlreadyExistsException`}
 *         if the alias already exists. Each AWS KMS key alias must be unique in the account and
 *         region.
 * @throws {@link https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-kms/Class/InvalidAliasNameException/ | `InvalidAliasNameException`}
 *         if the alias name is invalid. The alias name value must be string of 1-256 characters
 *         containing only alphanumeric characters, forward slashes (/), underscores (_),
 *         and dashes (-).
 * @throws {@link https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-kms/Class/NotFoundException/ | `NotFoundException`}
 *         if the AWS Key ID or AWS Key ARN could not be found in the account and region.
 * @throws Other AWS KMS related errors.
 */
export declare function createKeyAlias({ alias, awsKeyId, kmsClient }: {
    alias: string;
    awsKeyId: string;
    kmsClient: KMSClient;
}): Promise<void>;
export declare function getKeySpec({ keyUri, kmsClient }: {
    keyUri: KeyIdentifier;
    kmsClient: KMSClient;
}): Promise<KeySpec>;
//# sourceMappingURL=utils.d.ts.map