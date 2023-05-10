import type { DidResolutionResult, DidResolverCache } from './types.js';

/**
 * no-op cache that is used as the default cache for did-resolver.
 * The motivation behind using a no-op cache as the default stems from
 * the desire to maximize the potential for this library to be used
 * in as many JS runtimes as possible
 */
export const nopCache: DidResolverCache = {
  get: function (_key: string): Promise<DidResolutionResult> {
    return;
  },
  set: function (_key: string, _value: DidResolutionResult): Promise<void> {
    return;
  },
  delete: function (_key: string): Promise<void> {
    return;
  },
  clear: function (): Promise<void> {
    return;
  },
  close: function (): Promise<void> {
    return;
  }
};