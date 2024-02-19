import type { SyncEngine } from './types/sync.js';
import type { Web5ManagedAgent } from './types/agent.js';

export type SyncApiParams = {
  agent?: Web5ManagedAgent;
  syncEngine: SyncEngine;
}

export class AgentSyncApi implements SyncEngine {
  /**
   * Holds the instance of a `Web5ManagedAgent` that represents the current execution context for
   * the `AgentDidApi`. This agent is used to interact with other Web5 agent components. It's vital
   * to ensure this instance is set to correctly contextualize operations within the broader Web5
   * Agent framework.
   */
  private _agent?: Web5ManagedAgent;

  private _syncEngine: SyncEngine;

  constructor({ agent, syncEngine }: SyncApiParams) {
    this._syncEngine = syncEngine;
    this._agent = agent;
  }

  /**
   * Retrieves the `Web5ManagedAgent` execution context.
   *
   * @returns The `Web5ManagedAgent` instance that represents the current execution context.
   * @throws Will throw an error if the `agent` instance property is undefined.
   */
  get agent(): Web5ManagedAgent {
    if (this._agent === undefined) {
      throw new Error('AgentSyncApi: Unable to determine agent execution context.');
    }

    return this._agent;
  }

  set agent(agent: Web5ManagedAgent) {
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