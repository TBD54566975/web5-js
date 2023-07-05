import type { DidState } from '@tbd54566975/dids';

export interface ProfileManager {
  createProfile(options: CreateProfileOptions): Promise<Profile>
  getProfile(id: string): Promise<Profile | undefined>
  listProfiles(): Promise<Profile[]>;
  deleteProfile(id: string): Promise<void>;
}

export type Profile = {
  id: string;
  did: DidState;
  name: string;
  icon: string;
  connections: any[];
  dateCreated: Date;
}

export type CreateProfileOptions = {
  id?: string;
  did?: DidState
  didMethod?: 'ion' | 'key'
  name?: string
  icon?: string
  // TODO: figure out concrete type for Connection
  connections?: any[]
}