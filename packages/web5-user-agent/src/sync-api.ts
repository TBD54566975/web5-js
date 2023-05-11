import { Profile } from './profile-manager.js';
import { SyncManager } from './sync-manager.js';

export class SyncApi implements SyncManager {
  registerProfile(profile: Profile): Promise<void> {
    throw new Error('Method not implemented.');
  }

  push(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  pull(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  daemonize(): boolean {
    throw new Error('Method not implemented');
  }
}