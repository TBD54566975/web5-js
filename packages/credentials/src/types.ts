import type { PresentationDefinitionV2, PresentationDefinitionV1 as PexPresDefV1, InputDescriptorV2 } from '@sphereon/pex-models';
import type { EvaluationResults as ER, PresentationResult as PexPR, SelectResults as PexSR, Validated as PexValidated } from '@sphereon/pex';
import type {
  IIssuer,
  ICredential,
  ICredentialStatus,
  ICredentialSubject,
  ICredentialSchemaType,
  ICredentialContextType,
  AdditionalClaims,
} from '@sphereon/ssi-types';
import type {
  Descriptor,
  IPresentation,
  JwtDecodedVerifiableCredential as PexJwtDecodedVc,
  PresentationSubmission as PexPresentationSubmission,
  JwtDecodedVerifiablePresentation as PexJwtDecodedPres,
} from '@sphereon/ssi-types';

import { PEX } from '@sphereon/pex';

let pex = new PEX();

export const DEFAULT_CONTEXT = 'https://www.w3.org/2018/credentials/v1';
export const DEFAULT_VC_TYPE = 'VerifiableCredential';
export const DEFAULT_VP_TYPE = 'VerifiablePresentation';

/**
 * Resets the state for PEX lib, needed for every fresh Presentation Exchange flow.
 */
export const resetPex = () => {
  pex = new PEX();
};


/** Presentation Exchange */

/**
 * A Verifiable Credential is a set of one or more claims made by the same entity.
 *
 * @see {@link https://www.w3.org/TR/vc-data-model/#credentials | VC Data Model}
 */
export type VerifiableCredentialTypeV1 = ICredential;

/**
 * A Credential Context is to convey the meaning of the data and term definitions of the data in a verifiable credential.
 *
 * @see {@link https://www.w3.org/TR/vc-data-model/#credentials | VC Data Model}
 */
export type CredentialContextType = ICredentialContextType;

/**
 * JWT-decoded version of a Verifiable Credential, offering a structured format for credential data.
 */
export type JwtDecodedVerifiableCredential = PexJwtDecodedVc;

/**
 * Credential Schema Types are useful when enforcing a specific structure on a given collection of
 * data.
 *
 * @see {@link https://www.w3.org/TR/vc-data-model/#data-schemas | Data Schemas}
 */
export type CredentialSchemaType = ICredentialSchemaType;

/**
 * Issuer: The acting Entity issuing a Verifiable Credential. The value of the issuer property must
 * be either a URI or an object containing an `id` property.
 *
 * @see {@link https://www.w3.org/TR/vc-data-model/#issuer | Issuer Data Model}
 */
export type Issuer = IIssuer;

/**
 * Credential Subject: Entity that the Verifiable Credential is about. This includes one or more
 * properties related to the subject.
 *
 * @see {@link https://www.w3.org/TR/vc-data-model/#credential-subject | Credential Subject}
 */
export type CredentialSubject = (ICredentialSubject & AdditionalClaims) | (ICredentialSubject & AdditionalClaims)[]

/**
 * Used for the discovery of information about the current status of a verifiable credential, such
 * as whether it is suspended or revoked.
 *
 *  @see {@link https://www.w3.org/TR/vc-data-model/#status | Credential Status}
 */
export type CredentialStatus = ICredentialStatus;

/**
 * Presentation Definition: Outlines the requirements Verifiers have for Proofs.
 *
 * @see {@link https://identity.foundation/presentation-exchange/#presentation-definition | Presentation Definition}
 */
export type PresentationDefinitionType = PexPresDefV1;

/**
 * Presentation Definition: Outlines the requirements Verifiers have for Proofs.
 *
 * @see {@link https://identity.foundation/presentation-exchange/#presentation-definition | Presentation Definition}
 */
export type PresentationDefinition = PresentationDefinitionV2;

/**
 * Presentation Submissions are objects embedded within target Claim negotiation formats that
 * express how the inputs presented as proofs to a Verifier are provided in accordance with the
 * requirements specified in a Presentation Definition.
 *
 * @see {@link https://identity.foundation/presentation-exchange/#presentation-submission | Presentation Submission}
 */
export type PresentationSubmission = PexPresentationSubmission;

/**
 * A Verifiable Presentation expresses data from one or more verifiable credentials, and is packaged
 * n such a way that the authorship of the data is verifiable.
 *
 * @see {@link https://www.w3.org/TR/vc-data-model/#dfn-verifiable-presentations | Verifiable Presentation}
 */
export type VerifiablePresentationV1 = IPresentation;

/**
 * JWT-decoded version of a Verifiable Presentation, offering a structured format for presentation
 * data.
 */
export type JwtDecodedVerifiablePresentation = PexJwtDecodedPres;

/**
 * Represents a Json Web Token in compact form.
 */
export type VcJwt = string;

/**
 * Represents a Json Web Token in compact form.
 */
export type VpJwt = string;

/**
 * Descriptor Map: Maps descriptors in a presentation exchange context.
 */
export type DescriptorMap = Descriptor;

/**
 * Presentation Result: The outcome of a presentation process.
 */
export type PresentationResult = PexPR;

/**
 * Evaulation Result: The outcome of a evaluation process.
 */
export type EvaluationResults = ER;


/**
 * Search Result: The outcome of the select results process.
 */
export type SelectResults = PexSR;

/**
 * Validated: The outcome of the validation process.
 */
export type Validated = PexValidated;

/**
 * Evaluates given credentials against a presentation definition.
 * @returns {EvaluationResults} The result of the evaluation process.
 */
export const evaluateCredentials = (
  presentationDefinition: PresentationDefinition,
  verifiableCredentials: string[]
): EvaluationResults => {
  return pex.evaluateCredentials(presentationDefinition, verifiableCredentials);
};

/**
 * Evaluates a presentation against a presentation definition.
 * @returns {EvaluationResults} The result of the evaluation process.
 */
export const evaluatePresentation = (
  presentationDefinition: PresentationDefinition,
  presentation: VerifiablePresentationV1
): EvaluationResults  => {
  return pex.evaluatePresentation(presentationDefinition, presentation);
};

/**
 * Constructs a presentation from a presentation definition and set of credentials.
 * @returns {PresentationResult} The constructed presentation.
 */
export const presentationFrom = (
  presentationDefinition: PresentationDefinition,
  verifiableCredentials: string[]
): PresentationResult => {
  return pex.presentationFrom(presentationDefinition, verifiableCredentials);
};

/**
 * The selectFrom method is a helper function that helps filter out the verifiable credentials which can not be selected and returns
 * the selectable credentials.
 *
 * @param presentationDefinition the definition of what is expected in the presentation.
 * @param verifiableCredentials verifiable credentials are the credentials from wallet provided to the library to find selectable credentials.
 *
 * @return the selectable credentials.
 */
export const selectFrom = (presentationDefinition: PresentationDefinition, verifiableCredentials: VcJwt[]): SelectResults => {
  return pex.selectFrom(presentationDefinition, verifiableCredentials);
};

/**
 * This method validates whether an object is usable as a presentation definition or not.
 *
 * @param presentationDefinition: presentationDefinition to be validated.
 *
 * @return the validation results to reveal what is acceptable/unacceptable about the passed object to be considered a valid presentation definition
 */
export const validateDefinition = (presentationDefinition: PresentationDefinition): Validated => {
  return PEX.validateDefinition(presentationDefinition);
};

/**
 * This method validates whether an object is usable as a presentation submission or not.
 *
 * @param presentationSubmission the object to be validated.
 *
 * @return the validation results to reveal what is acceptable/unacceptable about the passed object to be considered a valid presentation submission
 */
export const validateSubmission = (presentationSubmission: PresentationSubmission): Validated => {
  return PEX.validateSubmission(presentationSubmission);
};

/** Credential Manifest */

/**
 * Input Descriptors are objects used to describe the information a Verifier requires of a Holder.
 * All Input Descriptors MUST be satisfied, unless otherwise specified by a Feature.
 *
 * See {@link https://identity.foundation/presentation-exchange/#input-descriptor-object | Input Descriptor}
 */
export type InputDescriptor = InputDescriptorV2;

/**
 * See {@link https://identity.foundation/wallet-rendering/v0.0.1/#entity-styles | Entity Styles}
 */
export type EntityStyle = {
  thumbnail?: Image
  hero?: Image
  background?: Colorable
  text?: Colorable
}

export type Image = {
  /** Valid URI string to an image resource */
  uri: string;
  /** String that describes the alternate text for the image */
  alt?: string;
}

export type Colorable = {
  /** HEX string color value */
  color?: string;
}

/**
 * See {@link https://identity.foundation/credential-manifest/#output-descriptor | Output Descriptor}
 */
export type OutputDescriptor = {
  /** String that does not conflict with the `id` of another OutputDescriptor in the same
   * CredentialManifest */
  id: string;
  /** String specifying the schema of the credential to be issued */
  schema: string;
  /** Human-readable string that describes what the credential represents */
  name?: string;
  /** Human-readable string that descripbes what the credential is in greater detail */
  description?: string;
  /** Object or URI of the {@link https://identity.foundation/wallet-rendering/v0.0.1/#entity-styles | Entity Style} to render the OutputDescriptor */
  styles?: EntityStyle | string;
  /** Object or URI of the {@link https://identity.foundation/wallet-rendering/v0.0.1/#display-mapping-object | Display Mapping} used to pull data from the target Claim */
  display?: DisplayMapping | string;
}

/** See {@link https://identity.foundation/wallet-rendering/v0.0.1/#display-mapping-object | Display Mapping Object} */
export type DisplayMapping = {
  /** Array of JSONPath string expressions */
  path: string[];
  schema: {
    /** Represents the type of data found with the `path` property */
    type: 'string' | 'boolean' | 'number' | 'integer';
    /** If the `type` property is "string", this property is used to format the string in any rendered UI */
    format?: 'date-time' | 'time' | 'date' | 'email' | 'idn-email' | 'hostname' | 'idn-hostname' |
     'ipv4' | 'ipv6' | 'uri' | 'uri-reference' | 'iri' | 'iri-reference';
  }
  /**
   * String to be rendered into the UI if all the `path` property's item's value is
   * undefined OR incorrectly processed
  */
  fallback?: string;
}

/** See {@link https://identity.foundation/presentation-exchange/#presentation-definition | Presentation Definiton}'s `format` property */
export type Format = {
  [key: string]: any;
}

/** See {@link https://identity.foundation/presentation-exchange/#input-descriptor-object | Input Descriptor}'s `constraints.fields.filter` property */
export type Filter = {
  [key: string]: any;
}

/**
 * Credential Manifests are a resource format that defines preconditional requirements, Issuer style
 * preferences, and other facets User Agents utilize to help articulate and select the inputs
 * necessary for processing and issuance of a specified credential.
 *
 * See {@link https://identity.foundation/credential-manifest/#credential-manifest | Credential Manifest}
 */
export type CredentialManifest = {
  /** String providing a unique identifier for the desired context */
  id: string;
  /** String that acts as a summarizing title for the CredentialManifest */
  name?: string;
  /**
   * String explaining what the CredentialManifest is generally offering for meeting
   * its requirements
   */
  description?: string;
  spec_version?: string;
  issuer: Issuer;
  /** Output Descriptors are used by an Issuer to describe the credentials they are offering to a
   * Holder. See Output Descriptor */
  output_descriptors: OutputDescriptor[];
  format?: Format;
  /**
   * Presentation Exchange is a specification codifying a Presentation Definition data format
   * Verifiers can use to articulate proof requirements in a Presentation Request, and a
   * Presentation Submission data format Holders can use to describe proofs submitted in accordance
   * with them.
  */
  presentation_definition?: PresentationDefinition;
}