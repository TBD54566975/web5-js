import type { Web5PlatformAgent } from './agent.js';

export type SyncIdentityOptions = {
  delegateDid?: string;
  protocols: string[]
}
export interface SyncEngine {
  agent: Web5PlatformAgent;
  registerIdentity(params: { did: string, options: SyncIdentityOptions }): Promise<void>;
  sync(direction?: 'push' | 'pull'): Promise<void>;
  startSync(params: { interval: string }): Promise<void>;
  stopSync(): void;
}