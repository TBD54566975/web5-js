
import { Jose } from '@web5/crypto';
import { Dwn } from '@tbd54566975/dwn-sdk-js';
import { DidIonMethod, DidKeyMethod, DidResolver } from '@web5/dids';
import { KeyValueStore, LevelStore, MemoryStore } from '@web5/common';
import { MessageStoreLevel, DataStoreLevel, EventLogLevel } from '@tbd54566975/dwn-sdk-js/stores';

import type { Web5ManagedAgent } from './types/agent.js';

import { LocalKms } from './kms-local.js';
import { DidManager } from './did-manager.js';
import { DwnManager } from './dwn-manager.js';
import { KeyManager } from './key-manager.js';
import { AppDataVault } from './app-data-store.js';
import { cryptoToPortableKeyPair } from './utils.js';
import { IdentityManager } from './identity-manager.js';
import { DidStoreDwn, DidStoreMemory } from './store-managed-did.js';
import { IdentityStoreDwn, IdentityStoreMemory } from './store-managed-identity.js';
import { KeyStoreDwn, KeyStoreMemory, PrivateKeyStoreDwn, PrivateKeyStoreMemory } from './store-managed-key.js';
import { Web5RpcClient } from './rpc-client.js';

type CreateMethodOptions = {
  agentClass: new (options: any) => Web5ManagedAgent
  agentStores?: 'dwn' | 'memory';
  testDataLocation?: string;
}

type TestManagedAgentOptions = {
  agent: Web5ManagedAgent

  agentStores: 'dwn' | 'memory';
  appDataStore: KeyValueStore<string, any>;
  dwn: Dwn;
  dwnDataStore: DataStoreLevel;
  dwnEventLog: EventLogLevel;
  dwnMessageStore: MessageStoreLevel;
}

export class TestManagedAgent {
  agent: Web5ManagedAgent;

  agentStores: 'dwn' | 'memory';
  appDataStore: KeyValueStore<string, any>;
  dwn: Dwn;
  dwnDataStore: DataStoreLevel;
  dwnEventLog: EventLogLevel;
  dwnMessageStore: MessageStoreLevel;

  constructor(options: TestManagedAgentOptions) {
    this.agent = options.agent;
    this.agentStores = options.agentStores;
    this.appDataStore = options.appDataStore;
    this.dwn = options.dwn;
    this.dwnDataStore = options.dwnDataStore;
    this.dwnEventLog = options.dwnEventLog;
    this.dwnMessageStore = options.dwnMessageStore;
  }

  async clearStorage(): Promise<void> {
    this.agent.agentDid = undefined;
    await this.appDataStore.clear();
    await this.dwnDataStore.clear();
    await this.dwnEventLog.clear();
    await this.dwnMessageStore.clear();

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
    await this.dwnDataStore.close();
    await this.dwnEventLog.close();
    await this.dwnMessageStore.close();
  }

  static async create(options: CreateMethodOptions): Promise<TestManagedAgent> {
    let { agentClass, agentStores, testDataLocation } = options;

    agentStores ??= 'memory';
    testDataLocation ??= '__TESTDATA__';
    const testDataPath = (path: string) => `${testDataLocation}/${path}`;

    const { appData, appDataStore, didManager, identityManager, keyManager } = (agentStores === 'memory')
      ? TestManagedAgent.useMemoryStorage()
      : TestManagedAgent.useDiskStorage({ testDataLocation });

    // Instantiate DID resolver.
    const didMethodApis = [DidIonMethod, DidKeyMethod];
    const didResolver = new DidResolver({ didResolvers: didMethodApis });

    // Instantiate custom stores to use with DWN instance.
    const dwnDataStore = new DataStoreLevel({ blockstoreLocation: testDataPath('DATASTORE') });
    const dwnEventLog = new EventLogLevel({ location: testDataPath('EVENTLOG') });
    const dwnMessageStore = new MessageStoreLevel({
      blockstoreLocation : testDataPath('MESSAGESTORE'),
      indexLocation      : testDataPath('INDEX')
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

    const agent = new agentClass({
      agentDid: '',
      appData,
      didManager,
      didResolver,
      dwnManager,
      identityManager,
      keyManager,
      rpcClient,
    });

    return new TestManagedAgent({
      agent,
      agentStores,
      appDataStore,
      dwn,
      dwnDataStore,
      dwnEventLog,
      dwnMessageStore,
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

    return { appData, appDataStore, didManager, identityManager, keyManager };
  }

  private static useMemoryStorage(options?: { agent: Web5ManagedAgent }) {
    const { agent } = options ?? {};

    const appDataStore = new MemoryStore();
    const appData = new AppDataVault({
      keyDerivationWorkFactor : 1,
      store                   : appDataStore
    });

    const didManager = new DidManager({
      agent,
      didMethods : [DidIonMethod, DidKeyMethod],
      store      : new DidStoreMemory()
    });

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

    return { appData, appDataStore, didManager, identityManager, keyManager };
  }
}