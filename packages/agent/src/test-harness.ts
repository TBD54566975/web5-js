import { DidDht, DidJwk, DidResolverCache, DidResolverCacheLevel } from '@web5/dids';
import { DataStoreLevel, Dwn, EventLogLevel, MessageStoreLevel } from '@tbd54566975/dwn-sdk-js';

import type { Web5ManagedAgent } from './types/agent.js';

import { AgentDidApi } from './did-api.js';
import { AgentDwnApi } from './dwn-api.js';
import { AgentCryptoApi } from './crypto-api.js';
import { AgentIdentityApi } from './identity-api.js';
import { DwnDidStore, InMemoryDidStore } from './store-did.js';
import { DidResolverCacheMemory } from './temp/resolver-cache-memory.js';
import { DwnIdentityStore, InMemoryIdentityStore } from './store-identity.js';

type ManagedAgentTestHarnessParams = {
  agent: Web5ManagedAgent

  agentStores: 'dwn' | 'memory';
  didResolverCache: DidResolverCache;
  dwn: Dwn;
  dwnDataStore: DataStoreLevel;
  dwnEventLog: EventLogLevel;
  dwnMessageStore: MessageStoreLevel;
}

type ManagedAgentTestHarnessSetupParams = {
  agentClass: new (params: any) => Web5ManagedAgent
  agentStores?: 'dwn' | 'memory';
  testDataLocation?: string;
}

export class ManagedAgentTestHarness {
  public agent: Web5ManagedAgent;

  public agentStores: 'dwn' | 'memory';
  public didResolverCache: DidResolverCache;
  public dwn: Dwn;
  public dwnDataStore: DataStoreLevel;
  public dwnEventLog: EventLogLevel;
  public dwnMessageStore: MessageStoreLevel;

  constructor(params: ManagedAgentTestHarnessParams) {
    this.agent = params.agent;
    this.agentStores = params.agentStores;
    this.didResolverCache = params.didResolverCache;
    this.dwn = params.dwn;
    this.dwnDataStore = params.dwnDataStore;
    this.dwnEventLog = params.dwnEventLog;
    this.dwnMessageStore = params.dwnMessageStore;
  }

  public async clearStorage(): Promise<void> {
    this.agent.agentDid = undefined;
    // await this.appDataStore.clear();
    await this.didResolverCache.clear();
    await this.dwnDataStore.clear();
    await this.dwnEventLog.clear();
    await this.dwnMessageStore.clear();
    // await this.syncStore.clear();

    // Easiest way to start with fresh in-memory stores is to re-instantiate all of the managed
    // agent components.
    if (this.agentStores === 'memory') {
      const { cryptoApi, didApi, identityApi } = ManagedAgentTestHarness.useMemoryStores({ agent: this.agent });
      this.agent.crypto = cryptoApi;
      this.agent.did = didApi;
      this.agent.identity = identityApi;
    }
  }

  public async closeStorage(): Promise<void> {
    // await this.appDataStore.close();
    await this.didResolverCache.close();
    await this.dwnDataStore.close();
    await this.dwnEventLog.close();
    await this.dwnMessageStore.close();
    // await this.syncStore.close();
  }

  async createAgentDid(): Promise<void> {
    // Create a DID for the Agent.
    this.agent.agentDid = await DidJwk.create({
      keyManager : this.agent.crypto,
      options    : { algorithm: 'Ed25519' }
    });
  }

  public static async setup({ agentClass, agentStores, testDataLocation }:
    ManagedAgentTestHarnessSetupParams
  ): Promise<ManagedAgentTestHarness> {
    agentStores ??= 'memory';
    testDataLocation ??= '__TESTDATA__';

    const testDataPath = (path: string) => `${testDataLocation}/${path}`;

    const {
      cryptoApi,
      didApi,
      identityApi,
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

    // Create Web5ManagedAgent instance
    const agent = new agentClass({
      cryptoApi,
      didApi,
      dwnApi,
      identityApi
    });

    return new ManagedAgentTestHarness({
      agent,
      agentStores,
      didResolverCache,
      dwn,
      dwnDataStore,
      dwnEventLog,
      dwnMessageStore,
    });
  }

  private static useDiskStores({ agent, testDataLocation }: {
    agent?: Web5ManagedAgent;
    testDataLocation: string;
  }) {
    const testDataPath = (path: string) => `${testDataLocation}/${path}`;

    // Setup DID Resolver Cache
    const didResolverCache = new DidResolverCacheLevel({
      location: testDataPath('DID_RESOLVERCACHE')
    });

    const cryptoApi = new AgentCryptoApi({ agent });

    const didApi = new AgentDidApi({
      agent         : agent,
      didMethods    : [DidDht, DidJwk],
      resolverCache : didResolverCache,
      store         : new DwnDidStore()
    });

    const identityApi = new AgentIdentityApi({ agent, store: new DwnIdentityStore() });

    return { cryptoApi, didApi, didResolverCache, identityApi };
  }

  private static useMemoryStores({ agent }: { agent?: Web5ManagedAgent } = {}) {
    // Setup DID Resolver Cache
    const didResolverCache = new DidResolverCacheMemory();

    const cryptoApi = new AgentCryptoApi({ agent });

    const didApi = new AgentDidApi({
      agent         : agent,
      didMethods    : [DidDht, DidJwk],
      resolverCache : didResolverCache,
      store         : new InMemoryDidStore()
    });

    const identityApi = new AgentIdentityApi({ agent, store: new InMemoryIdentityStore() });

    return { cryptoApi, didApi, didResolverCache, identityApi };
  }
}