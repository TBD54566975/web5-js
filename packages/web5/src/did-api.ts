import type { DidKeyOptions, DidIonCreateOptions, DidResolver, DidResolutionResult } from '@tbd54566975/dids';

// Map method names to option types
type CreateMethodOptions = {
  ion: DidIonCreateOptions;
  key: DidKeyOptions;
};

// A conditional type for inferring options based on the method name
type CreateOptions<M extends keyof CreateMethodOptions> = CreateMethodOptions[M];
export const DidApi = (didResolver: DidResolver) => ({
  // TODO: discuss whether we want this approach or would rather just go with options being unknown
  create<M extends keyof CreateMethodOptions>(method: M, options?: CreateOptions<M>): Promise<any> {
    return null;
  },

  resolve(did: string): Promise<DidResolutionResult> {
    return didResolver.resolve(did);
  },
});