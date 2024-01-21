var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Convert, removeUndefinedProperties } from '@web5/common';
import { canonicalize } from './utils.js';
import { Sha256 } from '../primitives/sha256.js';
/**
 * Constant defining the prefix for JSON Web Keys (JWK) key URIs in this library.
 *
 * The prefix 'urn:jwk:' makes it explicit that a string represents a JWK, referenced by a
 * {@link https://datatracker.ietf.org/doc/html/rfc3986 | URI} (Uniform Resource Identifier),
 * which ensures consistent key referencing across all Web5 Key Management System (KMS)
 * implementations.
 *
 * These key URIs take the form `urn:jwk:<JWK thumbprint>`, where the
 * {@link https://datatracker.ietf.org/doc/html/rfc7638 | JWK thumbprint}, derived from the JWK, is
 * unique to the key's material, unaffected by the order or optional properties in the JWK.
 */
export const KEY_URI_PREFIX_JWK = 'urn:jwk:';
/**
 * Computes the thumbprint of a JSON Web Key (JWK) using the method
 * specified in RFC 7638. This function accepts RSA, EC, OKP, and oct keys
 * and returns the thumbprint as a base64url encoded SHA-256 hash of the
 * JWK's required members, serialized and sorted lexicographically.
 *
 * Purpose:
 * - Uniquely Identifying Keys: The thumbprint allows the unique
 *   identification of a specific JWK within a set of JWKs. It provides a
 *   deterministic way to generate a value that can be used as a key
 *   identifier (kid) or to match a specific key.
 *
 * - Simplifying Key Management: In systems where multiple keys are used,
 *   managing and identifying individual keys can become complex. The
 *   thumbprint method simplifies this by creating a standardized, unique
 *   identifier for each key.
 *
 * - Enabling Interoperability: By standardizing the method to compute a
 *   thumbprint, different systems can compute the same thumbprint value for
 *   a given JWK. This enables interoperability among systems that use JWKs.
 *
 * - Secure Comparison: The thumbprint provides a way to securely compare
 *   JWKs to determine if they are equivalent.
 *
 * @example
 * ```ts
 * const jwk: PublicKeyJwk = {
 *   'kty': 'EC',
 *   'crv': 'secp256k1',
 *   'x': '61iPYuGefxotzBdQZtDvv6cWHZmXrTTscY-u7Y2pFZc',
 *   'y': '88nPCVLfrAY9i-wg5ORcwVbHWC_tbeAd1JE2e0co0lU'
 * };
 *
 * const thumbprint = jwkThumbprint(jwk);
 * console.log(`JWK thumbprint: ${thumbprint}`);
 * ```
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc7638 | RFC7638} for
 * the specification of JWK thumbprint computation.
 *
 * @param jwk - The JSON Web Key for which the thumbprint will be computed.
 *              This must be an RSA, EC, OKP, or oct key.
 * @returns The thumbprint as a base64url encoded string.
 * @throws Throws an `Error` if the provided key type is unsupported.
 */
export function computeJwkThumbprint({ jwk }) {
    return __awaiter(this, void 0, void 0, function* () {
        /** Step 1 - Normalization: The JWK is normalized to include only specific
         * members and in lexicographic order.
         */
        const keyType = jwk.kty;
        let normalizedJwk;
        if (keyType === 'EC') {
            normalizedJwk = { crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y };
        }
        else if (keyType === 'oct') {
            normalizedJwk = { k: jwk.k, kty: jwk.kty };
        }
        else if (keyType === 'OKP') {
            normalizedJwk = { crv: jwk.crv, kty: jwk.kty, x: jwk.x };
        }
        else if (keyType === 'RSA') {
            normalizedJwk = { e: jwk.e, kty: jwk.kty, n: jwk.n };
        }
        else {
            throw new Error(`Unsupported key type: ${keyType}`);
        }
        removeUndefinedProperties(normalizedJwk);
        /** Step 2 - Serialization: The normalized JWK is serialized to a UTF-8
         * representation of its JSON encoding. */
        const serializedJwk = canonicalize(normalizedJwk);
        /** Step 3 - Digest Calculation: A cryptographic hash function
         * (SHA-256 is recommended) is applied to the serialized JWK,
         * resulting in the thumbprint. */
        const utf8Bytes = Convert.string(serializedJwk).toUint8Array();
        const digest = yield Sha256.digest({ data: utf8Bytes });
        // Encode as Base64Url.
        const thumbprint = Convert.uint8Array(digest).toBase64Url();
        return thumbprint;
    });
}
/**
 * Checks if the provided object is a valid elliptic curve private key in JWK format.
 *
 * @param obj - The object to check.
 * @returns True if the object is a valid EC private JWK; otherwise, false.
 */
export function isEcPrivateJwk(obj) {
    if (!obj || typeof obj !== 'object')
        return false;
    if (!('kty' in obj && 'crv' in obj && 'x' in obj && 'd' in obj))
        return false;
    if (obj.kty !== 'EC')
        return false;
    if (typeof obj.d !== 'string')
        return false;
    if (typeof obj.x !== 'string')
        return false;
    return true;
}
/**
 * Checks if the provided object is a valid elliptic curve public key in JWK format.
 *
 * @param obj - The object to check.
 * @returns True if the object is a valid EC public JWK; otherwise, false.
 */
export function isEcPublicJwk(obj) {
    if (!obj || typeof obj !== 'object')
        return false;
    if (!('kty' in obj && 'crv' in obj && 'x' in obj))
        return false;
    if ('d' in obj)
        return false;
    if (obj.kty !== 'EC')
        return false;
    if (typeof obj.x !== 'string')
        return false;
    return true;
}
/**
 * Checks if the provided object is a valid octet sequence (symmetric key) in JWK format.
 *
 * @param obj - The object to check.
 * @returns True if the object is a valid oct private JWK; otherwise, false.
 */
export function isOctPrivateJwk(obj) {
    if (!obj || typeof obj !== 'object')
        return false;
    if (!('kty' in obj && 'k' in obj))
        return false;
    if (obj.kty !== 'oct')
        return false;
    if (typeof obj.k !== 'string')
        return false;
    return true;
}
/**
 * Checks if the provided object is a valid octet key pair private key in JWK format.
 *
 * @param obj - The object to check.
 * @returns True if the object is a valid OKP private JWK; otherwise, false.
 */
export function isOkpPrivateJwk(obj) {
    if (!obj || typeof obj !== 'object')
        return false;
    if (!('kty' in obj && 'crv' in obj && 'x' in obj && 'd' in obj))
        return false;
    if (obj.kty !== 'OKP')
        return false;
    if (typeof obj.d !== 'string')
        return false;
    if (typeof obj.x !== 'string')
        return false;
    return true;
}
/**
 * Checks if the provided object is a valid octet key pair public key in JWK format.
 *
 * @param obj - The object to check.
 * @returns True if the object is a valid OKP public JWK; otherwise, false.
 */
export function isOkpPublicJwk(obj) {
    if (!obj || typeof obj !== 'object')
        return false;
    if ('d' in obj)
        return false;
    if (!('kty' in obj && 'crv' in obj && 'x' in obj))
        return false;
    if (obj.kty !== 'OKP')
        return false;
    if (typeof obj.x !== 'string')
        return false;
    return true;
}
/**
 * Checks if the provided object is a valid private key in JWK format of any supported type.
 *
 * @param obj - The object to check.
 * @returns True if the object is a valid private JWK; otherwise, false.
 */
export function isPrivateJwk(obj) {
    if (!obj || typeof obj !== 'object')
        return false;
    const kty = obj.kty;
    switch (kty) {
        case 'EC':
        case 'OKP':
        case 'RSA':
            return 'd' in obj;
        case 'oct':
            return 'k' in obj;
        default:
            return false;
    }
}
/**
 * Checks if the provided object is a valid public key in JWK format of any supported type.
 *
 * @param obj - The object to check.
 * @returns True if the object is a valid public JWK; otherwise, false.
 */
export function isPublicJwk(obj) {
    if (!obj || typeof obj !== 'object')
        return false;
    const kty = obj.kty;
    switch (kty) {
        case 'EC':
        case 'OKP':
            return 'x' in obj && !('d' in obj);
        case 'RSA':
            return 'n' in obj && 'e' in obj && !('d' in obj);
        default:
            return false;
    }
}
//# sourceMappingURL=jwk.js.map