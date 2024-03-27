import type { DidResolverCache, DidResolutionResult } from '@web5/dids';

import ms from 'ms';
import { TtlCache } from '@web5/common';

/**
 * Configuration parameters for creating an in-memory cache for DID resolution results.
 *
 * Allows customization of the cache time-to-live (TTL) setting.
 */
export type DidResolverCacheMemoryParams = {
  /**
   * Optional. The time-to-live for cache entries, expressed as a string (e.g., '1h', '15m').
   * Determines how long a cache entry should remain valid before being considered expired.
   *
   * Defaults to '15m' if not specified.
   */
  ttl?: string;
}

export class DidResolverCacheMemory implements DidResolverCache {
  private cache: TtlCache<string, DidResolutionResult>;

  constructor({ ttl = '15m' }: DidResolverCacheMemoryParams = {}) {
    this.cache = new TtlCache({ ttl: ms(ttl) });
  }

  /**
   * Retrieves a DID resolution result from the cache.
   *
   * If the cached item has exceeded its TTL, it's scheduled for deletion and undefined is returned.
   *
   * @param didUri - The DID string used as the key for retrieving the cached result.
   * @returns The cached DID resolution result or undefined if not found or expired.
   */
  public async get(didUri: string): Promise<DidResolutionResult | void> {
    if (!didUri) {
      throw new Error('Key cannot be null or undefined');
    }

    return this.cache.get(didUri);
  }

  /**
   * Stores a DID resolution result in the cache with a TTL.
   *
   * @param didUri - The DID string used as the key for storing the result.
   * @param resolutionResult - The DID resolution result to be cached.
   * @returns A promise that resolves when the operation is complete.
   */
  public async set(didUri: string, resolutionResult: DidResolutionResult): Promise<void> {
    this.cache.set(didUri, resolutionResult);
  }

  /**
   * Deletes a DID resolution result from the cache.
   *
   * @param didUri - The DID string used as the key for deletion.
   * @returns A promise that resolves when the operation is complete.
   */
  public async delete(didUri: string): Promise<void> {
    this.cache.delete(didUri);
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
   * This method is a no-op but exists to be consistent with other DID Resolver Cache
   * implementations.
   *
   * @returns A promise that resolves immediately.
   */
  public async close(): Promise<void> {
    // No-op since there is no underlying store to close.
  }
}