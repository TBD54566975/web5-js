import type { KeyValueStore } from '@web5/common';

import type { DidDereferencingOptions, DidDereferencingResult, DidResolutionOptions, DidResolutionResult } from './did-core.js';

/**
 * Represents the interface for resolving a Decentralized Identifier (DID) to its corresponding DID
 * document.
 *
 * The `DidResolver` interface defines a single method, `resolve`, which takes a DID URL as input
 * and returns a `Promise` that resolves to a `DidResolutionResult`. This result contains the DID
 * document associated with the given DID, along with metadata about the resolution process.
 *
 * Implementations of this interface are expected to support resolution of DIDs according to the
 * specific rules and methods defined by the DID scheme in use.
 *
 * More information on DID URL dereferencing can be found in the
 * {@link https://www.w3.org/TR/did-core/#did-resolution | DID Core specification}.
 *
 * @example
 * ```typescript
 * const resolutionResult = await didResolver.resolve('did:example:123456789abcdefghi');
 * ```
 */
export interface DidResolver {
  /**
   * Resolves a DID URI to a DID document and associated metadata.
   *
   * This function should resolve the DID URI in accordance with the relevant DID method
   * specification, using the provided `options`.
   *
   * @param didUri - The DID URI to be resolved.
   * @param options - Optional. The options used for resolving the DID.
   * @returns A {@link DidResolutionResult} object containing the DID document and metadata or an
   *          error.
   */
  resolve(didUrl: string, options?: DidResolutionOptions): Promise<DidResolutionResult>;
}

/**
 * Interface for cache implementations used by to store resolved DID documents.
 */
export interface DidResolverCache extends KeyValueStore<string, DidResolutionResult | void> {}

/**
 * Represents the interface for dereferencing a DID URL to a specific resource within a DID
 * document.
 *
 * The `DidUrlDereferencer` interface defines a single method, `dereference`, which takes a DID URL
 * as input and returns a `Promise` that resolves to a `DidDereferencingResult`. This result
 * includes the dereferenced resource (if found) and metadata about the dereferencing process.
 *
 * Dereferencing a DID URL involves parsing the URL to identify the specific part of the DID
 * document being referenced, which could be a verification method, a service endpoint, or the
 * entire document itself.
 *
 * Implementations of this interface must adhere to the dereferencing mechanisms defined in the DID
 * Core specifications, handling various components of the DID URL including the DID itself, path,
 * query, and fragment.
 *
 * More information on DID URL dereferencing can be found in the
 * {@link https://www.w3.org/TR/did-core/#did-url-dereferencing | DID Core specification}.
 *
 * @example
 * ```typescript
 * const dereferenceResult = await didUrlDereferencer.dereference('did:example:123456789abcdefghi#keys-1');
 * ```
 */
export interface DidUrlDereferencer {
  /**
   * Dereferences a DID (Decentralized Identifier) URL to a corresponding DID resource.
   *
   * This method interprets the DID URL's components, which include the DID method, method-specific
   * identifier, path, query, and fragment, and retrieves the related resource as per the DID Core
   * specifications.
   *
   * @param didUrl - The DID URL string to dereference.
   * @param options - Input options to the dereference function. Optional.
   * @returns a {@link DidDereferencingResult}
   */
  dereference(didUrl: string, options?: DidDereferencingOptions): Promise<DidDereferencingResult>;
}

/**
 * A constant representing an empty DID Resolution Result. This object is used as the basis for a
 * result of DID resolution and is typically augmented with additional properties by the
 * DID method resolver.
 */
export const EMPTY_DID_RESOLUTION_RESULT: DidResolutionResult = {
  '@context'            : 'https://w3id.org/did-resolution/v1',
  didResolutionMetadata : {},
  didDocument           : null,
  didDocumentMetadata   : {},
};