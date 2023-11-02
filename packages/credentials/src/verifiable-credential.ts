import type { Resolvable, DIDResolutionResult} from 'did-resolver';
import {VerificationMethod} from 'did-resolver';
import type {
  ICredential,
  ICredentialSubject,
  JwtDecodedVerifiableCredential } from '@sphereon/ssi-types';

import { v4 as uuidv4 } from 'uuid';
import { getCurrentXmlSchema112Timestamp } from './utils.js';
import { Convert } from '@web5/common';
import { verifyJWT } from 'did-jwt';
import { DidIonMethod, DidKeyMethod, DidResolver } from '@web5/dids';
import { SsiValidator } from './validators.js';

import { DidDocument } from '@decentralized-identity/did-common-typescript';

export const DEFAULT_CONTEXT = 'https://www.w3.org/2018/credentials/v1';
export const DEFAULT_VC_TYPE = 'VerifiableCredential';

/**
 * A Verifiable Credential is a set of one or more claims made by the same entity.
 *
 * @see {@link https://www.w3.org/TR/vc-data-model/#credentials | VC Data Model}
 */
export type VcDataModel = ICredential;

export type SignOptions = {
  kid: string;
  issuerDid: string;
  subjectDid: string;
  signer: Signer,
}

type Signer = (data: Uint8Array) => Promise<Uint8Array>;

type CredentialSubject = ICredentialSubject;

type JwtHeaderParams = {
  alg: string;
  typ: 'JWT'
  kid: string;
};

type DecodedVcJwt = {
  header: JwtHeaderParams
  payload: JwtDecodedVerifiableCredential,
  signature: string
}

const didResolver = new DidResolver({ didResolvers: [DidIonMethod, DidKeyMethod] });

class TbdResolver implements Resolvable {
  async resolve(didUrl: string): Promise<DIDResolutionResult> {
    return await didResolver.resolve(didUrl) as DIDResolutionResult;
  }
}

const tbdResolver = new TbdResolver();

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

  get type(): string {
    return this.vcDataModel.type[this.vcDataModel.type.length - 1];
  }

  get issuer(): string {
    return this.vcDataModel.issuer.toString();
  }

  get subject(): string {
    if (Array.isArray(this.vcDataModel.credentialSubject)) {
      return this.vcDataModel.credentialSubject[0].id!;
    } else {
      return this.vcDataModel.credentialSubject.id!;
    }
  }

  /**
   * Sign a verifiable credential using [signOptions]
   *
   *
   * @param signOptions The sign options used to sign the credential.
   * @return The JWT representing the signed verifiable credential.
   *
   * Example:
   * ```
   * val signedVc = verifiableCredential.sign(signOptions)
   * ```
   */
  // TODO: Refactor to look like: sign(did: Did, assertionMethodId?: string)
  public async sign(signOptions: SignOptions): Promise<string> {
    const vcJwt: string = await createJwt({ vc: this.vcDataModel }, signOptions);
    return vcJwt;
  }

  /**
   * Converts the current object to its JSON representation.
   *
   * @return The JSON representation of the object.
   */
  public toString(): string {
    return JSON.stringify(this.vcDataModel);
  }

  /**
   * Create a [VerifiableCredential] based on the provided parameters.
   *
   * @param type The type of the credential, as a [String].
   * @param issuer The issuer URI of the credential, as a [String].
   * @param subject The subject URI of the credential, as a [String].
   * @param data The credential data, as a generic type [T].
   * @return A [VerifiableCredential] instance.
   *
   * Example:
   * ```
   * const vc = VerifiableCredential.create("ExampleCredential", "http://example.com/issuers/1", "http://example.com/subjects/1", myData)
   * ```
   */
  public static create<T>(
    type: string,
    issuer: string,
    subject: string,
    data: T,
    expirationDate?: string
  ): VerifiableCredential {
    const jsonData = JSON.parse(JSON.stringify(data));

    if (typeof jsonData !== 'object') {
      throw new Error('Expected data to be parseable into a JSON object');
    }

    if(!issuer || !subject) {
      throw new Error('Issuer and subject must be defined');
    }

    const credentialSubject: CredentialSubject = {
      id: subject,
      ...jsonData
    };

    const vcDataModel: VcDataModel = {
      '@context'        : [DEFAULT_CONTEXT],
      type              : [DEFAULT_VC_TYPE, type],
      id                : `urn:uuid:${uuidv4()}`,
      issuer            : issuer,
      issuanceDate      : getCurrentXmlSchema112Timestamp(),
      credentialSubject : credentialSubject,
      ...(expirationDate && { expirationDate }), // optional property
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
     * If any of these steps fail, the function will throw a [Error] with a message indicating the nature of the failure.
     *
     * @param vcJwt The Verifiable Credential in JWT format as a [string].
     * @throws Error if the verification fails at any step, providing a message with failure details.
     * @throws Error if critical JWT header elements are absent.
     *
     * ### Example:
     * ```
     * try {
     *     VerifiableCredential.verify(signedVcJwt)
     *     console.log("VC Verification successful!")
     * } catch (e: Error) {
     *     console.log("VC Verification failed: ${e.message}")
     * }
     * ```
     */
  public static async verify(vcJwt: string): Promise<void> {
    const jwt = decode(vcJwt); // Parse and validate JWT

    // Ensure the presence of critical header elements `alg` and `kid`
    if (!jwt.header.alg || !jwt.header.kid) {
      throw new Error('Signature verification failed: Expected JWS header to contain alg and kid');
    }

    const parsedDidUrl = DidDocument.getDidFromKeyId(jwt.header.kid);
    const fragment = jwt.header.kid.split('#')[1];

    if(!fragment || ! parsedDidUrl) {
      throw new Error('Signature verification failed: Expected kid in JWS header to be a DID URL');
    }

    const didResolutionResult: DIDResolutionResult = await tbdResolver.resolve(parsedDidUrl);
    if (didResolutionResult.didResolutionMetadata.error) {
      throw new Error(
        `Signature verification failed: Failed to resolve DID ${parsedDidUrl}. ` +
        `Error: ${didResolutionResult.didResolutionMetadata.error}`
      );
    }

    const verificationMethodIds = new Set([`${parsedDidUrl}#${fragment}`, `#${fragment}`]);

    if (!didResolutionResult.didDocument?.assertionMethod || !didResolutionResult.didDocument?.verificationMethod) {
      throw new Error(
        'Signature verification failed: Expected kid in JWS header to dereference ' +
          'a DID Document Verification Method with an Assertion verification relationship'
      );
    }

    const assertionMethods = didResolutionResult.didDocument?.assertionMethod;

    let assertionMethod: VerificationMethod | undefined;

    for (const element of assertionMethods) {
      if (typeof element === 'string') {
        if (verificationMethodIds.has(element)) {
          assertionMethod = didResolutionResult.didDocument?.verificationMethod.find(vm => vm.id === element);
          break;
        }
      } else {
        if (verificationMethodIds.has(element.id)) {
          assertionMethod = didResolutionResult.didDocument?.verificationMethod.find(vm => vm.id === element.id);
          break;
        }
      }
    }

    if (!assertionMethod) {
      throw new Error(
        'Signature verification failed: Expected kid in JWS header to dereference ' +
          'a DID Document Verification Method with an Assertion verification relationship'
      );
    }

    if (assertionMethod.type !== 'JsonWebKey2020' || !assertionMethod.publicKeyJwk) {
      throw new Error(
        'Signature verification failed: Expected kid in JWS header to dereference ' +
        'a DID Document Verification Method of type JsonWebKey2020 with a publicKeyJwk'
      );
    }

    // Perform the signature verification
    const verificationResponse = await verifyJWT(vcJwt, {
      resolver: tbdResolver
    });

    if (!verificationResponse.verified) {
      throw new Error('VC JWT could not be verified. Reason: ' + JSON.stringify(verificationResponse));
    }
  }

  /**
   * Parses a JWT into a [VerifiableCredential] instance.
   *
   * @param vcJwt The verifiable credential JWT as a [String].
   * @return A [VerifiableCredential] instance derived from the JWT.
   *
   * Example:
   * ```
   * val vc = VerifiableCredential.parseJwt(signedVcJwt)
   * ```
   */
  public static parseJwt(vcJwt: string): VerifiableCredential {
    const decodedVcJwt: DecodedVcJwt = decode(vcJwt);
    const vcDataModel: VcDataModel = decodedVcJwt.payload.vc;

    if(!vcDataModel) {
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
function validatePayload(vc: VcDataModel): void {
  SsiValidator.validateContext(vc['@context']);
  SsiValidator.validateVcType(vc.type);
  SsiValidator.validateCredentialSubject(vc.credentialSubject);
  if (vc.issuanceDate) SsiValidator.validateTimestamp(vc.issuanceDate);
  if (vc.expirationDate) SsiValidator.validateTimestamp(vc.expirationDate);
}

/**
 * Decodes a VC JWT into its constituent parts: header, payload, and signature.
 *
 * @param jwt - The JWT string to decode.
 * @returns An object containing the decoded header, payload, and signature.
 */
function decode(jwt: string): DecodedVcJwt {
  const [encodedHeader, encodedPayload, encodedSignature] = jwt.split('.');

  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw Error('Not a valid jwt');
  }

  return {
    header    : Convert.base64Url(encodedHeader).toObject() as JwtHeaderParams,
    payload   : Convert.base64Url(encodedPayload).toObject() as JwtDecodedVerifiableCredential,
    signature : encodedSignature
  };
}

async function createJwt(payload: any, signOptions: SignOptions) {
  const { issuerDid, subjectDid, signer, kid } = signOptions;

  const header: JwtHeaderParams = { alg: 'EdDSA', typ: 'JWT', kid: kid };

  const jwtPayload = {
    iss : issuerDid,
    sub : subjectDid,
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