var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Convert } from '@web5/common';
import { EdDsaAlgorithm, EcdsaAlgorithm } from '@web5/crypto';
import { DidDhtMethod, DidIonMethod, DidKeyMethod, DidResolver, utils as didUtils } from '@web5/dids';
const secp256k1Signer = {
    signer: new EcdsaAlgorithm(),
    options: { name: 'ES256K' },
    alg: 'ES256K',
    crv: 'secp256k1'
};
const ed25519Signer = {
    signer: new EdDsaAlgorithm(),
    options: { name: 'EdDSA' },
    alg: 'EdDSA',
    crv: 'Ed25519'
};
/**
 * Class for handling Compact JSON Web Tokens (JWTs).
 * This class provides methods to create, verify, and decode JWTs using various cryptographic algorithms.
 * More information on JWTs can be found [here](https://datatracker.ietf.org/doc/html/rfc7519)
 */
export class Jwt {
    /**
     * Creates a signed JWT.
     *
     * @example
     * ```ts
     * const jwt = await Jwt.sign({ signerDid: myDid, payload: myPayload });
     * ```
     *
     * @param options - Parameters for JWT creation including signer DID and payload.
     * @returns The compact JWT as a string.
     */
    static sign(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { signerDid, payload } = options;
            const privateKeyJwk = signerDid.keySet.verificationMethodKeys[0].privateKeyJwk;
            let vmId = signerDid.document.verificationMethod[0].id;
            if (vmId.charAt(0) === '#') {
                vmId = `${signerDid.did}${vmId}`;
            }
            const header = {
                typ: 'JWT',
                alg: privateKeyJwk.alg,
                kid: vmId
            };
            const base64UrlEncodedHeader = Convert.object(header).toBase64Url();
            const base64UrlEncodedPayload = Convert.object(payload).toBase64Url();
            const toSign = `${base64UrlEncodedHeader}.${base64UrlEncodedPayload}`;
            const toSignBytes = Convert.string(toSign).toUint8Array();
            const algorithmId = `${header.alg}:${privateKeyJwk['crv'] || ''}`;
            if (!(algorithmId in Jwt.algorithms)) {
                throw new Error(`Signing failed: ${algorithmId} not supported`);
            }
            const { signer, options: signatureAlgorithm } = Jwt.algorithms[algorithmId];
            const signatureBytes = yield signer.sign({ key: privateKeyJwk, data: toSignBytes, algorithm: signatureAlgorithm });
            const base64UrlEncodedSignature = Convert.uint8Array(signatureBytes).toBase64Url();
            return `${toSign}.${base64UrlEncodedSignature}`;
        });
    }
    /**
     * Verifies a JWT.
     *
     * @example
     * ```ts
     * const verifiedJwt = await Jwt.verify({ jwt: myJwt });
     * ```
     *
     * @param options - Parameters for JWT verification
     * @returns Verified JWT information including signer DID, header, and payload.
     */
    static verify(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { decoded: decodedJwt, encoded: encodedJwt } = Jwt.parse({ jwt: options.jwt });
            if (decodedJwt.payload.exp && Math.floor(Date.now() / 1000) > decodedJwt.payload.exp) {
                throw new Error(`Verification failed: JWT is expired`);
            }
            // TODO: should really be looking for verificationMethod with authentication verification relationship
            const dereferenceResult = yield Jwt.didResolver.dereference({ didUrl: decodedJwt.header.kid });
            if (dereferenceResult.dereferencingMetadata.error) {
                throw new Error(`Failed to resolve ${decodedJwt.header.kid}`);
            }
            const verificationMethod = dereferenceResult.contentStream;
            if (!verificationMethod || !didUtils.isVerificationMethod(verificationMethod)) { // ensure that appropriate verification method was found
                throw new Error('Verification failed: Expected kid in JWT header to dereference a DID Document Verification Method');
            }
            // will be used to verify signature
            const publicKeyJwk = verificationMethod.publicKeyJwk;
            if (!publicKeyJwk) { // ensure that Verification Method includes public key as a JWK.
                throw new Error('Verification failed: Expected kid in JWT header to dereference to a DID Document Verification Method with publicKeyJwk');
            }
            const signedData = `${encodedJwt.header}.${encodedJwt.payload}`;
            const signedDataBytes = Convert.string(signedData).toUint8Array();
            const signatureBytes = Convert.base64Url(encodedJwt.signature).toUint8Array();
            const algorithmId = `${decodedJwt.header.alg}:${publicKeyJwk['crv'] || ''}`;
            if (!(algorithmId in Jwt.algorithms)) {
                throw new Error(`Verification failed: ${algorithmId} not supported`);
            }
            const { signer, options: signatureAlgorithm } = Jwt.algorithms[algorithmId];
            const isSignatureValid = yield signer.verify({
                algorithm: signatureAlgorithm,
                key: publicKeyJwk,
                data: signedDataBytes,
                signature: signatureBytes
            });
            if (!isSignatureValid) {
                throw new Error('Signature verification failed: Integrity mismatch');
            }
            return decodedJwt;
        });
    }
    /**
     * Parses a JWT without verifying its signature.
     *
     * @example
     * ```ts
     * const { encoded: encodedJwt, decoded: decodedJwt } = Jwt.parse({ jwt: myJwt });
     * ```
     *
     * @param options - Parameters for JWT decoding, including the JWT string.
     * @returns both encoded and decoded JWT parts
     */
    static parse(options) {
        const splitJwt = options.jwt.split('.');
        if (splitJwt.length !== 3) {
            throw new Error(`Verification failed: Malformed JWT. expected 3 parts. got ${splitJwt.length}`);
        }
        const [base64urlEncodedJwtHeader, base64urlEncodedJwtPayload, base64urlEncodedSignature] = splitJwt;
        let jwtHeader;
        let jwtPayload;
        try {
            jwtHeader = Convert.base64Url(base64urlEncodedJwtHeader).toObject();
        }
        catch (e) {
            throw new Error('Verification failed: Malformed JWT. Invalid base64url encoding for JWT header');
        }
        if (!jwtHeader.typ || jwtHeader.typ !== 'JWT') {
            throw new Error('Verification failed: Expected JWT header to contain typ property set to JWT');
        }
        if (!jwtHeader.alg || !jwtHeader.kid) { // ensure that JWT header has required properties
            throw new Error('Verification failed: Expected JWT header to contain alg and kid');
        }
        // TODO: validate optional payload fields: https://datatracker.ietf.org/doc/html/rfc7519#section-4.1
        try {
            jwtPayload = Convert.base64Url(base64urlEncodedJwtPayload).toObject();
        }
        catch (e) {
            throw new Error('Verification failed: Malformed JWT. Invalid base64url encoding for JWT payload');
        }
        return {
            decoded: {
                header: jwtHeader,
                payload: jwtPayload,
            },
            encoded: {
                header: base64urlEncodedJwtHeader,
                payload: base64urlEncodedJwtPayload,
                signature: base64urlEncodedSignature
            }
        };
    }
}
/** supported cryptographic algorithms. keys are `${alg}:${crv}`. */
Jwt.algorithms = {
    'ES256K:': secp256k1Signer,
    'ES256K:secp256k1': secp256k1Signer,
    ':secp256k1': secp256k1Signer,
    'EdDSA:Ed25519': ed25519Signer
};
/**
 * DID Resolver instance for resolving decentralized identifiers.
 */
Jwt.didResolver = new DidResolver({ didResolvers: [DidIonMethod, DidKeyMethod, DidDhtMethod] });
//# sourceMappingURL=jwt.js.map