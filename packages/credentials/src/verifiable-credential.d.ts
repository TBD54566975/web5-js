import type { PortableDid } from '@web5/dids';
import type { ICredential } from '@sphereon/ssi-types';
export declare const DEFAULT_CONTEXT = "https://www.w3.org/2018/credentials/v1";
export declare const DEFAULT_VC_TYPE = "VerifiableCredential";
/**
 * A Verifiable Credential is a set of one or more claims made by the same entity.
 *
 * @see {@link https://www.w3.org/TR/vc-data-model/#credentials | VC Data Model}
 */
export type VcDataModel = ICredential;
/**
 * Options for creating a verifiable credential.
 * @param type Optional. The type of the credential, can be a string or an array of strings.
 * @param issuer The issuer URI of the credential, as a string.
 * @param subject The subject URI of the credential, as a string.
 * @param data The credential data, as a generic type any.
 * @param issuanceDate Optional. The issuance date of the credential, as a string.
 *               Defaults to the current date if not specified.
 * @param expirationDate Optional. The expiration date of the credential, as a string.
 */
export type VerifiableCredentialCreateOptions = {
    type?: string | string[];
    issuer: string;
    subject: string;
    data: any;
    issuanceDate?: string;
    expirationDate?: string;
};
/**
 * Options for signing a verifiable credential.
 * @param did - The issuer DID of the credential, represented as a PortableDid.
 */
export type VerifiableCredentialSignOptions = {
    did: PortableDid;
};
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
export declare class VerifiableCredential {
    vcDataModel: VcDataModel;
    constructor(vcDataModel: VcDataModel);
    get type(): string;
    get issuer(): string;
    get subject(): string;
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
    sign(options: VerifiableCredentialSignOptions): Promise<string>;
    /**
     * Converts the current object to its JSON representation.
     *
     * @returns The JSON representation of the object.
     */
    toString(): string;
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
    static create(options: VerifiableCredentialCreateOptions): Promise<VerifiableCredential>;
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
    static verify({ vcJwt }: {
        vcJwt: string;
    }): Promise<{
        issuer: string;
        subject: string;
        vc: ICredential;
    }>;
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
    static parseJwt({ vcJwt }: {
        vcJwt: string;
    }): VerifiableCredential;
}
//# sourceMappingURL=verifiable-credential.d.ts.map