import type { KeyValueStore } from '@web5/common';
import type { PrivateKeyJwk, PublicKeyJwk } from '@web5/crypto';
import { DidKeyKeySet } from './did-key.js';
import { DidIonKeySet } from './did-ion.js';
import { DidDhtKeySet } from './did-dht.js';
export type DidDereferencingMetadata = {
    /** The Media Type of the returned contentStream SHOULD be expressed using this property if
     * dereferencing is successful. */
    contentType?: string;
    /**
     * The error code from the dereferencing process. This property is REQUIRED when there is an
     * error in the dereferencing process. The value of this property MUST be a single keyword
     * expressed as an ASCII string. The possible property values of this field SHOULD be registered
     * in the {@link https://www.w3.org/TR/did-spec-registries/ | DID Specification Registries}.
     * The DID Core specification defines the following common error values.
     *
     * @see {@link https://www.w3.org/TR/did-core/#did-url-dereferencing-metadata | Section 7.2.2, DID URL Dereferencing Metadata}
     */
    error?: 
    /** The DID URL supplied to the DID URL dereferencing function does not conform to valid
     * syntax. */
    'invalidDidUrl'
    /** The DID URL dereferencer was unable to find the contentStream resulting from this
     * dereferencing request. */
     | 'notFound' | string;
    /** Additional output metadata generated during DID Resolution. */
    [key: string]: any;
};
/**
 * A metadata structure consisting of input options to the dereference function.
 *
 * @see {@link https://www.w3.org/TR/did-core/#did-url-dereferencing-options}
 */
export interface DidDereferencingOptions {
    /** The Media Type that the caller prefers for contentStream. */
    accept?: string;
    /** Additional properties used during DID dereferencing. */
    [key: string]: any;
}
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
};
export type DidDocument = {
    '@context'?: 'https://www.w3.org/ns/did/v1' | string | string[];
    id: string;
    alsoKnownAs?: string[];
    controller?: string | string[];
    verificationMethod?: VerificationMethod[];
    service?: DidService[];
    assertionMethod?: VerificationMethod[] | string[];
    authentication?: VerificationMethod[] | string[];
    keyAgreement?: VerificationMethod[] | string[];
    capabilityDelegation?: VerificationMethod[] | string[];
    capabilityInvocation?: VerificationMethod[] | string[];
};
export type DidDocumentMetadata = {
    created?: string;
    updated?: string;
    deactivated?: boolean;
    versionId?: string;
    nextUpdate?: string;
    nextVersionId?: string;
    equivalentId?: string;
    canonicalId?: string;
    [key: string]: any;
};
export type DidKeySet = DidKeyKeySet | DidIonKeySet | DidDhtKeySet;
export type DidKeySetVerificationMethodKey = {
    /** Unique identifier for the key in the KeyManager store. */
    keyManagerId?: string;
    publicKeyJwk?: PublicKeyJwk;
    privateKeyJwk?: PrivateKeyJwk;
    relationships: VerificationRelationship[];
};
export type DidMetadata = {
    /**
     * Additional properties of any type.
     */
    [key: string]: any;
};
export interface DidMethod {
}
export interface DidMethodApi extends DidMethodOperator, DidMethodResolver {
    new (): DidMethod;
    methodName: string;
}
export interface DidMethodResolver {
    new (): DidMethod;
    methodName: string;
    resolve(options: {
        didUrl: string;
        resolutionOptions?: DidResolutionOptions;
    }): Promise<DidResolutionResult>;
}
export interface DidMethodOperator {
    new (): DidMethod;
    methodName: string;
    create(options: any): Promise<PortableDid>;
    generateKeySet(): Promise<DidKeySet>;
    getDefaultSigningKey(options: {
        didDocument: DidDocument;
    }): Promise<string | undefined>;
}
/**
 * A DID Resource is either a DID Document, a DID Verification method or a DID Service
 */
export type DidResource = DidDocument | VerificationMethod | DidService;
/**
 * Services are used in DID documents to express ways of communicating with the DID subject or associated entities.
 * A service can be any type of service the DID subject wants to advertise.
 *
 * @see {@link https://www.w3.org/TR/did-core/#services}
 */
export type DidService = {
    id: string;
    type: string;
    serviceEndpoint: string | DidServiceEndpoint | DidServiceEndpoint[];
    description?: string;
};
/**
 * A service endpoint is a URI (Uniform Resource Identifier) that can be used to interact with the service.
 *
 * @see {@link https://www.w3.org/TR/did-core/#dfn-serviceendpoint}
 */
export interface DidServiceEndpoint {
    [key: string]: any;
}
export interface DwnServiceEndpoint extends DidServiceEndpoint {
    encryptionKeys?: string[];
    nodes: string[];
    signingKeys: string[];
}
export type DidResolutionMetadata = {
    /**
     * The Media Type of the returned `didDocumentStream`. This property is REQUIRED if resolution is
     * successful and if the `resolveRepresentation` function was called. This property MUST NOT be
     * present if the `resolve` function was called. The value of this property MUST be an ASCII
     * string that is the Media Type of the conformant representations. The caller of the
     * `resolveRepresentation` function MUST use this value when determining how to parse and process
     * the `didDocumentStream` returned by this function into the data model.
     */
    contentType?: string;
    error?: 
    /**
     * When an unexpected error occurs during DID Resolution or DID URL dereferencing, the value of
     * the DID Resolution or DID URL Dereferencing Metadata error property MUST be internalError.
     */
    'internalError'
    /**
     * If an invalid DID is detected during DID Resolution, the value of the
     * DID Resolution Metadata error property MUST be invalidDid.
     */
     | 'invalidDid'
    /**
     * If a DID method is not supported during DID Resolution or DID URL
     * dereferencing, the value of the DID Resolution or DID URL Dereferencing
     * Metadata error property MUST be methodNotSupported.
     */
     | 'methodNotSupported'
    /**
     * If during DID Resolution or DID URL dereferencing a DID or DID URL
     * doesn't exist, the value of the DID Resolution or DID URL dereferencing
     * Metadata error property MUST be notFound.
     */
     | 'notFound'
    /**
     * If a DID document representation is not supported during DID Resolution
     * or DID URL dereferencing, the value of the DID Resolution Metadata error
     * property MUST be representationNotSupported.
     */
     | 'representationNotSupported' | string;
    /** Additional output metadata generated during DID Resolution. */
    [key: string]: any;
};
/**
 * DID Resolution input metadata.
 *
 * @see {@link https://www.w3.org/TR/did-core/#did-resolution-options}
 */
export interface DidResolutionOptions {
    accept?: string;
    [key: string]: any;
}
export type DidResolutionResult = {
    '@context'?: 'https://w3id.org/did-resolution/v1' | string | string[];
    didResolutionMetadata: DidResolutionMetadata;
    didDocument?: DidDocument;
    didDocumentMetadata: DidDocumentMetadata;
};
/**
 * implement this interface to provide your own cache for did resolution results. can be plugged in through Web5 API
 */
export type DidResolverCache = KeyValueStore<string, DidResolutionResult | void>;
/**
 * Format to document a DID identifier, along with its associated data,
 * which can be exported, saved to a file, or imported. The intent is
 * bundle all of the necessary metadata to enable usage of the DID in
 * different contexts.
 */
export interface PortableDid {
    did: string;
    /**
     * A DID method can define different forms of a DID that are logically
     * equivalent. An example is when a DID takes one form prior to registration
     * in a verifiable data registry and another form after such registration.
     * This is the purpose of the canonicalId property.
     *
     * The `canonicalId` must be used as the primary ID for the DID subject,
     * with all other equivalent values treated as secondary aliases.
     *
     * @see {@link https://www.w3.org/TR/did-core/#dfn-canonicalid | W3C DID Document Metadata}
     */
    canonicalId?: string;
    /**
     * A set of data describing the DID subject, including mechanisms, such as
     * cryptographic public keys, that the DID subject or a DID delegate can use
     * to authenticate itself and prove its association with the DID.
     */
    document: DidDocument;
    /**
     * A collection of cryptographic keys associated with the DID subject. The
     * `keySet` encompasses various forms, such as recovery keys, update keys,
     * and verification method keys, to enable authentication and verification
     * of the DID subject's association with the DID.
     */
    keySet: DidKeySet;
    /**
     * This property can be used to store method specific data about
     * each managed DID and additional properties of any type.
     */
    metadata?: DidMetadata;
}
export type VerificationMethod = {
    id: string;
    type: string;
    controller: string;
    publicKeyJwk?: PublicKeyJwk;
    publicKeyMultibase?: string;
};
export type VerificationRelationship = 
/**
 * Used to specify how the DID subject is expected to express claims, such
 * as for the purposes of issuing a Verifiable Credential
 */
'assertionMethod'
/**
 * Used to specify how the DID subject is expected to be authenticated, for
 * purposes such as logging into a website or engaging in any sort of
 * challenge-response protocol.
 */
 | 'authentication'
/**
 * Used to specify how an entity can generate encryption material in order to
 * transmit confidential information intended for the DID subject, such as
 * for the purposes of establishing a secure communication channel with the
 * recipient.
 */
 | 'keyAgreement'
/**
 * Used to specify a mechanism that might be used by the DID subject to
 * delegate a cryptographic capability to another party, such as delegating
 * the authority to access a specific HTTP API to a subordinate.
 */
 | 'capabilityDelegation'
/**
 * Used to specify a verification method that might be used by the DID
 * subject to invoke a cryptographic capability, such as the authorization
 * to update the DID Document.
 */
 | 'capabilityInvocation';
//# sourceMappingURL=types.d.ts.map