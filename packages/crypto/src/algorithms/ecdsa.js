var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Secp256k1 } from '../primitives/secp256k1.js';
import { isEcPrivateJwk, isEcPublicJwk } from '../jose/jwk.js';
import { CryptoAlgorithm } from './crypto-algorithm.js';
/**
 * The `EcdsaAlgorithm` class provides a concrete implementation for cryptographic operations using
 * the Elliptic Curve Digital Signature Algorithm (ECDSA). This class implements both
 * {@link Signer | `Signer`} and { @link AsymmetricKeyGenerator | `AsymmetricKeyGenerator`}
 * interfaces, providing private key generation, public key derivation, and creation/verification
 * of signatures.
 *
 * This class is typically accessed through implementations that extend the
 * {@link CryptoApi | `CryptoApi`} interface.
 */
export class EcdsaAlgorithm extends CryptoAlgorithm {
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
     * const ecdsa = new EcdsaAlgorithm();
     * const privateKey = { ... }; // A Jwk object representing a private key
     * const publicKey = await ecdsa.computePublicKey({ key: privateKey });
     * ```
     *
     * @param params - The parameters for the public key derivation.
     * @param params.key - The private key in JWK format from which to derive the public key.
     *
     * @returns A Promise that resolves to the derived public key in JWK format.
     */
    computePublicKey({ key }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!isEcPrivateJwk(key))
                throw new TypeError('Invalid key provided. Must be an elliptic curve (EC) private key.');
            switch (key.crv) {
                case 'secp256k1': {
                    const publicKey = yield Secp256k1.computePublicKey({ key });
                    publicKey.alg = 'ES256K';
                    return publicKey;
                }
                default: {
                    throw new Error(`Unsupported curve: ${key.crv}`);
                }
            }
        });
    }
    /**
     * Generates a new private key with the specified algorithm in JSON Web Key (JWK) format.
     *
     * @example
     * ```ts
     * const ecdsa = new EcdsaAlgorithm();
     * const privateKey = await ecdsa.generateKey({ algorithm: 'ES256K' });
     * ```
     *
     * @param params - The parameters for key generation.
     * @param params.algorithm - The algorithm to use for key generation.
     *
     * @returns A Promise that resolves to the generated private key in JWK format.
     */
    generateKey({ algorithm }) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (algorithm) {
                case 'ES256K': {
                    const privateKey = yield Secp256k1.generateKey();
                    privateKey.alg = algorithm;
                    return privateKey;
                }
            }
        });
    }
    /**
     * Retrieves the public key properties from a given private key in JWK format.
     *
     * @remarks
     * This method extracts the public key portion from an ECDSA private key in JWK format. It does
     * so by removing the private key property 'd' and making a shallow copy, effectively yielding the
     * public key.
     *
     * Note: This method offers a significant performance advantage, being about 200 times faster
     * than `computePublicKey()`. However, it does not mathematically validate the private key, nor
     * does it derive the public key from the private key. It simply extracts existing public key
     * properties from the private key object. This makes it suitable for scenarios where speed is
     * critical and the private key's integrity is already assured.
     *
     * @example
     * ```ts
     * const ecdsa = new EcdsaAlgorithm();
     * const privateKey = { ... }; // A Jwk object representing a private key
     * const publicKey = await ecdsa.getPublicKey({ key: privateKey });
     * ```
     *
     * @param params - The parameters for retrieving the public key properties.
     * @param params.key - The private key in JWK format.
     *
     * @returns A Promise that resolves to the public key in JWK format.
     */
    getPublicKey({ key }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!isEcPrivateJwk(key))
                throw new TypeError('Invalid key provided. Must be an elliptic curve (EC) private key.');
            switch (key.crv) {
                case 'secp256k1': {
                    const publicKey = yield Secp256k1.getPublicKey({ key });
                    publicKey.alg = 'ES256K';
                    return publicKey;
                }
                default: {
                    throw new Error(`Unsupported curve: ${key.crv}`);
                }
            }
        });
    }
    /**
     * Generates an ECDSA signature of given data using a private key.
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
     * const ecdsa = new EcdsaAlgorithm();
     * const data = new TextEncoder().encode('Message');
     * const privateKey = { ... }; // A Jwk object representing a private key
     * const signature = await ecdsa.sign({
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
    sign({ key, data }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!isEcPrivateJwk(key))
                throw new TypeError('Invalid key provided. Must be an elliptic curve (EC) private key.');
            switch (key.crv) {
                case 'secp256k1': {
                    return yield Secp256k1.sign({ key, data });
                }
                default: {
                    throw new Error(`Unsupported curve: ${key.crv}`);
                }
            }
        });
    }
    /**
     * Verifies an ECDSA signature associated with the provided data using the provided key.
     *
     * @remarks
     * This method uses the signature algorithm determined by the `crv` property of the provided key
     * to check the validity of a digital signature against the original data. It confirms whether the
     * signature was created by the holder of the corresponding private key and that the data has not
     * been tampered with.
     *s
     * @example
     * ```ts
     * const ecdsa = new EcdsaAlgorithm();
     * const publicKey = { ... }; // Public key in JWK format corresponding to the private key that signed the data
     * const signature = new Uint8Array([...]); // Signature to verify
     * const data = new TextEncoder().encode('Message');
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