import { DidResolutionResult, DidResolverCache, DidResolverCacheLevel, DidResolverCacheLevelParams } from '@web5/dids';
import { Web5PlatformAgent } from './types/agent.js';


export class AgentDidResolverCache extends DidResolverCacheLevel implements DidResolverCache {

  private _agent?: Web5PlatformAgent;

  private _resolving: Map<string, boolean> = new Map();

  constructor({ agent, db, location, ttl }: DidResolverCacheLevelParams & { agent?: Web5PlatformAgent }) {
    super ({ db, location, ttl });
    this._agent = agent;
  }

  get agent() {
    if (!this._agent) {
      throw new Error('Agent not initialized');
    }
    return this._agent;
  }

  set agent(agent: Web5PlatformAgent) {
    this._agent = agent;
  }

  async get(did: string): Promise<DidResolutionResult | void> {
    try {
      const str = await this.cache.get(did);
      const cachedResult = JSON.parse(str);
      if (!this._resolving.has(did) && Date.now() >= cachedResult.ttlMillis) {
        this._resolving.set(did, true);
        if (this.agent.agentDid.uri === did || 'undefined' !==  typeof await this.agent.identity.get({ didUri: did })) {
          try {
            const result = await this.agent.did.resolve(did);
            if (!result.didResolutionMetadata.error) {
              this.set(did, result);
            }
          } finally {
            this._resolving.delete(did);
          }
        } else {
          this._resolving.delete(did);
          this.cache.nextTick(() => this.cache.del(did));
        }
      }
      return cachedResult.value;
    } catch(error: any) {
      if (error.notFound) {
        return;
      }
      throw error;
    }
  }
}