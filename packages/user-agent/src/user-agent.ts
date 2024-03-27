import type {
  Web5Rpc,
  DidRequest,
  VcResponse,
  DidResponse,
  DwnResponse,
  DidInterface,
  DwnInterface,
  SendVcRequest,
  SendDwnRequest,
  ProcessVcRequest,
  ProcessDwnRequest,
  Web5PlatformAgent,
} from '@web5/agent';

import { LevelStore } from '@web5/common';
import { BearerDid, DidDht, DidJwk, DidResolverCacheLevel } from '@web5/dids';
import {
  AgentDidApi,
  AgentDwnApi,
  DwnDidStore,
  DwnKeyStore,
  AgentSyncApi,
  Web5RpcClient,
  AgentCryptoApi,
  AgentKeyManager,
  HdIdentityVault,
  LocalKeyManager,
  SyncEngineLevel,
  AgentIdentityApi,
  DwnIdentityStore,
} from '@web5/agent';

/**
 * Initialization parameters for {@link Web5UserAgent}, including an optional recovery phrase that
 * can be used to derive keys to encrypt the vault and generate a DID.
 */
export type AgentInitializeParams = {
  /**
    * The password used to secure the Agent vault.
    *
    * The password selected should be strong and securely managed to prevent unauthorized access.
    */
   password: string;

  /**
   * An optional recovery phrase used to deterministically generate the cryptographic keys for the
   * Agent vault.
   *
   * Supplying this phrase enables the vault's contents to be restored or replicated across devices.
   * If omitted, a new phrase is generated, which should be securely recorded for future recovery needs.
   */
   recoveryPhrase?: string;
 };

export type AgentStartParams = {
  /**
   * The password used to unlock the previously initialized Agent vault.
   */
  password: string;
 }

export type AgentParams<TKeyManager extends AgentKeyManager = LocalKeyManager> = {
  /** Optional. The Decentralized Identifier (DID) representing this Web5 User Agent. */
  agentDid?: BearerDid;
  /** Encrypted vault used for managing the Agent's DID and associated keys. */
  agentVault: HdIdentityVault;
  /** Provides cryptographic capabilties like signing, encryption, hashing and key derivation. */
  cryptoApi: AgentCryptoApi;
  /** Specifies the local path to be used by the Agent's persistent data stores. */
  dataPath?: string;
  /** Facilitates DID operations including create, update, and resolve. */
  didApi: AgentDidApi<TKeyManager>;
  /** Facilitates DWN operations including processing and sending requests. */
  dwnApi: AgentDwnApi;
  /** Facilitates decentralized Identity operations including create, import, and export. */
  identityApi: AgentIdentityApi<TKeyManager>;
  /** Responsible for securely managing the cryptographic keys of the agent. */
  keyManager: TKeyManager;
  /** Remote procedure call (RPC) client used to communicate with other Web5 services. */
  rpcClient: Web5Rpc;
  /** Facilitates data synchronization of DWN records between nodes. */
  syncApi: AgentSyncApi;
}

export class Web5UserAgent<TKeyManager extends AgentKeyManager = LocalKeyManager> implements Web5PlatformAgent<TKeyManager> {
  public crypto: AgentCryptoApi;
  public did: AgentDidApi<TKeyManager>;
  public dwn: AgentDwnApi;
  public identity: AgentIdentityApi<TKeyManager>;
  public keyManager: TKeyManager;
  public rpc: Web5Rpc;
  public sync: AgentSyncApi;
  public vault: HdIdentityVault;

  private _agentDid?: BearerDid;

  constructor(params: AgentParams<TKeyManager>) {
    this._agentDid = params.agentDid;
    this.crypto = params.cryptoApi;
    this.did = params.didApi;
    this.dwn = params.dwnApi;
    this.identity = params.identityApi;
    this.keyManager = params.keyManager;
    this.rpc = params.rpcClient;
    this.sync = params.syncApi;
    this.vault = params.agentVault;

    // Set this agent to be the default agent.
    this.did.agent = this;
    this.dwn.agent = this;
    this.identity.agent = this;
    this.keyManager.agent = this;
    this.sync.agent = this;
  }

  get agentDid(): BearerDid {
    if (this._agentDid === undefined) {
      throw new Error(
        'Web5UserAgent: The "agentDid" property is not set. Ensure the agent is properly ' +
        'initialized and a DID is assigned.'
      );
    }
    return this._agentDid;
  }

  set agentDid(did: BearerDid) {
    this._agentDid = did;
  }

  /**
   * If any of the required agent components are not provided, instantiate default implementations.
   */
  public static async create({
    dataPath = 'DATA/AGENT',
    agentDid, agentVault, cryptoApi, didApi, dwnApi, identityApi, keyManager, rpcClient, syncApi
  }: Partial<AgentParams> = {}
  ): Promise<Web5UserAgent> {

    agentVault ??= new HdIdentityVault({
      keyDerivationWorkFactor : 210_000,
      store                   : new LevelStore<string, string>({ location: `${dataPath}/VAULT_STORE` })
    });

    cryptoApi ??= new AgentCryptoApi();

    didApi ??= new AgentDidApi({
      didMethods    : [DidDht, DidJwk],
      resolverCache : new DidResolverCacheLevel({ location: `${dataPath}/DID_RESOLVERCACHE` }),
      store         : new DwnDidStore()
    });

    dwnApi ??= new AgentDwnApi({
      dwn: await AgentDwnApi.createDwn({ dataPath, didResolver: didApi })
    });

    identityApi ??= new AgentIdentityApi({ store: new DwnIdentityStore() });

    keyManager ??= new LocalKeyManager({ keyStore: new DwnKeyStore() });

    rpcClient ??= new Web5RpcClient();

    syncApi ??= new AgentSyncApi({ syncEngine: new SyncEngineLevel({ dataPath }) });

    // Instantiate the Agent using the provided or default components.
    return new Web5UserAgent({
      agentDid,
      agentVault,
      cryptoApi,
      didApi,
      dwnApi,
      keyManager,
      identityApi,
      rpcClient,
      syncApi
    });
  }

  public async firstLaunch(): Promise<boolean> {
    // Check whether data vault is already initialize
    return await this.vault.isInitialized() === false;
  }

  /**
   * Initializes the User Agent with a password, and optionally a recovery phrase.
   *
   * This method is typically called once, the first time the Agent is launched, and is responsible
   * for setting up the agent's operational environment, cryptographic key material, and readiness
   * for processing Web5 requests.
   *
   * The password is used to secure the Agent vault, and the recovery phrase is used to derive the
   * cryptographic keys for the vault. If a recovery phrase is not provided, a new recovery phrase
   * will be generated and returned. The password should be chosen and entered by the end-user.
   */
  public async initialize({ password, recoveryPhrase }: AgentInitializeParams): Promise<string> {
    // Initialize the Agent vault.
    recoveryPhrase = await this.vault.initialize({ password, recoveryPhrase });

    return recoveryPhrase;
  }

  async processDidRequest<T extends DidInterface>(
    request: DidRequest<T>
  ): Promise<DidResponse<T>> {
    return this.did.processRequest(request);
  }

  public async processDwnRequest<T extends DwnInterface>(
    request: ProcessDwnRequest<T>
  ): Promise<DwnResponse<T>> {
    return this.dwn.processRequest(request);
  }

  public async processVcRequest(_request: ProcessVcRequest): Promise<VcResponse> {
    throw new Error('Not implemented');
  }

  public async sendDidRequest<T extends DidInterface>(
    _request: DidRequest<T>
  ): Promise<DidResponse<T>> {
    throw new Error('Not implemented');
  }

  public async sendDwnRequest<T extends DwnInterface>(
    request: SendDwnRequest<T>
  ): Promise<DwnResponse<T>> {
    return this.dwn.sendRequest(request);
  }

  public async sendVcRequest(_request: SendVcRequest): Promise<VcResponse> {
    throw new Error('Not implemented');
  }

  public async start({ password }: AgentInitializeParams): Promise<void> {
    // If the Agent vault is locked, unlock it.
    if (this.vault.isLocked()) {
      await this.vault.unlock({ password });
    }

    // Set the Agent's DID.
    this.agentDid = await this.vault.getDid();
  }
}