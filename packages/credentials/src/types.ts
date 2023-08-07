import type { ICredential, IIssuer, ICredentialSubject, ICredentialSchemaType } from '@sphereon/ssi-types';
import type { PresentationDefinitionV2 } from '@sphereon/pex-models';
import type { IPresentation, PresentationSubmission as PexPresentationSubmission, Descriptor, JwtDecodedVerifiableCredential as PexJwtDecodedVc, JwtDecodedVerifiablePresentation as PexJwtDecodedPres } from '@sphereon/ssi-types';
import type { PresentationResult as PexPR } from '@sphereon/pex/dist/main/lib/signing';

import { PEXv2, EvaluationResults as ER } from '@sphereon/pex';

const pex = new PEXv2();

/**
 * A Verifiable Credential is a set of one or more claims made by the same entity.
 *
 * @see {@link https://www.w3.org/TR/vc-data-model/#credentials | VC data model}
 */
export type VerifiableCredential = ICredential;

/**
 * JWT-decoded version of a Verifiable Credential, offering a structured format for credential data.
 */
export type JwtDecodedVerifiableCredential = PexJwtDecodedVc;

/**
 * Credential Schema Types are useful when enforcing a specific structure on a given collection of data.
 *
 * @see {@link https://www.w3.org/TR/vc-data-model/#data-schemas | Data schemas}
 */
export type CredentialSchemaType = ICredentialSchemaType;

/**
 * Issuer: The acting Entity issuing a Verifiable Credential.
 *
 * @see {@link https://www.w3.org/TR/vc-data-model/#issuer | Issuer data model}
 */
export type Issuer = IIssuer;

/**
 * Credential Subject: Entity that the Verifiable Credential is about. This includes one or more properties related to the subject.
 *
 * @see {@link https://www.w3.org/TR/vc-data-model/#credential-subject | Credential Subject}
 */
export type CredentialSubject = ICredentialSubject;

/**
 * Presentation Definition: Outlines the requirements Verifiers have for Proofs.
 *
 * @see {@link https://identity.foundation/presentation-exchange/#presentation-definition | Presentation Definition}
 */
export type PresentationDefinition = PresentationDefinitionV2;

/**
 * Presentation Submissions are objects embedded within target Claim negotiation formats that express how the inputs presented as proofs to a Verifier are provided in accordance with the requirements specified in a Presentation Definition.
 *
 * @see {@link https://identity.foundation/presentation-exchange/#presentation-submission | Presentation Submission}
 */
export type PresentationSubmission = PexPresentationSubmission;

/**
 * A Verifiable Presentation expresses data from one or more verifiable credentials, and is packaged in such a way that the authorship of the data is verifiable.
 *
 * @see {@link https://www.w3.org/TR/vc-data-model/#dfn-verifiable-presentations | Verifiable Presentation}
 */
export type VerifiablePresentation = IPresentation;

/**
 * JWT-decoded version of a Verifiable Presentation, offering a structured format for presentation data.
 */
export type JwtDecodedVerifiablePresentation = PexJwtDecodedPres;

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
 * Evaluates given credentials against a presentation definition.
 * @returns {EvaluationResults} The result of the evaluation process.
 */
export const evaluateCredentials = (presentationDefinition: PresentationDefinition, verifiableCredentials: string[]): EvaluationResults => {
  return pex.evaluateCredentials(presentationDefinition, verifiableCredentials);
};

/**
   * Evaluates a presentation against a presentation definition.
   * @returns {EvaluationResults} The result of the evaluation process.
   */
export const evaluatePresentation = (presentationDefinition: PresentationDefinitionV2, presentation: JwtDecodedVerifiablePresentation): EvaluationResults  => {
  return pex.evaluatePresentation(presentationDefinition, presentation);
};

/**
   * Constructs a presentation from a presentation definition and set of credentials.
   * @returns {PresentationResult} The constructed presentation.
   */
export const presentationFrom = (presentationDefinition: PresentationDefinitionV2, verifiableCredentials: string[]): PresentationResult => {
  return pex.presentationFrom(presentationDefinition, verifiableCredentials);
};