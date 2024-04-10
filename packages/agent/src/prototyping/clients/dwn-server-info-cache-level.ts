import type { AbstractLevel } from 'abstract-level';

import ms from 'ms';
import { Level } from 'level';
import { DwnServerInfoCache, ServerInfo } from './server-info-types.js';

/**
 * Configuration parameters for creating a LevelDB-based cache for DWN Server Info results.
 *
 * Allows customization of the underlying database instance, storage location, and cache
 * time-to-live (TTL) settings.
 */
export type DwnServerCacheLevelParams = {
  /**
   * Optional. An instance of `AbstractLevel` to use as the database. If not provided, a new
   * LevelDB instance will be created at the specified `location`.
   */
  db?: AbstractLevel<string | Buffer | Uint8Array, string, string>;

  /**
   * Optional. The file system path or IndexedDB name where the LevelDB store will be created.
   * Defaults to 'DATA/DWN_SERVERINFOCACHE' if not specified.
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
 * Encapsulates a ServerInfo result along with its expiration information for caching purposes.
 *
 * This type is used internally by the `DwnServerInfoCacheLevel` to store DWN ServerInfo results
 * with an associated time-to-live (TTL) value. The TTL is represented in milliseconds and
 * determines when the cached entry is considered expired and eligible for removal.
 */
type CacheWrapper = {
  /**
   * The expiration time of the cache entry in milliseconds since the Unix epoch.
   *
   * This value is used to calculate whether the cached entry is still valid or has expired.
   */
  ttlMillis: number;

  /**
   * The DWN ServerInfo entry being cached.
   */
  value: ServerInfo;
}

/**
 * A Level-based cache implementation for storing and retrieving DWN ServerInfo results.
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
 * const cache = new DwnServerInfoCacheLevel({ ttl: '15m' });
 * ```
 */
export class DwnServerInfoCacheLevel implements DwnServerInfoCache {
  /** The underlying LevelDB store used for caching. */
  private cache: AbstractLevel<string | Buffer | Uint8Array, string, string>;

  /** The time-to-live for cache entries in milliseconds. */
  private ttl: number;

  constructor({
    db,
    location = 'DATA/DWN_SERVERINFOCACHE',
    ttl = '15m'
  }: DwnServerCacheLevelParams = {}) {
    this.cache = db ?? new Level<string, string>(location);
    this.ttl = ms(ttl);
  }

  /**
   * Retrieves a DWN ServerInfo entry from the cache.
   *
   * If the cached item has exceeded its TTL, it's scheduled for deletion and undefined is returned.
   *
   * @param dwnUrl - The DWN URL endpoint string used as the key for retrieving the cached result.
   * @returns The cached ServerInfo entry or undefined if not found or expired.
   */
  async get(dwnUrl: string): Promise<ServerInfo| undefined> {
    try {
      const str = await this.cache.get(dwnUrl);
      const cacheWrapper: CacheWrapper = JSON.parse(str);

      if (Date.now() >= cacheWrapper.ttlMillis) {
        // defer deletion to be called in the next tick of the js event loop
        this.cache.nextTick(() => this.cache.del(dwnUrl));

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
   * Stores a DWN ServerInfo entry in the cache with a TTL.
   *
   * @param dwnUrl - The DWN URL endpoint string used as the key for storing the result.
   * @param value - The DWN ServerInfo entry to be cached.
   * @returns A promise that resolves when the operation is complete.
   */
  set(dwnUrl: string, value: ServerInfo): Promise<void> {
    const cacheWrapper: CacheWrapper = { ttlMillis: Date.now() + this.ttl, value };
    const str = JSON.stringify(cacheWrapper);

    return this.cache.put(dwnUrl, str);
  }

  /**
   * Deletes a DWN ServerInfo entry from the cache.
   *
   * @param dwnUrl - The DWN URL endpoint string used as the key deletion.
   * @returns A promise that resolves when the operation is complete.
   */
  delete(dwnUrl: string): Promise<void> {
    return this.cache.del(dwnUrl);
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