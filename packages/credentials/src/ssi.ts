import type { JwsHeaderParams } from '@web5/crypto';
import type { Resolvable, DIDResolutionResult } from 'did-resolver';
import type {
  VerifiableCredential,
  JwtDecodedVerifiableCredential,
  CredentialSubject,
  VerifiablePresentation,
  PresentationResult,
  EvaluationResults,
  PresentationDefinition,
  JwtDecodedVerifiablePresentation,
  Issuer,
  CredentialSchemaType,
  CredentialStatus
} from './types.js';

import { v4 as uuidv4 } from 'uuid';
import { evaluateCredentials, evaluatePresentation, presentationFrom, VcJwt, VpJwt } from './types.js';
import { getCurrentXmlSchema112Timestamp } from './utils.js';
import { Convert } from '@web5/common';
import { verifyJWT } from 'did-jwt';
import { DidIonMethod, DidKeyMethod, DidResolver } from '@web5/dids';
import { SsiValidator } from './validators.js';

export type CreateVcOptions = {
  credentialSubject: CredentialSubject,
  issuer: Issuer,
  credentialSchema?: CredentialSchemaType,
  expirationDate?: string,
  credentialStatus?: CredentialStatus,
}

export type CreateVpOptions = {
  presentationDefinition: PresentationDefinition,
  verifiableCredentialJwts: string[]
}

export type SignOptions = {
  kid: string;
  issuerDid: string;
  subjectDid: string;
  signer: Signer,
}

export type DecodedVcJwt = {
  header: JwtHeaderParams
  payload: JwtDecodedVerifiableCredential,
  signature: string
}

export type DecodedVpJwt = {
  header: JwtHeaderParams
  payload: JwtDecodedVerifiablePresentation,
  signature: string
}

type CreateJwtOpts = {
  payload: any;
  subject: string;
  issuer: string;
  kid: string;
  signer: Signer;
}

type JwtHeaderParams = JwsHeaderParams & {
  alg: string;
  typ: 'JWT'
};

type Signer = (data: Uint8Array) => Promise<Uint8Array>;

class TbdResolver implements Resolvable {
  async resolve(didUrl: string): Promise<DIDResolutionResult> {
    return await didResolver.resolve(didUrl) as DIDResolutionResult;
  }
}

const didResolver = new DidResolver({ didResolvers: [DidIonMethod, DidKeyMethod] });

export class VC {
  /**
   * Creates a Verifiable Credential (VC) JWT.
   *
   * @param createVcOptions - Options for creating the VC including the subject, issuer, signer, and other optional parameters.
   * @returns A promise that resolves to a VC JWT.
   */
  public static async createVerifiableCredentialJwt(createVcSignOptions: SignOptions, createVcOptions?: CreateVcOptions, verifiableCredential?: VerifiableCredential): Promise<VcJwt> {
    if (createVcOptions && verifiableCredential) {
      throw new Error('options and verifiableCredential are mutually exclusive, either include the full verifiableCredential or the options to create one');
    }

    if (!createVcOptions && !verifiableCredential) {
      throw new Error('options or verifiableCredential must be provided');
    }

    let vc: VerifiableCredential;

    if (verifiableCredential) {
      vc = verifiableCredential;
    } else {
      vc = {
        id                : uuidv4(),
        '@context'        : ['https://www.w3.org/2018/credentials/v1'],
        credentialSubject : createVcOptions!.credentialSubject,
        type              : ['VerifiableCredential'],
        issuer            : createVcOptions!.issuer,
        issuanceDate      : getCurrentXmlSchema112Timestamp(),
        credentialSchema  : createVcOptions?.credentialSchema,
        expirationDate    : createVcOptions?.expirationDate,
      };
    }

    this.validateVerifiableCredentialPayload(vc);
    const vcJwt: VcJwt = await createJwt({ payload: { vc: vc }, subject: createVcSignOptions.subjectDid, issuer: createVcSignOptions.issuerDid, kid: createVcSignOptions.kid, signer: createVcSignOptions.signer });
    return vcJwt;
  }

  /**
   * Decodes a VC JWT into its constituent parts: header, payload, and signature.
   *
   * @param jwt - The JWT string to decode.
   * @returns An object containing the decoded header, payload, and signature.
   */
  public static decodeVerifiableCredentialJwt(jwt: string): DecodedVcJwt {
    const [encodedHeader, encodedPayload, encodedSignature] = jwt.split('.');

    return {
      header    : Convert.base64Url(encodedHeader).toObject() as JwtHeaderParams,
      payload   : Convert.base64Url(encodedPayload).toObject() as JwtDecodedVerifiableCredential,
      signature : encodedSignature
    };
  }

  /**
   * Verifies the integrity of a VC JWT.
   *
   * @param vcJwt - The VC JWT to verify.
   * @returns A boolean or errors indicating whether the JWT is valid.
   */
  public static async verifyVerifiableCredentialJwt(vcJwt: VcJwt): Promise<void> {
    let resolver = new TbdResolver();

    let verificationResponse = await verifyJWT(vcJwt, {
      resolver
    });

    if (!verificationResponse.verified) {
      throw new Error('VC JWT could not be verified. Reason: ' + JSON.stringify(verificationResponse));
    }

    const vcDecoded = VC.decodeVerifiableCredentialJwt(vcJwt).payload.vc;
    this.validateVerifiableCredentialPayload(vcDecoded);
  }

  /**
 * Validates the structure and integrity of a Verifiable Credential payload.
 *
 * @param vc - The Verifiable Credential object to validate.
 * @throws Error if any validation check fails.
 */
  public static validateVerifiableCredentialPayload(vc: VerifiableCredential): void {
    SsiValidator.validateContext(vc['@context']);
    SsiValidator.validateVcType(vc.type);
    SsiValidator.validateCredentialSubject(vc.credentialSubject);
    if (vc.issuanceDate) SsiValidator.validateTimestamp(vc.issuanceDate);
    if (vc.expirationDate) SsiValidator.validateTimestamp(vc.expirationDate);
  }

  /**
   * Evaluates a set of verifiable credentials against a specified presentation definition.
   *
   * This method checks if the provided credentials meet the criteria defined in the presentation definition.
   *
   * @param presentationDefinition - The definition that specifies the criteria for the credentials.
   * @param verifiableCredentialJwts - An array of JWT strings representing the verifiable credentials to be evaluated.
   * @returns {EvaluationResults} The result of the evaluation process, indicating whether each credential meets the criteria.
   */
  public static evaluateCredentials(presentationDefinition: PresentationDefinition, verifiableCredentialJwts: string[]): EvaluationResults {
    return evaluateCredentials(presentationDefinition, verifiableCredentialJwts);
  }
}

export class VP {
  /**
   * Creates a Verifiable Presentation (VP) JWT from a presentation definition and set of credentials.
   *
   * @param options - Options for creating the VP including presentationDefinition, verifiableCredentialJwts, and signer
   * @returns A promise that resolves to a VP JWT.
   */
  public static async createVerifiablePresentationJwt(createVpOptions: CreateVpOptions, createVpSignOptions: SignOptions): Promise<VpJwt> {
    const evaluationResults = VC.evaluateCredentials(createVpOptions.presentationDefinition, createVpOptions.verifiableCredentialJwts);

    if (evaluationResults.errors?.length || evaluationResults.warnings?.length) {
      let errorMessage = 'Failed to create Verifiable Presentation JWT due to: ';

      if (evaluationResults.errors?.length) {
        errorMessage += 'Errors: ' + JSON.stringify(evaluationResults.errors);
      }

      if (evaluationResults.warnings?.length) {
        errorMessage += 'Warnings: ' + JSON.stringify(evaluationResults.warnings) + '. ';
      }

      throw new Error(errorMessage);
    }

    const presentationResult: PresentationResult = presentationFrom(createVpOptions.presentationDefinition, createVpOptions.verifiableCredentialJwts);
    const verifiablePresentation: VerifiablePresentation = presentationResult.presentation;
    const vpJwt: VpJwt = await createJwt({ payload: { vp: verifiablePresentation }, subject: createVpSignOptions.subjectDid, issuer: createVpSignOptions.issuerDid, kid: createVpSignOptions.kid, signer: createVpSignOptions.signer });

    return vpJwt;
  }

  /**
   * Decodes a VP JWT into its constituent parts: header, payload, and signature.
   *
   * @param jwt - The JWT string to decode.
   * @returns An object containing the decoded header, payload, and signature.
   */
  public static decodeVerifiablePresentationJwt(jwt: string): DecodedVpJwt {
    const [encodedHeader, encodedPayload, encodedSignature] = jwt.split('.');

    return {
      header    : Convert.base64Url(encodedHeader).toObject() as JwtHeaderParams,
      payload   : Convert.base64Url(encodedPayload).toObject() as JwtDecodedVerifiablePresentation,
      signature : encodedSignature
    };
  }

  /**
   * Verifies the integrity of a VP JWT.
   *
   * @param vpJwt - The VP JWT to verify.
   * @returns A boolean or errors indicating whether the JWT is valid.
   */
  public static async verifyVerifiablePresentationJwt(vpJwt: VpJwt): Promise<void> {
    let resolver = new TbdResolver();

    let verificationResponse = await verifyJWT(vpJwt, {
      resolver
    });

    if (!verificationResponse.verified) {
      throw new Error('VP JWT could not be verified. Reason: ' + JSON.stringify(verificationResponse));
    }

    const vpDecoded: VerifiablePresentation = VP.decodeVerifiablePresentationJwt(vpJwt).payload.vp;
    VP.validateVerifiablePresentationPayload(vpDecoded);
  }

  /**
 * Validates the structure and integrity of a Verifiable Presentation payload.
 *
 * @param vp - The Verifiable Presentation object to validate.
 * @throws Error if any validation check fails.
 */
  public static validateVerifiablePresentationPayload(vp: VerifiablePresentation): void {
    SsiValidator.validateContext(vp['@context']);
    if (vp.type) SsiValidator.validateVpType(vp.type);
    // empty credential array is allowed
    if (vp.verifiableCredential && vp.verifiableCredential.length >= 1) {
      for (const vc of vp.verifiableCredential) {
        if (typeof vc === 'string') {
          VC.verifyVerifiableCredentialJwt(vc);
        } else {
          SsiValidator.validateCredentialPayload(vc);
        }
      }
    }
    if (vp.expirationDate) SsiValidator.validateTimestamp(vp.expirationDate);
  }

  /**
   * Evaluates a given Verifiable Presentation against a specified presentation definition.
   *
   * This method checks if the presentation meets the criteria defined in the presentation definition.
   *
   * @param presentationDefinition - The definition that specifies the criteria for the presentation.
   * @param presentation - The Verifiable Presentation to evaluate.
   * @returns {EvaluationResults} The result of the evaluation process, indicating whether the presentation meets the criteria.
   */
  public static evaluatePresentation(presentationDefinition: PresentationDefinition, presentation: VerifiablePresentation): EvaluationResults {
    return evaluatePresentation(presentationDefinition, presentation);
  }
}

async function createJwt(options: CreateJwtOpts) {
  const header: JwtHeaderParams = { alg: 'EdDSA', typ: 'JWT', kid: options.kid };
  const { issuer, subject, payload, signer } = options;

  const jwtPayload = {
    iss : issuer,
    sub : subject,
    ...payload,
  };

  const encodedHeader = Convert.object(header).toBase64Url();
  const encodedPayload = Convert.object(jwtPayload).toBase64Url();
  const message = encodedHeader + '.' + encodedPayload;
  const messageBytes = Convert.string(message).toUint8Array();

  const signature = await signer(messageBytes);

  const encodedSignature = Convert.uint8Array(signature).toBase64Url();
  const jwt = message + '.' + encodedSignature;

  return jwt;
}