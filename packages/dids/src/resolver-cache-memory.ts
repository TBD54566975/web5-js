import { type DidResolutionResult, type DidResolverCache } from '@web5/dids';
import ms from 'ms';

type DidResolverCacheOptions = {
  ttl?: string;
};

type CacheWrapper = {
  ttlMillis: number;
  value: DidResolutionResult;
};

/**
 * Simple unpersisted memory-based cache for did resolution results.
 */
export class DidResolverCacheMemory implements DidResolverCache {
  private cache: Map<string, CacheWrapper>;
  private ttl: number;

  constructor(options: DidResolverCacheOptions = {}) {
    let { ttl } = options;

    ttl ??= '15m';

    this.cache = new Map();
    this.ttl = ms(ttl);
  }

  async get(did: string) {
    const cacheWrapper = this.cache.get(did);
    if (!cacheWrapper) return;

    if (Date.now() >= cacheWrapper.ttlMillis) {
      this.cache.delete(did);
      // this.cache.nextTick(() => this.cache.del(did));
      return;
    } else {
      return cacheWrapper.value;
    }
  }

  set(did: string, value: DidResolutionResult) {
    const cacheWrapper = {
      ttlMillis: Date.now() + this.ttl,
      value,
    };

    this.cache.set(did, cacheWrapper);
    return Promise.resolve();
  }

  delete(did: string) {
    this.cache.delete(did);
    return Promise.resolve();
  }

  clear() {
    this.cache.clear();
    return Promise.resolve();
  }

  close() {
    return Promise.resolve();
  }
}
