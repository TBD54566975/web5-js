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
   * Unregister an identity from the SyncEngine, this will stop syncing messages for this identity.
   */
  unregisterIdentity(did: string): Promise<void>;
  /**
   * Get the Sync Options for a specific identity.
   */
  getIdentityOptions(did: string): Promise<SyncIdentityOptions | undefined>;
  /**
   * Update the Sync Options for a specific identity, replaces the existing options.
   */
  updateIdentityOptions(params: { did: string, options: SyncIdentityOptions }): Promise<void>;
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
   *
   * @param timeout the maximum amount of time, in milliseconds, to wait for the current sync operation to complete. Default is 2000 (2 seconds).
   * @throws {Error} if the sync operation fails to stop before the timeout.
   */
  stopSync(timeout?: number): Promise<void>;
}