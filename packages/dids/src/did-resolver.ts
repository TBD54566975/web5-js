import type {
  DidResolverCache,
  DidMethodResolver,
  DidResolutionResult,
  DidResolutionOptions,
} from './types.js';

import { parseDid } from './utils.js';
import { DidResolverCacheNoop } from './resolver-cache-noop.js';

export type DidResolverOptions = {
  didResolvers: DidMethodResolver[];
  cache?: DidResolverCache;
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
}