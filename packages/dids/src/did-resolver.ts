import type { DidResolutionResult, DidMethodResolver, DidResolverCache } from './types.js';

import { parseDid } from './utils.js';
import { nopCache } from './nop-cache.js';

export type DidResolverOptions = {
  methodResolvers: DidMethodResolver[];
  cache?: DidResolverCache;
}

export class DidResolver {
  cache: DidResolverCache;
  methodResolverMap: Map<string, DidMethodResolver> = new Map();

  constructor(options: DidResolverOptions) {
    this.cache = options.cache || nopCache;

    for (let methodResolver of options.methodResolvers) {
      this.methodResolverMap.set(methodResolver.methodName, methodResolver);
    }
  }

  async resolve(did: string): Promise<DidResolutionResult> {
    // TODO: Support resolutionOptions as defined in https://www.w3.org/TR/did-core/#did-resolution
    const { method } = parseDid(did);
    const resolver = this.methodResolverMap.get(method);

    if (!resolver) {
      throw new Error(`no resolver for ${method}`);
    }

    const cachedResolution = await this.cache.get(did);

    if (cachedResolution) {
      return cachedResolution;
    } else {
      const didResolutionResult = await resolver.resolve(did);
      await this.cache.set(did, didResolutionResult);

      return didResolutionResult;
    }
  }
}