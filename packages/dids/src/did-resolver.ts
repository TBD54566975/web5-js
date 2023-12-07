import type {
  DidResolverCache,
  DidMethodResolver,
  DidResolutionResult,
  DidResolutionOptions,
  DidResource
} from './types.js';

import { parseDid } from './utils.js';
import { DidResolverCacheNoop } from './resolver-cache-noop.js';

export type DidResolverOptions = {
  didResolvers: DidMethodResolver[];
  cache?: DidResolverCache;
}

export type DereferenceParams = {
  didUrl: string
}

/**
 * The `DidResolver` class is responsible for resolving DIDs to DID documents.
 * It uses method resolvers to resolve DIDs of different methods and a cache
 * to store resolved DID documents.
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
          contentType  : 'application/did+ld+json',
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
          contentType  : 'application/did+ld+json',
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
 * Asynchronously dereferences a DID (Decentralized Identifier) URL to a corresponding DID resource. This method interprets the DID URL's components, which include the DID method, method-specific identifier, path, query, and fragment,
 * and retrieves the related resource as per the DID Core specifications. The dereferencing process involves resolving the DID contained in the DID URL to a DID document, and then extracting the specific part
 * of the document identified by the fragment in the DID URL. If no fragment is specified, the entire DID document is returned. This method supports resolution of different components within a DID document such
 * as service endpoints and verification methods, based on their IDs. It accommodates both full and relative DID URLs as specified in the DID Core specification.
 *
 * More information on DID URL dereferencing can be found in the DID Core specification [here](https://www.w3.org/TR/did-core/#did-url-dereferencing)
 *
 * @param params - An object of type `DereferenceParams` containing the `didUrl` which needs to be dereferenced.
 * @returns A `Promise` that resolves to a `DidResource`, which can be the entire DID Document or a specific part of it (like a verification method or service endpoint) depending on the presence and value of the fragment in the DID URL.
 */
  async dereference(params: DereferenceParams): Promise<DidResource> {
    const { didUrl } = params;
    const { didDocument } = await this.resolve(didUrl);

    const parsedDid = parseDid(params);

    // return the entire DID Document if no fragment is present on the did url
    if (!parsedDid.fragment) {
      return didDocument;
    }

    const { service, verificationMethod } = didDocument;

    // create a set of possible id matches. the DID spec allows for an id to be the entire did#fragment or just #fragment.
    // See: https://www.w3.org/TR/did-core/#relative-did-urls
    // using a set for fast string comparison. DIDs can be lonnng.
    const idSet = new Set([didUrl, parsedDid.fragment, `#${parsedDid.fragment}`]);

    for (let vm of verificationMethod) {
      if (idSet.has(vm.id)) {
        return vm;
      }
    }

    for (let svc of service) {
      if (idSet.has(svc.id)) {
        return svc;
      }
    }
  }
}