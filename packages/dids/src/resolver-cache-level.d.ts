import type { DidResolutionResult, DidResolverCache } from './types.js';
export type DidResolverCacheOptions = {
    location?: string;
    ttl?: string;
};
/**
 * Naive level-based cache for did resolution results. It just so happens that level aggressively keeps as much as it
 * can in memory when possible while also writing to the filesystem (in node runtime) and indexedDB (in browser runtime).
 * the persistent aspect is especially useful across page refreshes.
 */
export declare class DidResolverCacheLevel implements DidResolverCache {
    private cache;
    private ttl;
    private static defaultOptions;
    constructor(options?: DidResolverCacheOptions);
    get(did: string): Promise<DidResolutionResult | void>;
    set(did: string, value: DidResolutionResult): Promise<void>;
    delete(did: string): Promise<void>;
    clear(): Promise<void>;
    close(): Promise<void>;
}
//# sourceMappingURL=resolver-cache-level.d.ts.map