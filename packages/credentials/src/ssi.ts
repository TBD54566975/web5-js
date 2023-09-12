import type { Resolvable, DIDResolutionResult } from 'did-resolver';
import {
  VerifiableCredentialTypeV1,
  JwtDecodedVerifiableCredential,
  CredentialSubject,
  VerifiablePresentationV1,
  PresentationResult,
  EvaluationResults,
  PresentationDefinition,
  JwtDecodedVerifiablePresentation,
  Issuer,
  CredentialSchemaType,
  CredentialStatus,
  validateDefinition,
  validateSubmission,
  Validated,
  resetPex
} from './types.js';

import { v4 as uuidv4 } from 'uuid';
import { evaluateCredentials, presentationFrom, VcJwt, VpJwt } from './types.js';
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

type JwtHeaderParams = {
  alg: string;
  typ: 'JWT'
  kid: string;
};

type Signer = (data: Uint8Array) => Promise<Uint8Array>;

const didResolver = new DidResolver({ didResolvers: [DidIonMethod, DidKeyMethod] });
class TbdResolver implements Resolvable {
  async resolve(didUrl: string): Promise<DIDResolutionResult> {
    return await didResolver.resolve(didUrl) as DIDResolutionResult;
  }
}

const tbdResolver = new TbdResolver();

export class VerifiableCredential {
  /**
   * Creates a Verifiable Credential (VC) JWT.
   *
   * @param signOptions - Options for creating the signature including the kid, issuerDid, subjectDid, and signer function.
   * @param createVcOptions - Optional. Options for creating the VC including the subject, issuer and other optional parameters.
   * @param verifiableCredential - Optional. Actual VC object to be signed.
   * @returns A promise that resolves to a VC JWT.
   */
  public static async create(signOptions: SignOptions, createVcOptions?: CreateVcOptions, verifiableCredential?: VerifiableCredentialTypeV1): Promise<VcJwt> {
    if (createVcOptions && verifiableCredential) {
      throw new Error('options and verifiableCredentials are mutually exclusive, either include the full verifiableCredential or the options to create one');
    }

    if (!createVcOptions && !verifiableCredential) {
      throw new Error('options or verifiableCredential must be provided');
    }

    let vc: VerifiableCredentialTypeV1;

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

    this.validatePayload(vc);
    const vcJwt: VcJwt = await createJwt({ payload: { vc: vc }, subject: signOptions.subjectDid, issuer: signOptions.issuerDid, kid: signOptions.kid, signer: signOptions.signer });
    return vcJwt;
  }

  /**
   * Validates the structure and integrity of a Verifiable Credential payload.
   *
   * @param vc - The Verifiable Credential object to validate.
   * @throws Error if any validation check fails.
   */
  public static validatePayload(vc: VerifiableCredentialTypeV1): void {
    SsiValidator.validateContext(vc['@context']);
    SsiValidator.validateVcType(vc.type);
    SsiValidator.validateCredentialSubject(vc.credentialSubject);
    if (vc.issuanceDate) SsiValidator.validateTimestamp(vc.issuanceDate);
    if (vc.expirationDate) SsiValidator.validateTimestamp(vc.expirationDate);
  }

  /**
   * Verifies the integrity of a VC JWT.
   *
   * @param vcJwt - The VC JWT to verify.
   * @returns A boolean or errors indicating whether the JWT is valid.
   */
  public static async verify(vcJwt: VcJwt): Promise<void> {
    const verificationResponse = await verifyJWT(vcJwt, {
      resolver: tbdResolver
    });

    if (!verificationResponse.verified) {
      throw new Error('VC JWT could not be verified. Reason: ' + JSON.stringify(verificationResponse));
    }

    const vcDecoded = VerifiableCredential.decode(vcJwt).payload.vc;
    this.validatePayload(vcDecoded);
  }

  /**
   * Decodes a VC JWT into its constituent parts: header, payload, and signature.
   *
   * @param jwt - The JWT string to decode.
   * @returns An object containing the decoded header, payload, and signature.
   */
  public static decode(jwt: string): DecodedVcJwt {
    const [encodedHeader, encodedPayload, encodedSignature] = jwt.split('.');

    return {
      header    : Convert.base64Url(encodedHeader).toObject() as JwtHeaderParams,
      payload   : Convert.base64Url(encodedPayload).toObject() as JwtDecodedVerifiableCredential,
      signature : encodedSignature
    };
  }
}

export class VerifiablePresentation {
  /**
   * Creates a Verifiable Presentation (VP) JWT from a presentation definition and set of credentials.
   * @param signOptions - Options for creating the VP including subjectDid, issuerDid, kid, and the sign function.
   * @param createVpOptions - Options for creating the VP including presentationDefinition, verifiableCredentialJwts.
   * @returns A promise that resolves to a VP JWT.
   */
  public static async create(signOptions: SignOptions, createVpOptions: CreateVpOptions,): Promise<VpJwt> {
    resetPex();

    const pdValidated: Validated = validateDefinition(createVpOptions.presentationDefinition);
    isValid(pdValidated);

    const evaluationResults: EvaluationResults = evaluateCredentials(createVpOptions.presentationDefinition, createVpOptions.verifiableCredentialJwts);

    if (evaluationResults.warnings?.length) {
      console.warn('Warnings were generated during the evaluation process: ' + JSON.stringify(evaluationResults.warnings));
    }

    if (evaluationResults.areRequiredCredentialsPresent.toString() !== 'info' || evaluationResults.errors?.length) {
      let errorMessage = 'Failed to create Verifiable Presentation JWT due to: ';
      if(evaluationResults.areRequiredCredentialsPresent) {
        errorMessage += 'Required Credentials Not Present: ' + JSON.stringify(evaluationResults.areRequiredCredentialsPresent);
      }

      if (evaluationResults.errors?.length) {
        errorMessage += 'Errors: ' + JSON.stringify(evaluationResults.errors);
      }

      throw new Error(errorMessage);
    }

    const presentationResult: PresentationResult = presentationFrom(createVpOptions.presentationDefinition, createVpOptions.verifiableCredentialJwts);

    const submissionValidated: Validated = validateSubmission(presentationResult.presentationSubmission);
    isValid(submissionValidated);

    const verifiablePresentation: VerifiablePresentationV1 = presentationResult.presentation;
    const vpJwt: VpJwt = await createJwt({ payload: { vp: verifiablePresentation }, subject: signOptions.subjectDid, issuer: signOptions.issuerDid, kid: signOptions.kid, signer: signOptions.signer });

    return vpJwt;
  }

  /**
   * Validates the structure and integrity of a Verifiable Presentation payload.
   *
   * @param vp - The Verifiable Presentation object to validate.
   * @throws Error if any validation check fails.
   */
  public static validatePayload(vp: VerifiablePresentationV1): void {
    SsiValidator.validateContext(vp['@context']);
    if (vp.type) SsiValidator.validateVpType(vp.type);
    // empty credential array is allowed
    if (vp.verifiableCredential && vp.verifiableCredential.length >= 1) {
      for (const vc of vp.verifiableCredential) {
        if (typeof vc === 'string') {
          VerifiableCredential.verify(vc);
        } else {
          SsiValidator.validateCredentialPayload(vc);
        }
      }
    }
    if (vp.expirationDate) SsiValidator.validateTimestamp(vp.expirationDate);
  }

  /**
   * Verifies the integrity of a VP JWT.
   *
   * @param vpJwt - The VP JWT to verify.
   * @returns A boolean or errors indicating whether the JWT is valid.
   */
  public static async verify(vpJwt: VpJwt): Promise<void> {
    const verificationResponse = await verifyJWT(vpJwt, {
      resolver: tbdResolver
    });

    if (!verificationResponse.verified) {
      throw new Error('VP JWT could not be verified. Reason: ' + JSON.stringify(verificationResponse));
    }

    const vpDecoded: VerifiablePresentationV1 = VerifiablePresentation.decode(vpJwt).payload.vp;
    VerifiablePresentation.validatePayload(vpDecoded);
  }

  /**
   * Decodes a VP JWT into its constituent parts: header, payload, and signature.
   *
   * @param jwt - The JWT string to decode.
   * @returns An object containing the decoded header, payload, and signature.
   */
  public static decode(jwt: string): DecodedVpJwt {
    const [encodedHeader, encodedPayload, encodedSignature] = jwt.split('.');

    return {
      header    : Convert.base64Url(encodedHeader).toObject() as JwtHeaderParams,
      payload   : Convert.base64Url(encodedPayload).toObject() as JwtDecodedVerifiablePresentation,
      signature : encodedSignature
    };
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

function isValid(validated: Validated) {
  let errorMessage = 'Failed to pass validation check due to: ';
  if (Array.isArray(validated)) {
    if (!validated.every(item => item.status === 'info')) {
      errorMessage += 'Validation Errors: ' + JSON.stringify(validated);
      throw new Error(errorMessage);
    }
  } else {
    if (validated.status !== 'info') {
      errorMessage += 'Validation Errors: ' + JSON.stringify(validated);
      throw new Error(errorMessage);
    }
  }
}