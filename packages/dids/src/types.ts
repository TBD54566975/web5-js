import type { KeyValueStore } from '@web5/common';

import type { DidKeySet } from './methods/did-method.js';
import type { DidDocument, DidResolutionResult } from './types/did-core.js';


// export interface DidMethodOperator {
//   new (): DidMethod;
//   methodName: string;

//   create(options: any): Promise<PortableDid>;

//   generateKeySet(): Promise<DidKeySet>;

//   getDefaultSigningKey(options: { didDocument: DidDocument }): Promise<string | undefined>;
// }







/**
 * implement this interface to provide your own cache for did resolution results. can be plugged in through Web5 API
 */
export type DidResolverCache = KeyValueStore<string, DidResolutionResult | void>;

type DidMetadata = {
  /**
   * Additional properties of any type.
   */
  [key: string]: any;
}

/**
 * Format to document a DID identifier, along with its associated data,
 * which can be exported, saved to a file, or imported. The intent is
 * bundle all of the necessary metadata to enable usage of the DID in
 * different contexts.
 */
interface PortableDid {
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