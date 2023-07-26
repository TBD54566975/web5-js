import type { DidIonCreateOptions } from '@tbd54566975/dids';

import { DidIonApi, DidKeyApi, DidResolver } from '@tbd54566975/dids';
import { Web5UserAgent, ProfileApi, ProfileStore } from '@tbd54566975/web5-user-agent';
import { Dwn, DataStoreLevel, EventLogLevel, MessageStoreLevel } from '@tbd54566975/dwn-sdk-js';
import { KeyManager, KeyManagerOptions, KeyManagerStore, ManagedKeyPair, ManagedKey, KmsKeyStore, KmsPrivateKeyStore, ManagedPrivateKey, LocalKms} from '@tbd54566975/crypto';
import { MemoryStore } from '@tbd54566975/common';

import { AppStorage } from '../../src/app-storage.js';

type CreateMethodOptions = {
  testDataLocation?: string;
}

export type TestAgentOptions = {
  agent: Web5UserAgent;
  appStorage: AppStorage;
  dataStore: DataStoreLevel;
  dwn: Dwn;
  eventLog: EventLogLevel;
  messageStore: MessageStoreLevel;
  profileApi: ProfileApi;
  profileStore: ProfileStore;
  didResolver: DidResolver;
  didIon: DidIonApi;
  didKey: DidKeyApi;
  signKeyPair: ManagedKeyPair;
}

export type TestProfile = {
  did: string
}

export type TestProfileOptions = {
  profileDidOptions?: DidIonCreateOptions;
}

export class TestAgent {
  agent: Web5UserAgent;
  appStorage: AppStorage;
  dataStore: DataStoreLevel;
  dwn: Dwn;
  eventLog: EventLogLevel;
  messageStore: MessageStoreLevel;
  profileApi: ProfileApi;
  profileStore: ProfileStore;
  didResolver: DidResolver;
  didIon: DidIonApi;
  didKey: DidKeyApi;
  signKeyPair: ManagedKeyPair;

  constructor(options: TestAgentOptions) {
    this.agent = options.agent;
    this.appStorage = options.appStorage;
    this.dataStore = options.dataStore;
    this.dwn = options.dwn;
    this.eventLog = options.eventLog;
    this.messageStore = options.messageStore;
    this.profileApi = options.profileApi;
    this.profileStore = options.profileStore;
    this.didResolver = options.didResolver;
    this.didIon = options.didIon;
    this.didKey = options.didKey;
    this.signKeyPair = options.signKeyPair;
  }

  async clearStorage(): Promise<void> {
    await this.appStorage.clear();
    await this.dataStore.clear();
    await this.eventLog.clear();
    await this.messageStore.clear();
    await this.profileStore.clear();
  }

  async closeStorage() {
    await this.appStorage.close();
    await this.dataStore.close();
    await this.eventLog.close();
    await this.messageStore.close();
    await this.profileStore.close();
  }

  static async create(options: CreateMethodOptions = {}): Promise<TestAgent> {
    const testDataLocation = options.testDataLocation ?? '__TESTDATA__';
    const testDataPath = (path: string) => `${testDataLocation}/${path}`;

    const appStorage = new AppStorage(testDataPath('APPSTORAGE'));

    const DidIon = new DidIonApi();
    const DidKey = new DidKeyApi();
    const didResolver = new DidResolver({ methodResolvers: [DidIon, DidKey] });

    const dataStore = new DataStoreLevel({ blockstoreLocation: testDataPath('DATASTORE') });

    const eventLog = new EventLogLevel({ location: testDataPath('EVENTLOG') });

    const messageStore = new MessageStoreLevel({
      blockstoreLocation : testDataPath('MESSAGESTORE'),
      indexLocation      : testDataPath('INDEX')
    });

    const dwn = await Dwn.create({ eventLog, dataStore, messageStore });

    const profileStore = new ProfileStore({
      location      : testDataPath('PROFILES'),
      indexLocation : testDataPath('PROFILES-INDEX')
    });

    const profileApi = new ProfileApi(profileStore);

    const kmsMemoryStore = new MemoryStore<string, ManagedKey | ManagedKeyPair>();
    const kmsKeyStore = new KmsKeyStore(kmsMemoryStore);

    const memoryPrivateKeyStore = new MemoryStore<string, ManagedPrivateKey>();
    const kmsPrivateKeyStore = new KmsPrivateKeyStore(memoryPrivateKeyStore);

    const localKms = new LocalKms('local', kmsKeyStore, kmsPrivateKeyStore);

    const kmMemoryStore = new MemoryStore<string, ManagedKey | ManagedKeyPair>();
    const keyManagerStore = new KeyManagerStore({ store: kmMemoryStore });

    const keyManagerOptions: KeyManagerOptions = {
      store : keyManagerStore,
      kms   : { local: localKms },
    };

    const keyManager = new KeyManager(keyManagerOptions);

    const keyPair = await keyManager.generateKey({
      algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
      extractable : false,
      keyUsages   : ['sign', 'verify']
    });

    const agent = new Web5UserAgent({
      profileManager : new ProfileApi(profileStore),
      dwn            : dwn,
      didResolver    : didResolver,
      keyManager     : keyManager
    });

    return new TestAgent({
      agent,
      appStorage,
      dataStore,
      dwn,
      eventLog,
      messageStore,
      profileApi,
      profileStore,
      didResolver,
      didIon      : DidIon,
      didKey      : DidKey,
      signKeyPair : keyPair
    });
  }

  async createProfile(options: TestProfileOptions = {}): Promise<TestProfile> {
    const DidIon = new DidIonApi();
    const DidKey = new DidKeyApi();

    const appDidState = await DidKey.create();
    const profileDidState = await DidIon.create(options.profileDidOptions);

    const profile = await this.profileApi.createProfile({
      name        : appDidState.id,
      did         : profileDidState, // TODO: need to figure out concrete return type for DidCreator
      connections : [appDidState.id],
    });

    return { did: profile.did.id };
  }

  async openStorage() {
    // await this.appStorage.open(); // TODO: Should AppStorage have an open() method?
    await this.dataStore.open();
    await this.eventLog.open();
    await this.messageStore.open();
    // await this.profileStore.open(); // TODO: Should ProfileStore have an open() method?
  }
}