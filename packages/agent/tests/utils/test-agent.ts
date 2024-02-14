import type { BearerDid } from '@web5/dids';

import type { Web5ManagedAgent } from '../../src/types/agent.js';
import type { DidRequest, DidResponse } from '../../src/did-api.js';
import type {   VcResponse, SendVcRequest, ProcessVcRequest } from '../../src/types/agent-vc.js';
import type {
  DwnResponse,
  DwnInterface,
  SendDwnRequest,
  ProcessDwnRequest,
} from '../../src/types/agent-dwn.js';

import { AgentDidApi, DidInterface } from '../../src/did-api.js';
import { AgentDwnApi } from '../../src/dwn-api.js';
import { AgentCryptoApi } from '../../src/crypto-api.js';

type TestAgentOptions = {
  cryptoApi: AgentCryptoApi;
  didApi: AgentDidApi;
  dwnApi: AgentDwnApi;
}

export class TestAgent implements Web5ManagedAgent {
  agentDid?: BearerDid;
  crypto: AgentCryptoApi;
  did: AgentDidApi;
  dwn: AgentDwnApi;

  constructor(params: TestAgentOptions) {
    this.crypto = params.cryptoApi;
    this.did = params.didApi;
    this.dwn = params.dwnApi;

    // Set this agent to be the default agent.
    this.crypto.agent = this;
    this.did.agent = this;
    this.dwn.agent = this;
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
    _request: SendDwnRequest<T>
  ): Promise<DwnResponse<T>> {
    throw new Error('Not implemented');
    // return this.dwnManager.sendRequest(request);
  }

  async sendVcRequest(_request: SendVcRequest): Promise<VcResponse> {
    throw new Error('Not implemented');
  }

  async start(_options: { passphrase: string; }): Promise<void> {
    throw new Error('Not implemented');
  }
}