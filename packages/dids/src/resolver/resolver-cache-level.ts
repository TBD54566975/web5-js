import type { AbstractLevel } from 'abstract-level';

import ms from 'ms';
import { Level } from 'level';

import type { DidResolutionResult } from '../types/did-core.js';
import type { DidResolverCache } from '../types/did-resolution.js';

/**
 * Configuration parameters for creating a LevelDB-based cache for DID resolution results.
 *
 * Allows customization of the underlying database instance, storage location, and cache
 * time-to-live (TTL) settings.
 */
export type DidResolverCacheLevelParams = {
  /**
   * Optional. An instance of `AbstractLevel` to use as the database. If not provided, a new
   * LevelDB instance will be created at the specified `location`.
   */
  db?: AbstractLevel<string | Buffer | Uint8Array, string, string>;

  /**
   * Optional. The file system path or IndexedDB name where the LevelDB store will be created.
   * Defaults to 'DATA/DID_RESOLVERCACHE' if not specified.
   */
  location?: string;

  /**
   * Optional. The time-to-live for cache entries, expressed as a string (e.g., '1h', '15m').
   * Determines how long a cache entry should remain valid before being considered expired. Defaults
   * to '15m' if not specified.
   */
  ttl?: string;
}

/**
 * Encapsulates a DID resolution result along with its expiration information for caching purposes.
 *
 * This type is used internally by the `DidResolverCacheLevel` to store DID resolution results
 * with an associated time-to-live (TTL) value. The TTL is represented in milliseconds and
 * determines when the cached entry is considered expired and eligible for removal.
 */
type CachedDidResolutionResult = {
  /**
   * The expiration time of the cache entry in milliseconds since the Unix epoch.
   *
   * This value is used to calculate whether the cached entry is still valid or has expired.
   */
  ttlMillis: number;

  /**
   * The DID resolution result being cached.
   *
   * This object contains the resolved DID document and associated metadata.
   */
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
  /** The underlying LevelDB store used for caching. */
  private cache;

  /** The time-to-live for cache entries in milliseconds. */
  private ttl: number;

  constructor({
    db,
    location = 'DATA/DID_RESOLVERCACHE',
    ttl = '15m'
  }: DidResolverCacheLevelParams = {}) {
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
      const cachedDidResolutionResult: CachedDidResolutionResult = JSON.parse(str);

      if (Date.now() >= cachedDidResolutionResult.ttlMillis) {
        // defer deletion to be called in the next tick of the js event loop
        this.cache.nextTick(() => this.cache.del(did));

        return;
      } else {
        return cachedDidResolutionResult.value;
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
    const cachedDidResolutionResult: CachedDidResolutionResult = { ttlMillis: Date.now() + this.ttl, value };
    const str = JSON.stringify(cachedDidResolutionResult);

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