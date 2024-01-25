import type { AbstractLevel } from 'abstract-level';

import ms from 'ms';
import { Level } from 'level';

import type { DidResolverCache } from './did-resolver.js';
import type { DidResolutionResult } from '../types/did-core.js';

export type DidResolverCacheLevelOptions = {
  db?: AbstractLevel<string | Buffer | Uint8Array, string, string>;
  location?: string;
  ttl?: string;
}

type CacheWrapper = {
  ttlMillis: number;
  value: DidResolutionResult;
}

/**
 * A Level-based cache implementation for storing and retrieving DID resolution results.
 *
 * This cache uses LevelDB for storage, allowing data persistence across process restarts or
 * browser refreshes. It's suitable for both Node.js and browser environments.
 *
 * @remarks
 * The LevelDB cache keeps data in memory for fast access and also writes to the filesystem in
 * Node.js or indexedDB in browsers. Time-to-live (TTL) for cache entries is configurable.
 *
 * @example
 * ```
 * const cache = new DidResolverCacheLevel({ ttl: '15m' });
 * ```
 */
export class DidResolverCacheLevel implements DidResolverCache {
  private cache: AbstractLevel<string | Buffer | Uint8Array, string, string>;
  private ttl: number;

  constructor({
    db,
    location = 'DATA/DID_RESOLVERCACHE',
    ttl = '15m'
  }: DidResolverCacheLevelOptions = {}) {
    this.cache = db ?? new Level<string, string>(location);
    this.ttl = ms(ttl);
  }

  /**
   * Retrieves a DID resolution result from the cache.
   *
   * If the cached item has exceeded its TTL, it's scheduled for deletion and undefined is returned.
   *
   * @param did - The DID string used as the key for retrieving the cached result.
   * @returns The cached DID resolution result or undefined if not found or expired.
   */
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
      if (error.notFound) {
        return;
      }

      throw error;
    }
  }

  /**
   * Stores a DID resolution result in the cache with a TTL.
   *
   * @param did - The DID string used as the key for storing the result.
   * @param value - The DID resolution result to be cached.
   * @returns A promise that resolves when the operation is complete.
   */
  set(did: string, value: DidResolutionResult): Promise<void> {
    const cacheWrapper: CacheWrapper = { ttlMillis: Date.now() + this.ttl, value };
    const str = JSON.stringify(cacheWrapper);

    return this.cache.put(did, str);
  }

  /**
   * Deletes a DID resolution result from the cache.
   *
   * @param did - The DID string used as the key for deletion.
   * @returns A promise that resolves when the operation is complete.
   */
  delete(did: string): Promise<void> {
    return this.cache.del(did);
  }

  /**
   * Clears all entries from the cache.
   *
   * @returns A promise that resolves when the operation is complete.
   */
  clear(): Promise<void> {
    return this.cache.clear();
  }

  /**
   * Closes the underlying LevelDB store.
   *
   * @returns A promise that resolves when the store is closed.
   */
  close(): Promise<void> {
    return this.cache.close();
  }
}