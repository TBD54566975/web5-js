import type {
  DidKeyOptions,
  DidIonCreateOptions,
  DidMethodApi,
  DidMethodCreator,
  DidMethodResolver,
  DidResolutionResult,
  DidState
} from '@tbd54566975/dids';

import { DidResolver } from '@tbd54566975/dids';

// Map method names to option types
type CreateMethodOptions = {
  ion: DidIonCreateOptions;
  key: DidKeyOptions;
};

// A conditional type for inferring options based on the method name
type CreateOptions<M extends keyof CreateMethodOptions> = CreateMethodOptions[M];

export type DidApiOptions = {
  didMethodApis: DidMethodApi[];
  // TODO: implement cache in DidResolver
  cache?: never
}
export class DidApi {
  private didResolver: DidResolver;
  private methodCreatorMap: Map<string, DidMethodCreator> = new Map();

  constructor(options: DidApiOptions) {
    const { didMethodApis } = options;

    this.didResolver = new DidResolver({ methodResolvers: options.didMethodApis });

    for (let methodApi of didMethodApis) {
      this.methodCreatorMap.set(methodApi.methodName, methodApi);
    }
  }
  // TODO: discuss whether we want this approach or would rather just go with options being unknown. this approach
  //       leads to a better devex because intellisense will work based on what was provided for method
  create<M extends keyof CreateMethodOptions>(method: M, options?: CreateOptions<M>): Promise<DidState> {
    const didMethodCreator = this.methodCreatorMap.get(method);
    if (!didMethodCreator) {
      throw new Error(`no creator available for ${method}`);
    }

    return didMethodCreator.create(options);
  }

  resolve(did: string): Promise<DidResolutionResult> {
    return this.didResolver.resolve(did);
  }

  /**
   * can be used to add different did method resolvers
   * @param _resolver
   */
  addResolver(_resolver: DidMethodResolver) {
    throw new Error('not yet implemented');
  }

  /**
   * can be used to add differed did method creators
   * @param _creator
   */
  addCreator(_creator: DidMethodCreator) {
    throw new Error('not yet implemented');
  }
}