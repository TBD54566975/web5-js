import type {
  Web5Rpc,
  DidRequest,
  VcResponse,
  DidResponse,
  DwnResponse,
  AppDataStore,
  SendVcRequest,
  SendDwnRequest,
  ProcessVcRequest,
  Web5ManagedAgent,
  ProcessDwnRequest,
  SyncManager,
} from '@web5/agent';

import { Dwn, EventLogLevel,
  DataStoreLevel,
  MessageStoreLevel, } from '@tbd54566975/dwn-sdk-js';
import {
  DidResolver,
  DidKeyMethod,
} from '@web5/dids';
import {
  LocalKms,
  DidManager,
  DidMessage,
  DwnManager,
  KeyManager,
  AppDataVault,
  Web5RpcClient,
  IdentityManager,
  SyncManagerLevel,
} from '@web5/agent';

type CreateMethodOptions = {
  testDataLocation?: string;
}

type TestUserAgentOptions = {
  appData: AppDataStore;
  didManager: DidManager;
  didResolver: DidResolver;
  dwnManager: DwnManager;
  identityManager: IdentityManager;
  keyManager: KeyManager;
  rpcClient: Web5Rpc;
  syncManager: SyncManager;

  dwn: Dwn;
  dwnDataStore: DataStoreLevel;
  dwnEventLog: EventLogLevel;
  dwnMessageStore: MessageStoreLevel;
}

export class TestUserAgent implements Web5ManagedAgent {
  agentDid: string | undefined;
  appData: AppDataStore;
  didManager: DidManager;
  didResolver: DidResolver;
  dwnManager: DwnManager;
  identityManager: IdentityManager;
  keyManager: KeyManager;
  rpcClient: Web5Rpc;
  syncManager: SyncManager;

  /**
   * DWN-related properties.
   */
  dwn: Dwn;
  dwnDataStore: DataStoreLevel;
  dwnEventLog: EventLogLevel;
  dwnMessageStore: MessageStoreLevel;

  constructor(options: TestUserAgentOptions) {
    this.appData = options.appData;
    this.didManager = options.didManager;
    this.didResolver = options.didResolver;
    this.dwnManager = options.dwnManager;
    this.identityManager = options.identityManager;
    this.keyManager = options.keyManager;
    this.rpcClient = options.rpcClient;
    this.syncManager = options.syncManager;

    // Set this agent to be the default agent for each component.
    this.didManager.agent = this;
    this.dwnManager.agent = this;
    this.identityManager.agent = this;
    this.keyManager.agent = this;
    this.syncManager.agent = this;

    // TestUserAgent-specific properties.
    this.dwn = options.dwn;
    this.dwnDataStore = options.dwnDataStore;
    this.dwnEventLog = options.dwnEventLog;
    this.dwnMessageStore = options.dwnMessageStore;
  }

  async clearStorage(): Promise<void> {
    this.agentDid = undefined;
    await this.dwnDataStore.clear();
    await this.dwnEventLog.clear();
    await this.dwnMessageStore.clear();
  }

  async closeStorage(): Promise<void> {
    await this.dwnDataStore.close();
    await this.dwnEventLog.close();
    await this.dwnMessageStore.close();
  }

  static async create(options: CreateMethodOptions = {}): Promise<TestUserAgent> {
    const testDataLocation = options.testDataLocation ?? '__TESTDATA__';
    const testDataPath = (path: string) => `${testDataLocation}/${path}`;

    // Instantiate custom stores to use with DWN instance.
    const dwnDataStore = new DataStoreLevel({ blockstoreLocation: testDataPath('DATASTORE') });
    const dwnEventLog = new EventLogLevel({ location: testDataPath('EVENTLOG') });
    const dwnMessageStore = new MessageStoreLevel({
      blockstoreLocation : testDataPath('MESSAGESTORE'),
      indexLocation      : testDataPath('INDEX')
    });

    // Instantiate components with default in-memory stores.
    const appData = new AppDataVault({ keyDerivationWorkFactor: 1 });
    const didManager = new DidManager({ didMethods: [DidKeyMethod] });
    const identityManager = new IdentityManager();
    const kms = {
      memory: new LocalKms({ kmsName: 'memory' })
    };
    const keyManager = new KeyManager({ kms });

    // Instantiate DID resolver.
    const didMethodApis = [DidKeyMethod];
    const didResolver = new DidResolver({ didResolvers: didMethodApis });

    // Instantiate custom DWN instance.
    const dwn = await Dwn.create({
      eventLog     : dwnEventLog,
      dataStore    : dwnDataStore,
      messageStore : dwnMessageStore
    });

    // Instantiate a DwnManager using the custom DWN instance.
    const dwnManager = new DwnManager({ dwn });

    // Instantiate an RPC Client.
    const rpcClient = new Web5RpcClient();

    // Instantiate a SyncManager.
    const syncManager = new SyncManagerLevel({ dataPath: testDataPath('SYNC_STORE')});

    return new TestUserAgent({
      appData,
      didManager,
      didResolver,
      dwn,
      dwnDataStore,
      dwnEventLog,
      dwnMessageStore,
      dwnManager,
      identityManager,
      keyManager,
      rpcClient,
      syncManager,
    });
  }

  async firstLaunch(): Promise<boolean> {
    throw new Error('Not implemented');
  }

  async initialize(_options: { passphrase: string; }): Promise<void> {
    throw new Error('Not implemented');
  }

  async processDidRequest(request: DidRequest): Promise<DidResponse> {
    switch (request.messageType) {
      case DidMessage.Resolve: {
        const { didUrl, resolutionOptions } = request.messageOptions;
        const result = await this.didResolver.resolve(didUrl, resolutionOptions);
        return { result };
      }

      default: {
        return this.didManager.processRequest(request);
      }
    }
  }

  async processDwnRequest(request: ProcessDwnRequest): Promise<DwnResponse> {
    return this.dwnManager.processRequest(request);
  }

  async processVcRequest(_request: ProcessVcRequest): Promise<VcResponse> {
    throw new Error('Not implemented');
  }

  async sendDidRequest(_request: DidRequest): Promise<DidResponse> {
    throw new Error('Not implemented');
  }

  async sendDwnRequest(request: SendDwnRequest): Promise<DwnResponse> {
    return this.dwnManager.sendRequest(request);
  }

  async sendVcRequest(_request: SendVcRequest): Promise<VcResponse> {
    throw new Error('Not implemented');
  }

  async start(_options: { passphrase: string; }): Promise<void> {
    throw new Error('Not implemented');
  }
}