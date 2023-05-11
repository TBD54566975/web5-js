import { DidIonApi, DidKeyApi, DidResolver } from '@tbd54566975/dids';
import { Web5UserAgent, ProfileApi, ProfileStore } from '@tbd54566975/web5-user-agent';
import { Dwn, DataStoreLevel, EventLogLevel, MessageStoreLevel } from '@tbd54566975/dwn-sdk-js';

import { AppStorage } from '../src/app-storage.js';

export type TestAgent = {
  dwn: Dwn;
  profileApi: ProfileApi;
  profileStore: ProfileStore;
  agent: Web5UserAgent;
  clear: () => Promise<void>;
  createTestProfile: () => Promise<TestProfile>;
}

export type TestProfile = {
  did: string
}

// have to do it this way because esbuild doesn't support top-level await
export async function createTestAgent(): Promise<TestAgent> {
  const DidIon = new DidIonApi();
  const DidKey = new DidKeyApi();
  const didResolver = new DidResolver({ methodResolvers: [DidIon, DidKey] });
  const appStorage = new AppStorage('__TESTDATA__/APPSTORAGE');

  const dataStore = new DataStoreLevel({ blockstoreLocation: '__TESTDATA__/DATASTORE' });
  const eventLog = new EventLogLevel({ location: '__TESTDATA__/EVENTLOG' });
  const messageStore = new MessageStoreLevel({
    blockstoreLocation : '__TESTDATA__/MESSAGESTORE',
    indexLocation      : '__TESTDATA__/INDEX'
  });


  const dwn = await Dwn.create({ eventLog, dataStore, messageStore });

  const profileStore = new ProfileStore({
    location      : '__TESTDATA__/PROFILES',
    indexLocation : '__TESTDATA__/PROFILES-INDEX'
  });

  const profileApi = new ProfileApi(profileStore);


  const agent = new Web5UserAgent({
    profileManager : new ProfileApi(profileStore),
    dwn            : dwn,
    didResolver    : didResolver
  });

  async function clear(): Promise<void> {
    await profileStore.clear();
    await dataStore.clear();
    await eventLog.clear();
    await messageStore.clear();
    await appStorage.clear();
  }

  async function createTestProfile(): Promise<TestProfile> {
    const profileDidState = await DidIon.create();
    const appDidState = await DidKey.create();

    const profile = await profileApi.createProfile({
      name        : appDidState.id,
      did         : profileDidState, // TODO: need to figure out concrete return type for DidCreator
      connections : [appDidState.id],
    });

    return { did: profile.did.id };
  }

  return {
    dwn,
    profileStore,
    profileApi,
    agent,
    clear,
    createTestProfile
  };
}