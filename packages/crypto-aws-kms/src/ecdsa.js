var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { isEcPublicJwk, Secp256k1 } from '@web5/crypto';
import { KeySpec, MessageType, SignCommand, KeyUsageType, CreateKeyCommand, SigningAlgorithmSpec, } from '@aws-sdk/client-kms';
import { createKeyAlias } from './utils.js';
export class EcdsaAlgorithm {
    /**
     *
     * @param params - An object containing the parameters to use when instantiating the algorithm.
     * @param params.crypto - An instance of `CryptoApi` from the `@web5/crypto` package.
     * @param params.kmsClient - An instance of `KMSClient` from the AWS SDK.
     */
    constructor({ crypto, kmsClient }) {
        this._crypto = crypto;
        this._kmsClient = kmsClient;
    }
    /**
     * Generates a new cryptographic key in AWS KMS with the specified algorithm and returns a unique
     * key URI which can be used to reference the key in subsequent operations.
     *
     * @example
     * ```ts
     * const ecdsa = new EcdsaAlgorithm({ crypto, kmsClient });
     * const keyUri = await ecdsa.generateKey({ algorithm: 'ES256K' });
     * console.log(keyUri); // Outputs the key URI
     * ```
     *
     * @param params - The parameters for key generation.
     * @param params.algorithm - The algorithm to use for key generation, defined in `SupportedAlgorithm`.
     *
     * @returns A Promise that resolves to the key URI, a unique identifier for the generated key.
     */
    generateKey({ algorithm }) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let keySpec;
            let keyUsage;
            switch (algorithm) {
                case 'ES256K': {
                    keySpec = KeySpec.ECC_SECG_P256K1;
                    keyUsage = KeyUsageType.SIGN_VERIFY;
                }
            }
            // Send the request to generate a new customer managed key to AWS KMS.
            const response = yield this._kmsClient.send(new CreateKeyCommand({
                KeySpec: keySpec,
                KeyUsage: keyUsage
            }));
            if (!((_a = response.KeyMetadata) === null || _a === void 0 ? void 0 : _a.KeyId)) {
                throw new Error('Expected key metadata was not returned: KeyId');
            }
            // Get the AWS key identifier from the response (UUID v4 xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).
            const awsKeyId = response.KeyMetadata.KeyId;
            // Retrieve the public key from AWS KMS.
            const publicKey = yield this._crypto.getPublicKey({ keyUri: awsKeyId });
            // Compute the key URI.
            const keyUri = yield this._crypto.getKeyUri({ key: publicKey });
            // Set the key's alias in AWS KMS to the key URI.
            yield createKeyAlias({ awsKeyId, alias: keyUri, kmsClient: this._kmsClient });
            return keyUri;
        });
    }
    /**
     * Generates an ECDSA signature of given data using the private key identified by the provided
     * key URI.
     *
     * @remarks
     * This method uses the signature algorithm determined by the given `algorithm` to sign the
     * provided data. The `algorithm` is used to avoid another round trip to AWS KMS to determine the
     * `KeySpec` since it was already retrieved in {@link AwsKmsCrypto.sign | `AwsKmsCrypto.sign()`}.
     *
     * The signature can later be verified by parties with access to the corresponding
     * public key, ensuring that the data has not been tampered with and was indeed signed by the
     * holder of the private key.
     *
     * Note: Data is pre-hashed before signing to accommodate AWS KMS limitations for signature
     * payloads. AWS KMS restricts the size of the data payload to 4096 bytes for direct signing.
     * Hashing the data first ensures that the input to the signing operation is within this limit,
     * regardless of the original data size.
     *
     * @example
     * ```ts
     * const ecdsa = new EcdsaAlgorithm({ crypto, kmsClient });
     * const data = new TextEncoder().encode('Message to sign');
     * const signature = await ecdsa.sign({
     *   algorithm: 'ES256K',
     *   keyUri: 'urn:jwk:...',
     *   data
     * });
     * ```
     *
     * @param params - The parameters for the signing operation.
     * @param params.algorithm - The algorithm to use for signing.
     * @param params.keyUri - The key URI of the private key to use for signing.
     * @param params.data - The data to sign.
     *
     * @returns A Promise resolving to the digital signature as a `Uint8Array`.
     */
    sign({ algorithm, keyUri, data }) {
        return __awaiter(this, void 0, void 0, function* () {
            // Pre-hash the data to accommodate AWS KMS limitations for signature payloads.
            let hashedData;
            let signingAlgorithm;
            switch (algorithm) {
                case 'ES256K': {
                    // Pre-hash the data to accommodate AWS KMS limitations for signature payloads.s
                    hashedData = yield this._crypto.digest({ algorithm: 'SHA-256', data });
                    signingAlgorithm = SigningAlgorithmSpec.ECDSA_SHA_256;
                    break;
                }
                default: {
                    throw new Error(`Unsupported signature algorithm: ${algorithm}`);
                }
            }
            // Send the request to sign the data to AWS KMS.
            const response = yield this._kmsClient.send(new SignCommand({
                KeyId: keyUri,
                Message: hashedData,
                MessageType: MessageType.DIGEST,
                SigningAlgorithm: signingAlgorithm
            }));
            if (!response.Signature) {
                throw new Error('Expected response property was not returned: Signature');
            }
            // Get the ASN.1 DER encoded ECDSA signature returned by AWS KMS.
            const derSignature = response.Signature;
            // Convert the DER encoded signature to a compact R+S signature.
            const signature = yield Secp256k1.convertDerToCompactSignature({ derSignature });
            return signature;
        });
    }
    /**
     * Verifies an ECDSA signature associated with the provided data using the provided key.
     *
     * @remarks
     * This method uses the signature algorithm determined by the `alg` and/or `crv` properties of the
     * provided key to check the validity of a digital signature against the original data. It
     * confirms whether the signature was created by the holder of the corresponding private key and
     * that the data has not been tampered with.
     *
     * @example
     * ```ts
     * const ecdsa = new EcdsaAlgorithm({ crypto, kmsClient });
     * const publicKey = { ... }; // Public key in JWK format corresponding to the private key that signed the data
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
    verify({ key, signature, data }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!isEcPublicJwk(key))
                throw new TypeError('Invalid key provided. Must be an elliptic curve (EC) public key.');
            switch (key.crv) {
                case 'secp256k1': {
                    return yield Secp256k1.verify({ key, signature, data });
                }
                default: {
                    throw new Error(`Unsupported curve: ${key.crv}`);
                }
            }
        });
    }
}
//# sourceMappingURL=ecdsa.js.map