import type { BearerDid } from '@web5/dids';
import type { IPresentation} from '@sphereon/ssi-types';

import { utils as cryptoUtils } from '@web5/crypto';

import { Jwt } from './jwt.js';
import { SsiValidator } from './validators.js';

import { VerifiableCredential, DEFAULT_VC_CONTEXT } from './verifiable-credential.js';

/** The default type for a Verifiable Presentation. */
export const DEFAULT_VP_TYPE = 'VerifiablePresentation';

/**
 * A Verifiable Presentation
 *
 * @see {@link https://www.w3.org/TR/vc-data-model/#credentials | VC Data Model}
 */
export type VpDataModel = IPresentation;

/**
 * Options for creating a verifiable presentation.
 * @param holder The holder URI of the presentation, as a string.
 * @param vcJwts The JWTs of the credentials to be included in the presentation.
 * @param type Optional. The type of the presentation, can be a string or an array of strings.
 * @param additionalData Optional additional data to be included in the presentation.
 */
export type VerifiablePresentationCreateOptions = {
  /** The holder URI of the presentation, as a string. */
  holder: string,
  /** The JWTs of the credentials to be included in the presentation. */
  vcJwts: string[],
  /** The type of the presentation, can be a string or an array of strings. */
  type?: string | string[];
  /** Optional additional data to be included in the presentation. */
  additionalData?: Record<string, any>
};

/**
 * Options for signing a verifiable presentation.
 * @param did - The holder DID of the presentation, represented as a PortableDid.
 */
export type VerifiablePresentationSignOptions = {
  /** The holder DID of the presentation, represented as a PortableDid. */
  did: BearerDid;
};

/**
 * `VerifiablePresentation` is a tamper-evident presentation encoded in such a way that authorship of the data
 * can be trusted after a process of cryptographic verification.
 * [W3C Verifiable Presentation Data Model](https://www.w3.org/TR/vc-data-model/#presentations).
 *
 * It provides functionalities to sign, verify, and create presentations, offering a concise API to
 * work with JWT representations of verifiable presentations and ensuring that the signatures
 * and claims within those JWTs can be validated.
 *
 * @property vpDataModel The [vpDataModel] instance representing the core data model of a verifiable presentation.
 */
export class VerifiablePresentation {
  constructor(public vpDataModel: VpDataModel) {}

  /** The type of the Verifiable Presentation. */
  get type(): string {
    return this.vpDataModel.type![this.vpDataModel.type!.length - 1];
  }

  /** The holder of the Verifiable Presentation. */
  get holder(): string {
    return this.vpDataModel.holder!.toString();
  }

  /** The verifiable credentials contained in the Verifiable Presentation. */
  get verifiableCredential(): string[] {
    return this.vpDataModel.verifiableCredential! as string[];
  }

  /**
   * Signs the verifiable presentation and returns it as a signed JWT.
   *
   * @example
   * ```ts
   * const vpJwt = verifiablePresentation.sign({ did: myDid });
   * ```
   *
   * @param options - The sign options used to sign the presentation.
   * @returns The JWT representing the signed verifiable presentation.
   */
  public async sign(options: VerifiablePresentationSignOptions): Promise<string> {
    const vpJwt: string = await Jwt.sign({
      signerDid : options.did,
      payload   : {
        vp  : this.vpDataModel,
        iss : options.did.uri,
        sub : options.did.uri,
        jti : this.vpDataModel.id,
        iat : Math.floor(Date.now() / 1000)
      }
    });

    return vpJwt;
  }

  /**
   * Converts the current object to its JSON representation.
   *
   * @returns The JSON representation of the object.
   */
  public toString(): string {
    return JSON.stringify(this.vpDataModel);
  }

  /**
   * Create a [VerifiablePresentation] based on the provided parameters.
   *
   * @example
   * ```ts
   * const vp = await VerifiablePresentation.create({
   *     type: 'PresentationSubmission',
   *     holder: 'did:ex:holder',
   *     vcJwts: vcJwts,
   *     additionalData: { 'arbitrary': 'data' }
   *   })
   * ```
   *
   * @param options - The options to use when creating the Verifiable Presentation.
   * @returns A [VerifiablePresentation] instance.
   */
  public static async create(options: VerifiablePresentationCreateOptions): Promise<VerifiablePresentation> {
    const { type, holder, vcJwts, additionalData } = options;

    if (additionalData) {
      const jsonData = JSON.parse(JSON.stringify(additionalData));

      if (typeof jsonData !== 'object') {
        throw new Error('Expected data to be parseable into a JSON object');
      }
    }

    if(!holder) {
      throw new Error('Holder must be defined');
    }

    if(typeof holder !== 'string') {
      throw new Error('Holder must be of type string');
    }

    const vpDataModel: VpDataModel = {
      '@context' : [DEFAULT_VC_CONTEXT],
      type       : Array.isArray(type)
        ? [DEFAULT_VP_TYPE, ...type]
        : (type ? [DEFAULT_VP_TYPE, type] : [DEFAULT_VP_TYPE]),
      id                   : `urn:uuid:${cryptoUtils.randomUuid()}`,
      holder               : holder,
      verifiableCredential : vcJwts,
      ...additionalData,
    };

    validatePayload(vpDataModel);

    return new VerifiablePresentation(vpDataModel);
  }

  /**
   * Verifies the integrity and authenticity of a Verifiable Presentation (VP) encoded as a JSON Web Token (JWT).
   *
   * This function performs several crucial validation steps to ensure the trustworthiness of the provided VP:
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
   *     VerifiablePresentation.verify({ vpJwt: signedVpJwt })
   *     console.log("VC Verification successful!")
   * } catch (e: Error) {
   *     console.log("VC Verification failed: ${e.message}")
   * }
   * ```
   *
   * @param vpJwt The Verifiable Presentation in JWT format as a [string].
   * @throws Error if the verification fails at any step, providing a message with failure details.
   * @throws Error if critical JWT header elements are absent.
   */
  public static async verify({ vpJwt }: {
    vpJwt: string
  }) {
    const { payload } = await Jwt.verify({ jwt: vpJwt });
    const vp = payload['vp'] as VpDataModel;
    if (!vp) {
      throw new Error('vp property missing.');
    }

    validatePayload(vp);

    for (const vcJwt of vp.verifiableCredential!) {
      await VerifiableCredential.verify({ vcJwt: vcJwt as string });
    }

    return {
      /** The issuer of the VP */
      issuer  : payload.iss!,
      /** The subject of the VP. */
      subject : payload.sub!,
      /** The VP data model object. */
      vp      : payload['vp'] as VpDataModel
    };
  }

  /**
   * Parses a JWT into a [VerifiablePresentation] instance.
   *
   * @example
   * ```ts
   * const vp = VerifiablePresentation.parseJwt({ vpJwt: signedVpJwt })
   * ```
   *
   * @param vpJwt The verifiable presentation JWT as a [String].
   * @returns A [VerifiablePresentation] instance derived from the JWT.
   */
  public static parseJwt({ vpJwt }: { vpJwt: string }): VerifiablePresentation {
    const parsedJwt = Jwt.parse({ jwt: vpJwt });
    const vpDataModel: VpDataModel = parsedJwt.decoded.payload['vp'] as VpDataModel;

    if(!vpDataModel) {
      throw Error('Jwt payload missing vp property');
    }

    return new VerifiablePresentation(vpDataModel);
  }
}

/**
 * Validates the structure and integrity of a Verifiable Presentation payload.
 *
 * @param vp - The Verifiable Presentaation object to validate.
 * @throws Error if any validation check fails.
 */
function validatePayload(vp: VpDataModel): void {
  SsiValidator.validateContext(vp['@context']);
  SsiValidator.validateVpType(vp.type!);
}