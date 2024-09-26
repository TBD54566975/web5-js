import type { KeyValueStore } from '@web5/common';
import type { AbstractLevel } from 'abstract-level';

import { Level } from 'level';
import { LevelStore, MemoryStore } from '@web5/common';
import { DataStoreLevel, Dwn, EventEmitterStream, EventLogLevel, MessageStoreLevel, ResumableTaskStoreLevel } from '@tbd54566975/dwn-sdk-js';
import { DidDht, DidJwk, DidResolutionResult, DidResolverCache } from '@web5/dids';

import type { Web5PlatformAgent } from './types/agent.js';

import { AgentDidApi } from './did-api.js';
import { AgentDidResolverCache } from './agent-did-resolver-cache.js';
import { AgentDwnApi } from './dwn-api.js';
import { AgentSyncApi } from './sync-api.js';
import { Web5RpcClient } from './rpc-client.js';
import { AgentCryptoApi } from './crypto-api.js';
import { AgentIdentityApi } from './identity-api.js';
import { BearerIdentity } from './bearer-identity.js';
import { HdIdentityVault } from './hd-identity-vault.js';
import { LocalKeyManager } from './local-key-manager.js';
import { SyncEngineLevel } from './sync-engine-level.js';
import { DwnDidStore, InMemoryDidStore } from './store-did.js';
import { DwnKeyStore, InMemoryKeyStore } from './store-key.js';
import { DwnIdentityStore, InMemoryIdentityStore } from './store-identity.js';
import { DidResolverCacheMemory } from './prototyping/dids/resolver-cache-memory.js';
import { AgentPermissionsApi } from './permissions-api.js';

type PlatformAgentTestHarnessParams = {
  agent: Web5PlatformAgent<LocalKeyManager>

  agentStores: 'dwn' | 'memory';
  didResolverCache: DidResolverCache;
  dwn: Dwn;
  dwnDataStore: DataStoreLevel;
  dwnEventLog: EventLogLevel;
  dwnMessageStore: MessageStoreLevel;
  dwnResumableTaskStore: ResumableTaskStoreLevel;
  syncStore: AbstractLevel<string | Buffer | Uint8Array>;
  vaultStore: KeyValueStore<string, string>;
  dwnStores: {
    keyStore: DwnKeyStore;
    identityStore: DwnIdentityStore;
    didStore: DwnDidStore;
    clear: () => void;
  }
}

export class PlatformAgentTestHarness {
  public agent: Web5PlatformAgent<LocalKeyManager>;

  public agentStores: 'dwn' | 'memory';
  public didResolverCache: DidResolverCache;
  public dwn: Dwn;
  public dwnDataStore: DataStoreLevel;
  public dwnEventLog: EventLogLevel;
  public dwnMessageStore: MessageStoreLevel;
  public dwnResumableTaskStore: ResumableTaskStoreLevel;
  public syncStore: AbstractLevel<string | Buffer | Uint8Array>;
  public vaultStore: KeyValueStore<string, string>;

  /**
   * Custom DWN Stores for `keyStore`, `identityStore` and `didStore`.
   * This allows us to clear the store cache between tests
   */
  public dwnStores: {
    keyStore: DwnKeyStore;
    identityStore: DwnIdentityStore;
    didStore: DwnDidStore;
    /** clears the protocol initialization caches */
    clear: () => void;
  };

  constructor(params: PlatformAgentTestHarnessParams) {
    this.agent = params.agent;
    this.agentStores = params.agentStores;
    this.didResolverCache = params.didResolverCache;
    this.dwn = params.dwn;
    this.dwnDataStore = params.dwnDataStore;
    this.dwnEventLog = params.dwnEventLog;
    this.dwnMessageStore = params.dwnMessageStore;
    this.syncStore = params.syncStore;
    this.vaultStore = params.vaultStore;
    this.dwnResumableTaskStore = params.dwnResumableTaskStore;
    this.dwnStores = params.dwnStores;
  }

  public async clearStorage(): Promise<void> {
    // first stop any ongoing sync operations
    await this.agent.sync.stopSync();

    // @ts-expect-error since normally this property shouldn't be set to undefined.
    this.agent.agentDid = undefined;
    await this.didResolverCache.clear();
    await this.dwnDataStore.clear();
    await this.dwnEventLog.clear();
    await this.dwnMessageStore.clear();
    await this.dwnResumableTaskStore.clear();
    await this.syncStore.clear();
    await this.vaultStore.clear();
    await this.agent.permissions.clear();
    this.dwnStores.clear();

    // Reset the indexes and caches for the Agent's DWN data stores.
    // if (this.agentStores === 'dwn') {
    //   const { didApi, identityApi } = PlatformAgentTestHarness.useDiskStores({ testDataLocation: '__TESTDATA__', agent: this.agent });
    //   this.agent.crypto = cryptoApi;
    //   this.agent.did = didApi;
    //   this.agent.identity = identityApi;
    // }

    // Easiest way to start with fresh in-memory stores is to re-instantiate Agent components.
    if (this.agentStores === 'memory') {
      const { didApi, identityApi, permissionsApi, keyManager } = PlatformAgentTestHarness.useMemoryStores({ agent: this.agent });
      this.agent.did = didApi;
      this.agent.identity = identityApi;
      this.agent.keyManager = keyManager;
      this.agent.permissions = permissionsApi;
    }
  }

  public async closeStorage(): Promise<void> {
    await this.didResolverCache.close();
    await this.dwnDataStore.close();
    await this.dwnEventLog.close();
    await this.dwnMessageStore.close();
    await this.dwnResumableTaskStore.close();
    await this.syncStore.close();
    await this.vaultStore.close();
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
            id        : 'enc',
            purposes  : ['keyAgreement']
          }
        ]
      },
      metadata: { name }
    });

    return bearerIdentity;
  }

  public static async setup({ agentClass, agentStores, testDataLocation }: {
      agentClass: new (params: any) => Web5PlatformAgent<LocalKeyManager>
      agentStores?: 'dwn' | 'memory';
      testDataLocation?: string;
    }): Promise<PlatformAgentTestHarness> {
    agentStores ??= 'memory';
    testDataLocation ??= '__TESTDATA__';

    const testDataPath = (path: string) => `${testDataLocation}/${path}`;

    // Instantiate Agent's Crypto API.
    const cryptoApi = new AgentCryptoApi();

    // Instantiate Agent's RPC Client.
    const rpcClient = new Web5RpcClient();

    const dwnStores = {
      keyStore      : new DwnKeyStore(),
      identityStore : new DwnIdentityStore(),
      didStore      : new DwnDidStore(),
      clear         : ():void => {
        dwnStores.keyStore['_protocolInitializedCache']?.clear();
        dwnStores.identityStore['_protocolInitializedCache']?.clear();
        dwnStores.didStore['_protocolInitializedCache']?.clear();
      }
    };

    const {
      agentVault,
      didApi,
      identityApi,
      keyManager,
      didResolverCache,
      vaultStore,
      permissionsApi
    } = (agentStores === 'memory')
      ? PlatformAgentTestHarness.useMemoryStores()
      : PlatformAgentTestHarness.useDiskStores({ testDataLocation, stores: dwnStores });

    // Instantiate custom stores to use with DWN instance.
    // Note: There is no in-memory store for DWN, so we always use LevelDB-based disk stores.
    const dwnDataStore = new DataStoreLevel({ blockstoreLocation: testDataPath('DWN_DATASTORE') });
    const dwnEventLog = new EventLogLevel({ location: testDataPath('DWN_EVENTLOG') });
    const dwnEventStream = new EventEmitterStream();
    const dwnResumableTaskStore = new ResumableTaskStoreLevel({ location: testDataPath('DWN_RESUMABLETASKSTORE') });

    const dwnMessageStore = new MessageStoreLevel({
      blockstoreLocation : testDataPath('DWN_MESSAGESTORE'),
      indexLocation      : testDataPath('DWN_MESSAGEINDEX')
    });

    // Instantiate DWN instance using the custom stores.
    const dwn = await AgentDwnApi.createDwn({
      dataPath           : testDataLocation,
      dataStore          : dwnDataStore,
      didResolver        : didApi,
      eventLog           : dwnEventLog,
      eventStream        : dwnEventStream,
      messageStore       : dwnMessageStore,
      resumableTaskStore : dwnResumableTaskStore
    });

    // Instantiate Agent's DWN API using the custom DWN instance.
    const dwnApi = new AgentDwnApi({ dwn });

    // Instantiate Agent's Sync API using a custom LevelDB-backed store.
    const syncStore = new Level(testDataPath('SYNC_STORE'));
    const syncEngine = new SyncEngineLevel({ db: syncStore });
    const syncApi = new AgentSyncApi({ syncEngine });

    // Create Web5PlatformAgent instance
    const agent = new agentClass({
      agentVault,
      cryptoApi,
      didApi,
      dwnApi,
      identityApi,
      keyManager,
      permissionsApi,
      rpcClient,
      syncApi,
    });

    return new PlatformAgentTestHarness({
      agent,
      agentStores,
      didResolverCache,
      dwn,
      dwnDataStore,
      dwnEventLog,
      dwnMessageStore,
      dwnResumableTaskStore,
      dwnStores,
      syncStore,
      vaultStore
    });
  }

  private static useDiskStores({ agent, testDataLocation, stores }: {
    agent?: Web5PlatformAgent;
    stores: {
      keyStore: DwnKeyStore;
      identityStore: DwnIdentityStore;
      didStore: DwnDidStore;
    }
    testDataLocation: string;
  }) {
    const testDataPath = (path: string) => `${testDataLocation}/${path}`;

    const vaultStore = new LevelStore<string, string>({ location: testDataPath('VAULT_STORE') });
    const agentVault = new HdIdentityVault({ keyDerivationWorkFactor: 1, store: vaultStore });

    const { didStore, identityStore, keyStore } = stores;

    // Setup DID Resolver Cache
    const didResolverCache = new AgentDidResolverCache({
      location: testDataPath('DID_RESOLVERCACHE')
    });

    const didApi = new AgentDidApi({
      agent         : agent,
      didMethods    : [DidDht, DidJwk],
      resolverCache : didResolverCache,
      store         : didStore
    });

    const identityApi = new AgentIdentityApi({ agent, store: identityStore });

    const keyManager = new LocalKeyManager({ agent, keyStore: keyStore });

    const permissionsApi = new AgentPermissionsApi({ agent });

    return { agentVault, didApi, didResolverCache, identityApi, keyManager, permissionsApi, vaultStore };
  }

  private static useMemoryStores({ agent }: { agent?: Web5PlatformAgent<LocalKeyManager> } = {}) {
    const vaultStore = new MemoryStore<string, string>();
    const agentVault = new HdIdentityVault({ keyDerivationWorkFactor: 1, store: vaultStore });

    // Setup DID Resolver Cache
    const didResolverCache = new DidResolverCacheMemory();

    const didApi = new AgentDidApi({
      agent         : agent,
      didMethods    : [DidDht, DidJwk],
      resolverCache : didResolverCache,
      store         : new InMemoryDidStore()
    });

    const keyManager = new LocalKeyManager({ agent, keyStore: new InMemoryKeyStore() });

    const identityApi = new AgentIdentityApi<LocalKeyManager>({ agent, store: new InMemoryIdentityStore() });

    const permissionsApi = new AgentPermissionsApi({ agent });

    return { agentVault, didApi, didResolverCache, identityApi, keyManager, permissionsApi, vaultStore };
  }
}