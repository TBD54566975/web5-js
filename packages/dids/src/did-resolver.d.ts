import type { DidResolverCache, DidMethodResolver, DidResolutionResult, DidResolutionOptions, DidDereferencingResult, DidDereferencingOptions } from './types.js';
export type DidResolverOptions = {
    didResolvers: DidMethodResolver[];
    cache?: DidResolverCache;
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
 * const dereferenceResult = await resolver.dereference({ didUrl: 'did:example:123456#key-1' });
 * ```
 */
export declare class DidResolver {
    /**
     * A cache for storing resolved DID documents.
     */
    private cache;
    /**
     * A map to store method resolvers against method names.
     */
    private didResolvers;
    /**
     * Constructs a new `DidResolver`.
     *
     * @param options - The options for constructing the `DidResolver`.
     * @param options.didResolvers - An array of `DidMethodResolver` instances.
     * @param options.cache - Optional. A cache for storing resolved DID documents. If not provided, a no-operation cache is used.
     */
    constructor(options: DidResolverOptions);
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
    resolve(didUrl: string, resolutionOptions?: DidResolutionOptions): Promise<DidResolutionResult>;
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
    dereference({ didUrl }: {
        didUrl: string;
        dereferenceOptions?: DidDereferencingOptions;
    }): Promise<DidDereferencingResult>;
}
//# sourceMappingURL=did-resolver.d.ts.map