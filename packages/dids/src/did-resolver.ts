import type {
  DidResource,
  DidResolverCache,
  DidMethodResolver,
  DidResolutionResult,
  DidResolutionOptions,
  DidDereferencingResult,
  DidDereferencingOptions,
} from './types.js';

import { parseDid } from './utils.js';
import { DidResolverCacheNoop } from './resolver-cache-noop.js';

export type DidResolverOptions = {
  didResolvers: DidMethodResolver[];
  cache?: DidResolverCache;
}

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
 * const dereferenceResult = await resolver.dereference({ didUrl: 'did:example:123456#key-1' });
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
   * @param didUrl - The DID or DID URL to resolve.
   * @returns A promise that resolves to the DID Resolution Result.
   */
  async resolve(didUrl: string, resolutionOptions?: DidResolutionOptions): Promise<DidResolutionResult> {

    const parsedDid = parseDid({ didUrl });
    if (!parsedDid) {
      return {
        '@context'            : 'https://w3id.org/did-resolution/v1',
        didDocument           : undefined,
        didDocumentMetadata   : {},
        didResolutionMetadata : {
          error        : 'invalidDid',
          errorMessage : `Cannot parse DID: ${didUrl}`
        }
      };
    }

    const resolver = this.didResolvers.get(parsedDid.method);
    if (!resolver) {
      return {
        '@context'            : 'https://w3id.org/did-resolution/v1',
        didDocument           : undefined,
        didDocumentMetadata   : {},
        didResolutionMetadata : {
          error        : 'methodNotSupported',
          errorMessage : `Method not supported: ${parsedDid.method}`
        }
      };
    }

    const cachedResolutionResult = await this.cache.get(parsedDid.did);

    if (cachedResolutionResult) {
      return cachedResolutionResult;
    } else {
      const resolutionResult = await resolver.resolve({
        didUrl: parsedDid.did,
        resolutionOptions
      });

      await this.cache.set(parsedDid.did, resolutionResult);

      return resolutionResult;
    }
  }

  /**
   * Dereferences a DID (Decentralized Identifier) URL to a corresponding DID resource. This method
   * interprets the DID URL's components, which include the DID method, method-specific identifier,
   * path, query, and fragment, and retrieves the related resource as per the DID Core specifications.
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
   * @param didUrl - The DID URL string to dereference.
   * @param [dereferenceOptions] - Input options to the dereference function. Optional.
   * @returns a {@link DidDereferencingResult}
   */
  async dereference({ didUrl }: {
    didUrl: string,
    dereferenceOptions?: DidDereferencingOptions
  }): Promise<DidDereferencingResult> {
    const { didDocument, didResolutionMetadata = {}, didDocumentMetadata = {} } = await this.resolve(didUrl);
    if (didResolutionMetadata.error) {
      return {
        dereferencingMetadata : { error: 'invalidDidUrl' },
        contentStream         : null,
        contentMetadata       : {}
      };
    }

    const parsedDid = parseDid({ didUrl });

    // Return the entire DID Document if no fragment is present on the did url
    if (!parsedDid.fragment) {
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
    const idSet = new Set([didUrl, parsedDid.fragment, `#${parsedDid.fragment}`]);

    let didResource: DidResource;
    for (let vm of verificationMethod) {
      if (idSet.has(vm.id)) {
        didResource = vm;
        break;
      }
    }

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
        dereferencingMetadata : { error: 'notFound' },
        contentStream         : null,
        contentMetadata       : {},
      };
    }
  }
}