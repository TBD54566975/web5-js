import type { Profile } from './profile-manager.js';

export interface SyncManager {
  registerProfile(profile: Profile): Promise<void>;
  push(): Promise<void>;
  pull(): Promise<void>;
}