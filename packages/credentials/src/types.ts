import { ICredential, IIssuer, ICredentialStatus, ICredentialSubject, ICredentialSchemaType} from '@sphereon/ssi-types';

/**
 * @see {@link https://www.w3.org/TR/vc-data-model/#credentials | VC data model}
 */
export type { ICredential as VerifiableCredential };


/**
 * @see {@link https://www.w3.org/TR/vc-data-model/#data-schemas | Data schemas}
 */
export type { ICredentialSchemaType as CredentialSchemaType };

/**
 * The issuer of a {@link VerifiableCredential}.
 * The value of the issuer property must be either a URI or an object containing an `id` property.
 * It is _recommended_ that the URI in the issuer or its id be one which, if de-referenced, results in a document
 * containing machine-readable information about the issuer that can be used to verify the information expressed in the
 * credential.
 *
 * See {@link https://www.w3.org/TR/vc-data-model/#issuer | Issuer data model}
 */
export type {IIssuer as Issuer};


/**
 * The value of the `credentialSubject` property is defined as a set of objects that contain one or more properties that
 * are each related to a subject of the verifiable credential. Each object MAY contain an id.
 *
 * See {@link https://www.w3.org/TR/vc-data-model/#credential-subject | Credential Subject}
 */

export type {ICredentialSubject as CredentialSubject};


/**
 * Used for the discovery of information about the current status of a verifiable credential, such as whether it is
 * suspended or revoked.
 * The precise contents of the credential status information is determined by the specific `credentialStatus` type
 * definition, and varies depending on factors such as whether it is simple to implement or if it is privacy-enhancing.
 *
 * See {@link https://www.w3.org/TR/vc-data-model/#status | Credential Status}
 */
export type {ICredentialStatus as CredentialStatus};