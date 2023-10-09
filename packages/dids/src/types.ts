import type { KeyValueStore } from '@web5/common';
import type { PrivateKeyJwk, PublicKeyJwk } from '@web5/crypto';

import { DidKeyKeySet } from './did-key.js';
import { DidIonKeySet } from './did-ion.js';
import { DidDhtKeySet } from './did-dht.js';

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
}

export type DidDocumentMetadata = {
  // indicates the timestamp of the Create operation. ISO8601 timestamp
  created?: string
  // indicates the timestamp of the last Update operation for the document version which was
  // resolved. ISO8601 timestamp
  updated?: string
  // indicates whether the DID has been deactivated
  deactivated?: boolean
  // indicates the version of the last Update operation for the document version which
  // was resolved
  versionId?: string
  // indicates the timestamp of the next Update operation if the resolved document version
  // is not the latest version of the document.
  nextUpdate?: string
  // indicates the version of the next Update operation if the resolved document version
  // is not the latest version of the document.
  nextVersionId?: string
  // @see https://www.w3.org/TR/did-core/#dfn-equivalentid
  equivalentId?: string
  // @see https://www.w3.org/TR/did-core/#dfn-canonicalid
  canonicalId?: string
  // Additional output metadata generated during DID Resolution.
  [key: string]: any
};

export type DidKeySet = DidKeyKeySet | DidIonKeySet | DidDhtKeySet;

export type DidKeySetVerificationMethodKey = {
  /** Unique identifier for the key in the KeyManager store. */
  keyManagerId?: string;
  publicKeyJwk?: PublicKeyJwk;
  privateKeyJwk?: PrivateKeyJwk;
  relationships: VerificationRelationship[];
}

export type DidMetadata = {
  /**
   * Additional properties of any type.
   */
  [key: string]: any;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DidMethod {}

export interface DidMethodApi extends DidMethodOperator, DidMethodResolver {
  new (): DidMethod;
  methodName: string;
}

export interface DidMethodResolver {
  new (): DidMethod;
  methodName: string;

  resolve(options: {
    didUrl: string,
    resolutionOptions?: DidResolutionOptions
  }): Promise<DidResolutionResult>;
}

export interface DidMethodOperator {
  new (): DidMethod;
  methodName: string;

  create(options: any): Promise<PortableDid>;

  generateKeySet(): Promise<DidKeySet>;

  getDefaultSigningKey(options: { didDocument: DidDocument }): Promise<string | undefined>;
}

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
  contentType?: string

  error?:
    /**
     * When an unexpected error occurs during DID Resolution or DID URL dereferencing, the value of the DID Resolution or DID URL Dereferencing Metadata error property MUST be internalError.
     */
    | 'internalError'

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
    | 'representationNotSupported'
    | string

  // Additional output metadata generated during DID Resolution.
  [key: string]: any
};

/**
 * DID Resolution input metadata.
 *
 * @see {@link https://www.w3.org/TR/did-core/#did-resolution-options}
 */
export interface DidResolutionOptions {
  accept?: string

  // Additional properties used during DID Resolution.
  [key: string]: any
}

export type DidResolutionResult = {
  '@context'?: 'https://w3id.org/did-resolution/v1' | string | string[]
  didResolutionMetadata: DidResolutionMetadata
  didDocument?: DidDocument
  didDocumentMetadata: DidDocumentMetadata
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
  // one of the valid verification method types as per
  // https://www.w3.org/TR/did-spec-registries/#verification-method-types
  type: string;
  // DID of the key's controller
  controller: string;
  // a JSON Web Key that conforms to https://datatracker.ietf.org/doc/html/rfc7517
  publicKeyJwk?: PublicKeyJwk;
  // an encoded (e.g, base58) key with a Multibase-prefix that conforms to
  // https://datatracker.ietf.org/doc/draft-multiformats-multibase/
  publicKeyMultibase?: string;
};

export type VerificationRelationship =
  /**
   * Used to specify how the DID subject is expected to express claims, such
   * as for the purposes of issuing a Verifiable Credential
   */
  | 'assertionMethod'

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
