import type { BearerDid } from '@web5/dids';

import type { Web5Rpc } from '../rpc-client.js';
import type { AgentDwnApi } from '../dwn-api.js';
import type { AgentSyncApi } from '../sync-api.js';
import type { AgentCryptoApi } from '../crypto-api.js';
import type { AgentIdentityApi } from '../identity-api.js';
import type { ProcessVcRequest, SendVcRequest, VcResponse } from './vc.js';
import type { AgentDidApi, DidInterface, DidRequest, DidResponse } from '../did-api.js';
import type { DwnInterface, DwnResponse, ProcessDwnRequest, SendDwnRequest } from './dwn.js';

/**
 * Status code and detailed message for a response.
 */
export type ResponseStatus = {
  ok: boolean;

  status: {
    code: number;
    detail: string;
  };
};

/**
 * Web5 Agent Types
 */
export interface Web5Agent {
  agentDid: BearerDid;

  processDidRequest(request: DidRequest<DidInterface>): Promise<DidResponse<DidInterface>>
  sendDidRequest(request: DidRequest<DidInterface>): Promise<DidResponse<DidInterface>>;
  processDwnRequest<T extends DwnInterface>(request: ProcessDwnRequest<T>): Promise<DwnResponse<T>>
  sendDwnRequest<T extends DwnInterface>(request: SendDwnRequest<T>): Promise<DwnResponse<T>>;
  processVcRequest(request: ProcessVcRequest): Promise<VcResponse>
  sendVcRequest(request: SendVcRequest): Promise<VcResponse>;
}

export interface Web5PlatformAgent<TCrypto extends AgentCryptoApi = AgentCryptoApi> extends Web5Agent {
  crypto: TCrypto;
  did: AgentDidApi<TCrypto>;
  dwn: AgentDwnApi;
  identity: AgentIdentityApi<TCrypto>;
  rpc: Web5Rpc;
  sync: AgentSyncApi;

  firstLaunch(): Promise<boolean>;
  initialize(params: { passphrase: string }): Promise<void>;
  start(params: { passphrase: string }): Promise<void>;
}