import { DidResolutionResult, DidMethodResolver } from './types.js';
import { parseDid } from './utils.js';

export type DidResolverOptions = {
  methodResolvers: DidMethodResolver[];
}

export class DidResolver {
  methodResolverMap: Map<string, DidMethodResolver> = new Map();

  constructor(options: DidResolverOptions) {
    for (let methodResolver of options.methodResolvers) {
      this.methodResolverMap.set(methodResolver.methodName, methodResolver);
    }
  }

  resolve(did: string): Promise<DidResolutionResult> {
    const { method } = parseDid(did);
    const resolver = this.methodResolverMap.get(method);

    if (!resolver) {
      throw new Error(`no resolver for ${method}`);
    }

    return resolver.resolve(did);
  }
}