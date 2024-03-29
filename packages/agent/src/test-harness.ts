import type { AbstractLevel } from 'abstract-level';

import { Level } from 'level';
import { DataStoreLevel, Dwn, EventLogLevel, MessageStoreLevel } from '@tbd54566975/dwn-sdk-js';
import { DidDht, DidJwk, DidResolutionResult, DidResolverCache, DidResolverCacheLevel } from '@web5/dids';

import type { Web5PlatformAgent } from './types/agent.js';

import { AgentDidApi } from './did-api.js';
import { AgentDwnApi } from './dwn-api.js';
import { AgentSyncApi } from './sync-api.js';
import { Web5RpcClient } from './rpc-client.js';
import { AgentCryptoApi } from './crypto-api.js';
import { AgentIdentityApi } from './identity-api.js';
import { BearerIdentity } from './bearer-identity.js';
import { LocalKeyManager } from './local-key-manager.js';
import { SyncEngineLevel } from './sync-engine-level.js';
import { DwnDidStore, InMemoryDidStore } from './store-did.js';
import { DwnKeyStore, InMemoryKeyStore } from './store-key.js';
import { DwnIdentityStore, InMemoryIdentityStore } from './store-identity.js';
import { DidResolverCacheMemory } from './prototyping/dids/resolver-cache-memory.js';

type ManagedAgentTestHarnessParams = {
  agent: Web5PlatformAgent

  agentStores: 'dwn' | 'memory';
  didResolverCache: DidResolverCache;
  dwn: Dwn;
  dwnDataStore: DataStoreLevel;
  dwnEventLog: EventLogLevel;
  dwnMessageStore: MessageStoreLevel;
  syncStore: AbstractLevel<string | Buffer | Uint8Array>;
}

type ManagedAgentTestHarnessSetupParams = {
  agentClass: new (params: any) => Web5PlatformAgent
  agentStores?: 'dwn' | 'memory';
  testDataLocation?: string;
}

export class ManagedAgentTestHarness {
  public agent: Web5PlatformAgent;

  public agentStores: 'dwn' | 'memory';
  public didResolverCache: DidResolverCache;
  public dwn: Dwn;
  public dwnDataStore: DataStoreLevel;
  public dwnEventLog: EventLogLevel;
  public dwnMessageStore: MessageStoreLevel;
  public syncStore: AbstractLevel<string | Buffer | Uint8Array>;

  constructor(params: ManagedAgentTestHarnessParams) {
    this.agent = params.agent;
    this.agentStores = params.agentStores;
    this.didResolverCache = params.didResolverCache;
    this.dwn = params.dwn;
    this.dwnDataStore = params.dwnDataStore;
    this.dwnEventLog = params.dwnEventLog;
    this.dwnMessageStore = params.dwnMessageStore;
    this.syncStore = params.syncStore;
  }

  public async clearStorage(): Promise<void> {
    // @ts-expect-error since normally this property shouldn't be set to undefined.
    this.agent.agentDid = undefined;
    // await this.appDataStore.clear();
    await this.didResolverCache.clear();
    await this.dwnDataStore.clear();
    await this.dwnEventLog.clear();
    await this.dwnMessageStore.clear();
    await this.syncStore.clear();

    // Reset the indexes and caches for the Agent's DWN data stores.
    // if (this.agentStores === 'dwn') {
    //   const { didApi, identityApi } = ManagedAgentTestHarness.useDiskStores({ testDataLocation: '__TESTDATA__', agent: this.agent });
    //   this.agent.crypto = cryptoApi;
    //   this.agent.did = didApi;
    //   this.agent.identity = identityApi;
    // }

    // Easiest way to start with fresh in-memory stores is to re-instantiate all of the managed
    // agent components.
    if (this.agentStores === 'memory') {
      const { didApi, identityApi, keyManager } = ManagedAgentTestHarness.useMemoryStores({ agent: this.agent });
      this.agent.did = didApi;
      this.agent.identity = identityApi;
      this.agent.keyManager = keyManager;
    }
  }

  public async closeStorage(): Promise<void> {
    // await this.appDataStore.close();
    await this.didResolverCache.close();
    await this.dwnDataStore.close();
    await this.dwnEventLog.close();
    await this.dwnMessageStore.close();
    await this.syncStore.close();
  }

  public async createAgentDid(): Promise<void> {
    // Create a DID for the Agent.
    this.agent.agentDid = await DidJwk.create({
      options: { algorithm: 'Ed25519' }
    });
  }

  public async createIdentity({ name, testDwnUrls }: {
    name: string;
    testDwnUrls: string[];
  }): Promise<BearerIdentity> {
    const bearerIdentity = await this.agent.identity.create({
      didMethod  : 'dht',
      didOptions : {
        services: [
          {
            id              : 'dwn',
            type            : 'DecentralizedWebNode',
            serviceEndpoint : testDwnUrls,
            enc             : '#enc',
            sig             : '#sig',
          }
        ],
        verificationMethods: [
          {
            algorithm : 'Ed25519',
            id        : 'sig',
            purposes  : ['assertionMethod', 'authentication']
          },
          {
            algorithm : 'secp256k1',
            id        : 'end',
            purposes  : ['keyAgreement']
          }
        ]
      },
      metadata: { name }
    });

    return bearerIdentity;
  }

  public async preloadResolverCache({ didUri, resolutionResult }: {
    didUri: string;
    resolutionResult: DidResolutionResult;
  }): Promise<void> {
    await this.didResolverCache.set(didUri, resolutionResult);
  }

  public static async setup({ agentClass, agentStores, testDataLocation }:
    ManagedAgentTestHarnessSetupParams
  ): Promise<ManagedAgentTestHarness> {
    agentStores ??= 'memory';
    testDataLocation ??= '__TESTDATA__';

    const testDataPath = (path: string) => `${testDataLocation}/${path}`;

    // Instantiate Agent's Crypto API.
    const cryptoApi = new AgentCryptoApi();

    // Instantiate Agent's RPC Client.
    const rpcClient = new Web5RpcClient();

    const {
      didApi,
      identityApi,
      keyManager,
      didResolverCache
    } = (agentStores === 'memory')
      ? ManagedAgentTestHarness.useMemoryStores()
      : ManagedAgentTestHarness.useDiskStores({ testDataLocation });

    // Instantiate custom stores to use with DWN instance.
    // Note: There is no in-memory store for DWN, so we always use LevelDB-based disk stores.
    const dwnDataStore = new DataStoreLevel({ blockstoreLocation: testDataPath('DWN_DATASTORE') });
    const dwnEventLog = new EventLogLevel({ location: testDataPath('DWN_EVENTLOG') });
    const dwnMessageStore = new MessageStoreLevel({
      blockstoreLocation : testDataPath('DWN_MESSAGESTORE'),
      indexLocation      : testDataPath('DWN_MESSAGEINDEX')
    });

    // Instantiate DWN instance.
    const dwn = await Dwn.create({
      eventLog     : dwnEventLog,
      dataStore    : dwnDataStore,
      didResolver  : didApi,
      messageStore : dwnMessageStore
    });

    // Instantiate Agent's DWN API using the custom DWN instance.
    const dwnApi = new AgentDwnApi({ dwn });

    // Instantiate Agent's Sync API using a custom LevelDB-backed store.
    const syncStore = new Level(testDataPath('SYNC_STORE'));
    const syncEngine = new SyncEngineLevel({ db: syncStore });
    const syncApi = new AgentSyncApi({ syncEngine });

    // Create Web5PlatformAgent instance
    const agent = new agentClass({
      cryptoApi,
      didApi,
      dwnApi,
      identityApi,
      keyManager,
      rpcClient,
      syncApi
    });

    return new ManagedAgentTestHarness({
      agent,
      agentStores,
      didResolverCache,
      dwn,
      dwnDataStore,
      dwnEventLog,
      dwnMessageStore,
      syncStore
    });
  }

  private static useDiskStores({ agent, testDataLocation }: {
    agent?: Web5PlatformAgent;
    testDataLocation: string;
  }) {
    const testDataPath = (path: string) => `${testDataLocation}/${path}`;

    // Setup DID Resolver Cache
    const didResolverCache = new DidResolverCacheLevel({
      location: testDataPath('DID_RESOLVERCACHE')
    });

    const didApi = new AgentDidApi({
      agent         : agent,
      didMethods    : [DidDht, DidJwk],
      resolverCache : didResolverCache,
      store         : new DwnDidStore()
    });

    const identityApi = new AgentIdentityApi({ agent, store: new DwnIdentityStore() });

    const keyManager = new LocalKeyManager({ agent, keyStore: new DwnKeyStore() });

    return { didApi, didResolverCache, identityApi, keyManager };
  }

  private static useMemoryStores({ agent }: { agent?: Web5PlatformAgent } = {}) {
    // Setup DID Resolver Cache
    const didResolverCache = new DidResolverCacheMemory();

    const keyManager = new LocalKeyManager({ agent, keyStore: new InMemoryKeyStore() });

    const didApi = new AgentDidApi({
      agent         : agent,
      didMethods    : [DidDht, DidJwk],
      resolverCache : didResolverCache,
      store         : new InMemoryDidStore()
    });

    const identityApi = new AgentIdentityApi({ agent, store: new InMemoryIdentityStore() });

    return { didApi, didResolverCache, identityApi, keyManager };
  }
}