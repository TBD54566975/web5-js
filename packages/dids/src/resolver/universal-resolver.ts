import type { DidMethodResolver } from '../methods/did-method.js';
import type { DidResolver, DidResolverCache, DidUrlDereferencer } from '../types/did-resolution.js';
import type { DidDereferencingOptions, DidDereferencingResult, DidResolutionOptions, DidResolutionResult, DidResource } from '../types/did-core.js';

import { Did } from '../did.js';
import { DidErrorCode } from '../did-error.js';
import { DidResolverCacheNoop } from './resolver-cache-noop.js';
import { EMPTY_DID_RESOLUTION_RESULT } from '../types/did-resolution.js';

/**
 * Parameters for configuring the `UniversalResolver` class, which is responsible for resolving
 * decentralized identifiers (DIDs) to their corresponding DID documents.
 *
 * This type specifies the essential components required by the `UniversalResolver` to perform
 * DID resolution and dereferencing. It includes an array of `DidMethodResolver` instances,
 * each capable of resolving DIDs for a specific method, and optionally, a cache for storing
 * resolved DID documents to improve resolution efficiency.
 */
export type UniversalResolverParams = {
  /**
   * An array of `DidMethodResolver` instances.
   *
   * Each resolver in this array is designed to handle a specific DID method, enabling the
   * `DidResolver` to support multiple DID methods simultaneously.
   */
  didResolvers: DidMethodResolver[];

  /**
   * An optional `DidResolverCache` instance used for caching resolved DID documents.
   *
   * Providing a cache implementation can significantly enhance resolution performance by avoiding
   * redundant resolutions for previously resolved DIDs. If omitted, a no-operation cache is used,
   * which effectively disables caching.
   */
  cache?: DidResolverCache;
}

/**
 * The `DidResolver` class provides mechanisms for resolving Decentralized Identifiers (DIDs) to
 * their corresponding DID documents.
 *
 * The class is designed to handle various DID methods by utilizing an array of `DidMethodResolver`
 * instances, each responsible for a specific DID method.
 *
 * Providing a cache implementation can significantly enhance resolution performance by avoiding
 * redundant resolutions for previously resolved DIDs. If omitted, a no-operation cache is used,
 * which effectively disables caching.
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
export class UniversalResolver implements DidResolver, DidUrlDereferencer {
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
   * @param params - The parameters for constructing the `DidResolver`.
   */
  constructor({ cache, didResolvers }: UniversalResolverParams) {
    this.cache = cache || DidResolverCacheNoop;

    for (const resolver of didResolvers) {
      this.didResolvers.set(resolver.methodName, resolver);
    }
  }

  /**
   * Resolves a DID to a DID Resolution Result.
   *
   * If the DID Resolution Result is present in the cache, it returns the cached result. Otherwise,
   * it uses the appropriate method resolver to resolve the DID, stores the resolution result in the
   * cache, and returns the resolultion result.
   *
   * @param didUri - The DID or DID URL to resolve.
   * @returns A promise that resolves to the DID Resolution Result.
   */
  public async resolve(didUri: string, options?: DidResolutionOptions): Promise<DidResolutionResult> {

    const parsedDid = Did.parse(didUri);
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
      if (!resolutionResult.didResolutionMetadata.error) {
        // Cache the resolution result if it was successful.
        await this.cache.set(parsedDid.uri, resolutionResult);
      }

      return resolutionResult;
    }
  }

  /**
   * Dereferences a DID (Decentralized Identifier) URL to a corresponding DID resource.
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
   * @param [_options] - Input options to the dereference function. Optional.
   * @returns a {@link DidDereferencingResult}
   */
  async dereference(
    didUrl: string,
    _options?: DidDereferencingOptions
  ): Promise<DidDereferencingResult> {

    // Validate the given `didUrl` confirms to the DID URL syntax.
    const parsedDidUrl = Did.parse(didUrl);

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