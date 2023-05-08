import type { QueryStore } from '@tbd54566975/web5-agent';
import type { CreateProfileOptions, Profile, ProfileManager } from './profile-manager.js';

import { ProfileStore } from './profile-store.js';

export class ProfileApi implements ProfileManager {
  private store: QueryStore<Profile>;

  constructor(store?: QueryStore<Profile>) {
    this.store = store ||= new ProfileStore();
  }

  async createProfile(options: CreateProfileOptions): Promise<Profile> {
    if (!options.did && !options.didMethod) {
      throw new Error('must provide did or didMethod');
    }

    const profile: Partial<Profile> = {
      name        : options.name,
      icon        : options.icon,
      dateCreated : new Date(),
    };

    if (!options.did) {
      // TODO: create DID based on didMethod
    }

    profile.id = options.did?.id;
    await this.store.put(profile as Profile);

    throw new Error('Method not implemented.');
  }

  getProfile(id: string): Promise<Profile | undefined> {
    return this.store.get(id);
  }
}