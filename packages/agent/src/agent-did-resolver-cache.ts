import { DidResolutionResult, DidResolverCache, DidResolverCacheLevel, DidResolverCacheLevelParams } from '@web5/dids';
import { Web5PlatformAgent } from './types/agent.js';


/**
 * AgentDidResolverCache keeps a stale copy of the Agent's managed Identity DIDs and only evicts and refreshes upon a successful resolution.
 * This allows for quick and offline access to the internal DIDs used by the agent.
 */
export class AgentDidResolverCache extends DidResolverCacheLevel implements DidResolverCache {

  /**
   * Holds the instance of a `Web5PlatformAgent` that represents the current execution context for
   * the `AgentDidApi`. This agent is used to interact with other Web5 agent components. It's vital
   * to ensure this instance is set to correctly contextualize operations within the broader Web5
   * Agent framework.
   */
  private _agent?: Web5PlatformAgent;

  /** A map of DIDs that are currently in-flight. This helps avoid going into an infinite loop */
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

  /**
   * Get the DID resolution result from the cache for the given DID.
   *
   * If the DID is managed by the agent, or is the agent's own DID, it will not evict it from the cache until a new resolution is successful.
   * This is done to achieve quick and offline access to the agent's own managed DIDs.
   */
  async get(did: string): Promise<DidResolutionResult | void> {
    try {
      const str = await this.cache.get(did);
      const cachedResult = JSON.parse(str);
      if (!this._resolving.has(did) && Date.now() >= cachedResult.ttlMillis) {
        this._resolving.set(did, true);

        // if a DID is stored in the DID Store, then we don't want to evict it from the cache until we have a successful resolution
        // upon a successful resolution, we will update both the storage and the cache with the newly resolved Document.
        const storedDid = await this.agent.did.get({ didUri: did, tenant: this.agent.agentDid.uri });
        if ('undefined' !==  typeof storedDid) {
          try {
            const result = await this.agent.did.resolve(did);

            // if the resolution was successful, update the stored DID with the new Document
            if (!result.didResolutionMetadata.error && result.didDocument) {

              const portableDid = {
                ...storedDid,
                document : result.didDocument,
                metadata : result.didDocumentMetadata,
              };

              // this will throw an error if the DID is not managed by the agent, or there is no difference between the stored and resolved DID
              try {
                await this.agent.did.update({ portableDid, tenant: this.agent.agentDid.uri });
              } catch(error: any) {
                // if the error is not due to no changes detected, log the error
                if (error.message && !error.message.includes('No changes detected, update aborted')) {
                  console.error(`Error updating DID: ${error.message}`);
                }
              }
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