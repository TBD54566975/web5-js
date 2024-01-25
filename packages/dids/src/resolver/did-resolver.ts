import type { KeyValueStore } from '@web5/common';

import type { DidMethodResolver } from '../methods/did-method.js';
import type { DidDereferencingOptions, DidDereferencingResult, DidResolutionOptions, DidResolutionResult, DidResource } from '../types/did-core.js';

import { DidUri } from '../did-uri.js';
import { DidErrorCode } from '../did-error.js';
import { DidResolverCacheNoop } from './resolver-cache-noop.js';

/**
 * Interface for cache implementations used by {@link DidResolver} to store resolved DID documents.
 */
export interface DidResolverCache extends KeyValueStore<string, DidResolutionResult | void> {}

export type DidResolverOptions = {
  didResolvers: DidMethodResolver[];
  cache?: DidResolverCache;
}

export const EMPTY_DID_RESOLUTION_RESULT: DidResolutionResult = {
  '@context'            : 'https://w3id.org/did-resolution/v1',
  didResolutionMetadata : {},
  didDocument           : null,
  didDocumentMetadata   : {},
};

/**
 * The `DidResolver` class provides mechanisms for resolving Decentralized Identifiers (DIDs) to
 * their corresponding DID documents.
 *
 * The class is designed to handle various DID methods by utilizing an array of `DidMethodResolver`
 * instances, each responsible for a specific DID method. It also employs a caching mechanism to
 * store and retrieve previously resolved DID documents for efficiency.
 *
 * Usage:
 * - Construct the `DidResolver` with an array of `DidMethodResolver` instances and an optional cache.
 * - Use `resolve` to resolve a DID to its DID Resolution Result.
 * - Use `dereference` to extract specific resources from a DID URL, like service endpoints or verification methods.
 *
 * @example
 * ```ts
 * const resolver = new DidResolver({
 *   didResolvers: [<array of DidMethodResolver instances>],
 *   cache: new DidResolverCacheNoop()
 * });
 *
 * const resolutionResult = await resolver.resolve('did:example:123456');
 * const dereferenceResult = await resolver.dereference({ didUri: 'did:example:123456#key-1' });
 * ```
 */
export class DidResolver {
  /**
   * A cache for storing resolved DID documents.
   */
  private cache: DidResolverCache;

  /**
   * A map to store method resolvers against method names.
   */
  private didResolvers: Map<string, DidMethodResolver> = new Map();

  /**
   * Constructs a new `DidResolver`.
   *
   * @param options - The options for constructing the `DidResolver`.
   * @param options.didResolvers - An array of `DidMethodResolver` instances.
   * @param options.cache - Optional. A cache for storing resolved DID documents. If not provided, a no-operation cache is used.
   */
  constructor(options: DidResolverOptions) {
    this.cache = options.cache || DidResolverCacheNoop;

    for (const resolver of options.didResolvers) {
      this.didResolvers.set(resolver.methodName, resolver);
    }
  }

  /**
   * Resolves a DID to a DID Resolution Result.
   * If the DID Resolution Result is present in the cache, it returns the cached
   * result. Otherwise, it uses the appropriate method resolver to resolve
   * the DID, stores the resolution result in the cache, and returns the
   * resolultion result.
   *
   * Note: The method signature for resolve() in this implementation must match
   * the `DidResolver` implementation in
   * {@link https://github.com/TBD54566975/dwn-sdk-js | dwn-sdk-js} so that
   * Web5 apps and the underlying DWN instance can share the same DID
   * resolution cache.
   *
   * @param didUri - The DID or DID URL to resolve.
   * @returns A promise that resolves to the DID Resolution Result.
   */
  public async resolve(didUri: string, options?: DidResolutionOptions): Promise<DidResolutionResult> {

    const parsedDid = DidUri.parse(didUri);
    if (!parsedDid) {
      return {
        ...EMPTY_DID_RESOLUTION_RESULT,
        didResolutionMetadata: {
          error        : DidErrorCode.InvalidDid,
          errorMessage : `Invalid DID URI: ${didUri}`
        }
      };
    }

    const resolver = this.didResolvers.get(parsedDid.method);
    if (!resolver) {
      return {
        ...EMPTY_DID_RESOLUTION_RESULT,
        didResolutionMetadata: {
          error        : DidErrorCode.MethodNotSupported,
          errorMessage : `Method not supported: ${parsedDid.method}`
        }
      };
    }

    const cachedResolutionResult = await this.cache.get(parsedDid.uri);

    if (cachedResolutionResult) {
      return cachedResolutionResult;
    } else {
      const resolutionResult = await resolver.resolve(parsedDid.uri, options);

      await this.cache.set(parsedDid.uri, resolutionResult);

      return resolutionResult;
    }
  }

  /**
   * Dereferences a DID (Decentralized Identifier) URL to a corresponding DID resource.
   *
   *
   * This method interprets the DID URL's components, which include the DID method, method-specific
   * identifier, path, query, and fragment, and retrieves the related resource as per the DID Core
   * specifications.
   *
   * The dereferencing process involves resolving the DID contained in the DID URL to a DID document,
   * and then extracting the specific part of the document identified by the fragment in the DID URL.
   * If no fragment is specified, the entire DID document is returned.
   *
   * This method supports resolution of different components within a DID document such as service
   * endpoints and verification methods, based on their IDs. It accommodates both full and
   * DID URLs as specified in the DID Core specification.
   *
   * More information on DID URL dereferencing can be found in the
   * {@link https://www.w3.org/TR/did-core/#did-url-dereferencing | DID Core specification}.
   *
   * TODO: This is a partial implementation and does not fully implement DID URL dereferencing. (https://github.com/TBD54566975/web5-js/issues/387)
   *
   * @param didUrl - The DID URL string to dereference.
   * @param [dereferenceOptions] - Input options to the dereference function. Optional.
   * @returns a {@link DidDereferencingResult}
   */
  async dereference(
    didUrl: string,
    _options?: DidDereferencingOptions
  ): Promise<DidDereferencingResult> {

    // Validate the given `didUrl` confirms to the DID URL syntax.
    const parsedDidUrl = DidUri.parse(didUrl);

    if (!parsedDidUrl) {
      return {
        dereferencingMetadata : { error: DidErrorCode.InvalidDidUrl },
        contentStream         : null,
        contentMetadata       : {}
      };
    }

    // Obtain the DID document for the input DID by executing DID resolution.
    const { didDocument, didResolutionMetadata, didDocumentMetadata } = await this.resolve(parsedDidUrl.uri);

    if (!didDocument) {
      return {
        dereferencingMetadata : { error: didResolutionMetadata.error },
        contentStream         : null,
        contentMetadata       : {}
      };
    }

    // Return the entire DID Document if no query or fragment is present on the DID URL.
    if (!parsedDidUrl.fragment || parsedDidUrl.query) {
      return {
        dereferencingMetadata : { contentType: 'application/did+json' },
        contentStream         : didDocument,
        contentMetadata       : didDocumentMetadata
      };
    }

    const { service = [], verificationMethod = [] } = didDocument;

    // Create a set of possible id matches. The DID spec allows for an id to be the entire
    // did#fragment or just #fragment.
    // @see {@link }https://www.w3.org/TR/did-core/#relative-did-urls | Section 3.2.2, Relative DID URLs}.
    // Using a Set for fast string comparison since some DID methods have long identifiers.
    const idSet = new Set([didUrl, parsedDidUrl.fragment, `#${parsedDidUrl.fragment}`]);

    let didResource: DidResource | undefined;

    // Find the first matching verification method in the DID document.
    for (let vm of verificationMethod) {
      if (idSet.has(vm.id)) {
        didResource = vm;
        break;
      }
    }

    // Find the first matching service in the DID document.
    for (let svc of service) {
      if (idSet.has(svc.id)) {
        didResource = svc;
        break;
      }
    }

    if (didResource) {
      return {
        dereferencingMetadata : { contentType: 'application/did+json' },
        contentStream         : didResource,
        contentMetadata       : didResolutionMetadata
      };
    } else {
      return {
        dereferencingMetadata : { error: DidErrorCode.NotFound },
        contentStream         : null,
        contentMetadata       : {},
      };
    }
  }
}