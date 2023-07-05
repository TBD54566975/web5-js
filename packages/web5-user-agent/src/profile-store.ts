import type { Filter, QueryStore } from '@tbd54566975/web5-agent';
import type { Profile } from './profile-manager.js';

import { Level } from 'level';

import { ProfileIndex } from './profile-index.js';
// TODO: refactor to use another underlying datastore

export type ProfileStoreOptions = {
  location?: string;
  indexLocation?: string;
};
export class ProfileStore implements QueryStore<Profile> {
  private db: Level;
  private index: ProfileIndex;

  private static _defaultOptions = {
    location      : 'data/agent/profiles',
    indexLocation : 'data/agent/profiles-index'
  };

  constructor(options: ProfileStoreOptions = {}) {
    options = { ...ProfileStore._defaultOptions, ...options };

    this.db = new Level(options.location);
    this.index = new ProfileIndex(options.indexLocation);
  }

  async put(entry: Profile): Promise<void> {
    const key = this.generateKey(entry.id);
    const value = JSON.stringify(entry);

    await this.db.put(key, value);
    await this.index.put(entry);
  }

  async get(id: string): Promise<Profile | undefined> {
    const key = this.generateKey(id);

    try {
      const value = await this.db.get(key);

      return JSON.parse(value);
    } catch(e: any) {
      if (e.code === 'LEVEL_NOT_FOUND') {
        return undefined;
      }
    }
  }

  async query(filter: Filter): Promise<Profile[]> {
    const results = await this.index.query(filter);
    const profiles = [];

    const serializedProfiles = await this.db.getMany(results);
    for (let serializedProfile of serializedProfiles) {
      profiles.push(JSON.parse(serializedProfile));
    }

    return profiles;
  }

  async all(): Promise<Profile[]> {
    const serializedProfiles = await this.db.values().all();
    const profiles = [];

    for (let serializedProfile of serializedProfiles) {
      profiles.push(JSON.parse(serializedProfile));
    }

    return profiles;
  }

  async delete(id: string): Promise<void> {
    const key = this.generateKey(id);
    return this.db.del(key);
  }

  async deleteAll(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async clear(): Promise<void> {
    await this.index.clear();
    await this.db.clear();

    return;
  }

  async close(): Promise<void> {
    await this.index.close();
    await this.db.close();

    return;
  }

  private generateKey(id: string) {
    return `PROFILE_${id}`;
  }

}