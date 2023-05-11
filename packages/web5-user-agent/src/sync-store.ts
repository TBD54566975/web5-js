import type { Profile } from './profile-manager.js';

import { Level } from 'level';

export type SyncStoreOptions = {
  location?: string;
};

export class SyncStore {
  private db: Level;

  static #defaultOptions = {
    location: 'data/agent/sync-store',
  };

  constructor(options: SyncStoreOptions = {}) {
    options = { ...SyncStore.#defaultOptions, ...options };
    this.db = new Level(options.location);
  }

  /**
   * returns all profiles that have been registered to sync
   */
  async getRegisteredProfiles(): Promise<Profile[]> {
    throw new Error('method not implemented');
  }
}