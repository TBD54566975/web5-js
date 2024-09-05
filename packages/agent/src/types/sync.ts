import type { Web5PlatformAgent } from './agent.js';

/**
 * The SyncEngine is responsible for syncing messages between the agent and the platform.
 */
export type SyncIdentityOptions = {
  /**
   * The delegate DID that should be used to sign the sync messages.
   */
  delegateDid?: string;
  /**
   * The protocols that should be synced for this identity, if an empty array is provided, all messages for all protocols will be synced.
   */
  protocols: string[]
}
export interface SyncEngine {
  /**
   * The agent that the SyncEngine is attached to.
   */
  agent: Web5PlatformAgent;
  /**
   * Register an identity to be managed by the SyncEngine for syncing.
   * The options can define specific protocols that should only be synced, or a delegate DID that should be used to sign the sync messages.
   */
  registerIdentity(params: { did: string, options?: SyncIdentityOptions }): Promise<void>;
  /**
   * Preforms a one-shot sync operation. If no direction is provided, it will perform both push and pull.
   * @param direction which direction you'd like to perform the sync operation.
   *
   * @throws {Error} if a sync is already in progress or the sync operation fails.
   */
  sync(direction?: 'push' | 'pull'): Promise<void>;
  /**
   * Starts a periodic sync that runs at an interval. Subsequent calls to startSync will update the interval.
   *
   * @param params { interval: string } the interval at which the sync operation should be performed. ex: '30s', '1m', '10m'
   */
  startSync(params: { interval: string }): Promise<void>;
  /**
   * Stops the periodic sync operation, will complete the current sync operation if one is already in progress.
   */
  stopSync(): Promise<void>;
}