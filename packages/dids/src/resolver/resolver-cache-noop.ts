import type { DidResolutionResult } from '../types/did-core.js';
import type { DidResolverCache } from '../types/did-resolution.js';

/**
 * No-op cache that is used as the default cache for did-resolver.
 *
 * The motivation behind using a no-op cache as the default stems from the desire to maximize the
 * potential for this library to be used in as many JS runtimes as possible.
 */
export const DidResolverCacheNoop: DidResolverCache = {
  get: function (_key: string): Promise<DidResolutionResult> {
    return null as any;
  },
  set: function (_key: string, _value: DidResolutionResult): Promise<void> {
    return null as any;
  },
  delete: function (_key: string): Promise<void> {
    return null as any;
  },
  clear: function (): Promise<void> {
    return null as any;
  },
  close: function (): Promise<void> {
    return null as any;
  }
};