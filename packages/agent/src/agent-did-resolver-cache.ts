import { DidResolutionResult, DidResolverCache, DidResolverCacheLevel, DidResolverCacheLevelParams } from "@web5/dids";
import { Web5PlatformAgent } from "./types/agent.js";


export class AgentDidResolverCache extends DidResolverCacheLevel implements DidResolverCache {

  private _agent?: Web5PlatformAgent;

  private _resolving: Record<string, boolean> = {};

  constructor({ agent, db, location, ttl }: DidResolverCacheLevelParams & { agent?: Web5PlatformAgent }) {
    super ({ db, location, ttl });
    this._agent = agent;
  }

  get agent() {
    if (!this._agent) {
      throw new Error("Agent not initialized");
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
      if (!this._resolving[did] && Date.now() >= cachedResult.ttlMillis) {
        this._resolving[did] = true;
        const list = await this.agent.identity.list();
        if (this.agent.agentDid.uri === did || list.find(identity => identity.did.uri === did)) {
          this.agent.did.resolve(did).then(result => {
            if (!result.didResolutionMetadata.error) {
              this.set(did, result);
            }
          }).finally(() => delete this._resolving[did])
        }
        else {
          delete this._resolving[did];
          this.cache.nextTick(() => this.cache.del(did));
          return;
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