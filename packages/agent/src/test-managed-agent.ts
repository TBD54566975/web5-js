import type { KeyValueStore } from '@web5/common';
import type { DidResolutionResult, DidResolverCache, PortableDid } from '@web5/dids';

import { Level } from 'level';
import { Jose } from '@web5/crypto';
import { Dwn, MessageStoreLevel, DataStoreLevel, EventLogLevel } from '@tbd54566975/dwn-sdk-js';
import { LevelStore, MemoryStore } from '@web5/common';
import { DidIonMethod, DidKeyMethod, DidResolver, DidResolverCacheLevel } from '@web5/dids';

import type { Web5ManagedAgent } from './types/agent.js';

import { LocalKms } from './kms-local.js';
import { DidManager } from './did-manager.js';
import { DwnManager } from './dwn-manager.js';
import { KeyManager } from './key-manager.js';
import { Web5RpcClient } from './rpc-client.js';
import { AppDataVault } from './app-data-store.js';
import { SyncManagerLevel } from './sync-manager.js';
import { cryptoToPortableKeyPair } from './utils.js';
import { DidStoreDwn, DidStoreMemory } from './store-managed-did.js';
import { IdentityManager, ManagedIdentity } from './identity-manager.js';
import { IdentityStoreDwn, IdentityStoreMemory } from './store-managed-identity.js';
import { KeyStoreDwn, KeyStoreMemory, PrivateKeyStoreDwn, PrivateKeyStoreMemory } from './store-managed-key.js';

type CreateMethodOptions = {
  agentClass: new (options: any) => Web5ManagedAgent
  agentStores?: 'dwn' | 'memory';
  testDataLocation?: string;
}

type TestManagedAgentOptions = {
  agent: Web5ManagedAgent

  agentStores: 'dwn' | 'memory';
  appDataStore: KeyValueStore<string, any>;
  didResolverCache: DidResolverCache;
  dwn: Dwn;
  dwnDataStore: DataStoreLevel;
  dwnEventLog: EventLogLevel;
  dwnMessageStore: MessageStoreLevel;
  syncStore: Level;
}

export class TestManagedAgent {
  agent: Web5ManagedAgent;

  agentStores: 'dwn' | 'memory';
  appDataStore: KeyValueStore<string, any>;
  didResolverCache: DidResolverCache;
  dwn: Dwn;
  dwnDataStore: DataStoreLevel;
  dwnEventLog: EventLogLevel;
  dwnMessageStore: MessageStoreLevel;
  syncStore: Level;

  constructor(options: TestManagedAgentOptions) {
    this.agent = options.agent;
    this.agentStores = options.agentStores;
    this.appDataStore = options.appDataStore;
    this.didResolverCache = options.didResolverCache;
    this.dwn = options.dwn;
    this.dwnDataStore = options.dwnDataStore;
    this.dwnEventLog = options.dwnEventLog;
    this.dwnMessageStore = options.dwnMessageStore;
    this.syncStore = options.syncStore;
  }

  async clearStorage(): Promise<void> {
    this.agent.agentDid = undefined;
    await this.appDataStore.clear();
    await this.didResolverCache.clear();
    await this.dwnDataStore.clear();
    await this.dwnEventLog.clear();
    await this.dwnMessageStore.clear();
    await this.syncStore.clear();

    /** Easiest way to start with fresh in-memory stores is to
     * re-instantiate all of the managed agent components */
    if (this.agentStores === 'memory') {
      const { didManager, identityManager, keyManager } = TestManagedAgent.useMemoryStorage({ agent: this.agent });
      this.agent.didManager = didManager;
      this.agent.identityManager = identityManager;
      this.agent.keyManager = keyManager;
    }
  }

  async closeStorage(): Promise<void> {
    await this.appDataStore.close();
    await this.didResolverCache.close();
    await this.dwnDataStore.close();
    await this.dwnEventLog.close();
    await this.dwnMessageStore.close();
    await this.syncStore.close();
  }

  static async create(options: CreateMethodOptions): Promise<TestManagedAgent> {
    let { agentClass, agentStores, testDataLocation } = options;

    agentStores ??= 'memory';
    testDataLocation ??= '__TESTDATA__';
    const testDataPath = (path: string) => `${testDataLocation}/${path}`;

    const { appData, appDataStore, didManager, didResolverCache, identityManager, keyManager } = (agentStores === 'memory')
      ? TestManagedAgent.useMemoryStorage()
      : TestManagedAgent.useDiskStorage({ testDataLocation });

    // Instantiate DID resolver.
    const didMethodApis = [DidIonMethod, DidKeyMethod];
    const didResolver = new DidResolver({
      cache        : didResolverCache,
      didResolvers : didMethodApis
    });

    // Instantiate custom stores to use with DWN instance.
    const dwnDataStore = new DataStoreLevel({ blockstoreLocation: testDataPath('DWN_DATASTORE') });
    const dwnEventLog = new EventLogLevel({ location: testDataPath('DWN_EVENTLOG') });
    const dwnMessageStore = new MessageStoreLevel({
      blockstoreLocation : testDataPath('DWN_MESSAGESTORE'),
      indexLocation      : testDataPath('DWN_MESSAGEINDEX')
    });

    // Instantiate custom DWN instance.
    const dwn = await Dwn.create({
      eventLog     : dwnEventLog,
      dataStore    : dwnDataStore,
      // @ts-expect-error because the Web5.js DidResolver implementation doesn't have the dump() method.
      didResolver  : didResolver,
      messageStore : dwnMessageStore
    });

    // Instantiate a DwnManager using the custom DWN instance.
    const dwnManager = new DwnManager({ dwn });

    // Instantiate an RPC Client.
    const rpcClient = new Web5RpcClient();

    // Instantiate a custom SyncManager and LevelDB-backed store.
    const syncStore = new Level(testDataPath('SYNC_STORE'));
    const syncManager = new SyncManagerLevel({ db: syncStore });

    const agent = new agentClass({
      agentDid: '',
      appData,
      didManager,
      didResolver,
      dwnManager,
      identityManager,
      keyManager,
      rpcClient,
      syncManager
    });

    return new TestManagedAgent({
      agent,
      agentStores,
      appDataStore,
      didResolverCache,
      dwn,
      dwnDataStore,
      dwnEventLog,
      dwnMessageStore,
      syncStore,
    });
  }

  async createAgentDid(): Promise<void> {
    // Create an a DID and key set for the Agent.
    const agentDid = await DidKeyMethod.create({ keyAlgorithm: 'Ed25519' });
    const privateCryptoKey = await Jose.jwkToCryptoKey({ key: agentDid.keySet.verificationMethodKeys![0].privateKeyJwk! });
    const publicCryptoKey = await Jose.jwkToCryptoKey({ key: agentDid.keySet.verificationMethodKeys![0].publicKeyJwk! });
    const agentSigningKey = { privateKey: privateCryptoKey, publicKey: publicCryptoKey };

    // Set the DID as the default signing key.
    const alias = await this.agent.didManager.getDefaultSigningKey({ did: agentDid.did });
    const defaultSigningKey = cryptoToPortableKeyPair({ cryptoKeyPair: agentSigningKey, keyData: { alias, kms: 'memory' } });
    await this.agent.keyManager.setDefaultSigningKey({ key: defaultSigningKey });

    // Set the DID as the Agent's DID.
    this.agent.agentDid = agentDid.did;
  }

  public async createIdentity(options: {
    keyAlgorithm?: 'Ed25519' | 'secp256k1';
    testDwnUrls: string[]
  }): Promise<{ did: PortableDid, identity: ManagedIdentity }> {
    // Default to generating Ed25519 keys.
    const { keyAlgorithm, testDwnUrls } = options;

    const didOptions = await DidIonMethod.generateDwnOptions({
      signingKeyAlgorithm  : keyAlgorithm,
      serviceEndpointNodes : testDwnUrls
    });

    // Create a PortableDid.
    const did = await DidIonMethod.create({
      anchor: false,
      ...didOptions
    });

    // Create a ManagedIdentity.
    const identity: ManagedIdentity = {
      did  : did.did,
      name : 'Test'
    };

    return { did, identity };
  }

  private static useDiskStorage(options: { agent?: Web5ManagedAgent, testDataLocation: string }) {
    const { agent, testDataLocation } = options;
    const testDataPath = (path: string) => `${testDataLocation}/${path}`;

    const appDataStore = new LevelStore(testDataPath('APPDATA'));
    const appData = new AppDataVault({
      keyDerivationWorkFactor : 1,
      store                   : appDataStore
    });

    const didManager = new DidManager({
      agent,
      didMethods : [DidIonMethod, DidKeyMethod],
      store      : new DidStoreDwn()
    });

    const didResolverCache = new DidResolverCacheLevel({
      location: testDataPath('DID_RESOLVERCACHE')
    });

    const identityManager = new IdentityManager({
      agent,
      store: new IdentityStoreDwn()
    });

    const localKmsDwn = new LocalKms({
      agent,
      kmsName         : 'local',
      keyStore        : new KeyStoreDwn({ schema: 'https://identity.foundation/schemas/web5/kms-key' }),
      privateKeyStore : new PrivateKeyStoreDwn()
    });
    const localKmsMemory = new LocalKms({
      agent,
      kmsName: 'memory'
    });
    const keyManager = new KeyManager({
      agent,
      kms: {
        local  : localKmsDwn,
        memory : localKmsMemory
      },
      store: new KeyStoreDwn({ schema: 'https://identity.foundation/schemas/web5/managed-key' })
    });

    return { appData, appDataStore, didManager, didResolverCache, identityManager, keyManager };
  }

  private static useMemoryStorage(options?: { agent: Web5ManagedAgent }) {
    const { agent } = options ?? {};

    const appDataStore = new MemoryStore<string, any>();
    const appData = new AppDataVault({
      keyDerivationWorkFactor : 1,
      store                   : appDataStore
    });

    const didManager = new DidManager({
      agent,
      didMethods : [DidIonMethod, DidKeyMethod],
      store      : new DidStoreMemory()
    });

    const didResolverCache = new MemoryStore<string, DidResolutionResult | void>();

    const identityManager = new IdentityManager({
      agent,
      store: new IdentityStoreMemory()
    });

    const localKmsDwn = new LocalKms({
      agent,
      kmsName         : 'local',
      keyStore        : new KeyStoreMemory(),
      privateKeyStore : new PrivateKeyStoreMemory()
    });
    const localKmsMemory = new LocalKms({
      agent,
      kmsName: 'memory'
    });
    const keyManager = new KeyManager({
      agent,
      kms: {
        local  : localKmsDwn,
        memory : localKmsMemory
      },
      store: new KeyStoreMemory()
    });

    return { appData, appDataStore, didManager, didResolverCache, identityManager, keyManager };
  }
}