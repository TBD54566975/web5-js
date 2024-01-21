import type { DidResolutionResult, DidResolverCache } from './types.js';

import ms from 'ms';
import { Level } from 'level';

export type DidResolverCacheOptions = {
  location?: string;
  ttl?: string;
}

type CacheWrapper = {
  ttlMillis: number;
  value: DidResolutionResult;
}

/**
 * Naive level-based cache for did resolution results. It just so happens that level aggressively keeps as much as it
 * can in memory when possible while also writing to the filesystem (in node runtime) and indexedDB (in browser runtime).
 * the persistent aspect is especially useful across page refreshes.
 */
export class DidResolverCacheLevel implements DidResolverCache {
  private cache: Level<string, string>;
  private ttl: number;

  private static defaultOptions: Required<DidResolverCacheOptions> = {
    location : 'DATA/AGENT/DID_RESOLVERCACHE',
    ttl      : '15m'
  };

  constructor(options: DidResolverCacheOptions = {}) {
    let { location, ttl } = options;

    location ??= DidResolverCacheLevel.defaultOptions.location;
    ttl ??= DidResolverCacheLevel.defaultOptions.ttl;

    this.cache = new Level(location);
    this.ttl = ms(ttl);
  }

  async get(did: string): Promise<DidResolutionResult | void> {
    try {
      const str = await this.cache.get(did);
      const cacheWrapper: CacheWrapper = JSON.parse(str);

      if (Date.now() >= cacheWrapper.ttlMillis) {
        // defer deletion to be called in the next tick of the js event loop
        this.cache.nextTick(() => this.cache.del(did));

        return;
      } else {
        return cacheWrapper.value;
      }

    } catch(error: any) {
      // Don't throw when a key wasn't found.
      if (error.code === 'LEVEL_NOT_FOUND') {
        return;
      }

      throw error;
    }
  }

  set(did: string, value: DidResolutionResult): Promise<void> {
    const cacheWrapper: CacheWrapper = { ttlMillis: Date.now() + this.ttl, value };
    const str = JSON.stringify(cacheWrapper);

    return this.cache.put(did, str);
  }

  delete(did: string): Promise<void> {
    return this.cache.del(did);
  }

  clear(): Promise<void> {
    return this.cache.clear();
  }

  close(): Promise<void> {
    return this.cache.close();
  }
}