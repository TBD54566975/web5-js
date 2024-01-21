var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { utils as cryptoUtils } from '@web5/crypto';
import { Jwt } from './jwt.js';
import { SsiValidator } from './validators.js';
import { getCurrentXmlSchema112Timestamp } from './utils.js';
export const DEFAULT_CONTEXT = 'https://www.w3.org/2018/credentials/v1';
export const DEFAULT_VC_TYPE = 'VerifiableCredential';
/**
 * `VerifiableCredential` represents a digitally verifiable credential according to the
 * [W3C Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model/).
 *
 * It provides functionalities to sign, verify, and create credentials, offering a concise API to
 * work with JWT representations of verifiable credentials and ensuring that the signatures
 * and claims within those JWTs can be validated.
 *
 * @property vcDataModel The [VcDataModel] instance representing the core data model of a verifiable credential.
 */
export class VerifiableCredential {
    constructor(vcDataModel) {
        this.vcDataModel = vcDataModel;
    }
    get type() {
        return this.vcDataModel.type[this.vcDataModel.type.length - 1];
    }
    get issuer() {
        return this.vcDataModel.issuer.toString();
    }
    get subject() {
        if (Array.isArray(this.vcDataModel.credentialSubject)) {
            return this.vcDataModel.credentialSubject[0].id;
        }
        else {
            return this.vcDataModel.credentialSubject.id;
        }
    }
    /**
     * Signs the verifiable credential and returns it as a signed JWT.
     *
     * @example
     * ```ts
     * const vcJwt = verifiableCredential.sign({ did: myDid });
     * ```
     *
     * @param options - The sign options used to sign the credential.
     * @returns The JWT representing the signed verifiable credential.
     */
    sign(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const vcJwt = yield Jwt.sign({
                signerDid: options.did,
                payload: {
                    vc: this.vcDataModel,
                    iss: this.issuer,
                    sub: this.subject,
                }
            });
            return vcJwt;
        });
    }
    /**
     * Converts the current object to its JSON representation.
     *
     * @returns The JSON representation of the object.
     */
    toString() {
        return JSON.stringify(this.vcDataModel);
    }
    /**
     * Create a [VerifiableCredential] based on the provided parameters.
     *
     * @example
     * ```ts
     * const vc = await VerifiableCredential.create({
     *     type: 'StreetCredibility',
     *     issuer: 'did:ex:issuer',
     *     subject: 'did:ex:subject',
     *     data: { 'arbitrary': 'data' }
     *   })
     * ```
     *
     * @param options - The options to use when creating the Verifiable Credential.
     * @returns A [VerifiableCredential] instance.
     */
    static create(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { type, issuer, subject, data, issuanceDate, expirationDate } = options;
            const jsonData = JSON.parse(JSON.stringify(data));
            if (typeof jsonData !== 'object') {
                throw new Error('Expected data to be parseable into a JSON object');
            }
            if (!issuer || !subject) {
                throw new Error('Issuer and subject must be defined');
            }
            const credentialSubject = Object.assign({ id: subject }, jsonData);
            const vcDataModel = Object.assign({ '@context': [DEFAULT_CONTEXT], type: Array.isArray(type)
                    ? [DEFAULT_VC_TYPE, ...type]
                    : (type ? [DEFAULT_VC_TYPE, type] : [DEFAULT_VC_TYPE]), id: `urn:uuid:${cryptoUtils.randomUuid()}`, issuer: issuer, issuanceDate: issuanceDate || getCurrentXmlSchema112Timestamp(), credentialSubject: credentialSubject }, (expirationDate && { expirationDate }));
            validatePayload(vcDataModel);
            return new VerifiableCredential(vcDataModel);
        });
    }
    /**
     * Verifies the integrity and authenticity of a Verifiable Credential (VC) encoded as a JSON Web Token (JWT).
     *
     * This function performs several crucial validation steps to ensure the trustworthiness of the provided VC:
     * - Parses and validates the structure of the JWT.
     * - Ensures the presence of critical header elements `alg` and `kid` in the JWT header.
     * - Resolves the Decentralized Identifier (DID) and retrieves the associated DID Document.
     * - Validates the DID and establishes a set of valid verification method IDs.
     * - Identifies the correct Verification Method from the DID Document based on the `kid` parameter.
     * - Verifies the JWT's signature using the public key associated with the Verification Method.
     *
     * If any of these steps fail, the function will throw a [Error] with a message indicating the nature of the failure.
     *
     * @example
     * ```ts
     * try {
     *     VerifiableCredential.verify({ vcJwt: signedVcJwt })
     *     console.log("VC Verification successful!")
     * } catch (e: Error) {
     *     console.log("VC Verification failed: ${e.message}")
     * }
     * ```
     *
     * @param vcJwt The Verifiable Credential in JWT format as a [string].
     * @throws Error if the verification fails at any step, providing a message with failure details.
     * @throws Error if critical JWT header elements are absent.
     */
    static verify({ vcJwt }) {
        return __awaiter(this, void 0, void 0, function* () {
            const { payload } = yield Jwt.verify({ jwt: vcJwt });
            const vc = payload['vc'];
            if (!vc) {
                throw new Error('vc property missing.');
            }
            validatePayload(vc);
            return {
                issuer: payload.iss,
                subject: payload.sub,
                vc: payload['vc']
            };
        });
    }
    /**
     * Parses a JWT into a [VerifiableCredential] instance.
     *
     * @example
     * ```ts
     * const vc = VerifiableCredential.parseJwt({ vcJwt: signedVcJwt })
     * ```
     *
     * @param vcJwt The verifiable credential JWT as a [String].
     * @returns A [VerifiableCredential] instance derived from the JWT.
     */
    static parseJwt({ vcJwt }) {
        const parsedJwt = Jwt.parse({ jwt: vcJwt });
        const vcDataModel = parsedJwt.decoded.payload['vc'];
        if (!vcDataModel) {
            throw Error('Jwt payload missing vc property');
        }
        return new VerifiableCredential(vcDataModel);
    }
}
/**
 * Validates the structure and integrity of a Verifiable Credential payload.
 *
 * @param vc - The Verifiable Credential object to validate.
 * @throws Error if any validation check fails.
 */
function validatePayload(vc) {
    SsiValidator.validateContext(vc['@context']);
    SsiValidator.validateVcType(vc.type);
    SsiValidator.validateCredentialSubject(vc.credentialSubject);
    if (vc.issuanceDate)
        SsiValidator.validateTimestamp(vc.issuanceDate);
    if (vc.expirationDate)
        SsiValidator.validateTimestamp(vc.expirationDate);
}
//# sourceMappingURL=verifiable-credential.js.map