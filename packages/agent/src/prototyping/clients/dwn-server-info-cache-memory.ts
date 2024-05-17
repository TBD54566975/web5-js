
import ms from 'ms';
import { TtlCache } from '@web5/common';
import { DwnServerInfoCache, ServerInfo } from './server-info-types.js';

/**
 * Configuration parameters for creating an in-memory cache for DWN ServerInfo entries.
 *
 * Allows customization of the cache time-to-live (TTL) setting.
 */
export type DwnServerInfoCacheMemoryParams = {
  /**
   * Optional. The time-to-live for cache entries, expressed as a string (e.g., '1h', '15m').
   * Determines how long a cache entry should remain valid before being considered expired.
   *
   * Defaults to '15m' if not specified.
   */
  ttl?: string;
}

export class DwnServerInfoCacheMemory implements DwnServerInfoCache {
  private cache: TtlCache<string, ServerInfo>;

  constructor({ ttl = '15m' }: DwnServerInfoCacheMemoryParams= {}) {
    this.cache = new TtlCache({ ttl: ms(ttl) });
  }

  /**
   * Retrieves a DWN ServerInfo entry from the cache.
   *
   * If the cached item has exceeded its TTL, it's scheduled for deletion and undefined is returned.
   *
   * @param dwnUrl - The DWN URL endpoint string used as the key for getting the entry.
   * @returns The cached DWN ServerInfo entry or undefined if not found or expired.
   */
  public async get(dwnUrl: string): Promise<ServerInfo| undefined> {
    return this.cache.get(dwnUrl);
  }

  /**
   * Stores a DWN ServerInfo entry in the cache with a TTL.
   *
   * @param dwnUrl - The DWN URL endpoint string used as the key for storing the entry.
   * @param value - The DWN ServerInfo entry to be cached.
   * @returns A promise that resolves when the operation is complete.
   */
  public async set(dwnUrl: string, value: ServerInfo): Promise<void> {
    this.cache.set(dwnUrl, value);
  }

  /**
   * Deletes a DWN ServerInfo entry from the cache.
   *
   * @param dwnUrl - The DWN URL endpoint string used as the key for deletion.
   * @returns A promise that resolves when the operation is complete.
   */
  public async delete(dwnUrl: string): Promise<void> {
    this.cache.delete(dwnUrl);
  }

  /**
   * Clears all entries from the cache.
   *
   * @returns A promise that resolves when the operation is complete.
   */
  public async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * This method is a no-op but exists to be consistent with other DWN ServerInfo Cache
   * implementations.
   *
   * @returns A promise that resolves immediately.
   */
  public async close(): Promise<void> {
    // No-op since there is no underlying store to close.
  }
}