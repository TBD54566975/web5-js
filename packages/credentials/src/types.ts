
/**
 * @see {@link https://www.w3.org/TR/vc-data-model/#credentials | VC data model}
 */
export type VerifiableCredential = {
  /** see {@link https://www.w3.org/TR/vc-data-model/#contexts | Contexts} */
  '@context': ['https://www.w3.org/2018/credentials/v1', ...string[]];
  credentialSubject: CredentialSubject | CredentialSubject[];
  /** @see {@link https://www.w3.org/TR/vc-data-model/#identifiers | Identifiers} */
  id?: string;
  /** @see {@link IssuerType} */
  issuer: Issuer;
  /** @see {@link https://www.w3.org/TR/vc-data-model/#types | Types} */
  type?: string[] | string;
  /** @see {@link https://www.w3.org/TR/vc-data-model/#issuance-date | Issuance Date} */
  issuanceDate: string;
  /** @see {@link https://www.w3.org/TR/vc-data-model/#expiration | Expiration} */
  expirationDate?: string;
  /** @see {@link CredentialStatusReference} */
  credentialStatus?: CredentialStatusReference;
  [key: string]: any;
}

/**
 * The issuer of a {@link VerifiableCredential}.
 * The value of the issuer property must be either a URI or an object containing an `id` property.
 * It is _recommended_ that the URI in the issuer or its id be one which, if de-referenced, results in a document
 * containing machine-readable information about the issuer that can be used to verify the information expressed in the
 * credential.
 *
 * See {@link https://www.w3.org/TR/vc-data-model/#issuer | Issuer data model}
 */
export type Issuer = {
  /** @see {@link https://www.w3.org/TR/vc-data-model/#identifiers | Identifiers} */
  id: string;
  [key: string]: any;
} | string

/**
 * The value of the `credentialSubject` property is defined as a set of objects that contain one or more properties that
 * are each related to a subject of the verifiable credential. Each object MAY contain an id.
 *
 * See {@link https://www.w3.org/TR/vc-data-model/#credential-subject | Credential Subject}
 */
export type CredentialSubject = {
  /** @see {@link https://www.w3.org/TR/vc-data-model/#identifiers | Identifiers} */
  id?: string;
  [key: string]: any;
}

/**
 * Used for the discovery of information about the current status of a verifiable credential, such as whether it is
 * suspended or revoked.
 * The precise contents of the credential status information is determined by the specific `credentialStatus` type
 * definition, and varies depending on factors such as whether it is simple to implement or if it is privacy-enhancing.
 *
 * See {@link https://www.w3.org/TR/vc-data-model/#status | Credential Status}
 */
export type CredentialStatusReference = {
  /** @see {@link https://www.w3.org/TR/vc-data-model/#identifiers | Identifiers} */
  id: string;
  /** expresses the credential status type (also referred to as the credential status method).
   * It is expected that the value will provide enough information to determine the current status
   * of the credential and that machine readable information needs to be retrievable from the URI.
   * For example, the object could contain a link to an external document noting whether or not the credential
   * is suspended or revoked.
   */
  type: string;
  [key: string]: any;
}

/**
 * proof property of a {@link VerifiableCredential}
 */
export type ProofType = {
  /** @see {@link https://www.w3.org/TR/vc-data-model/#types | Types} */
  type?: string;
  [key: string]: any;
}