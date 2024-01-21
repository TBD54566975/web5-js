var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { MemoryStore } from '@web5/common';
import { Sha2Algorithm } from './algorithms/sha-2.js';
import { EcdsaAlgorithm } from './algorithms/ecdsa.js';
import { EdDsaAlgorithm } from './algorithms/eddsa.js';
import { computeJwkThumbprint, isPrivateJwk, KEY_URI_PREFIX_JWK } from './jose/jwk.js';
/**
 * `supportedAlgorithms` is an object mapping algorithm names to their respective implementations
 * Each entry in this map specifies the algorithm name and its associated properties, including the
 * implementation class and any relevant names or identifiers for the algorithm. This structure
 * allows for easy retrieval and instantiation of algorithm implementations based on the algorithm
 * name or key specification. It facilitates the support of multiple algorithms within the
 * `LocalKmsCrypto` class.
 */
const supportedAlgorithms = {
    'Ed25519': {
        implementation: EdDsaAlgorithm,
        names: ['Ed25519'],
    },
    'ES256K': {
        implementation: EcdsaAlgorithm,
        names: ['ES256K', 'secp256k1'],
    },
    'SHA-256': {
        implementation: Sha2Algorithm,
        names: ['SHA-256']
    }
};
export class LocalKmsCrypto {
    constructor(params) {
        var _a;
        /**
         * A private map that stores instances of cryptographic algorithm implementations. Each key in this
         * map is an `AlgorithmConstructor`, and its corresponding value is an instance of a class that
         * implements a specific cryptographic algorithm. This map is used to cache and reuse instances for
         * performance optimization, ensuring that each algorithm is instantiated only once.
         */
        this._algorithmInstances = new Map();
        this._keyStore = (_a = params === null || params === void 0 ? void 0 : params.keyStore) !== null && _a !== void 0 ? _a : new MemoryStore();
    }
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
     * const crypto = new LocalKmsCrypto();
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
    digest({ algorithm, data }) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get the hash function implementation based on the specified `algorithm` parameter.
            const hasher = this.getAlgorithm({ algorithm });
            // Compute the hash.
            const hash = yield hasher.digest({ algorithm, data });
            return hash;
        });
    }
    /**
     * Exports a private key identified by the provided key URI from the local KMS.
     *
     * @remarks
     * This method retrieves the key from the key store and returns it. It is primarily used
     * for extracting keys for backup or transfer purposes.
     *
     * @example
     * ```ts
     * const crypto = new LocalKmsCrypto();
     * const keyUri = await crypto.generateKey({ algorithm: 'ES256K' });
     * const privateKey = await crypto.exportKey({ keyUri });
     * ```
     *
     * @param params - Parameters for exporting the key.
     * @param params.keyUri - The key URI identifying the key to export.
     *
     * @returns A Promise resolving to the JWK representation of the exported key.
     */
    exportKey({ keyUri }) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get the private key from the key store.
            const privateKey = yield this.getPrivateKey({ keyUri });
            return privateKey;
        });
    }
    /**
     * Generates a new cryptographic key in the local KMS with the specified algorithm and returns a
     * unique key URI which can be used to reference the key in subsequent operations.
     *
     * @example
     * ```ts
     * const cryptoApi = new LocalKmsCrypto();
     * const keyUri = await cryptoApi.generateKey({ algorithm: 'ES256K' });
     * console.log(keyUri); // Outputs the key URI
     * ```
     *
     * @param params - The parameters for key generation.
     * @param params.algorithm - The algorithm to use for key generation, defined in `SupportedAlgorithm`.
     *
     * @returns A Promise that resolves to the key URI, a unique identifier for the generated key.
     */
    generateKey({ algorithm }) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get the key generator implementation based on the specified `algorithm` parameter.
            const keyGenerator = this.getAlgorithm({ algorithm });
            // Generate the key.
            const key = yield keyGenerator.generateKey({ algorithm });
            if ((key === null || key === void 0 ? void 0 : key.kid) === undefined) {
                throw new Error('Generated key is missing a required property: kid');
            }
            // Construct the key URI.
            const keyUri = `${KEY_URI_PREFIX_JWK}${key.kid}`;
            // Store the key in the key store.
            yield this._keyStore.set(keyUri, key);
            return keyUri;
        });
    }
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
     * const crypto = new LocalKmsCrypto();
     * const keyUri = await crypto.generateKey({ algorithm: 'ES256K' });
     * const publicKey = await crypto.getPublicKey({ keyUri });
     * const keyUriFromPublicKey = await crypto.getKeyUri({ key: publicKey });
     * console.log(keyUri === keyUriFromPublicKey); // Outputs `true`
     * ```
     *
     * @param params - The parameters for getting the key URI.
     * @param params.key - The JWK for which to compute the key URI.
     *
     * @returns A Promise that resolves to the key URI as a string.
     */
    getKeyUri({ key }) {
        return __awaiter(this, void 0, void 0, function* () {
            // Compute the JWK thumbprint.
            const jwkThumbprint = yield computeJwkThumbprint({ jwk: key });
            // Construct the key URI by appending the JWK thumbprint to the key URI prefix.
            const keyUri = `${KEY_URI_PREFIX_JWK}${jwkThumbprint}`;
            return keyUri;
        });
    }
    /**
     * Retrieves the public key associated with a previously generated private key, identified by
     * the provided key URI.
     *
     * @example
     * ```ts
     * const crypto = new LocalKmsCrypto();
     * const keyUri = await crypto.generateKey({ algorithm: 'ES256K' });
     * const publicKey = await crypto.getPublicKey({ keyUri });
     * ```
     *
     * @param params - The parameters for retrieving the public key.
     * @param params.keyUri - The key URI of the private key to retrieve the public key for.
     *
     * @returns A Promise that resolves to the public key in JWK format.
     */
    getPublicKey({ keyUri }) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get the private key from the key store.
            const privateKey = yield this.getPrivateKey({ keyUri });
            // Determine the algorithm name based on the JWK's `alg` and `crv` properties.
            const algorithm = this.getAlgorithmName({ key: privateKey });
            // Get the key generator based on the algorithm name.
            const keyGenerator = this.getAlgorithm({ algorithm });
            // Get the public key properties from the private JWK.
            const publicKey = yield keyGenerator.getPublicKey({ key: privateKey });
            return publicKey;
        });
    }
    /**
     * Imports a private key into the local KMS.
     *
     * @remarks
     * This method stores the provided JWK in the key store, making it available for subsequent
     * cryptographic operations. It is particularly useful for initializing the KMS with pre-existing
     * keys or for restoring keys from backups.
     *
     * Note that, if defined, the `kid` (key ID) property of the JWK is used as the key URI for the
     * imported key. If the `kid` property is not provided, the key URI is computed from the JWK
     * thumbprint of the key.
     *
     * @example
     * ```ts
     * const crypto = new LocalKmsCrypto();
     * const privateKey = { ... } // A private key in JWK format
     * const keyUri = await crypto.importKey({ key: privateKey });
     * ```
     *
     * @param params - Parameters for importing the key.
     * @param params.key - The private key to import to in JWK format.
     *
     * @returns A Promise resolving to the key URI, uniquely identifying the imported key.
     */
    importKey({ key }) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!isPrivateJwk(key))
                throw new TypeError('Invalid key provided. Must be a private key in JWK format.');
            // Make a deep copy of the key to avoid mutating the original.
            const privateKey = structuredClone(key);
            // If the key ID is undefined, set it to the JWK thumbprint.
            (_a = privateKey.kid) !== null && _a !== void 0 ? _a : (privateKey.kid = yield computeJwkThumbprint({ jwk: privateKey }));
            // Compute the key URI for the key.
            const keyUri = yield this.getKeyUri({ key: privateKey });
            // Store the key in the key store.
            yield this._keyStore.set(keyUri, privateKey);
            return keyUri;
        });
    }
    /**
     * Signs the provided data using the private key identified by the provided key URI.
     *
     * @remarks
     * This method uses the signature algorithm determined by the `alg` and/or `crv` properties of the
     * private key identified by the provided key URI to sign the provided data. The signature can
     * later be verified by parties with access to the corresponding public key, ensuring that the
     * data has not been tampered with and was indeed signed by the holder of the private key.
     *
     * @example
     * ```ts
     * const crypto = new LocalKmsCrypto();
     * const keyUri = await crypto.generateKey({ algorithm: 'ES256K' });
     * const data = new TextEncoder().encode('Message to sign');
     * const signature = await crypto.sign({ keyUri, data });
     * ```
     *
     * @param params - The parameters for the signing operation.
     * @param params.keyUri - The key URI of the private key to use for signing.
     * @param params.data - The data to sign.
     *
     * @returns A Promise resolving to the digital signature as a `Uint8Array`.
     */
    sign({ keyUri, data }) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get the private key from the key store.
            const privateKey = yield this.getPrivateKey({ keyUri });
            // Determine the algorithm name based on the JWK's `alg` and `crv` properties.
            let algorithm = this.getAlgorithmName({ key: privateKey });
            // Get the signature algorithm based on the algorithm name.
            const signer = this.getAlgorithm({ algorithm });
            // Sign the data.
            const signature = signer.sign({ data, key: privateKey });
            return signature;
        });
    }
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
     * const crypto = new LocalKmsCrypto();
     * const keyUri = await crypto.generateKey({ algorithm: 'ES256K' });
     * const data = new TextEncoder().encode('Message to sign');
     * const signature = await crypto.sign({ keyUri, data });
     * const isSignatureValid = await crypto.verify({ keyUri, data, signature });
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
            // Determine the algorithm name based on the JWK's `alg` and `crv` properties.
            let algorithm = this.getAlgorithmName({ key });
            // Get the signature algorithm based on the algorithm name.
            const signer = this.getAlgorithm({ algorithm });
            // Verify the signature.
            const isSignatureValid = signer.verify({ key, signature, data });
            return isSignatureValid;
        });
    }
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
    getAlgorithm({ algorithm }) {
        var _a;
        // Check if algorithm is supported.
        const AlgorithmImplementation = (_a = supportedAlgorithms[algorithm]) === null || _a === void 0 ? void 0 : _a['implementation'];
        if (!AlgorithmImplementation) {
            throw new Error(`Algorithm not supported: ${algorithm}`);
        }
        // Check if instance already exists for the `AlgorithmImplementation`.
        if (!this._algorithmInstances.has(AlgorithmImplementation)) {
            // If not, create a new instance and store it in the cache
            this._algorithmInstances.set(AlgorithmImplementation, new AlgorithmImplementation());
        }
        // Return the cached instance
        return this._algorithmInstances.get(AlgorithmImplementation);
    }
    /**
     * Determines the name of the algorithm based on the key's properties.
     *
     * @remarks
     * This method facilitates the identification of the correct algorithm for cryptographic
     * operations based on the `alg` or `crv` properties of a {@link Jwk | JWK}.
     *
     * @example
     * ```ts
     * const publicKey = { ... }; // Public key in JWK format
     * const algorithm = this.getAlgorithmName({ key: publicKey });
     * ```
     *
     * @param params - The parameters for determining the algorithm name.
     * @param params.key - A JWK containing the `alg` or `crv` properties.
     *
     * @returns The name of the algorithm associated with the key.
     *
     * @throws Error if the algorithm cannot be determined from the provided input.
     */
    getAlgorithmName({ key }) {
        const algProperty = key.alg;
        const crvProperty = key.crv;
        for (const algName in supportedAlgorithms) {
            const algorithmInfo = supportedAlgorithms[algName];
            if (algProperty && algorithmInfo.names.includes(algProperty)) {
                return algName;
            }
            else if (crvProperty && algorithmInfo.names.includes(crvProperty)) {
                return algName;
            }
        }
        throw new Error(`Unable to determine algorithm based on provided input: alg=${algProperty}, crv=${crvProperty}`);
    }
    /**
     * Retrieves a private key from the key store based on the provided key URI.
     *
     * @example
     * ```ts
     * const privateKey = this.getPrivateKey({ keyUri: 'urn:jwk:...' });
     * ```
     *
     * @param params - Parameters for retrieving the private key.
     * @param params.keyUri - The key URI identifying the private key to retrieve.
     *
     * @returns A Promise resolving to the JWK representation of the private key.
     *
     * @throws Error if the key is not found in the key store.
     */
    getPrivateKey({ keyUri }) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get the private key from the key store.
            const privateKey = yield this._keyStore.get(keyUri);
            if (!privateKey) {
                throw new Error(`Key not found: ${keyUri}`);
            }
            return privateKey;
        });
    }
}
//# sourceMappingURL=local-kms-crypto.js.map