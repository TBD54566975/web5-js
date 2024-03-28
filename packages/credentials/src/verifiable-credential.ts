import type { BearerDid } from '@web5/dids';
import type { ICredential, ICredentialSubject} from '@sphereon/ssi-types';

import { utils as cryptoUtils } from '@web5/crypto';

import { Jwt } from './jwt.js';
import { SsiValidator } from './validators.js';
import { getCurrentXmlSchema112Timestamp, getXmlSchema112Timestamp } from './utils.js';

/** The default Verifiable Credential context. */
export const DEFAULT_VC_CONTEXT = 'https://www.w3.org/2018/credentials/v1';
/** The default Verifiable Credential type. */
export const DEFAULT_VC_TYPE = 'VerifiableCredential';

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
 * @param evidence Optional. Evidence can be included by an issuer to provide the verifier with additional supporting information in a verifiable credential.
 */
export type VerifiableCredentialCreateOptions = {
  /** The type of the credential, can be a string or an array of strings. */
  type?: string | string[];
  /** The issuer URI of the credential, as a string. */
  issuer: string;
  /** The subject URI of the credential, as a string. */
  subject: string;
  /** The credential data, as a generic type any. */
  data: any;
  /** The issuance date of the credential, as a string. */
  issuanceDate?: string;
  /** The expiration date of the credential, as a string. */
  expirationDate?: string;
  /** The evidence of the credential, as an array of any. */
  evidence?: any[];
};

/**
 * Options for signing a verifiable credential.
 * @param did - The issuer DID of the credential, represented as a PortableDid.
 */
export type VerifiableCredentialSignOptions = {
  /** The issuer DID of the credential, represented as a PortableDid. */
  did: BearerDid;
};

/** The credential subject of a verifiable credential. */
type CredentialSubject = ICredentialSubject;

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
  constructor(public vcDataModel: VcDataModel) {}

  /** The type of the credential. */
  get type(): string {
    return this.vcDataModel.type[this.vcDataModel.type.length - 1];
  }

  /** The issuer of the credential. */
  get issuer(): string {
    return this.vcDataModel.issuer.toString();
  }

  /** The subject of the credential. */
  get subject(): string {
    if (Array.isArray(this.vcDataModel.credentialSubject)) {
      return this.vcDataModel.credentialSubject[0].id!;
    } else {
      return this.vcDataModel.credentialSubject.id!;
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
  public async sign(options: VerifiableCredentialSignOptions): Promise<string> {
    const vcJwt: string = await Jwt.sign({
      signerDid : options.did,
      payload   : {
        vc  : this.vcDataModel,
        nbf : Math.floor(new Date(this.vcDataModel.issuanceDate).getTime() / 1000),
        jti : this.vcDataModel.id,
        iss : options.did.uri,
        sub : this.subject,
        iat : Math.floor(Date.now() / 1000),
        ...(this.vcDataModel.expirationDate && {
          exp: Math.floor(new Date(this.vcDataModel.expirationDate).getTime() / 1000),
        }),
      }
    });

    return vcJwt;
  }

  /**
   * Converts the current object to its JSON representation.
   *
   * @returns The JSON representation of the object.
   */
  public toString(): string {
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
  public static async create(options: VerifiableCredentialCreateOptions): Promise<VerifiableCredential> {
    const { type, issuer, subject, data, issuanceDate, expirationDate, evidence } = options;

    const jsonData = JSON.parse(JSON.stringify(data));

    if (typeof jsonData !== 'object') {
      throw new Error('Expected data to be parseable into a JSON object');
    }

    if(!issuer || !subject) {
      throw new Error('Issuer and subject must be defined');
    }

    if(typeof issuer !== 'string' || typeof subject !== 'string') {
      throw new Error('Issuer and subject must be of type string');
    }

    const credentialSubject: CredentialSubject = {
      id: subject,
      ...jsonData
    };

    const vcDataModel: VcDataModel = {
      '@context' : [DEFAULT_VC_CONTEXT],
      type       : Array.isArray(type)
        ? [DEFAULT_VC_TYPE, ...type]
        : (type ? [DEFAULT_VC_TYPE, type] : [DEFAULT_VC_TYPE]),
      id                : `urn:uuid:${cryptoUtils.randomUuid()}`,
      issuer            : issuer,
      issuanceDate      : issuanceDate || getCurrentXmlSchema112Timestamp(),
      credentialSubject : credentialSubject,
      // Include optional properties only if they have values
      ...(expirationDate && { expirationDate }),
      ...(evidence && { evidence }),
    };

    validatePayload(vcDataModel);

    return new VerifiableCredential(vcDataModel);
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
   * If any of these steps fail, the function will throw a [Error] with a message indicating the nature of the failure:
   * - exp MUST represent the expirationDate property, encoded as a UNIX timestamp (NumericDate).
   * - iss MUST represent the issuer property of a verifiable credential or the holder property of a verifiable presentation.
   * - nbf MUST represent issuanceDate, encoded as a UNIX timestamp (NumericDate).
   * - jti MUST represent the id property of the verifiable credential or verifiable presentation.
   * - sub MUST represent the id property contained in the credentialSubject.
   *
   * Once the verifications are successful, when recreating the VC data model object, this function will:
   * - If exp is present, the UNIX timestamp MUST be converted to an [XMLSCHEMA11-2] date-time, and MUST be used to set the value of the expirationDate property of credentialSubject of the new JSON object.
   * - If iss is present, the value MUST be used to set the issuer property of the new credential JSON object or the holder property of the new presentation JSON object.
   * - If nbf is present, the UNIX timestamp MUST be converted to an [XMLSCHEMA11-2] date-time, and MUST be used to set the value of the issuanceDate property of the new JSON object.
   * - If sub is present, the value MUST be used to set the value of the id property of credentialSubject of the new credential JSON object.
   * - If jti is present, the value MUST be used to set the value of the id property of the new JSON object.
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
   * @param param - The parameters for the verification process.
   * @param param.vcJwt The Verifiable Credential in JWT format as a [string].
   * @throws Error if the verification fails at any step, providing a message with failure details.
   * @throws Error if critical JWT header elements are absent.
   */
  public static async verify({ vcJwt }: {
    vcJwt: string
  }) {
    const { payload } = await Jwt.verify({ jwt: vcJwt });
    const { exp, iss, nbf, jti, sub, vc } = payload;

    if (!vc) {
      throw new Error('vc property missing.');
    }

    const vcTyped: VcDataModel = payload['vc'] as VcDataModel;

    // exp MUST represent the expirationDate property, encoded as a UNIX timestamp (NumericDate).
    if(exp && vcTyped.expirationDate && exp !==  Math.floor(new Date(vcTyped.expirationDate).getTime() / 1000)) {
      throw new Error('Verification failed: exp claim does not match expirationDate');
    }

    // If exp is present, the UNIX timestamp MUST be converted to an [XMLSCHEMA11-2] date-time, and MUST be used to set the value of the expirationDate property of credentialSubject of the new JSON object.
    if(exp) {
      vcTyped.expirationDate = getXmlSchema112Timestamp(exp);
    }

    if (!iss) throw new Error('Verification failed: iss claim is required');

    // iss MUST represent the issuer property of a verifiable credential or the holder property of a verifiable presentation.
    if (iss !== vcTyped.issuer) {
      throw new Error('Verification failed: iss claim does not match expected issuer');
    }

    // nbf cannot represent time in the future
    if(nbf && nbf > Math.floor(Date.now() / 1000)) {
      throw new Error('Verification failed: nbf claim is in the future');
    }

    // nbf MUST represent issuanceDate, encoded as a UNIX timestamp (NumericDate).
    if(nbf && vcTyped.issuanceDate && nbf !== Math.floor(new Date(vcTyped.issuanceDate).getTime() / 1000)) {
      throw new Error('Verification failed: nbf claim does not match issuanceDate');
    }

    // If nbf is present, the UNIX timestamp MUST be converted to an [XMLSCHEMA11-2] date-time, and MUST be used to set the value of the issuanceDate property of the new JSON object.
    if(nbf) {
      vcTyped.issuanceDate = getXmlSchema112Timestamp(nbf);
    }

    // sub MUST represent the id property contained in the credentialSubject.
    if(sub && !Array.isArray(vcTyped.credentialSubject) && sub !== vcTyped.credentialSubject.id) {
      throw new Error('Verification failed: sub claim does not match credentialSubject.id');
    }

    // If sub is present, the value MUST be used to set the value of the id property of credentialSubject of the new credential JSON object.
    if(sub && !Array.isArray(vcTyped.credentialSubject)) {
      vcTyped.credentialSubject.id = sub;
    }

    // jti MUST represent the id property of the verifiable credential or verifiable presentation.
    if(jti && jti !== vcTyped.id) {
      throw new Error('Verification failed: jti claim does not match id');
    }

    if(jti) {
      vcTyped.id = jti;
    }

    validatePayload(vcTyped);

    return {
      /** The issuer of the VC. */
      issuer  : payload.iss!,
      /** The subject of the VC. */
      subject : payload.sub!,
      /** The VC data model object. */
      vc      : vcTyped
    };
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
  public static parseJwt({ vcJwt }: { vcJwt: string }): VerifiableCredential {
    const parsedJwt = Jwt.parse({ jwt: vcJwt });
    const vcDataModel: VcDataModel = parsedJwt.decoded.payload['vc'] as VcDataModel;

    if(!vcDataModel) {
      throw Error('Jwt payload missing vc property');
    }

    validatePayload(vcDataModel);

    return new VerifiableCredential(vcDataModel);
  }
}

/**
 * Validates the structure and integrity of a Verifiable Credential payload.
 *
 * @param vc - The Verifiable Credential object to validate.
 * @throws Error if any validation check fails.
 */
function validatePayload(vc: VcDataModel): void {
  SsiValidator.validateContext(vc['@context']);
  SsiValidator.validateVcType(vc.type);
  SsiValidator.validateCredentialSubject(vc.credentialSubject);
  if (vc.issuanceDate) SsiValidator.validateTimestamp(vc.issuanceDate);
  if (vc.expirationDate) SsiValidator.validateTimestamp(vc.expirationDate);
}