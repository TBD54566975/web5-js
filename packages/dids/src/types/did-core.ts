import { Jwk } from '@web5/crypto';

/**
 * Represents metadata related to the process of DID dereferencing.
 *
 * This type includes fields that provide information about the outcome of a DID dereferencing operation,
 * including the content type of the returned resource and any errors that occurred during the dereferencing process.
 *
 * @see {@link https://www.w3.org/TR/did-core/#did-url-dereferencing-metadata | DID Core Specification, § DID URL Dereferencing Metadata}
 */
export type DidDereferencingMetadata = {
  /**
   * The Media Type of the returned contentStream SHOULD be expressed using this property if
   * dereferencing is successful.
   */
  contentType?: string;

  /**
   * The error code from the dereferencing process. This property is REQUIRED when there is an
   * error in the dereferencing process. The value of this property MUST be a single keyword
   * expressed as an ASCII string. The possible property values of this field SHOULD be registered
   * in the {@link https://www.w3.org/TR/did-spec-registries/ | DID Specification Registries}.
   * The DID Core specification defines the following common error values:
   *
   * - `invalidDidUrl`: The DID URL supplied to the DID URL dereferencing function does not conform
   *                    to valid syntax.
   * - `notFound`: The DID URL dereferencer was unable to find the `contentStream` resulting from
   *               this dereferencing request.
   *
   * @see {@link https://www.w3.org/TR/did-core/#did-url-dereferencing-metadata | DID Core Specification, § DID URL Dereferencing Metadata}
   */
  error?: string;

  // Additional output metadata generated during DID Resolution.
  [key: string]: any;
}

/**
 * Represents the options that can be used during the process of DID dereferencing.
 *
 * This interface allows the caller to specify preferences and additional parameters for the DID
 * dereferencing operation.
 *
 * @see {@link https://www.w3.org/TR/did-core/#did-url-dereferencing-options}
 */
export interface DidDereferencingOptions {
  /** The Media Type that the caller prefers for contentStream. */
  accept?: string;

  /** Additional properties used during DID dereferencing. */
  [key: string]: any;
}

/**
 * Represents the result of a DID dereferencing operation.
 *
 * This type encapsulates the outcomes of the DID URL dereferencing process, including metadata
 * about the dereferencing operation, the content stream retrieved (if any), and metadata about the
 * content stream.
 *
 * @see {@link https://www.w3.org/TR/did-core/#did-url-dereferencing | DID Core Specification, § DID URL Dereferencing}
 */
export type DidDereferencingResult = {
  /**
   * A metadata structure consisting of values relating to the results of the DID URL dereferencing
   * process. This structure is REQUIRED, and in the case of an error in the dereferencing process,
   * this MUST NOT be empty. Properties defined by this specification are in 7.2.2 DID URL
   * Dereferencing Metadata. If the dereferencing is not successful, this structure MUST contain an
   * `error` property describing the error.
   */
  dereferencingMetadata: DidDereferencingMetadata;

  /**
   * If the `dereferencing` function was called and successful, this MUST contain a resource
   * corresponding to the DID URL. The contentStream MAY be a resource such as:
   *   - a DID document that is serializable in one of the conformant representations
   *   - a Verification Method
   *   - a service.
   *   - any other resource format that can be identified via a Media Type and obtained through the
   *     resolution process.
   *
   * If the dereferencing is unsuccessful, this value MUST be empty.
   */
  contentStream: DidResource | null;

  /**
   * If the dereferencing is successful, this MUST be a metadata structure, but the structure MAY be
   * empty. This structure contains metadata about the contentStream. If the contentStream is a DID
   * document, this MUST be a didDocumentMetadata structure as described in DID Resolution. If the
   * dereferencing is unsuccessful, this output MUST be an empty metadata structure.
   */
  contentMetadata: DidDocumentMetadata;
}

/**
 * A set of data describing the Decentralized Identifierr (DID) subject.
 *
 * A DID Document contains information associated with the DID, such as cryptographic public keys
 * and service endpoints, enabling trustable interactions associated with the DID subject.
 *
 * - Cryptographic public keys - Used by the DID subject or a DID delegate to authenticate itself
 *                               and prove its association with the DID.
 * - Service endpoints - Used to communicate or interact with the DID subject or associated
 *                       entities. Examples include discovery, agent, social networking, file
 *                       storage, and verifiable credential repository services.
 *
 * A DID Document can be retrieved by resolving a DID, as described in
 * {@link https://www.w3.org/TR/did-core/#did-resolution | DID Core Specification, § DID Resolution}.
 */
export interface DidDocument {
  /**
   * A JSON-LD context link, which provides a JSON-LD processor with the information necessary to
   * interpret the DID document JSON. The default context URL is 'https://www.w3.org/ns/did/v1'.
   */
  '@context'?: 'https://www.w3.org/ns/did/v1' | string | (string | Record<string, any>)[];

  /**
   * The DID Subject to which this DID Document pertains.
   *
   * The `id` property is REQUIRED and must be a valid DID.
   *
   * @see {@link https://www.w3.org/TR/did-core/#did-subject | DID Core Specification, § DID Subject}
   */
  id: string;

  /**
   * A DID subject can have multiple identifiers for different purposes, or at different times.
   * The assertion that two or more DIDs (or other types of URI) refer to the same DID subject can
   * be made using the `alsoKnownAs` property.
   *
   * @see {@link https://www.w3.org/TR/did-core/#also-known-as | DID Core Specification, § Also Known As}
   */
  alsoKnownAs?: string[];

  /**
   * A DID controller is an entity that is authorized to make changes to a DID document. Typically,
   * only the DID Subject (i.e., the value of `id` property in the DID document) is authoritative.
   * However, another DID can be specified as the DID controller, and when doing so, any
   * verification methods contained in the DID document for the other DID should be accepted as
   * authoritative.  In other words, proofs created by the controller DID should be considered
   * equivalent to proofs created by the DID Subject.
   *
   * @see {@link https://www.w3.org/TR/did-core/#did-controller | DID Core Specification, § DID Controller}
   */
  controller?: string | string[];

  /**
   * A DID document can express verification methods, such as cryptographic public keys, which can
   * be used to authenticate or authorize interactions with the DID subject or associated parties.
   *
   * @see {@link https://www.w3.org/TR/did-core/#verification-methods | DID Core Specification, § Verification Methods}
   */
  verificationMethod?: DidVerificationMethod[];

  /**
   * The `assertionMethod` verification relationship is used to specify how the DID subject is
   * expected to express claims, such as for the purposes of issuing a Verifiable Credential.
   *
   * @see {@link https://www.w3.org/TR/did-core/#assertion | DID Core Specification, § Assertion}
   */
  assertionMethod?: (DidVerificationMethod | string)[];

  /**
   * The `authentication` verification relationship is used to specify how the DID subject is expected
   * to be authenticated, for purposes such as logging into a website or engaging in any sort of
   * challenge-response protocol.

   * @see {@link https://www.w3.org/TR/did-core/#authentication | DID Core Specification, § Authentication}
   */
  authentication?: (DidVerificationMethod | string)[];

  /**
   * The `keyAgreement` verification relationship is used to specify how an entity can generate
   * encryption material in order to transmit confidential  information intended for the DID
   * subject, such as for the purposes of establishing a secure communication channel with the
   * recipient.
   *
   * @see {@link https://www.w3.org/TR/did-core/#key-agreement | DID Core Specification, § Key Agreement}
   */
  keyAgreement?: (DidVerificationMethod | string)[];

  /**
   *  The `capabilityDelegation` verification relationship is used to specify a mechanism that might
   * be used by the DID subject to delegate a cryptographic capability to another party, such as
   * delegating the authority to access a specific HTTP API to a subordinate.
   *
   * @see {@link https://www.w3.org/TR/did-core/#capability-delegation | DID Core Specification, § Capability Delegation}
   */
  capabilityDelegation?: (DidVerificationMethod | string)[];

  /**
   * The `capabilityInvocation` verification relationship is used to specify a verification method
   * that might be used by the DID subject to invoke a cryptographic capability, such as the
   * authorization to update the DID Document.
   */
  capabilityInvocation?: (DidVerificationMethod | string)[];

  /**
   * Services are used in DID documents to express ways of communicating with the DID subject or
   * associated entities. A service can be any type of service the DID subject wants to advertise,
   * including decentralized identity management services for further discovery, authentication,
   * authorization, or interaction.
   *
   * @see {@link https://www.w3.org/TR/did-core/#services | DID Core Specification, § Services}
   */
  service?: DidService[];
}

/**
 * Represents metadata about the DID document resulting from a DID resolution operation.
 *
 * This metadata typically does not change between invocations of the `resolve` and
 * `resolveRepresentation` functions unless the DID document changes, as it represents metadata
 * about the DID document.
 *
 * @see {@link https://www.w3.org/TR/did-core/#did-document-metadata | DID Core Specification, § DID Document Metadata}
 */
export interface DidDocumentMetadata {
  /**
   * Timestamp of the Create operation.
   *
   * The value of the property MUST be a string formatted as an XML Datetime normalized to
   * UTC 00:00:00 and  without sub-second decimal precision. For example: `2020-12-20T19:17:47Z`.
   */
  created?: string;

  /**
   * Timestamp of the last Update operation for the document version which was resolved.
   *
   * The value of the property MUST follow the same formatting rules as the `created` property.
   * The `updated` property is omitted if an Update operation has never been performed on the DID
   * document. If an `updated` property exists, it can be the same value as the `created` property
   * when the difference between the two timestamps is less than one second.
   */
  updated?: string;

  /**
   * Whether the DID has been deactivated.
   *
   * If a DID has been deactivated, DID document metadata MUST include this property with the
   * boolean value `true`. If a DID has not been deactivated, this properrty is OPTIONAL, but if
   * present, MUST have the boolean value `false`.
   */
  deactivated?: boolean;

  /**
   * Version ID of the last Update operation for the document version which was resolved.
   */
  versionId?: string;

  /**
   * Timestamp of the next Update operation if the resolved document version is not the latest
   * version of the document.
   *
   * The value of the property MUST follow the same formatting rules as the `created` property.
   */
  nextUpdate?: string;

  /**
   * Version ID of the next Update operation if the resolved document version is not the latest
   * version of the document.
   */
  nextVersionId?: string;

  /**
   * A DID method can define different forms of a DID that are logically equivalent. An example is
   * when a DID takes one form prior to registration in a verifiable data registry and another form
   * after such registration. In this case, the DID method specification might need to express one
   * or more DIDs that are logically equivalent to the resolved DID as a property of the DID
   * document. This is the purpose of the `equivalentId` property.
   *
   * A requesting party is expected to retain the values from the id and equivalentId properties to
   * ensure any subsequent interactions with any of the values they contain are correctly handled as
   * logically equivalent (e.g., retain all variants in a database so an interaction with any one
   * maps to the same underlying account).
   *
   * @see {@link https://www.w3.org/TR/did-core/#dfn-equivalentid | DID Core Specification, § DID Document Metadata}
  */
 equivalentId?: string[];

 /**
  * The `canonicalId` property is identical to the `equivalentId` property except:
  * - it is associated with a single value rather than a set
  * - the DID is defined to be the canonical ID for the DID subject within the scope of the
  *   containing DID document.
  *
  * A requesting party is expected to use the `canonicalId` value as its primary ID value for the
  * DID subject and treat all other equivalent values as secondary aliases (e.g., update
  * corresponding primary references in their systems to reflect the new canonical ID directive).
  *
   * @see {@link https://www.w3.org/TR/did-core/#dfn-canonicalid | DID Core Specification, § DID Document Metadata}
   */
  canonicalId?: string;

  // Additional output metadata generated during DID Resolution.
  [key: string]: any;
}

/**
 * Represents metadata related to the result of a DID resolution operation.
 *
 * This type includes fields that provide information about the outcome of a DID resolution process,
 * including the content type of the returned DID document and any errors that occurred during the
 * resolution process.
 *
 * This metadata typically changes between invocations of the `resolve` and `resolveRepresentation`
 * functions, as it represents data about the resolution process itself.
 *
 * @see {@link https://www.w3.org/TR/did-core/#did-resolution-metadata | DID Core Specification, § DID Resolution Metadata}
 */
export type DidResolutionMetadata = {
  /**
   * The Media Type of the returned `didDocumentStream`.
   *
   * This property is REQUIRED if resolution is successful and if the `resolveRepresentation`
   * function was called. This property MUST NOT be present if the `resolve` function was called.
   * The value of this property MUST be an ASCII string that is the Media Type of the conformant
   * representations. The caller of the `resolveRepresentation` function MUST use this value when
   * determining how to parse and process the `didDocumentStream` returned by this function into the
   * data model.
   */
  contentType?: string;

  /**
   * An error code indicating issues encountered during the DID Resolution or DID URL
   * Dereferencing process.
   *
   * Defined error codes include:
   *   - `internalError`: An unexpected error occurred during DID Resolution or DID URL
   *                      dereferencing process.
   *   - `invalidDid`: The provided DID is invalid.
   *   - `methodNotSupported`: The DID method specified is not supported.
   *   - `notFound`: The DID or DID URL does not exist.
   *   - `representationNotSupported`: The DID document representation is not supported.
   *   - Custom error codes can also be provided as strings.
   *
   * @see {@link https://www.w3.org/TR/did-core/#did-resolution-metadata | DID Core Specification, § DID Resolution Metadata}
   * @see {@link https://www.w3.org/TR/did-spec-registries/#error | DID Specification Registries, § Error}
   */
  error?: string;

  // Additional output metadata generated during DID Resolution.
  [key: string]: any;
};

/**
 * DID Resolution input metadata.
*
* The DID Core specification defines the following common properties:
*  - `accept`: The Media Type that the caller prefers for the returned representation of the DID
*              Document.
*
* The possible properties within this structure and their possible values are registered in the
* {@link https://www.w3.org/TR/did-spec-registries/#did-resolution-options | DID Specification Registries}.
 *
 * @see {@link https://www.w3.org/TR/did-core/#did-resolution-options | DID Core Specification, § DID Resolution Options}
 */
export interface DidResolutionOptions {
  /**
   * The Media Type that the caller prefers for the returned representation of the DID Document.
   *
   * This property is REQUIRED if the `resolveRepresentation` function was called. This property
   * MUST NOT be present if the `resolve` function was called.
   *
   * The value of this property MUST be an ASCII string that is the Media Type of the conformant
   * representations. The caller of the `resolveRepresentation` function MUST use this value when
   * determining how to parse and process the `didDocumentStream` returned by this function into the
   * data model.
   *
   * @see {@link https://www.w3.org/TR/did-core/#did-resolution-options | DID Core Specification, § DID Resolution Options}
   */
  accept?: string;

  // Additional properties used during DID Resolution.
  [key: string]: any;
}

/**
 * Represents the result of a Decentralized Identifier (DID) resolution operation.
 *
 * This type encapsulates the complete outcome of resolving a DID, including the resolution metadata,
 * the DID document (if resolution is successful), and metadata about the DID document.
 *
 * @see {@link https://www.w3.org/TR/did-core/#did-resolution | DID Core Specification, § DID Resolution}
 */
export type DidResolutionResult = {
  /**
   * A JSON-LD context link, which provides the JSON-LD processor with the information necessary to
   * interpret the resolution result JSON. The default context URL is
   * 'https://w3id.org/did-resolution/v1'.
   */
  '@context'?: 'https://w3id.org/did-resolution/v1' | string | (string | Record<string, any>)[];

  /**
   * A metadata structure consisting of values relating to the results of the DID resolution
   * process.
   *
   * This structure is REQUIRED, and in the case of an error in the resolution process,
   * this MUST NOT be empty. If the resolution is not successful, this structure MUST contain an
   * `error` property describing the error.
   *
   * @see {@link https://www.w3.org/TR/did-core/#dfn-didresolutionmetadata | DID Core Specification, § DID Resolution Metadata}
   */
  didResolutionMetadata: DidResolutionMetadata;

  /**
   * The DID document resulting from the resolution process, if successful.
   *
   * If the `resolve` function was called and successful, this MUST contain a DID document
   * corresponding to the DID. If the resolution is unsuccessful, this value MUST be empty.
   *
   * @see {@link https://www.w3.org/TR/did-core/#dfn-diddocument | DID Core Specification, § DID Document}
   */
  didDocument: DidDocument | null;

  /**
   * Metadata about the DID Document.
   *
   * This structure contains information about the DID Document like creation and update timestamps,
   * deactivation status, versioning information, and other details relevant to the DID Document.
   *
   * @see {@link https://www.w3.org/TR/did-core/#dfn-diddocumentmetadata | DID Core Specification, § DID Document Metadata}
   */
  didDocumentMetadata: DidDocumentMetadata;
};

/**
 * A DID Resource is either a DID Document, a DID Verification method or a DID Service
 */
export type DidResource = DidDocument | DidService | DidVerificationMethod;

/**
 * Services are used in DID documents to express ways of communicating with the DID subject or
 * associated entities. A service can be any type of service the DID subject wants to advertise.
 *
 * @see {@link https://www.w3.org/TR/did-core/#services}
 */
export type DidService = {
  /**
   * Identifier of the service.
   *
   * The `id` property is REQUIRED. It MUST be a URI conforming to
   * {@link https://datatracker.ietf.org/doc/html/rfc3986 | RFC3986} and MUST be unique within the
   * DID document.
   */
  id: string;

  /**
   * The type of service being described.
   *
   * The `type` property is REQUIRED. It MUST be a string. To maximize interoperability, the value
   * SHOULD be registered in the
   * {@link https://www.w3.org/TR/did-spec-registries/ | DID Specification Registries}. Examples of
   * service types can be found in
   * {@link https://www.w3.org/TR/did-spec-registries/#service-types | § Service Types}.
   */
  type: string;

  /**
   * A URI that can be used to interact with the DID service.
   *
   * The value of the `serviceEndpoint` property MUST be a string, an object containing key/value
   * pairs, or an array composed of strings or objects. All string values MUST be valid URIs
   * conforming to {@link https://datatracker.ietf.org/doc/html/rfc3986 | RFC3986}.
   */
  serviceEndpoint: DidServiceEndpoint | DidServiceEndpoint[];

  // DID methods MAY include additional service properties.
  [key: string]: any;
};

/**
 * A service endpoint is a URI (Uniform Resource Identifier) that can be used to interact with the
 * DID service.
 *
 * The value of the `serviceEndpoint` property MUST be a string or an object containing key/value
 * pairs. All string values MUST be valid URIs conforming to
 * {@link https://datatracker.ietf.org/doc/html/rfc3986 | RFC3986}.
 *
 * @see {@link https://www.w3.org/TR/did-core/#dfn-serviceendpoint | RFC3986, § 5.4 Services}
 */
export type DidServiceEndpoint = string | Record<string, any>;

/**
 * Represents a verification method in the context of a DID document.
 *
 * A verification method is a mechanism by which a DID controller can cryptographically assert proof
 * of ownership or control over a DID or DID document. This can include, but is not limited to,
 * cryptographic public keys or other data that can be used to authenticate or authorize actions.
 *
 * @see {@link https://www.w3.org/TR/did-core/#verification-methods | DID Core Specification, § Verification Methods}
 */
export interface DidVerificationMethod {
  /**
   * The identifier of the verification method, which must be a URI.
   */
  id: string;

  /**
   * The type of the verification method.
   *
   * To maximize interoperability this value SHOULD be one of the valid verification method types
   * registered in the {@link https://www.w3.org/TR/did-spec-registries/#verification-method-types | DID Specification Registries}.
   */
  type: string;

  /**
   * The DID of the entity that controls this verification method.
   */
  controller: string;

  /**
   * (Optional) A public key in JWK format.
   *
   * A JSON Web Key (JWK) that conforms to {@link https://datatracker.ietf.org/doc/html/rfc7517 | RFC 7517}.
   */
  publicKeyJwk?: Jwk;

  /**
   * (Optional) A public key in Multibase format.
   *
   * A multibase key that conforms to the draft
   * {@link https://datatracker.ietf.org/doc/draft-multiformats-multibase/ | Multibase specification}.
   */
  publicKeyMultibase?: string;
}

/**
 * Represents the various verification relationships defined in a DID document.
 *
 * These verification relationships indicate the intended usage of verification methods within a DID
 * document. Each relationship signifies a different purpose or context in which a verification
 * method can be used, such as authentication, assertionMethod, keyAgreement, capabilityDelegation,
 * and capabilityInvocation. The array provides a standardized set of relationship names for
 * consistent referencing and implementation across different DID methods.
 *
 * @see {@link https://www.w3.org/TR/did-core/#verification-relationships | DID Core Specification, § Verification Relationships}
 */
export enum DidVerificationRelationship {
  /**
   * Specifies how the DID subject is expected to be authenticated. This is commonly used for
   * purposes like logging into a website or participating in challenge-response protocols.
   *
   * @see {@link https://www.w3.org/TR/did-core/#authentication | DID Core Specification, § Authentication}
   */
  authentication = 'authentication',

  /**
   * Specifies how the DID subject is expected to express claims, such as for issuing Verifiable
   * Credentials. This relationship is typically used when the DID subject is the issuer of a
   * credential.
   *
   * @see {@link https://www.w3.org/TR/did-core/#assertion | DID Core Specification, § Assertion}
   */
  assertionMethod = 'assertionMethod',

  /**
   * Specifies how an entity can generate encryption material to communicate confidentially with the
   * DID subject. Often used in scenarios requiring secure communication channels.
   *
   * @see {@link https://www.w3.org/TR/did-core/#key-agreement | DID Core Specification, § Key Agreement}
   */
  keyAgreement = 'keyAgreement',

  /**
   * Specifies a verification method used by the DID subject to invoke a cryptographic capability.
   * This is frequently associated with authorization actions, like updating the DID Document.
   *
   * @see {@link https://www.w3.org/TR/did-core/#capability-invocation | DID Core Specification, § Capability Invocation}
   */
  capabilityInvocation = 'capabilityInvocation',

  /**
   * Specifies a mechanism used by the DID subject to delegate a cryptographic capability to another
   * party. This can include delegating access to a specific resource or API.
   *
   * @see {@link https://www.w3.org/TR/did-core/#capability-delegation | DID Core Specification, § Capability Delegation}
   */
  capabilityDelegation = 'capabilityDelegation',
}