import type { BearerDid } from '@web5/dids';

import type { Web5ManagedAgent } from '../../src/types/agent.js';
import type { DidRequest, DidResponse } from '../../src/did-api.js';
import type { VcResponse, SendVcRequest, ProcessVcRequest } from '../../src/types/vc.js';
import type {
  DwnResponse,
  DwnInterface,
  SendDwnRequest,
  ProcessDwnRequest,
} from '../../src/types/dwn.js';

import { Web5Rpc } from '../../src/rpc-client.js';
import { AgentDwnApi } from '../../src/dwn-api.js';
import { AgentSyncApi } from '../../src/sync-api.js';
import { AgentCryptoApi } from '../../src/crypto-api.js';
import { AgentIdentityApi } from '../../src/identity-api.js';
import { AgentDidApi, DidInterface } from '../../src/did-api.js';

type TestAgentOptions = {
  cryptoApi: AgentCryptoApi;
  didApi: AgentDidApi;
  dwnApi: AgentDwnApi;
  identityApi: AgentIdentityApi;
  rpcClient: Web5Rpc;
  syncApi: AgentSyncApi;
}

export class TestAgent implements Web5ManagedAgent {
  public crypto: AgentCryptoApi;
  public did: AgentDidApi;
  public dwn: AgentDwnApi;
  public identity: AgentIdentityApi;
  public rpc: Web5Rpc;
  public sync: AgentSyncApi;

  private _agentDid?: BearerDid;

  constructor(params: TestAgentOptions) {
    this.crypto = params.cryptoApi;
    this.did = params.didApi;
    this.dwn = params.dwnApi;
    this.identity = params.identityApi;
    this.rpc = params.rpcClient;
    this.sync = params.syncApi;

    // Set this agent to be the default agent.
    this.crypto.agent = this;
    this.did.agent = this;
    this.dwn.agent = this;
    this.identity.agent = this;
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

  async firstLaunch(): Promise<boolean> {
    throw new Error('Not implemented');
  }

  async initialize(_options: { passphrase: string; }): Promise<void> {
    throw new Error('Not implemented');
  }

  async processDidRequest(
    request: DidRequest<DidInterface>
  ): Promise<DidResponse<DidInterface>> {
    return this.did.processRequest(request);
  }

  public async processDwnRequest<T extends DwnInterface>(
    request: ProcessDwnRequest<T>
  ): Promise<DwnResponse<T>> {
    return this.dwn.processRequest(request);
  }

  async processVcRequest(_request: ProcessVcRequest): Promise<VcResponse> {
    throw new Error('Not implemented');
  }

  async sendDidRequest<T extends DidInterface>(
    _request: DidRequest<T>
  ): Promise<DidResponse<T>> {
    throw new Error('Not implemented');
  }

  async sendDwnRequest<T extends DwnInterface>(
    request: SendDwnRequest<T>
  ): Promise<DwnResponse<T>> {
    return this.dwn.sendRequest(request);
  }

  async sendVcRequest(_request: SendVcRequest): Promise<VcResponse> {
    throw new Error('Not implemented');
  }

  async start(_options: { passphrase: string; }): Promise<void> {
    throw new Error('Not implemented');
  }
}