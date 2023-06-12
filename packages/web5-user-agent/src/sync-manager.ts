export interface SyncManager {
  registerProfile(did: string): Promise<void>;
  push(): Promise<void>;
  pull(): Promise<void>;
}