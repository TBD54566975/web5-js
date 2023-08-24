import { v4 as uuidv4 } from 'uuid';
import type { JwsHeaderParams } from '@web5/crypto';
import { VerifiableCredential, evaluateCredentials, evaluatePresentation, presentationFrom, VcJwt, VpJwt, JwtDecodedVerifiablePresentation, CredentialSubject, VerifiablePresentation, PresentationResult, EvaluationResults, PresentationDefinition, JwtDecodedVerifiableCredential, Issuer, CredentialSchemaType, CredentialStatus } from './types.js';
import { getCurrentXmlSchema112Timestamp, isValidXmlSchema112Timestamp } from './utils.js';
import { Convert } from '@web5/common';

export interface DecodedVcJwt {
    header: JwsHeaderParams & { alg: string },
    payload: JwtDecodedVerifiableCredential,
    signature: string
}

export interface DecodedVpJwt {
    header: JwsHeaderParams & { alg: string },
    payload: JwtDecodedVerifiablePresentation,
    signature: string
}

export interface CreateVcOptions {
    credentialSubject: CredentialSubject,
    issuer: Issuer,
    credentialSchema?: CredentialSchemaType,
    expirationDate?: string,
    credentialStatus?: CredentialStatus,
    signer: any,
}

export class VC {
  /**
   * Creates a Verifiable Credential (VC) JWT.
   *
   * @param options - Options for creating the VC including the subject, issuer, signer, and other optional parameters.
   * @returns A promise that resolves to a VC JWT.
   */
  public static async createVerifiableCredentialJwt(options: CreateVcOptions): Promise<VcJwt> {
    if (options && options.expirationDate && !isValidXmlSchema112Timestamp(options.expirationDate)) {
      throw new Error('Invalid expirationDate');
    }

    const vc: VerifiableCredential = {
      id                : uuidv4(),
      '@context'        : ['https://www.w3.org/2018/credentials/v1'],
      credentialSubject : options.credentialSubject,
      type              : ['VerifiableCredential'],
      issuer            : options.issuer,
      issuanceDate      : getCurrentXmlSchema112Timestamp(),
      credentialSchema  : options?.credentialSchema,
      expirationDate    : options?.expirationDate,
      credentialStatus  : options?.credentialStatus,
    };

    const vcJwt: VcJwt = await createJwt({ payload: { vc: vc }, subject: options.credentialSubject.id!, issuer: options.issuer.id, signer: options.signer });

    return vcJwt;
  }

  /**
   * Decodes a VC JWT into its constituent parts: header, payload, and signature.
   *
   * @param jwt - The JWT string to decode.
   * @returns An object containing the decoded header, payload, and signature.
   */
  public static decodeJwt(jwt: string): DecodedVcJwt {
    const [encodedHeader, encodedPayload, encodedSignature] = jwt.split('.');

    return {
      header    : Convert.base64Url(encodedHeader).toObject() as JwsHeaderParams & { alg: string },
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
  public static verify(vcJwt: VcJwt): boolean {
    return verifyJwtIntegrity(vcJwt);
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

export interface CreateVpOptions {
    presentationDefinition: PresentationDefinition,
    verifiableCredentialJwts: string[]
    signer: any,
}

export class VP {
  /**
   * Creates a Verifiable Presentation (VP) JWT from a presentation definition and set of credentials.
   *
   * @param options - Options for creating the VP including presentationDefinition, verifiableCredentialJwts, and signer
   * @returns A promise that resolves to a VP JWT.
   */
  public static async createVerifiablePresentationJwt(options: CreateVpOptions): Promise<VpJwt> {
    const evaluationResults = VC.evaluateCredentials(options.presentationDefinition, options.verifiableCredentialJwts);
    // Check for errors or warnings in the evaluation results
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

    const presentationResult: PresentationResult = presentationFrom(options.presentationDefinition, options.verifiableCredentialJwts);
    const verifiablePresentation: VerifiablePresentation = presentationResult.presentation;
    const vpJwt: VpJwt = await createJwt({ payload: { vp: verifiablePresentation }, subject: options.signer.subject, issuer: options.signer.issuer, signer: options.signer });

    return vpJwt;
  }

  /**
   * Decodes a VP JWT into its constituent parts: header, payload, and signature.
   *
   * @param jwt - The JWT string to decode.
   * @returns An object containing the decoded header, payload, and signature.
   */
  public static decodeJwt(jwt: string): DecodedVpJwt {
    const [encodedHeader, encodedPayload, encodedSignature] = jwt.split('.');

    return {
      header    : Convert.base64Url(encodedHeader).toObject() as JwsHeaderParams & { alg: string },
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
  public static verify(vpJwt: VpJwt) {
    return verifyJwtIntegrity(vpJwt);
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
  public static evaluatePresentation = (presentationDefinition: PresentationDefinition, presentation: VerifiablePresentation): EvaluationResults => {
    return evaluatePresentation(presentationDefinition, presentation);
  };
}

type CreateJwtOpts = {
    payload: any,
    subject: string
    issuer: string
    signer: any
}

async function createJwt(opts: CreateJwtOpts): Promise<string> {
  const header = { alg: 'EdDSA', kid: opts.signer.kid };

  const jwtPayload = {
    iss : opts.issuer,
    sub : opts.subject,
    ...opts.payload,
  };

  const headerBytes = Convert.object(header).toUint8Array();
  const encodedHeader = Convert.uint8Array(headerBytes).toBase64Url();

  const payloadBytes = Convert.object(jwtPayload).toUint8Array();
  const encodedPayload = Convert.uint8Array(payloadBytes).toBase64Url();

  const message = encodedHeader + '.' + encodedPayload;

  const signature = await opts.signer.sign(message);

  const encodedSignature = Convert.uint8Array(signature).toBase64Url();
  const jwt = message + '.' + encodedSignature;

  return jwt;
}

function verifyJwtIntegrity(jwt: VcJwt | VpJwt): boolean {
  if (!jwt || jwt == '') {
    throw new Error('VC JWT cannot be empty');
  }

  const decodedJwt = VC.decodeJwt(jwt);
  if (!decodedJwt || !decodedJwt.header || !decodedJwt.payload || !decodedJwt.signature) {
    throw new Error('VC JWT cannot be decoded');
  }

  const issuerKid = decodedJwt.header.kid;
  if (!issuerKid || issuerKid == '') {
    throw new Error('Missing kid in header of credential');
  }

  const issuer = decodedJwt.payload.iss;
  if (!issuer || issuer == '') {
    throw new Error('Missing issuer in payload of credential');
  }

  return true;
}
