import type { BearerDid } from '@web5/dids';

import type { Web5PlatformAgent } from '../../src/types/agent.js';
import type { DidRequest, DidResponse } from '../../src/did-api.js';
import type { VcResponse, SendVcRequest, ProcessVcRequest } from '../../src/types/vc.js';
import type {
  DwnResponse,
  DwnInterface,
  SendDwnRequest,
  ProcessDwnRequest,
} from '../../src/types/dwn.js';

import type { Web5Rpc } from '../../src/rpc-client.js';
import type { AgentDwnApi } from '../../src/dwn-api.js';
import type { AgentSyncApi } from '../../src/sync-api.js';
import type { AgentCryptoApi } from '../../src/crypto-api.js';
import type { AgentIdentityApi } from '../../src/identity-api.js';
import type { AgentDidApi, DidInterface } from '../../src/did-api.js';
import type { AgentKeyManager } from '../../src/types/key-manager.js';
import type { IdentityVault } from '../../src/types/identity-vault.js';
import { AgentPermissionsApi } from '../../src/permissions-api.js';

type TestAgentParams<TKeyManager extends AgentKeyManager> = {
  agentVault: IdentityVault;
  cryptoApi: AgentCryptoApi;
  didApi: AgentDidApi;
  dwnApi: AgentDwnApi;
  identityApi: AgentIdentityApi<TKeyManager>;
  keyManager: TKeyManager;
  permissionsApi: AgentPermissionsApi;
  rpcClient: Web5Rpc;
  syncApi: AgentSyncApi;
}

export class TestAgent<TKeyManager extends AgentKeyManager> implements Web5PlatformAgent<TKeyManager> {
  public crypto: AgentCryptoApi;
  public did: AgentDidApi;
  public dwn: AgentDwnApi;
  public identity: AgentIdentityApi<TKeyManager>;
  public keyManager: TKeyManager;
  public permissions: AgentPermissionsApi;
  public rpc: Web5Rpc;
  public sync: AgentSyncApi;
  public vault: IdentityVault;

  private _agentDid?: BearerDid;

  constructor(params: TestAgentParams<TKeyManager>) {
    this.crypto = params.cryptoApi;
    this.did = params.didApi;
    this.dwn = params.dwnApi;
    this.identity = params.identityApi;
    this.keyManager = params.keyManager;
    this.permissions = params.permissionsApi;
    this.rpc = params.rpcClient;
    this.sync = params.syncApi;
    this.vault = params.agentVault;

    // Set this agent to be the default agent.
    this.did.agent = this;
    this.dwn.agent = this;
    this.identity.agent = this;
    this.keyManager.agent = this;
    this.permissions.agent = this;
    this.sync.agent = this;
  }

  get agentDid(): BearerDid {
    if (this._agentDid === undefined) {
      throw new Error('TestAgent: Agent DID is not set');
    }
    return this._agentDid;
  }

  set agentDid(did: BearerDid) {
    this._agentDid = did;
  }

  public async firstLaunch(): Promise<boolean> {
    throw new Error('Not implemented');
  }

  public async initialize(_params: { passphrase: string; }): Promise<void> {
    throw new Error('Not implemented');
  }

  public async processDidRequest<T extends DidInterface>(
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

  public async start(_params: { passphrase: string; }): Promise<void> {
    throw new Error('Not implemented');
  }
}