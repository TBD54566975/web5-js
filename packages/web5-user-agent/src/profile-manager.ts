import type { InterestingVerificationMethod } from '@tbd54566975/dids';

export interface ProfileManager {
  createProfile(options: CreateProfileOptions): Promise<Profile>
  getProfile(id: string): Promise<Profile | undefined>
}

export type Profile = {
  id: string;
  did: DID;
  name: string;
  icon: string;
  connections: any[];
  dateCreated: Date;
}

export type CreateProfileOptions = {
  id?: string;
  did?: DID
  didMethod?: 'ion' | 'key'
  name?: string
  icon?: string
  // TODO: figure out concrete type for Connection
  connections?: any[]
}

// TODO: decide on if this is what we'll use for the return value of DidCreator interface
export type DID = {
  services: any[],
  internalId: string,
  id: string,
  keys: InterestingVerificationMethod[],
  methodData: object[]
}