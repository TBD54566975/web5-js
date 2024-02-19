import type { Web5ManagedAgent } from './agent.js';

export interface SyncEngine {
  agent: Web5ManagedAgent;
  registerIdentity(params: { did: string }): Promise<void>;
  startSync(params: { interval: string }): Promise<void>;
  stopSync(): void;
}