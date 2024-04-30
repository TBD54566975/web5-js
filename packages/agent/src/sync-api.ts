import type { SyncEngine } from './types/sync.js';
import type { Web5PlatformAgent } from './types/agent.js';

export type SyncApiParams = {
  agent?: Web5PlatformAgent;
  syncEngine: SyncEngine;
}

export class AgentSyncApi implements SyncEngine {
  /**
   * Holds the instance of a `Web5PlatformAgent` that represents the current execution context for
   * the `AgentSyncApi`. This agent is used to interact with other Web5 agent components. It's vital
   * to ensure this instance is set to correctly contextualize operations within the broader Web5
   * Agent framework.
   */
  private _agent?: Web5PlatformAgent;

  private _syncEngine: SyncEngine;

  constructor({ agent, syncEngine }: SyncApiParams) {
    this._syncEngine = syncEngine;
    this._agent = agent;
  }

  /**
   * Retrieves the `Web5PlatformAgent` execution context.
   *
   * @returns The `Web5PlatformAgent` instance that represents the current execution context.
   * @throws Will throw an error if the `agent` instance property is undefined.
   */
  get agent(): Web5PlatformAgent {
    if (this._agent === undefined) {
      throw new Error('AgentSyncApi: Unable to determine agent execution context.');
    }

    return this._agent;
  }

  set agent(agent: Web5PlatformAgent) {
    this._agent = agent;
    this._syncEngine.agent = agent;
  }

  public async registerIdentity(params: { did: string; }): Promise<void> {
    await this._syncEngine.registerIdentity(params);
  }

  public startSync(params: { interval: string; }): Promise<void> {
    return this._syncEngine.startSync(params);
  }

  public stopSync(): void {
    this._syncEngine.stopSync();
  }
}