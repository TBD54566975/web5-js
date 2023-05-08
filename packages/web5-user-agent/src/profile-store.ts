import type { Filter, QueryStore } from '@tbd54566975/web5-agent';

import type { Profile } from './profile-manager.js';

// TODO: refactor to use another underlying datastore
export class ProfileStore implements QueryStore<Profile> {
  put(entry: Profile): Promise<void> {
    const key = this.generateKey(entry.id);
    const value = JSON.stringify(entry);

    localStorage.setItem(key, value);

    return Promise.resolve();
  }

  get(id: string): Promise<Profile> {
    const key = this.generateKey(id);
    const value = localStorage.getItem(key);

    return value ? JSON.parse(value) : null;
  }

  query(_filter: Filter): Promise<Profile[]> {
    throw new Error('Method not implemented.');
  }

  delete(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  private generateKey(id: string) {
    return `PROFILE_${id}`;
  }

}